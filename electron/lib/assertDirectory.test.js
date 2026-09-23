import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { assertDirectory } from "./assertDirectory.js";

describe("assertDirectory", () => {
    let scratchDir;

    beforeEach(async () => {
        scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "folder-renamer-assert-"));
    });

    afterEach(async () => {
        await fs.rm(scratchDir, { recursive: true, force: true });
    });

    it("returns the path when it is an existing directory", async () => {
        await expect(assertDirectory(scratchDir)).resolves.toBe(scratchDir);
    });

    it.each([undefined, null, 42, {}, "", "   "])(
        "rejects a non-string or blank value (%j)",
        async (value) => {
            await expect(assertDirectory(value)).rejects.toThrow("No folder was provided.");
        },
    );

    it("rejects a path that does not exist", async () => {
        await expect(assertDirectory(path.join(scratchDir, "missing"))).rejects.toThrow(
            "doesn't exist",
        );
    });

    it("rejects a path that is a file", async () => {
        const filePath = path.join(scratchDir, "note.txt");
        await fs.writeFile(filePath, "hello");

        await expect(assertDirectory(filePath)).rejects.toThrow("not a folder");
    });
});
