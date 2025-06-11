import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { validateEnv } from "./helpers/validateEnv.js";
import { loadJSON } from "./helpers/loadJSON.js";
import { transformName } from "./helpers/transformName.js";

// Load environment variables from .env file
dotenv.config();

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main entry point for renaming folders based on configured patterns and rules.
 */
async function main() {
    // Validate that required environment variables are set
    validateEnv(["DIRECTORY_PATH"]);

    // Resolve necessary paths
    const directoryPath = process.env.DIRECTORY_PATH;
    const prefixesPath = path.join(__dirname, "data", "prefixes.json");

    // Load prefixes list
    const prefixesToMove = await loadJSON(prefixesPath);

    try {
        // Read the contents of the target directory
        const entries = await fs.readdir(directoryPath, {
            withFileTypes: true,
        });

        for (const entry of entries) {
            // Only rename directories
            if (!entry.isDirectory()) continue;

            const oldName = entry.name;
            const newName = transformName(oldName, prefixesToMove);

            // If the name has changed, rename the directory
            if (newName !== oldName) {
                const oldPath = path.join(directoryPath, oldName);
                const newPath = path.join(directoryPath, newName);

                try {
                    await fs.rename(oldPath, newPath);
                    console.log(`Renamed: '${oldName}' → '${newName}'`);
                } catch (renameErr) {
                    console.error(
                        `Error renaming '${oldName}' to '${newName}':`,
                        renameErr
                    );
                }
            }
        }
    } catch (err) {
        console.error("Failed to process directory:", err);
    }
}

// Run the script
main();
