import { describe, expect, it } from "vitest";

import { emptyStateMessage, formatLogEntry, formatTotals } from "./logic.js";

describe("emptyStateMessage", () => {
    it("says nothing needed to rename when there were zero renames and zero errors", () => {
        expect(emptyStateMessage(0, 0)).toBe(
            "Nothing to rename — every folder already matches its target name."
        );
    });

    it("falls back to the generic pre-run message when there was at least one rename", () => {
        expect(emptyStateMessage(1, 0)).toBe("No folders processed yet.");
    });

    it("falls back to the generic pre-run message when there was at least one error", () => {
        expect(emptyStateMessage(0, 1)).toBe("No folders processed yet.");
    });
});

describe("formatLogEntry", () => {
    it("formats a successful rename as old → new", () => {
        expect(
            formatLogEntry({
                type: "ok",
                oldName: "Holiday Snaps (digital)",
                newName: "Holiday Snaps",
            })
        ).toBe("Holiday Snaps (digital) → Holiday Snaps");
    });

    it("formats an error as old — message", () => {
        expect(
            formatLogEntry({
                type: "error",
                oldName: "Old Bundle",
                newName: "Old Bundle",
                message: "A file with that name already exists.",
            })
        ).toBe("Old Bundle — A file with that name already exists.");
    });
});

describe("formatTotals", () => {
    it("sums renamed and errored into the items count", () => {
        expect(formatTotals(4, 1)).toBe("Items 5 · OK 4 · Err 1");
    });

    it("formats all-zero totals", () => {
        expect(formatTotals(0, 0)).toBe("Items 0 · OK 0 · Err 0");
    });
});
