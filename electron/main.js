import path from "path";
import { spawn } from "child_process";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";
import Store from "electron-store";

import { runRenameJob } from "./lib/renameJob.js";
import { assertDirectory } from "./lib/assertDirectory.js";
import { isTrustedSender } from "./lib/isTrustedSender.js";
import { seedDataDir } from "./lib/seedUserData.js";
import { waitForActiveOperation } from "./lib/quitGuard.js";

// Electron's main-process module exposes its API via lazy getters that
// ESM's default-import interop can't see (`import electron from "electron"`
// resolves to an empty object) — requiring it via createRequire sidesteps that.
const require = createRequire(import.meta.url);
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require("electron");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isMac = process.platform === "darwin";
const REPO_URL = "https://github.com/Karl-Horning/folder-renamer";
const RENDERER_URL_PREFIX = pathToFileURL(path.join(__dirname, "renderer") + path.sep).href;

const BUNDLED_DATA_DIR = path.join(__dirname, "..", "src", "data");
const PATTERN_FILES = ["prefixes.json", "removePatterns.json", "replacePatterns.json"];

// electron-builder builds the packaged .icns from this file, and setting it here also shows the icon in the Dock in dev mode.
const APP_ICON = path.join(__dirname, "..", "build", "icon.png");

const store = new Store({
    projectName: "folder-renamer",
    defaults: { directoryPath: "" },
});

/** @type {string} */
let userDataDir;
/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {Promise<any> | null} */
let activeRenamePromise = null;

/**
 * Resolves the userData data directory, seeding it from the bundled defaults on first run.
 * @returns {Promise<string>} The resolved userData data directory.
 */
async function seedUserData() {
    const dataDir = path.join(app.getPath("userData"), "data");
    await seedDataDir(dataDir, BUNDLED_DATA_DIR, PATTERN_FILES);
    return dataDir;
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        title: "Folder Renamer",
        icon: APP_ICON,
        width: 460,
        height: 440,
        minWidth: 400,
        minHeight: 360,
        backgroundColor: "#fdfdfb",
        show: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });
    mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
    mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
    mainWindow.once("ready-to-show", () => mainWindow?.show());
    mainWindow.on("closed", () => {
        mainWindow = null;
        applyMenuState({ canChoose: false, canRun: false });
    });
}

/**
 * Opens the config folder in Finder, and shows an error box if it can't be opened.
 * @returns {Promise<void>}
 */
async function revealConfigFolder() {
    const error = await shell.openPath(userDataDir);
    if (error) dialog.showErrorBox("Can't open the config folder", error);
}

