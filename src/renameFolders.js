import fs from "fs/promises";
import path from "path";

import { transformName } from "./helpers/transformName.js";

/**
 * Renames every subfolder of a directory whose transformed name differs from its current name.
 * @param {string} directoryPath - Absolute path to the directory whose subfolders should be renamed.
 * @param {string[]} prefixesToMove - Prefixes to move to the end of a folder name.
 * @param {{onRename?: (oldName: string, newName: string) => void, onError?: (oldName: string, newName: string, err: Error) => void, dryRun?: boolean}} [options] - Optional callbacks fired for each rename attempt, and a dry-run switch.
 * @returns {Promise<void>}
 */
export async function renameFolders(
    directoryPath,
    prefixesToMove,
    { onRename, onError, dryRun = false } = {}
) {
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
        // Only rename directories
        if (!entry.isDirectory()) continue;

        const oldName = entry.name;
        const newName = transformName(oldName, prefixesToMove);

        // If the name hasn't changed, there's nothing to do
        if (newName === oldName) continue;

        // Dry run: report what would happen without touching the filesystem.
        if (dryRun) {
            onRename?.(oldName, newName);
            continue;
        }

        const oldPath = path.join(directoryPath, oldName);
        const newPath = path.join(directoryPath, newName);

        try {
            await fs.rename(oldPath, newPath);
            onRename?.(oldName, newName);
        } catch (err) {
            onError?.(oldName, newName, err);
        }
    }
}
