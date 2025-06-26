import fs from "fs";
import path from "path";

/**
 * Loads and parses the replace patterns from JSON.
 * @returns {Array<{text: string, replacement: string}>}
 */
function loadReplacePatterns() {
    const patternsPath = path.resolve(
        process.cwd(),
        "src",
        "data",
        "replacePatterns.json"
    );
    const raw = fs.readFileSync(patternsPath, "utf8");
    return JSON.parse(raw);
}

const replacePatterns = loadReplacePatterns();

/**
 * Applies a set of replace patterns to a folder name string.
 *
 * The function processes an array of replacement rules, where each rule can specify
 * either a literal string to match or a regular expression pattern. If the `isRegex`
 * flag is set to `true`, the `text` is treated as a regular expression pattern and
 * compiled accordingly. Otherwise, it is escaped to match literally.
 *
 * Example replacements:
 * - Remove resolution indicators like "800x600", "1024x768px", "-1280x720", etc.
 * - Strip single-dimension markers like "4800px"
 *
 * @param {string} name - The original folder name to transform.
 * @returns {string} The transformed folder name after applying all replace patterns.
 */
function applyReplacePatterns(name) {
    for (const { text, replacement, isRegex } of replacePatterns) {
        // Create a RegExp from the text: use as-is if isRegex is true,
        // otherwise escape special characters for a literal match.
        const pattern = isRegex
            ? new RegExp(text, "g")
            : new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");

        // Apply the replacement globally to the name string.
        name = name.replace(pattern, replacement);
    }

    // Trim any leading/trailing whitespace and return the result.
    return name.trim();
}

export { applyReplacePatterns };
