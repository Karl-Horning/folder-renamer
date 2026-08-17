import fs from "fs/promises";
import os from "os";
import path from "path";

import { beforeAll, describe, expect, it } from "vitest";

import { initReplacePatterns } from "./replacePatterns.js";
import { transformName } from "./transformName.js";

describe("transformName", () => {
    const prefixes = ["MyPhotos", "FamilyPhotos"];

    beforeAll(async () => {
        // Self-contained synthetic fixture data, not the real (gitignored)
        // src/data/ — these tests shouldn't depend on a personal pattern
        // list that doesn't exist in a fresh clone.
        const dataDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "transformname-test-")
        );
        await fs.writeFile(
            path.join(dataDir, "removePatterns.json"),
            JSON.stringify([
                { text: "(Scanner)", caseInsensitive: true },
                { text: "\\([2-7] covers\\)", isRegex: true },
            ])
        );
        await fs.writeFile(
            path.join(dataDir, "replacePatterns.json"),
            JSON.stringify([])
        );
        initReplacePatterns(dataDir);
    });

    it("normalises an image count and moves it to the end", () => {
        expect(transformName("Holiday Snaps 238x", prefixes)).toBe(
            "Holiday Snaps (x238)"
        );
    });

    it("normalises a date and moves it to the end", () => {
        expect(transformName("Holiday Snaps 2024-01-05", prefixes)).toBe(
            "Holiday Snaps (2024-01-05)"
        );
    });

    it("moves a known prefix to the end in square brackets", () => {
        expect(transformName("MyPhotos Holiday Snaps", prefixes)).toBe(
            "Holiday Snaps [MyPhotos]"
        );
    });

    it("combines count, date, and prefix handling in one pass", () => {
        expect(
            transformName("MyPhotos Holiday Snaps 238x 2024-01-05", prefixes)
        ).toBe("Holiday Snaps (x238) (2024-01-05) [MyPhotos]");
    });

    it("strips a known bracketed tag and cleans up the resulting punctuation", () => {
        expect(
            transformName("Holiday Snaps (Scanner) (2 covers)", prefixes)
        ).toBe("Holiday Snaps");
    });

    it("removes stray empty brackets left behind by other transforms", () => {
        expect(transformName("Holiday Snaps ()", prefixes)).toBe(
            "Holiday Snaps"
        );
    });

    it("collapses multiple spaces produced by earlier transforms", () => {
        expect(transformName("Holiday   Snaps", prefixes)).toBe(
            "Holiday Snaps"
        );
    });

    it("leaves an already-clean name unchanged", () => {
        expect(transformName("Holiday Snaps", prefixes)).toBe(
            "Holiday Snaps"
        );
    });
});
