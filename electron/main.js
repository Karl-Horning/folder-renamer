import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import Store from "electron-store";

import { loadJSON } from "../src/helpers/loadJSON.js";
import { initReplacePatterns } from "../src/helpers/replacePatterns.js";
import { renameFolders } from "../src/renameFolders.js";

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

/**
 * Copies the bundled default pattern/prefix files into userData on first run, so future
 * app updates never overwrite the user's real, evolving pattern list — only the seed copy.
 * @returns {Promise<string>} The resolved userData data directory.
 */
async function seedUserData() {
    const dataDir = path.join(app.getPath("userData"), "data");

    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
        await Promise.all(
            PATTERN_FILES.map((file) =>
                fs.copyFile(
                    path.join(BUNDLED_DATA_DIR, file),
                    path.join(dataDir, file)
                )
            )
        );
    }

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
                    click: () => shell.openPath(userDataDir),
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

const FRIENDLY_RENAME_ERRORS = {
    EEXIST: "A folder with that name already exists.",
    ENOTEMPTY: "A folder with that name already exists.",
    ENOTDIR: "A file with that name already exists.",
    EACCES: "Permission denied.",
    EPERM: "Permission denied.",
};

/**
 * Turns a raw fs.rename error into a short, human-readable reason — Node's
 * default message repeats both full file paths, which is unreadable in a log row.
 * @param {NodeJS.ErrnoException} err - The error thrown by fs.rename.
 * @returns {string} A short, human-readable reason.
 */
function describeRenameError(err) {
    return FRIENDLY_RENAME_ERRORS[err.code] ?? err.code ?? err.message;
}

ipcMain.handle("rename:run", async (event) => {
    const directoryPath = store.get("directoryPath");
    if (!directoryPath) {
        throw new Error("No folder is set. Open Settings and choose one.");
    }

    const prefixesToMove = await loadJSON(
        path.join(userDataDir, "prefixes.json")
    );
    initReplacePatterns(userDataDir);

    let renamed = 0;
    let errored = 0;

    await renameFolders(directoryPath, prefixesToMove, {
        onRename: (oldName, newName) => {
            renamed += 1;
            event.sender.send("rename:log", { type: "ok", oldName, newName });
        },
        onError: (oldName, newName, err) => {
            errored += 1;
            event.sender.send("rename:log", {
                type: "error",
                oldName,
                newName,
                message: describeRenameError(err),
            });
        },
    });

    return { renamed, errored };
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
