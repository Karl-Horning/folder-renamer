/**
 * Picks the message shown in the log area's empty-state slot after a run completes.
 * @param {number} renamed - Folders successfully renamed.
 * @param {number} errored - Folders that failed to rename.
 * @returns {string} The message to display.
 */
export function emptyStateMessage(renamed, errored) {
    return renamed === 0 && errored === 0
        ? "Nothing to rename — every folder already matches its target name."
        : "No folders processed yet.";
}

/**
 * Formats a single rename-log entry as the text shown in its log row.
 * @param {{type: "ok" | "error", oldName: string, newName: string, message?: string}} entry - A rename-log entry.
 * @returns {string} The row's display text.
 */
export function formatLogEntry(entry) {
    return entry.type === "ok"
        ? `${entry.oldName} → ${entry.newName}`
        : `${entry.oldName} — ${entry.message}`;
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
