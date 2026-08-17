import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { validateEnv } from "./helpers/validateEnv.js";
import { loadJSON } from "./helpers/loadJSON.js";
import { initReplacePatterns } from "./helpers/replacePatterns.js";
import { renameFolders } from "./renameFolders.js";

// Load environment variables from .env file
dotenv.config();

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validates configuration, loads the prefix list, and renames folders in the target directory.
 */
async function main() {
    // Validate that required environment variables are set
    validateEnv(["DIRECTORY_PATH"]);

    // Resolve necessary paths
    const directoryPath = process.env.DIRECTORY_PATH;
    const dataDir = path.join(__dirname, "data");

    // Load prefixes and remove/replace patterns
    let prefixesToMove;
    try {
        prefixesToMove = await loadJSON(path.join(dataDir, "prefixes.json"));
        initReplacePatterns(dataDir);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }

    try {
        await renameFolders(directoryPath, prefixesToMove, {
            onRename: (oldName, newName) =>
                console.log(`Renamed: '${oldName}' → '${newName}'`),
            onError: (oldName, newName, err) =>
                console.error(
                    `Error renaming '${oldName}' to '${newName}':`,
                    err
                ),
        });
    } catch (err) {
        console.error("Failed to process directory:", err);
    }
}

// Run the script
main();
