import fs from "fs/promises";
import path from "path";

/**
 * Copies the bundled default pattern/prefix files into a data directory if it doesn't
 * already exist, so future app updates never overwrite the user's real, evolving
 * pattern list — only the one-time seed copy. Does nothing if the directory already exists.
 * @param {string} dataDir - Destination directory (e.g. inside userData).
 * @param {string} bundledDataDir - Source directory bundled with the app (e.g. src/data).
 * @param {string[]} files - Filenames to copy from bundledDataDir into dataDir.
 * @returns {Promise<boolean>} True if the directory was freshly seeded, false if it already existed.
 */
export async function seedDataDir(dataDir, bundledDataDir, files) {
    try {
        await fs.access(dataDir);
        return false;
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
        await Promise.all(
            files.map((file) =>
                fs.copyFile(
                    path.join(bundledDataDir, file),
                    path.join(dataDir, file)
                )
            )
        );
        return true;
    }
}
