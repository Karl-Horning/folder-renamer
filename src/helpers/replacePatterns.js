import fs from "fs";
import path from "path";

/**
 * Loads and parses a pattern list from the data directory.
 * @param {string} filename
 * @returns {Array<{text: string, replacement?: string, isRegex?: boolean, caseInsensitive?: boolean}>}
 */
function loadPatterns(filename) {
    const patternsPath = path.resolve(
        process.cwd(),
        "src",
        "data",
        filename
    );
    const raw = fs.readFileSync(patternsPath, "utf8");
    return JSON.parse(raw);
}

// Patterns that strip a match entirely — no "replacement" field needed,
// since removal is always to an empty string.
const removePatterns = loadPatterns("removePatterns.json").map(
    (pattern) => ({ ...pattern, replacement: "" })
);

// Patterns that substitute a match with different text (e.g. separators,
// capitalisation, domain suffixes).
const replacePatterns = loadPatterns("replacePatterns.json");

// Replacements run first so patterns like "&amp;" → "&" match before the
// generic ";" removal below would otherwise strip the trailing semicolon.
const allPatterns = [...replacePatterns, ...removePatterns];

/**
 * Applies the combined remove/replace patterns to a folder name string.
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
function applyReplacePatterns(name) {
    for (const { text, replacement, isRegex, caseInsensitive } of allPatterns) {
        const flags = caseInsensitive ? "gi" : "g";

        // Create a RegExp from the text: use as-is if isRegex is true,
        // otherwise escape special characters for a literal match.
        const pattern = isRegex
            ? new RegExp(text, flags)
            : new RegExp(
                  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
                  flags
              );

        // Apply the replacement globally to the name string.
        name = name.replace(pattern, replacement);
    }

    // Trim any leading/trailing whitespace and return the result.
    return name.trim();
}

export { applyReplacePatterns };
