import {
    cleanIpcError,
    emptyStateMessage,
    formatLogEntry,
    formatPreviewTotals,
    formatTotals,
    previewEmptyStateMessage,
} from "./logic.js";

const pathDisplay = document.getElementById("path-display");
const previewBtn = document.getElementById("preview-btn");
const runBtn = document.getElementById("run-btn");
const chooseBtn = document.getElementById("choose-btn");
const configBtn = document.getElementById("config-btn");
const pathHint = document.getElementById("path-hint");
const logTable = document.getElementById("log-table");
const emptyState = document.getElementById("empty-state");
const totalsEl = document.getElementById("totals");

let directoryPath = "";
let isPreviewMode = false;
let isBusy = false;

function render() {
    if (directoryPath) {
        const text = document.createElement("span");
        text.className = "path-text";
        text.textContent = directoryPath;
        pathDisplay.replaceChildren(text);
        pathDisplay.title = directoryPath;
        pathDisplay.classList.remove("empty");
    } else {
        pathDisplay.textContent =
            "No folder selected — choose or drop one.";
        pathDisplay.removeAttribute("title");
        pathDisplay.classList.add("empty");
    }
    previewBtn.disabled = isBusy || !directoryPath;
    runBtn.disabled = isBusy || !directoryPath;
    chooseBtn.disabled = isBusy;
    window.api.setMenuState({
        canChoose: !isBusy,
        canRun: !isBusy && Boolean(directoryPath),
    });
}

function setBusy(value) {
    isBusy = value;
    render();
}

function showPathHint(message) {
    pathHint.textContent = message;
    pathHint.hidden = false;
}

function hidePathHint() {
    pathHint.hidden = true;
    pathHint.textContent = "";
}

/**
 * Saves a chosen or dropped folder as the origin and clears the previous folder's results.
 * @param {string} candidate - The folder path to save.
 */
async function applyDirectory(candidate) {
    try {
        const saved = await window.api.saveSettings({
            directoryPath: candidate,
        });
        directoryPath = saved.directoryPath;
        hidePathHint();
        clearLog();
        emptyState.textContent = "No folders processed yet.";
        emptyState.style.display = "";
        totalsEl.textContent = "";
        render();
    } catch (err) {
        showPathHint(cleanIpcError(err.message));
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
    setBusy(true);
    previewBtn.textContent = "Previewing…";
    clearLog();
    emptyState.textContent = "Previewing…";
    emptyState.style.display = "";
    totalsEl.textContent = "";

    try {
        const { renamed, hasConfig } = await window.api.previewRename();
        emptyState.textContent = previewEmptyStateMessage(renamed, hasConfig);
        totalsEl.textContent = formatPreviewTotals(renamed);
    } catch (err) {
        emptyState.textContent = "No preview yet.";
        totalsEl.textContent = `Failed: ${err.message}`;
    } finally {
        setBusy(false);
        previewBtn.textContent = "Preview";
    }
});

runBtn.addEventListener("click", async () => {
    const confirmed = window.confirm(
        `This will rename folders in ${directoryPath}. Continue?`
    );
    if (!confirmed) return;

    isPreviewMode = false;
    setBusy(true);
    runBtn.textContent = "Processing…";
    clearLog();
    emptyState.textContent = "Processing…";
    emptyState.style.display = "";
    totalsEl.textContent = "";

    try {
        const { renamed, errored, hasConfig } = await window.api.runRename();
        emptyState.textContent = emptyStateMessage(renamed, errored, hasConfig);
        totalsEl.textContent = formatTotals(renamed, errored);
    } catch (err) {
        emptyState.textContent = "No folders processed yet.";
        totalsEl.textContent = `Failed: ${err.message}`;
    } finally {
        setBusy(false);
        runBtn.textContent = "Process Batch";
    }
});

chooseBtn.addEventListener("click", async () => {
    const chosen = await window.api.chooseDirectory();
    if (chosen) await applyDirectory(chosen);
});

configBtn.addEventListener("click", () => {
    window.api.revealConfigFolder();
});

// Stops a drop outside the path display from navigating the window to the dropped file.
document.addEventListener("dragover", (event) => event.preventDefault());
document.addEventListener("drop", (event) => event.preventDefault());

pathDisplay.addEventListener("dragover", () => {
    if (!isBusy) pathDisplay.classList.add("drag-over");
});

pathDisplay.addEventListener("dragleave", () => {
    pathDisplay.classList.remove("drag-over");
});

pathDisplay.addEventListener("drop", (event) => {
    pathDisplay.classList.remove("drag-over");
    if (isBusy) return;

    const entry = event.dataTransfer.items[0]?.webkitGetAsEntry?.();
    if (!entry?.isDirectory) {
        showPathHint("Drop a folder, not a file.");
        return;
    }
    applyDirectory(window.api.getPathForFile(event.dataTransfer.files[0]));
});

window.api.onRenameLog(addLogRow);
window.api.onMenuChoose(() => chooseBtn.click());
// Trigger the real buttons rather than duplicating their logic — this keeps
// the disabled-state guard and confirm dialog working identically whether
// the action comes from a click or the menu/keyboard shortcut.
window.api.onMenuPreview(() => previewBtn.click());
window.api.onMenuRun(() => runBtn.click());

window.api.getSettings().then((settings) => {
    directoryPath = settings.directoryPath;
    render();
});
