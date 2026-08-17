import fs from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { seedDataDir } from "./seedUserData.js";

describe("seedDataDir", () => {
    let tmpDir;
    let bundledDataDir;
    let dataDir;

    beforeEach(async () => {
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "seeduserdata-"));
        bundledDataDir = path.join(tmpDir, "bundled");
        dataDir = path.join(tmpDir, "userData", "data");
        await fs.mkdir(bundledDataDir, { recursive: true });
        await fs.writeFile(
            path.join(bundledDataDir, "prefixes.json"),
            '["MyPhotos"]'
        );
        await fs.writeFile(
            path.join(bundledDataDir, "removePatterns.json"),
            "[]"
        );
    });

    afterEach(async () => {
        await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it("copies the given files into a fresh data directory and reports it seeded", async () => {
        const seeded = await seedDataDir(dataDir, bundledDataDir, [
            "prefixes.json",
            "removePatterns.json",
        ]);

        expect(seeded).toBe(true);
        expect(await fs.readFile(path.join(dataDir, "prefixes.json"), "utf8")).toBe(
            '["MyPhotos"]'
        );
        expect(
            await fs.readFile(path.join(dataDir, "removePatterns.json"), "utf8")
        ).toBe("[]");
    });

    it("does nothing and reports not-seeded when the data directory already exists", async () => {
        await fs.mkdir(dataDir, { recursive: true });
        await fs.writeFile(
            path.join(dataDir, "prefixes.json"),
            '["already", "here"]'
        );

        const seeded = await seedDataDir(dataDir, bundledDataDir, [
            "prefixes.json",
        ]);

        expect(seeded).toBe(false);
        expect(await fs.readFile(path.join(dataDir, "prefixes.json"), "utf8")).toBe(
            '["already", "here"]'
        );
    });
});
