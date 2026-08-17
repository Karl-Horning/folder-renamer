/**
 * Moves image count and date patterns to the end of a folder name string.
 *
 * This function looks for:
 * - An image count in the form of `(x123)`
 * - A date in the ISO format `(YYYY-MM-DD)`
 *
 * If found, it removes them from their current location in the string and
 * appends them to the end in the order: image count, then date.
 *
 * @param {string} name - The original folder name.
 * @returns {string} The modified folder name with count and date at the end.
 */
function moveImageCountAndDate(name) {
    const countMatch = name.match(/\(x\d{2,5}\)/);
    const dateMatch = name.match(/\(\d{4}-\d{2}-\d{2}\)/);

    // Remove matched substrings from their original location
    if (countMatch?.[0]) {
        name = name.replace(countMatch[0], "").trim();
    }
    if (dateMatch?.[0]) {
        name = name.replace(dateMatch[0], "").trim();
    }

    // Append to the end if found
    const tagsToAppend = [];
    if (countMatch?.[0]) tagsToAppend.push(countMatch[0]);
    if (dateMatch?.[0]) tagsToAppend.push(dateMatch[0]);

    if (tagsToAppend.length) {
        name = `${name} ${tagsToAppend.join(" ")}`.trim();
    }

    return name;
}

/**
 * Cleans up extra commas, double spaces, and trailing punctuation.
 *
 * @param {string} name - Folder name string to clean.
 * @returns {string} Cleaned string with tidy punctuation.
 */
function cleanupPunctuation(name) {
    return (
        name
            // Replace multiple commas or comma-space combinations with a single comma
            .replace(/(,\s*){2,}/g, ", ")
            // Remove trailing comma before metadata like (x238) or (2020-01-01)
            .replace(/,\s*(\(\w.*?\))/g, " $1")
            // Remove trailing commas or spaces
            .replace(/,\s*$/, "")
            .replace(/\s{2,}/g, " ") // Collapse multiple spaces
            .trim()
    );
}

/**
 * Moves any specified prefix found at the start of the folder name
 * to the end of the name inside square brackets.
 *
 * For example:
 * 'MyPhotos, Holidays, Holiday snaps' → 'Holidays, Holiday snaps [MyPhotos]'
 * 'FamilyPhotos Holidays, Holiday snaps' → 'Holidays, Holiday snaps [FamilyPhotos]'
 *
 * @param {string} name - The original folder name.
 * @param {string[]} prefixes - Array of prefix names to detect and move.
 * @returns {string} The modified folder name with prefix moved to the end.
 */
function movePrefixesToEnd(name, prefixes) {
    for (const prefix of prefixes) {
        // Build a regex to match prefix at start, optionally followed by comma or whitespace
        const regex = new RegExp(`^${prefix}(?:,\\s*|\\s+)`, "i");
        if (regex.test(name)) {
            name = name.replace(regex, "").trim();
            // Append prefix in square brackets to the end
            return `${name} [${prefix}]`;
        }
    }
    return name;
}

export { moveImageCountAndDate, cleanupPunctuation, movePrefixesToEnd };
