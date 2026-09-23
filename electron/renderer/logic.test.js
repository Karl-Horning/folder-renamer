import { describe, expect, it } from "vitest";

import {
    NO_RULES_CONFIGURED_MESSAGE,
    cleanIpcError,
    emptyStateMessage,
    formatLogEntry,
    formatProgress,
    formatPreviewTotals,
    formatTotals,
    previewEmptyStateMessage,
} from "./logic.js";

describe("emptyStateMessage", () => {
    it("says nothing needed to rename when there were zero renames and zero errors, and rules are configured", () => {
        expect(emptyStateMessage(0, 0, true)).toBe(
            "Nothing to rename. Every folder already matches its target name.",
        );
    });

    it("points to Reveal Config Folder when there are zero renames and zero errors because no rules are configured", () => {
        expect(emptyStateMessage(0, 0, false)).toBe(NO_RULES_CONFIGURED_MESSAGE);
    });

    it("defaults to assuming rules are configured when hasConfig isn't passed", () => {
        expect(emptyStateMessage(0, 0)).toBe(
            "Nothing to rename. Every folder already matches its target name.",
        );
    });

    it("returns no message when there was at least one rename", () => {
        expect(emptyStateMessage(1, 0, false)).toBe("");
    });

    it("returns no message when there was at least one error", () => {
        expect(emptyStateMessage(0, 1, false)).toBe("");
    });
});

describe("formatLogEntry", () => {
    it("splits a successful rename into the old and new names", () => {
        expect(
            formatLogEntry({
                type: "ok",
                oldName: "Holiday Snaps (digital)",
                newName: "Holiday Snaps",
            }),
        ).toEqual({
            before: "Holiday Snaps (digital)",
            relation: "becomes",
            after: "Holiday Snaps",
        });
    });

    it("splits an error into the old name and the error message", () => {
        expect(
            formatLogEntry({
                type: "error",
                oldName: "Old Bundle",
                newName: "Old Bundle",
                message: "A file with that name already exists.",
            }),
        ).toEqual({
            before: "Old Bundle",
            relation: "failed:",
            after: "A file with that name already exists.",
        });
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

describe("previewEmptyStateMessage", () => {
    it("says nothing would change when the preview found zero renames, and rules are configured", () => {
        expect(previewEmptyStateMessage(0, true)).toBe(
            "Nothing would change. Every folder already matches its target name.",
        );
    });

    it("points to Reveal Config Folder when the preview found zero renames because no rules are configured", () => {
        expect(previewEmptyStateMessage(0, false)).toBe(NO_RULES_CONFIGURED_MESSAGE);
    });

    it("defaults to assuming rules are configured when hasConfig isn't passed", () => {
        expect(previewEmptyStateMessage(0)).toBe(
            "Nothing would change. Every folder already matches its target name.",
        );
    });

    it("returns no message when there's at least one result", () => {
        expect(previewEmptyStateMessage(3, false)).toBe("");
    });
});

describe("formatPreviewTotals", () => {
    it("pluralises for more than one folder", () => {
        expect(formatPreviewTotals(4)).toBe("Would rename 4 folders");
    });

    it("stays singular for exactly one folder", () => {
        expect(formatPreviewTotals(1)).toBe("Would rename 1 folder");
    });

    it("handles zero", () => {
        expect(formatPreviewTotals(0)).toBe("Would rename 0 folders");
    });
});

describe("cleanIpcError", () => {
    it("strips Electron's remote-method wrapper", () => {
        expect(
            cleanIpcError(
                "Error invoking remote method 'settings:save': Error: That is a file, not a folder.",
            ),
        ).toBe("That is a file, not a folder.");
    });

    it("leaves an unwrapped message untouched", () => {
        expect(cleanIpcError("Something broke")).toBe("Something broke");
    });
});

describe("formatProgress", () => {
    it("shows only the label before any rows have arrived", () => {
        expect(formatProgress("Processing…", 0)).toBe("Processing…");
    });

    it("adds the running count once rows arrive", () => {
        expect(formatProgress("Processing…", 12)).toBe("Processing… 12 so far");
    });
});
