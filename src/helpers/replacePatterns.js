import fs from "fs";
import path from "path";

let allPatterns = [];

/**
 * Loads and parses a single pattern list file from a data directory.
 * @param {string} dataDir - Directory containing the pattern JSON files.
 * @param {string} filename - Name of the JSON file to load.
 * @returns {Array<{text: string, replacement?: string, isRegex?: boolean, caseInsensitive?: boolean}>}
 * @throws {Error} If the file can't be read or doesn't contain valid JSON.
 */
function loadPatternsFile(dataDir, filename) {
    const filePath = path.join(dataDir, filename);
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (err) {
        throw new Error(
            `Failed to load ${filename} from ${dataDir}: ${err.message}`
        );
    }
}

/**
 * Loads the remove/replace patterns from a data directory, ready for applyReplacePatterns to use.
 * Must be called once (per data directory) before applyReplacePatterns is called — the CLI and the
 * Electron app each resolve their own data directory and call this at startup.
 * @param {string} dataDir - Directory containing `removePatterns.json` and `replacePatterns.json`.
 */
export function initReplacePatterns(dataDir) {
    // Patterns that strip a match entirely — no "replacement" field needed,
    // since removal is always to an empty string.
    const removePatterns = loadPatternsFile(dataDir, "removePatterns.json").map(
        (pattern) => ({ ...pattern, replacement: "" })
    );

    // Patterns that substitute a match with different text (for example, separators,
    // capitalisation, domain suffixes).
    const replacePatterns = loadPatternsFile(dataDir, "replacePatterns.json");

    // Replacements run first so patterns like "&amp;" → "&" match before the
    // generic ";" removal below would otherwise strip the trailing semicolon.
    allPatterns = [...replacePatterns, ...removePatterns];
}

/**
 * Applies the loaded remove/replace patterns to a folder name string.
 *
 * The function processes an array of replacement rules, where each rule can specify
 * either a literal string to match or a regular expression pattern. If the `isRegex`
 * flag is set to `true`, the `text` is treated as a regular expression pattern and
 * compiled accordingly. Otherwise, it is escaped to match literally. Rules with
 * `caseInsensitive: true` match regardless of case, so casing variants of the same
 * pattern don't need separate entries.
 *
 * Example replacements:
 * - Remove resolution indicators like "800x600", "1024x768px", "-1280x720", etc.
 * - Strip single-dimension markers like "4800px"
 *
 * @param {string} name - The original folder name to transform.
 * @returns {string} The transformed folder name after applying all replace patterns.
 */
export function applyReplacePatterns(name) {
    for (const {
        text,
        replacement,
        isRegex,
        caseInsensitive,
    } of allPatterns) {
        const flags = caseInsensitive ? "gi" : "g";

        // Create a RegExp from the text: use as-is if isRegex is true,
        // otherwise escape special characters for a literal match.
        const pattern = isRegex
            ? new RegExp(text, flags)
            : new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);

        name = name.replace(pattern, replacement);
    }

    return name.trim();
}
