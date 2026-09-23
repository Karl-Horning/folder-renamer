/**
 * Message shown when a run or preview found nothing to do because no rename
 * rules are configured at all, rather than because folders are already clean.
 */
export const NO_RULES_CONFIGURED_MESSAGE =
    "No rename rules configured yet. Click Reveal Config Folder to add some.";

/** Message shown in the log area before anything has been processed. */
export const NO_RESULTS_MESSAGE = "No folders processed yet.";

/** Message shown while the app waits for a running batch to finish before quitting. */
export const QUIT_WAITING_MESSAGE = "Finishing this batch, then quitting…";

/**
 * Picks the message shown in the log area's empty-state slot after a run completes.
 * @param {number} renamed - Folders successfully renamed.
 * @param {number} errored - Folders that failed to rename.
 * @param {boolean} [hasConfig] - Whether any rename rules (prefixes or patterns) are configured.
 * @returns {string} The message to display, or an empty string when the log has rows.
 */
export function emptyStateMessage(renamed, errored, hasConfig = true) {
    if (renamed !== 0 || errored !== 0) return "";
    return hasConfig
        ? "Nothing to rename. Every folder already matches its target name."
        : NO_RULES_CONFIGURED_MESSAGE;
}

/**
 * Splits a rename-log entry into the two lines shown in its log row.
 * @param {{type: "ok" | "error", oldName: string, newName: string, message?: string}} entry - A rename-log entry.
 * @returns {{before: string, relation: string, after: string}} The old name, a word linking the two lines for screen readers, and the new name or error message.
 */
export function formatLogEntry(entry) {
    return entry.type === "ok"
        ? { before: entry.oldName, relation: "becomes", after: entry.newName }
        : { before: entry.oldName, relation: "failed:", after: entry.message };
}

/**
 * Formats the totals line shown after a run completes.
 * @param {number} renamed - Folders successfully renamed.
 * @param {number} errored - Folders that failed to rename.
 * @returns {string} The totals line's display text.
 */
export function formatTotals(renamed, errored) {
    return `Items ${renamed + errored} · OK ${renamed} · Err ${errored}`;
}

/**
 * Picks the message shown in the log area's empty-state slot after a preview completes.
 * @param {number} count - Folders that would be renamed.
 * @param {boolean} [hasConfig] - Whether any rename rules (prefixes or patterns) are configured.
 * @returns {string} The message to display, or an empty string when the log has rows.
 */
export function previewEmptyStateMessage(count, hasConfig = true) {
    if (count !== 0) return "";
    return hasConfig
        ? "Nothing would change. Every folder already matches its target name."
        : NO_RULES_CONFIGURED_MESSAGE;
}

/**
 * Formats the totals line shown after a preview completes. Preview never predicts
 * errors, so there's no error count to show alongside it.
 * @param {number} count - Folders that would be renamed.
 * @returns {string} The totals line's display text.
 */
export function formatPreviewTotals(count) {
    return `Would rename ${count} folder${count === 1 ? "" : "s"}`;
}

/**
 * Strips Electron's remote-method wrapper from an IPC error message.
 * @param {string} message - The error message as received in the renderer.
 * @returns {string} The message without the IPC wrapper.
 */
export function cleanIpcError(message) {
    return message.replace(/^Error invoking remote method '[^']*': (Error: )?/, "");
}

/**
 * Formats the running count shown while a batch or preview is in progress.
 * @param {string} label - The activity, for example "Processing…".
 * @param {number} count - Log rows received so far.
 * @returns {string} The status text.
 */
export function formatProgress(label, count) {
    return count === 0 ? label : `${label} ${count} so far`;
}
