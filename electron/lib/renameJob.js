import path from "path";

import { loadJSON } from "../../src/helpers/loadJSON.js";
import { initReplacePatterns } from "../../src/helpers/replacePatterns.js";
import { renameFolders } from "../../src/renameFolders.js";

const FRIENDLY_RENAME_ERRORS = {
    EEXIST: "A folder with that name already exists.",
    ENOTEMPTY: "A folder with that name already exists.",
    ENOTDIR: "A file with that name already exists.",
    EACCES: "Permission denied.",
    EPERM: "Permission denied.",
};

/**
 * Turns a raw fs.rename error into a short, human-readable reason — Node's
 * default message repeats both full file paths, which is unreadable in a log row.
 * @param {NodeJS.ErrnoException} err - The error thrown by fs.rename.
 * @returns {string} A short, human-readable reason.
 */
export function describeRenameError(err) {
    return FRIENDLY_RENAME_ERRORS[err.code] ?? err.code ?? err.message;
}

/**
 * Runs a rename batch against a directory using the pattern config in a data
 * directory, reporting each attempt via onLog and returning the final counts.
 * @param {string} directoryPath - Folder whose subfolders should be renamed.
 * @param {string} dataDir - Directory containing prefixes.json and the pattern files.
 * @param {(entry: {type: "ok" | "error", oldName: string, newName: string, message?: string}) => void} onLog - Called once per rename attempt.
 * @returns {Promise<{renamed: number, errored: number}>}
 */
export async function runRenameJob(directoryPath, dataDir, onLog) {
    if (!directoryPath) {
        throw new Error("No folder is set. Open Settings and choose one.");
    }

    const prefixesToMove = await loadJSON(path.join(dataDir, "prefixes.json"));
    initReplacePatterns(dataDir);

    let renamed = 0;
    let errored = 0;

    await renameFolders(directoryPath, prefixesToMove, {
        onRename: (oldName, newName) => {
            renamed += 1;
            onLog({ type: "ok", oldName, newName });
        },
        onError: (oldName, newName, err) => {
            errored += 1;
            onLog({
                type: "error",
                oldName,
                newName,
                message: describeRenameError(err),
            });
        },
    });

    return { renamed, errored };
}
