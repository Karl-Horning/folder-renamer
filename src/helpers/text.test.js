import { describe, expect, it } from "vitest";

import {
    cleanupPunctuation,
    movePrefixesToEnd,
    moveImageCountAndDate,
} from "./text.js";

describe("moveImageCountAndDate", () => {
    // moveImageCountAndDate only deletes the matched substring and trims the
    // ends, so a gap left in the middle of the string isn't collapsed here —
    // that's cleanupPunctuation's job, exercised together in transformName.

    it("moves an image count to the end", () => {
        expect(moveImageCountAndDate("Holiday (x238) Snaps")).toBe(
            "Holiday  Snaps (x238)"
        );
    });

    it("moves a date to the end", () => {
        expect(moveImageCountAndDate("Holiday (2024-01-05) Snaps")).toBe(
            "Holiday  Snaps (2024-01-05)"
        );
    });

    it("moves both an image count and a date to the end, count before date", () => {
        expect(
            moveImageCountAndDate("(2024-01-05) Holiday (x238) Snaps")
        ).toBe("Holiday  Snaps (x238) (2024-01-05)");
    });

    it("leaves a name with neither a count nor a date unchanged", () => {
        expect(moveImageCountAndDate("Holiday Snaps")).toBe("Holiday Snaps");
    });
});

describe("cleanupPunctuation", () => {
    it("collapses repeated commas into one", () => {
        expect(cleanupPunctuation("Holiday,, Snaps")).toBe("Holiday, Snaps");
    });

    it("collapses comma-space combinations into one comma", () => {
        expect(cleanupPunctuation("Holiday, , , Snaps")).toBe(
            "Holiday, Snaps"
        );
    });

    it("removes a trailing comma before metadata in brackets", () => {
        expect(cleanupPunctuation("Holiday Snaps, (x238)")).toBe(
            "Holiday Snaps (x238)"
        );
    });

    it("removes a trailing comma at the end of the string", () => {
        expect(cleanupPunctuation("Holiday Snaps,")).toBe("Holiday Snaps");
    });

    it("collapses multiple spaces into one", () => {
        expect(cleanupPunctuation("Holiday   Snaps")).toBe("Holiday Snaps");
    });

    it("trims leading and trailing whitespace", () => {
        expect(cleanupPunctuation("  Holiday Snaps  ")).toBe(
            "Holiday Snaps"
        );
    });
});

describe("movePrefixesToEnd", () => {
    const prefixes = ["MyPhotos", "FamilyPhotos"];

    it("moves a comma-separated prefix to the end in square brackets", () => {
        expect(
            movePrefixesToEnd(
                "MyPhotos, Holidays, Holiday snaps",
                prefixes
            )
        ).toBe("Holidays, Holiday snaps [MyPhotos]");
    });

    it("moves a space-separated prefix to the end in square brackets", () => {
        expect(
            movePrefixesToEnd(
                "FamilyPhotos Holidays, Holiday snaps",
                prefixes
            )
        ).toBe("Holidays, Holiday snaps [FamilyPhotos]");
    });

    it("matches a prefix case-insensitively, using the prefix list's casing in the output", () => {
        expect(
            movePrefixesToEnd("myphotos Holidays", prefixes)
        ).toBe("Holidays [MyPhotos]");
    });

    it("leaves the name unchanged when no prefix matches", () => {
        expect(movePrefixesToEnd("Holidays, Holiday snaps", prefixes)).toBe(
            "Holidays, Holiday snaps"
        );
    });

    it("only matches a prefix at the start of the name", () => {
        expect(
            movePrefixesToEnd("Holidays, MyPhotos snaps", prefixes)
        ).toBe("Holidays, MyPhotos snaps");
    });
});