function buildMenu() {
    const template = [
        ...(isMac ? [{ role: "appMenu" }] : []),
        {
            label: "File",
            submenu: [
                {
                    id: "choose",
                    label: "Choose Folder…",
                    accelerator: "CmdOrCtrl+O",
                    click: () => mainWindow?.webContents.send("menu:choose"),
                },
                { type: "separator" },
                {
                    id: "preview",
                    label: "Preview",
                    accelerator: "CmdOrCtrl+Shift+P",
                    enabled: false,
                    click: () => mainWindow?.webContents.send("menu:preview"),
                },
                {
                    id: "run",
                    label: "Process Batch",
                    accelerator: "CmdOrCtrl+Return",
                    enabled: false,
                    click: () => mainWindow?.webContents.send("menu:run"),
                },
                { type: "separator" },
                {
                    label: "Reveal Config Folder",
                    accelerator: "CmdOrCtrl+Shift+R",
                    click: revealConfigFolder,
                },
                { type: "separator" },
                isMac ? { role: "close" } : { role: "quit" },
            ],
        },
        { role: "editMenu" },
        { role: "windowMenu" },
        {
            role: "help",
            submenu: [
                {
                    label: "View on GitHub",
                    click: () => shell.openExternal(REPO_URL),
                },
                {
                    label: "Report an Issue",
                    click: () => shell.openExternal(`${REPO_URL}/issues`),
                },
            ],
        },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * Enables or disables the menu items that act on the main window.
 * @param {{canChoose: boolean, canRun: boolean}} state - Whether choosing a folder, and previewing or running a batch, are currently possible.
 */
function applyMenuState({ canChoose, canRun }) {
    const menu = Menu.getApplicationMenu();
    if (!menu) return;
    menu.getMenuItemById("choose").enabled = canChoose;
    menu.getMenuItemById("preview").enabled = canRun;
    menu.getMenuItemById("run").enabled = canRun;
}

// --- IPC handlers ---

/**
 * Registers an invoke handler that only answers pages from the renderer folder.
 * @param {string} channel - The IPC channel name.
 * @param {(event: object, ...args: any[]) => any} handler - The handler to run for trusted senders.
 */
function handle(channel, handler) {
    ipcMain.handle(channel, (event, ...args) => {
        if (!isTrustedSender(event, RENDERER_URL_PREFIX)) throw new Error("Untrusted sender.");
        return handler(event, ...args);
    });
}

/**
 * Registers a one-way listener that only accepts messages from the renderer folder.
 * @param {string} channel - The IPC channel name.
 * @param {(event: object, ...args: any[]) => void} listener - The listener to run for trusted senders.
 */
function listen(channel, listener) {
    ipcMain.on(channel, (event, ...args) => {
        if (isTrustedSender(event, RENDERER_URL_PREFIX)) listener(event, ...args);
    });
}

handle("settings:get", () => ({
    directoryPath: store.get("directoryPath"),
}));

handle("settings:save", async (_event, settings) => {
    store.set("directoryPath", await assertDirectory(settings?.directoryPath));
    return { directoryPath: store.get("directoryPath") };
});

handle("dialog:chooseDirectory", async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
        defaultPath: store.get("directoryPath") || undefined,
        properties: ["openDirectory"],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

listen("menu:state", (_event, state) => {
    applyMenuState({ canChoose: Boolean(state?.canChoose), canRun: Boolean(state?.canRun) });
});

handle("config:reveal", revealConfigFolder);

handle("run:confirm", async () => {
    const directoryPath = store.get("directoryPath");
    const { response } = await dialog.showMessageBox(mainWindow ?? undefined, {
        type: "warning",
        message: `Rename folders in "${path.basename(directoryPath)}"?`,
        detail: `${directoryPath}\n\nThis can't be undone.`,
        buttons: ["Rename", "Cancel"],
        defaultId: 1,
        cancelId: 1,
    });
    return response === 0;
});

handle("rename:run", async (event) => {
    if (activeRenamePromise) throw new Error("A batch is already running.");

    const directoryPath = store.get("directoryPath");
    activeRenamePromise = runRenameJob(directoryPath, userDataDir, (entry) =>
        event.sender.send("rename:log", entry),
    );
    try {
        return await activeRenamePromise;
    } finally {
        activeRenamePromise = null;
    }
});

// Read-only, so it skips activeRenamePromise and the quit guard.
handle("rename:preview", async (event) => {
    const directoryPath = store.get("directoryPath");
    return runRenameJob(
        directoryPath,
        userDataDir,
        (entry) => event.sender.send("rename:log", entry),
        true,
    );
});

// --- Lifecycle ---

app.whenReady().then(async () => {
    userDataDir = await seedUserData();
    app.setAboutPanelOptions({
        copyright: "Copyright © 2025 Karl Horning",
        website: REPO_URL,
    });
    buildMenu();
    createMainWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on("window-all-closed", () => {
    if (!isMac) app.quit();
});

// Chromium can hang for several seconds on quit, so a detached watchdog ends the process after two seconds. electron-store writes synchronously, so nothing is lost.
let watchdogStarted = false;
let quittingAfterRename = false;

app.on("before-quit", (event) => {
    // If a batch is running, wait for it up to a ceiling. The second quit falls through to the watchdog.
    if (activeRenamePromise && !quittingAfterRename) {
        event.preventDefault();
        quittingAfterRename = true;
        mainWindow?.webContents.send("app:quit-waiting");
        waitForActiveOperation(activeRenamePromise, 15_000).then(() => app.quit());
        return;
    }

    if (watchdogStarted) return;
    watchdogStarted = true;
    spawn("sh", ["-c", `sleep 2 && kill -9 ${process.pid}`], {
        detached: true,
        stdio: "ignore",
    }).unref();
});
