import { normaliseDates } from "./dates.js";
import {
    moveImageCountAndDate,
    cleanupPunctuation,
    movePrefixesToEnd,
} from "./text.js";
import { applyReplacePatterns } from "./replacePatterns.js";

/**
 * Transforms a directory name by applying:
 *  - text cleanup using configured replacements
 *  - image count normalisation
 *  - date normalisation
 *  - prefix relocation
 *  - punctuation cleanup
 *
 * @param {string} name - Original directory name.
 * @param {string[]} prefixesToMove - Prefixes to move to the end.
 * @returns {string} Transformed directory name.
 */
export function transformName(name, prefixesToMove) {
    let newName = applyReplacePatterns(name);

    // 🔄 Normalise image count patterns like "123 pics" or "x456" → (x123)
    newName = newName.replace(
        /\b(\d{2,5})(?: ?(pics?|pictures?|photos?|images?)|[xX])\b|\b[xX](\d{2,5})\b/gi,
        (_, num1, _group2, num2) => `(x${num1 || num2})`
    );

    newName = normaliseDates(newName);
    newName = moveImageCountAndDate(newName);
    newName = cleanupPunctuation(newName);
    newName = movePrefixesToEnd(newName, prefixesToMove);

    // Remove stray empty brackets like () and []
    newName = newName.replace(/\(\s*\)/g, "");
    newName = newName.replace(/\[\s*\]/g, "");

    // Collapse multiple spaces into one
    newName = newName.replace(/\s{2,}/g, " ").trim();

    return newName;
}
