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
 * @returns {string} - The modified folder name with count and date at the end.
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

export { moveImageCountAndDate };
