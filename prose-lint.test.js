import fg from "fast-glob";
import { promises as fs } from "fs";
import { describe, expect, it } from "vitest";
import { findBannedWords, findWraps } from "prose-lint";

const GLOBS = ["electron/**/*.{js,cjs,css,html}", "src/**/*.js", "*.js", "README.md"];

/**
 * Lists the tracked source and doc files that the prose checks cover.
 * @returns {Promise<string[]>} The matching file paths.
 */
function listFiles() {
    return fg(GLOBS, { ignore: ["**/node_modules/**", "dist/**"] });
}

/**
 * Runs a check over every covered file and formats each offence as one line.
 * @param {(content: string) => object[]} find - The prose-lint check to run.
 * @param {(file: string, offence: object) => string} format - Turns an offence into a report line.
 * @returns {Promise<string[]>} One report line per offence.
 */
async function collectOffences(find, format) {
    const offences = [];

    for (const file of await listFiles()) {
        const content = await fs.readFile(file, "utf8");
        for (const offence of find(content)) {
            offences.push(format(file, offence));
        }
    }

    return offences;
}

describe("prose-lint", () => {
    it("finds no mid-sentence line wraps in comments", async () => {
        const offences = await collectOffences(
            findWraps,
            (file, o) => `${file}:${o.line}: "${o.from}" -> "${o.to}"`,
        );

        expect(offences, offences.join("\n")).toEqual([]);
    });

    it("finds no banned words or phrases", async () => {
        const offences = await collectOffences(
            findBannedWords,
            (file, o) => `${file}:${o.line}: "${o.match}" in: ${o.text}`,
        );

        expect(offences, offences.join("\n")).toEqual([]);
    });
});
