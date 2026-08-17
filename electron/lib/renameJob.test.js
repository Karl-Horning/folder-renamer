import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { describeRenameError, runRenameJob } from "./renameJob.js";

describe("describeRenameError", () => {
    it("maps EEXIST and ENOTEMPTY to a friendly 'already exists' message", () => {
        expect(describeRenameError({ code: "EEXIST" })).toBe(
            "A folder with that name already exists."
        );
        expect(describeRenameError({ code: "ENOTEMPTY" })).toBe(
            "A folder with that name already exists."
        );
    });

    it("maps ENOTDIR to a friendly message about a colliding file", () => {
        expect(describeRenameError({ code: "ENOTDIR" })).toBe(
            "A file with that name already exists."
        );
    });

    it("maps EACCES and EPERM to a permission-denied message", () => {
        expect(describeRenameError({ code: "EACCES" })).toBe(
            "Permission denied."
        );
        expect(describeRenameError({ code: "EPERM" })).toBe(
            "Permission denied."
        );
    });

    it("falls back to the raw error code when it isn't mapped", () => {
        expect(describeRenameError({ code: "EWEIRD" })).toBe("EWEIRD");
    });

    it("falls back to the error message when there's no code at all", () => {
        expect(describeRenameError({ message: "something broke" })).toBe(
            "something broke"
        );
    });
});

describe("runRenameJob", () => {
    let tmpDir;
    let dataDir;
    let targetDir;

    beforeEach(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "renamejob-"));
        dataDir = path.join(tmpDir, "data");
        targetDir = path.join(tmpDir, "target");
        await fs.mkdir(dataDir, { recursive: true });
        await fs.mkdir(targetDir, { recursive: true });

        await fs.writeFile(
            path.join(dataDir, "prefixes.json"),
            JSON.stringify(["MyPhotos"])
        );
        await fs.writeFile(
            path.join(dataDir, "removePatterns.json"),
            JSON.stringify([{ text: "(digital)" }])
        );
        await fs.writeFile(
            path.join(dataDir, "replacePatterns.json"),
            JSON.stringify([])
        );
    });

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it("throws when no directory path is given", async () => {
        await expect(runRenameJob("", dataDir, () => {})).rejects.toThrow(
            "No folder is set. Open Settings and choose one."
        );
    });

    it("throws a clear, catchable error when prefixes.json is missing", async () => {
        await fs.rm(path.join(dataDir, "prefixes.json"));

        await expect(
            runRenameJob(targetDir, dataDir, () => {})
        ).rejects.toThrow(/Failed to load JSON from .*prefixes\.json/);
    });

    it("throws a clear, catchable error when a pattern file is corrupted", async () => {
        await fs.writeFile(
            path.join(dataDir, "removePatterns.json"),
            "{ not valid json"
        );

        await expect(
            runRenameJob(targetDir, dataDir, () => {})
        ).rejects.toThrow(/Failed to load removePatterns\.json/);
    });

    it("renames folders, reports each attempt, and returns the final counts", async () => {
        await fs.mkdir(path.join(targetDir, "Holiday Snaps (digital)"));

        const logEntries = [];
        const result = await runRenameJob(targetDir, dataDir, (entry) =>
            logEntries.push(entry)
        );

        expect(result).toEqual({ renamed: 1, errored: 0 });
        expect(logEntries).toEqual([
            {
                type: "ok",
                oldName: "Holiday Snaps (digital)",
                newName: "Holiday Snaps",
            },
        ]);

        const remaining = await fs.readdir(targetDir);
        expect(remaining).toEqual(["Holiday Snaps"]);
    });

    it("reports a friendly error and keeps counting when a rename collides with an existing file", async () => {
        await fs.mkdir(path.join(targetDir, "Old Bundle (digital)"));
        await fs.writeFile(path.join(targetDir, "Old Bundle"), "");

        const logEntries = [];
        const result = await runRenameJob(targetDir, dataDir, (entry) =>
            logEntries.push(entry)
        );

        expect(result).toEqual({ renamed: 0, errored: 1 });
        expect(logEntries).toEqual([
            {
                type: "error",
                oldName: "Old Bundle (digital)",
                newName: "Old Bundle",
                message: "A file with that name already exists.",
            },
        ]);
    });

    it("reports what would change without touching the filesystem when dryRun is true", async () => {
        await fs.mkdir(path.join(targetDir, "Holiday Snaps (digital)"));

        const logEntries = [];
        const result = await runRenameJob(
            targetDir,
            dataDir,
            (entry) => logEntries.push(entry),
            true
        );

        expect(result).toEqual({ renamed: 1, errored: 0 });
        expect(logEntries).toEqual([
            {
                type: "ok",
                oldName: "Holiday Snaps (digital)",
                newName: "Holiday Snaps",
            },
        ]);

        // Nothing on disk should have actually changed.
        const remaining = await fs.readdir(targetDir);
        expect(remaining).toEqual(["Holiday Snaps (digital)"]);
    });

    it("reports nothing and returns zero counts when no folder names need to change", async () => {
        await fs.mkdir(path.join(targetDir, "Holiday Snaps"));

        const logEntries = [];
        const result = await runRenameJob(targetDir, dataDir, (entry) =>
            logEntries.push(entry)
        );

        expect(result).toEqual({ renamed: 0, errored: 0 });
        expect(logEntries).toEqual([]);
    });
});
