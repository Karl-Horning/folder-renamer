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
        throw new Error(`Failed to load ${filename} from ${dataDir}: ${err.message}`);
    }
}

/**
 * Loads the remove/replace patterns from a data directory, ready for applyReplacePatterns to use.
 * Must be called once (per data directory) before applyReplacePatterns is called — the CLI and the
 * Electron app each resolve their own data directory and call this at startup.
 * @param {string} dataDir - Directory containing `removePatterns.json` and `replacePatterns.json`.
 */
export function initReplacePatterns(dataDir) {
    // Patterns that strip a match, so the replacement is always an empty string.
    const removePatterns = loadPatternsFile(dataDir, "removePatterns.json").map((pattern) => ({
        ...pattern,
        replacement: "",
    }));

    // Patterns that replace a match with different text, for example separators, capitalisation and domain suffixes.
    const replacePatterns = loadPatternsFile(dataDir, "replacePatterns.json");

    // Replacements run first, so a pattern like "&amp;" → "&" matches before the ";" removal strips the semicolon.
    allPatterns = [...replacePatterns, ...removePatterns];
}

/**
 * Reports whether initReplacePatterns loaded any remove/replace patterns at all.
 * Distinguishes "ran and found nothing to change" from "no rules configured yet".
 * @returns {boolean} True if at least one remove or replace pattern is loaded.
 */
export function hasAnyPatterns() {
    return allPatterns.length > 0;
}

/**
 * Applies the loaded remove/replace patterns to a folder name string.
 *
 * Each rule matches a literal string, or a regular expression when `isRegex` is `true`.
 * Rules with `caseInsensitive: true` match regardless of case, so casing variants don't need separate entries.
 *
 * Example replacements:
 * - Remove resolution indicators like "800x600", "1024x768px" and "-1280x720"
 * - Strip single-dimension markers like "4800px"
 *
 * @param {string} name - The original folder name to transform.
 * @returns {string} The transformed folder name after applying all replace patterns.
 */
export function applyReplacePatterns(name) {
    for (const { text, replacement, isRegex, caseInsensitive } of allPatterns) {
        const flags = caseInsensitive ? "gi" : "g";

        // Builds a RegExp from the text, as-is if isRegex is true and otherwise with special characters escaped.
        const pattern = isRegex
            ? new RegExp(text, flags)
            : new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);

        name = name.replace(pattern, replacement);
    }

    return name.trim();
}
