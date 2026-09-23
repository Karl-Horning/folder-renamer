import fs from "fs/promises";
import path from "path";

/**
 * Copies the bundled default files that are missing from a data directory, so app updates never overwrite the user's pattern list.
 * A file the user deletes later is copied again on the next run.
 * A file with no bundled default is created as an empty array, so the app still launches.
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
        missingFiles.map(async (file) => {
            try {
                await fs.copyFile(path.join(bundledDataDir, file), path.join(dataDir, file));
            } catch {
                // No bundled default, for example in dev mode on a fresh clone where src/data/ is empty.
                await fs.writeFile(path.join(dataDir, file), "[]");
            }
        }),
    );

    return missingFiles.length > 0;
}
