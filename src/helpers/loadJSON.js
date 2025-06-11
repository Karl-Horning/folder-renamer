import fs from "fs";
import path from "path";

/**
 * Loads and parses a JSON file from a specified path relative to project root.
 *
 * @param {...string} relativePath - Sequence of path segments to the JSON file.
 * @returns {any} Parsed JSON content.
 */
export function loadJSON(...relativePath) {
    const fullPath = path.resolve(process.cwd(), ...relativePath);
    try {
        const data = fs.readFileSync(fullPath, "utf8");
        return JSON.parse(data);
    } catch (err) {
        console.error(`Failed to load JSON from ${fullPath}:`, err);
        process.exit(1);
    }
}
