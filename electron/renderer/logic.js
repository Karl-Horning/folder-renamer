/**
 * Message shown when a run or preview found nothing to do because no rename
 * rules are configured at all, rather than because folders are already clean.
 */
export const NO_RULES_CONFIGURED_MESSAGE =
    "No rename rules configured yet — open Reveal Config Folder from the menu to add some.";

/**
 * Picks the message shown in the log area's empty-state slot after a run completes.
 * @param {number} renamed - Folders successfully renamed.
 * @param {number} errored - Folders that failed to rename.
 * @param {boolean} [hasConfig] - Whether any rename rules (prefixes or patterns) are configured.
 * @returns {string} The message to display.
 */
export function emptyStateMessage(renamed, errored, hasConfig = true) {
    if (renamed !== 0 || errored !== 0) return "No folders processed yet.";
    return hasConfig
        ? "Nothing to rename — every folder already matches its target name."
        : NO_RULES_CONFIGURED_MESSAGE;
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

/**
 * Picks the message shown in the log area's empty-state slot after a preview completes.
 * @param {number} count - Folders that would be renamed.
 * @param {boolean} [hasConfig] - Whether any rename rules (prefixes or patterns) are configured.
 * @returns {string} The message to display.
 */
export function previewEmptyStateMessage(count, hasConfig = true) {
    if (count !== 0) return "No preview yet.";
    return hasConfig
        ? "Nothing would change — every folder already matches its target name."
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
