import {
    NO_RESULTS_MESSAGE,
    QUIT_WAITING_MESSAGE,
    cleanIpcError,
    emptyStateMessage,
    formatLogEntry,
    formatPreviewTotals,
    formatProgress,
    formatTotals,
    previewEmptyStateMessage,
} from "./logic.js";

const pathDisplay = document.getElementById("path-display");
const previewBtn = document.getElementById("preview-btn");
const runBtn = document.getElementById("run-btn");
const chooseBtn = document.getElementById("choose-btn");
const configBtn = document.getElementById("config-btn");
const pathHint = document.getElementById("path-hint");
const runError = document.getElementById("run-error");
const logTable = document.getElementById("log-table");
const logRows = document.getElementById("log-rows");
const emptyState = document.getElementById("empty-state");
const totalsEl = document.getElementById("totals");
const announcer = document.getElementById("announcer");

let directoryPath = "";
let isPreviewMode = false;
let isBusy = false;
let isQuitting = false;
let progressLabel = "";
let rowCount = 0;

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
            "No folder selected. Choose or drop one.";
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
        hideRunError();
        showEmptyState(NO_RESULTS_MESSAGE);
        totalsEl.textContent = "";
        render();
    } catch (err) {
        showPathHint(cleanIpcError(err.message));
    }
}

function showRunError(message) {
    runError.textContent = message;
    runError.hidden = false;
}

function hideRunError() {
    runError.hidden = true;
    runError.textContent = "";
}

/**
 * Shows a message in the log area when there are no rows, and hides the slot when there are.
 * @param {string} message - The message to show, or an empty string to hide the slot.
 */
function showEmptyState(message) {
    emptyState.textContent = message;
    emptyState.style.display = message ? "" : "none";
}

/**
 * Sets the text announced to screen readers, clearing it first so a repeated message is read again.
 * @param {string} message - The text to announce.
 */
function announce(message) {
    announcer.textContent = "";
    setTimeout(() => {
        announcer.textContent = message;
    }, 50);
}

function clearLog() {
    logRows
        .querySelectorAll(".log-row:not(.head)")
        .forEach((row) => row.remove());
}

function addLogRow(entry) {
    emptyState.style.display = "none";

    const row = document.createElement("div");
    row.className = `log-row ${entry.type === "ok" ? "ok" : "err"}${
        isPreviewMode ? " preview" : ""
    }`;
    row.setAttribute("role", "row");

    const { before, relation, after } = formatLogEntry(entry);

    const beforeEl = document.createElement("span");
    beforeEl.className = "before";
    beforeEl.textContent = before;

    const relationEl = document.createElement("span");
    relationEl.className = "visually-hidden";
    relationEl.textContent = relation;

    const afterEl = document.createElement("span");
    afterEl.className = "after";
    afterEl.textContent = after;

    const item = document.createElement("span");
    item.className = "names";
    item.setAttribute("role", "cell");
    item.append(beforeEl, relationEl, afterEl);

    const chip = document.createElement("span");
    chip.className = "chip";
    chip.setAttribute("role", "cell");
    chip.textContent = isPreviewMode
        ? "PREVIEW"
        : entry.type === "ok"
          ? "OK"
          : "ERR";

    row.append(item, chip);
    logRows.appendChild(row);
    logTable.scrollTop = logTable.scrollHeight;

    rowCount += 1;
    if (isBusy && !isQuitting) {
        totalsEl.textContent = formatProgress(progressLabel, rowCount);
    }
}

/**
 * Runs a preview or a batch, keeping the buttons, log and status line in step.
 * @param {object} job - What to run.
 * @param {HTMLButtonElement} job.button - The button that started the job.
 * @param {string} job.idleLabel - The button's label when nothing is running.
 * @param {string} job.busyLabel - The button's label, and the status text, while running.
 * @param {boolean} job.isPreview - Whether the job only previews the renames.
 * @param {() => Promise<object>} job.start - Starts the job in the main process.
 * @param {(result: object) => {message: string, totals: string}} job.summarise - Builds the empty-state message and totals line from the result.
 */
async function runJob({ button, idleLabel, busyLabel, isPreview, start, summarise }) {
    isPreviewMode = isPreview;
    progressLabel = busyLabel;
    rowCount = 0;
    setBusy(true);
    button.textContent = busyLabel;
    clearLog();
    hideRunError();
    showEmptyState("");
    totalsEl.textContent = busyLabel;

    try {
        const { message, totals } = summarise(await start());
        showEmptyState(message);
        totalsEl.textContent = totals;
        announce(message || totals);
    } catch (err) {
        showRunError(cleanIpcError(err.message));
        totalsEl.textContent = "";
    } finally {
        setBusy(false);
        button.textContent = idleLabel;
    }
}

previewBtn.addEventListener("click", () =>
    runJob({
        button: previewBtn,
        idleLabel: "Preview",
        busyLabel: "Previewing…",
        isPreview: true,
        start: () => window.api.previewRename(),
        summarise: ({ renamed, hasConfig }) => ({
            message: previewEmptyStateMessage(renamed, hasConfig),
            totals: formatPreviewTotals(renamed),
        }),
    })
);

runBtn.addEventListener("click", async () => {
    if (!(await window.api.confirmRun())) return;

    await runJob({
        button: runBtn,
        idleLabel: "Process Batch",
        busyLabel: "Processing…",
        isPreview: false,
        start: () => window.api.runRename(),
        summarise: ({ renamed, errored, hasConfig }) => ({
            message: emptyStateMessage(renamed, errored, hasConfig),
            totals: formatTotals(renamed, errored),
        }),
    });
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
window.api.onQuitWaiting(() => {
    isQuitting = true;
    totalsEl.textContent = QUIT_WAITING_MESSAGE;
});
window.api.onMenuChoose(() => chooseBtn.click());
// Menu actions click the buttons, so the disabled state and confirm dialog apply the same way as for a click.
window.api.onMenuPreview(() => previewBtn.click());
window.api.onMenuRun(() => runBtn.click());

window.api.getSettings().then((settings) => {
    directoryPath = settings.directoryPath;
    render();
});
