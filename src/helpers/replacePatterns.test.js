import fs from "fs/promises";
import os from "os";
import path from "path";

import { beforeAll, describe, expect, it } from "vitest";

import {
    applyReplacePatterns,
    hasAnyPatterns,
    initReplacePatterns,
} from "./replacePatterns.js";

describe("applyReplacePatterns", () => {
    beforeAll(async () => {
        // Self-contained synthetic fixture data, not the real (gitignored)
        // src/data/ — these tests shouldn't depend on a personal pattern
        // list that doesn't exist in a fresh clone.
        const dataDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "replacepatterns-test-")
        );
        await fs.writeFile(
            path.join(dataDir, "removePatterns.json"),
            JSON.stringify([
                { text: "(Scanner)", caseInsensitive: true },
                { text: "(Digital-HD)", caseInsensitive: true },
                { text: "\\([2-7] covers\\)", isRegex: true },
                { text: ".com", caseInsensitive: true },
                {
                    text: "Download (link;?|zip( file)?;?|mirror;?)",
                    isRegex: true,
                    caseInsensitive: true,
                },
                {
                    text: "\\(?(Future Release|pre-release)\\)?",
                    isRegex: true,
                    caseInsensitive: true,
                },
                {
                    text: ",\\s*-?\\s*Upcoming Release",
                    isRegex: true,
                    caseInsensitive: true,
                },
                {
                    text: ",\\s*-?\\s*Unreleased",
                    isRegex: true,
                    caseInsensitive: true,
                },
                { text: "\\b\\d{2,5}px\\b", isRegex: true },
                { text: "\\b\\d{2,5}x\\d{2,5}px\\b", isRegex: true },
                { text: "\\(?\\d{2,5}x\\d{2,5}(px)?\\)?", isRegex: true },
            ])
        );
        await fs.writeFile(
            path.join(dataDir, "replacePatterns.json"),
            JSON.stringify([
                { text: "\\bset\\b", replacement: "Set", isRegex: true },
                { text: "⁄", replacement: "-" },
                { text: " (-|•|¦) ", replacement: ", ", isRegex: true },
                { text: "&amp;", replacement: "&" },
                { text: ".eu", replacement: "EU" },
                { text: ".nl", replacement: "NL", caseInsensitive: true },
            ])
        );
        initReplacePatterns(dataDir);
    });

    it("strips a known bracketed tag", () => {
        expect(applyReplacePatterns("My Comic (Scanner)")).toBe("My Comic");
    });

    it("strips bracketed tags regardless of case", () => {
        expect(applyReplacePatterns("My Comic (Digital-HD)")).toBe(
            "My Comic"
        );
        expect(applyReplacePatterns("My Comic (digital-hd)")).toBe(
            "My Comic"
        );
    });

    it("strips a cover count in the range 2-7", () => {
        expect(applyReplacePatterns("My Comic (2 covers)")).toBe("My Comic");
        expect(applyReplacePatterns("My Comic (7 covers)")).toBe("My Comic");
    });

    it("strips .com and .Com regardless of case, but leaves other TLDs alone", () => {
        expect(applyReplacePatterns("Cool Site.com")).toBe("Cool Site");
        expect(applyReplacePatterns("Cool Site.Com")).toBe("Cool Site");
    });

    it("strips known download phrases regardless of case or punctuation", () => {
        expect(applyReplacePatterns("Download Link; Something")).toBe(
            "Something"
        );
        expect(applyReplacePatterns("Download link Something")).toBe(
            "Something"
        );
        expect(applyReplacePatterns("Download zip Something")).toBe(
            "Something"
        );
        expect(applyReplacePatterns("Download Mirror; Something")).toBe(
            "Something"
        );
        expect(applyReplacePatterns("Download ZIP file; Something")).toBe(
            "Something"
        );
    });

    it("strips future/pre-release phrases regardless of case or brackets", () => {
        expect(applyReplacePatterns("Something (future release)")).toBe(
            "Something"
        );
        expect(applyReplacePatterns("Something Future Release")).toBe(
            "Something"
        );
        expect(applyReplacePatterns("Something (pre-release)")).toBe(
            "Something"
        );
        expect(applyReplacePatterns("Something Pre-release")).toBe(
            "Something"
        );
    });

    it("strips 'Upcoming Release' and 'Unreleased' suffixes with or without a dash", () => {
        expect(applyReplacePatterns("Something, Upcoming Release")).toBe(
            "Something"
        );
        expect(applyReplacePatterns("Something, - Upcoming Release")).toBe(
            "Something,"
        );
        expect(applyReplacePatterns("Something, Unreleased")).toBe(
            "Something"
        );
    });

    it("only capitalises 'set' as a whole word", () => {
        expect(applyReplacePatterns("This is a set of things")).toBe(
            "This is a Set of things"
        );
        expect(applyReplacePatterns("Reset Assets Preset")).toBe(
            "Reset Assets Preset"
        );
    });

    it("converts a fraction slash to a hyphen", () => {
        expect(applyReplacePatterns("10⁄26⁄19")).toBe("10-26-19");
    });

    it("normalises ' - ', ' • ', and ' ¦ ' separators to ', '", () => {
        expect(applyReplacePatterns("Something - Else")).toBe(
            "Something, Else"
        );
        expect(applyReplacePatterns("Something • Else")).toBe(
            "Something, Else"
        );
        expect(applyReplacePatterns("Something ¦ Else")).toBe(
            "Something, Else"
        );
    });

    it("converts an HTML ampersand entity to a literal ampersand", () => {
        expect(applyReplacePatterns("Tom &amp; Jerry")).toBe("Tom & Jerry");
    });

    it("converts .eu to EU and .nl/.NL to NL", () => {
        expect(applyReplacePatterns("Site.eu")).toBe("SiteEU");
        expect(applyReplacePatterns("Site.nl")).toBe("SiteNL");
        expect(applyReplacePatterns("Site.NL")).toBe("SiteNL");
    });

    it("strips pixel dimension patterns", () => {
        expect(applyReplacePatterns("Scan 4800px")).toBe("Scan");
        expect(applyReplacePatterns("Scan 800x600px")).toBe("Scan");
        expect(applyReplacePatterns("Scan (800x600)")).toBe("Scan");
    });

    it("leaves a clean name unchanged", () => {
        expect(applyReplacePatterns("Holiday Snaps")).toBe("Holiday Snaps");
    });

    it("reports patterns as loaded once initReplacePatterns has run against non-empty files", () => {
        expect(hasAnyPatterns()).toBe(true);
    });
});

describe("hasAnyPatterns", () => {
    it("reports no patterns loaded when both pattern files are empty", async () => {
        const dataDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "replacepatterns-empty-test-")
        );
        await fs.writeFile(path.join(dataDir, "removePatterns.json"), "[]");
        await fs.writeFile(path.join(dataDir, "replacePatterns.json"), "[]");

        initReplacePatterns(dataDir);

        expect(hasAnyPatterns()).toBe(false);
    });
});
