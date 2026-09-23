import fs from "fs/promises";

/**
 * Confirms a path from the renderer is an existing directory.
 * @param {unknown} directoryPath - The candidate path.
 * @returns {Promise<string>} The same path, once confirmed to be a directory.
 * @throws {Error} With a user-readable message if the path is not a usable directory.
 */
export async function assertDirectory(directoryPath) {
    if (typeof directoryPath !== "string" || directoryPath.trim() === "") {
        throw new Error("No folder was provided.");
    }

    let stats;
    try {
        stats = await fs.stat(directoryPath);
    } catch {
        throw new Error("That folder doesn't exist or can't be read.");
    }

    if (!stats.isDirectory()) {
        throw new Error("That is a file, not a folder.");
    }

    return directoryPath;
}
