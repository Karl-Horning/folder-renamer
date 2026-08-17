import { emptyStateMessage, formatLogEntry, formatTotals } from "./logic.js";

const pathDisplay = document.getElementById("path-display");
const runBtn = document.getElementById("run-btn");
const settingsBtn = document.getElementById("settings-btn");
const logTable = document.getElementById("log-table");
const emptyState = document.getElementById("empty-state");
const totalsEl = document.getElementById("totals");

let directoryPath = "";

function render() {
    if (directoryPath) {
        pathDisplay.textContent = directoryPath;
        pathDisplay.classList.remove("empty");
        runBtn.disabled = false;
    } else {
        pathDisplay.textContent =
            "No folder selected — open Settings to choose one.";
        pathDisplay.classList.add("empty");
        runBtn.disabled = true;
    }
}

function addLogRow(entry) {
    emptyState.style.display = "none";

    const row = document.createElement("div");
    row.className = `log-row ${entry.type === "ok" ? "ok" : "err"}`;

    const item = document.createElement("span");
    item.textContent = formatLogEntry(entry);

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = entry.type === "ok" ? "OK" : "ERR";

    row.append(item, chip);
    logTable.appendChild(row);
}

runBtn.addEventListener("click", async () => {
    const confirmed = window.confirm(
        `This will rename folders in ${directoryPath}. Continue?`
    );
    if (!confirmed) return;

    runBtn.disabled = true;
    runBtn.textContent = "Processing…";
    logTable.querySelectorAll(".log-row:not(.head)").forEach((row) =>
        row.remove()
    );
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
