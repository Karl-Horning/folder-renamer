import fs from "fs/promises";
import path from "path";

/**
 * Copies any of the given bundled default files into a data directory that aren't
 * already there, so future app updates never overwrite the user's real, evolving
 * pattern list — only files missing entirely get (re)seeded. This self-heals a
 * single file the user deletes later, not just the initial empty-directory case.
 * @param {string} dataDir - Destination directory (for example, inside userData).
 * @param {string} bundledDataDir - Source directory bundled with the app (for example, src/data).
 * @param {string[]} files - Filenames to copy from bundledDataDir into dataDir if missing.
 * @returns {Promise<boolean>} True if any file was (re)seeded, false if all were already present.
 */
export async function seedDataDir(dataDir, bundledDataDir, files) {
    await fs.mkdir(dataDir, { recursive: true });

    const missingFiles = [];
    for (const file of files) {
        try {
            await fs.access(path.join(dataDir, file));
        } catch {
            missingFiles.push(file);
        }
    }

    await Promise.all(
        missingFiles.map((file) =>
            fs.copyFile(
                path.join(bundledDataDir, file),
                path.join(dataDir, file)
            )
        )
    );

    return missingFiles.length > 0;
}
