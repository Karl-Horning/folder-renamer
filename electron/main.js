import path from "path";
import { spawn } from "child_process";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import Store from "electron-store";

import { runRenameJob } from "./lib/renameJob.js";
import { seedDataDir } from "./lib/seedUserData.js";
import { waitForActiveOperation } from "./lib/quitGuard.js";

// Electron's main-process module exposes its API via lazy getters that
// ESM's default-import interop can't see (`import electron from "electron"`
// resolves to an empty object) — requiring it via createRequire sidesteps that.
const require = createRequire(import.meta.url);
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } =
    require("electron");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLED_DATA_DIR = path.join(__dirname, "..", "src", "data");
const PATTERN_FILES = [
    "prefixes.json",
    "removePatterns.json",
    "replacePatterns.json",
];

// electron-builder generates the packaged app's .icns from this same file at
// build time — setting it here too means dev mode (`npm run electron`) shows
// the real icon in the Dock instead of the default Electron icon.
const APP_ICON = path.join(__dirname, "..", "build", "icon.png");

const store = new Store({
    projectName: "folder-renamer",
    defaults: { directoryPath: "" },
});

/** @type {string} */
let userDataDir;
/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {BrowserWindow | null} */
let settingsWindow = null;
/** @type {Promise<any> | null} */
let activeRenamePromise = null;

/**
 * Resolves this app's userData data directory, seeding it from the bundled
 * defaults on first run — see seedDataDir for why that matters.
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
        },
    });
    mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
    mainWindow.once("ready-to-show", () => mainWindow?.show());
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

function createSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        title: "Manifest Settings",
        icon: APP_ICON,
        width: 420,
        height: 330,
        resizable: false,
        backgroundColor: "#fdfdfb",
        show: false,
        parent: mainWindow ?? undefined,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    settingsWindow.loadFile(path.join(__dirname, "renderer", "settings.html"));
    settingsWindow.once("ready-to-show", () => settingsWindow?.show());
    settingsWindow.on("closed", () => {
        settingsWindow = null;
    });
}

function buildMenu() {
    const template = [
        {
            label: app.name,
            submenu: [
                { role: "about" },
                { type: "separator" },
                {
                    label: "Preferences…",
                    accelerator: "Cmd+,",
                    click: () => createSettingsWindow(),
                },
                {
                    label: "Reveal Config Folder",
                    accelerator: "Cmd+Shift+R",
                    click: () => shell.openPath(userDataDir),
                },
                { type: "separator" },
                {
                    label: "Preview",
                    accelerator: "Cmd+Shift+P",
                    click: () => mainWindow?.webContents.send("menu:preview"),
                },
                {
                    label: "Process Batch",
                    accelerator: "Cmd+Return",
                    click: () => mainWindow?.webContents.send("menu:run"),
                },
                { type: "separator" },
                { role: "quit" },
            ],
        },
        {
            label: "Edit",
            submenu: [
                { role: "undo" },
                { role: "redo" },
                { type: "separator" },
                { role: "cut" },
                { role: "copy" },
                { role: "paste" },
                { role: "selectAll" },
            ],
        },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --- IPC handlers ---

ipcMain.handle("settings:get", () => ({
    directoryPath: store.get("directoryPath"),
}));

ipcMain.handle("settings:save", (_event, { directoryPath }) => {
    store.set("directoryPath", directoryPath);
    const updated = { directoryPath: store.get("directoryPath") };
    mainWindow?.webContents.send("settings:changed", updated);
    return updated;
});

ipcMain.handle("settings:open", () => {
    createSettingsWindow();
});

ipcMain.handle("dialog:chooseDirectory", async () => {
    const result = await dialog.showOpenDialog(
        settingsWindow ?? mainWindow ?? undefined,
        { properties: ["openDirectory"] }
    );
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
});

ipcMain.handle("config:reveal", () => {
    shell.openPath(userDataDir);
});

ipcMain.handle("rename:run", async (event) => {
    const directoryPath = store.get("directoryPath");
    activeRenamePromise = runRenameJob(directoryPath, userDataDir, (entry) =>
        event.sender.send("rename:log", entry)
    );
    try {
        return await activeRenamePromise;
    } finally {
        activeRenamePromise = null;
    }
});

// Read-only, so it doesn't touch activeRenamePromise/the quit guard —
// there's nothing on disk a force-quit could interrupt mid-preview.
ipcMain.handle("rename:preview", async (event) => {
    const directoryPath = store.get("directoryPath");
    return runRenameJob(
        directoryPath,
        userDataDir,
        (entry) => event.sender.send("rename:log", entry),
        true
    );
});

// --- Lifecycle ---

app.whenReady().then(async () => {
    userDataDir = await seedUserData();
    buildMenu();
    createMainWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

// Chromium can occasionally hang for several seconds on quit. This detached
// watchdog guarantees termination regardless of what's stalling — safe
// because electron-store writes synchronously, so nothing async is lost.
let watchdogStarted = false;
let quittingAfterRename = false;

app.on("before-quit", (event) => {
    // If a rename batch is still running, let it finish (up to a ceiling)
    // instead of cutting it off mid-batch — quitting again afterward falls
    // through to the watchdog below as normal.
    if (activeRenamePromise && !quittingAfterRename) {
        event.preventDefault();
        quittingAfterRename = true;
        waitForActiveOperation(activeRenamePromise, 15_000).then(() =>
            app.quit()
        );
        return;
    }

    if (watchdogStarted) return;
    watchdogStarted = true;
    spawn("sh", ["-c", `sleep 2 && kill -9 ${process.pid}`], {
        detached: true,
        stdio: "ignore",
    }).unref();
});
