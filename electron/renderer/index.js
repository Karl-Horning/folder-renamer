import {
    emptyStateMessage,
    formatLogEntry,
    formatPreviewTotals,
    formatTotals,
    previewEmptyStateMessage,
} from "./logic.js";

const pathDisplay = document.getElementById("path-display");
const previewBtn = document.getElementById("preview-btn");
const runBtn = document.getElementById("run-btn");
const settingsBtn = document.getElementById("settings-btn");
const logTable = document.getElementById("log-table");
const emptyState = document.getElementById("empty-state");
const totalsEl = document.getElementById("totals");

let directoryPath = "";
let isPreviewMode = false;

function render() {
    if (directoryPath) {
        pathDisplay.textContent = directoryPath;
        pathDisplay.classList.remove("empty");
        previewBtn.disabled = false;
        runBtn.disabled = false;
    } else {
        pathDisplay.textContent =
            "No folder selected — open Settings to choose one.";
        pathDisplay.classList.add("empty");
        previewBtn.disabled = true;
        runBtn.disabled = true;
    }
}

function clearLog() {
    logTable
        .querySelectorAll(".log-row:not(.head)")
        .forEach((row) => row.remove());
}

function addLogRow(entry) {
    emptyState.style.display = "none";

    const row = document.createElement("div");
    row.className = `log-row ${entry.type === "ok" ? "ok" : "err"}${
        isPreviewMode ? " preview" : ""
    }`;

    const item = document.createElement("span");
    item.textContent = formatLogEntry(entry);

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = isPreviewMode
        ? "PREVIEW"
        : entry.type === "ok"
          ? "OK"
          : "ERR";

    row.append(item, chip);
    logTable.appendChild(row);
}

previewBtn.addEventListener("click", async () => {
    isPreviewMode = true;
    previewBtn.disabled = true;
    runBtn.disabled = true;
    previewBtn.textContent = "Previewing…";
    clearLog();
    emptyState.textContent = "Previewing…";
    emptyState.style.display = "";
    totalsEl.textContent = "";

    try {
        const { renamed } = await window.api.previewRename();
        emptyState.textContent = previewEmptyStateMessage(renamed);
        totalsEl.textContent = formatPreviewTotals(renamed);
    } catch (err) {
        emptyState.textContent = "No preview yet.";
        totalsEl.textContent = `Failed: ${err.message}`;
    } finally {
        previewBtn.disabled = !directoryPath;
        runBtn.disabled = !directoryPath;
        previewBtn.textContent = "Preview";
    }
});

runBtn.addEventListener("click", async () => {
    const confirmed = window.confirm(
        `This will rename folders in ${directoryPath}. Continue?`
    );
    if (!confirmed) return;

    isPreviewMode = false;
    runBtn.disabled = true;
    previewBtn.disabled = true;
    runBtn.textContent = "Processing…";
    clearLog();
    emptyState.textContent = "Processing…";
    emptyState.style.display = "";
    totalsEl.textContent = "";

    try {
        const { renamed, errored } = await window.api.runRename();
        emptyState.textContent = emptyStateMessage(renamed, errored);
        totalsEl.textContent = formatTotals(renamed, errored);
    } catch (err) {
        emptyState.textContent = "No folders processed yet.";
        totalsEl.textContent = `Failed: ${err.message}`;
    } finally {
        runBtn.disabled = !directoryPath;
        previewBtn.disabled = !directoryPath;
        runBtn.textContent = "Process Batch";
    }
});

settingsBtn.addEventListener("click", () => {
    window.api.openSettings();
});

window.api.onRenameLog(addLogRow);
window.api.onSettingsChanged((settings) => {
    directoryPath = settings.directoryPath;
    render();
});

window.api.getSettings().then((settings) => {
    directoryPath = settings.directoryPath;
    render();
});
