const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("api", {
    getSettings: () => ipcRenderer.invoke("settings:get"),
    saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
    chooseDirectory: () => ipcRenderer.invoke("dialog:chooseDirectory"),
    getPathForFile: (file) => webUtils.getPathForFile(file),
    revealConfigFolder: () => ipcRenderer.invoke("config:reveal"),
    runRename: () => ipcRenderer.invoke("rename:run"),
    previewRename: () => ipcRenderer.invoke("rename:preview"),

    onRenameLog: (callback) => {
        const listener = (_event, entry) => callback(entry);
        ipcRenderer.on("rename:log", listener);
        return () => ipcRenderer.removeListener("rename:log", listener);
    },

    onMenuChoose: (callback) => {
        const listener = () => callback();
        ipcRenderer.on("menu:choose", listener);
        return () => ipcRenderer.removeListener("menu:choose", listener);
    },

    onMenuPreview: (callback) => {
        const listener = () => callback();
        ipcRenderer.on("menu:preview", listener);
        return () => ipcRenderer.removeListener("menu:preview", listener);
    },

    onMenuRun: (callback) => {
        const listener = () => callback();
        ipcRenderer.on("menu:run", listener);
        return () => ipcRenderer.removeListener("menu:run", listener);
    },
});
