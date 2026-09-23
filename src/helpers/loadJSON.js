import fs from "fs";
import path from "path";

/**
 * Loads and parses a JSON file from a specified path relative to project root.
 *
 * @param {...string} relativePath - Sequence of path segments to the JSON file.
 * @returns {any} Parsed JSON content.
 * @throws {Error} If the file can't be read or doesn't contain valid JSON. Callers decide how to handle that.
 */
export function loadJSON(...relativePath) {
    const fullPath = path.resolve(process.cwd(), ...relativePath);
    try {
        const data = fs.readFileSync(fullPath, "utf8");
        return JSON.parse(data);
    } catch (err) {
        throw new Error(`Failed to load JSON from ${fullPath}: ${err.message}`);
    }
}
