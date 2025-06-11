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
 * Applies replace patterns to a folder name string.
 * @param {string} name - The original folder name.
 * @returns {string} The transformed name.
 */
function applyReplacePatterns(name) {
    for (const { text, replacement } of replacePatterns) {
        // Escape special regex characters in the text string
        const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        name = name.replace(new RegExp(escapedText, "g"), replacement);
    }
    return name.trim();
}

export { applyReplacePatterns };
