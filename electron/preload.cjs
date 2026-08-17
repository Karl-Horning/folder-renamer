const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    getSettings: () => ipcRenderer.invoke("settings:get"),
    saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
    openSettings: () => ipcRenderer.invoke("settings:open"),
    chooseDirectory: () => ipcRenderer.invoke("dialog:chooseDirectory"),
    revealConfigFolder: () => ipcRenderer.invoke("config:reveal"),
    runRename: () => ipcRenderer.invoke("rename:run"),

    onRenameLog: (callback) => {
        const listener = (_event, entry) => callback(entry);
        ipcRenderer.on("rename:log", listener);
        return () => ipcRenderer.removeListener("rename:log", listener);
    },

    onSettingsChanged: (callback) => {
        const listener = (_event, settings) => callback(settings);
        ipcRenderer.on("settings:changed", listener);
        return () => ipcRenderer.removeListener("settings:changed", listener);
    },
});
