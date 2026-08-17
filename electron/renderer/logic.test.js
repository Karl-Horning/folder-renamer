import { describe, expect, it } from "vitest";

import {
    NO_RULES_CONFIGURED_MESSAGE,
    emptyStateMessage,
    formatLogEntry,
    formatPreviewTotals,
    formatTotals,
    previewEmptyStateMessage,
} from "./logic.js";

describe("emptyStateMessage", () => {
    it("says nothing needed to rename when there were zero renames and zero errors, and rules are configured", () => {
        expect(emptyStateMessage(0, 0, true)).toBe(
            "Nothing to rename — every folder already matches its target name."
        );
    });

    it("points to Reveal Config Folder when there are zero renames and zero errors because no rules are configured", () => {
        expect(emptyStateMessage(0, 0, false)).toBe(NO_RULES_CONFIGURED_MESSAGE);
    });

    it("defaults to assuming rules are configured when hasConfig isn't passed", () => {
        expect(emptyStateMessage(0, 0)).toBe(
            "Nothing to rename — every folder already matches its target name."
        );
    });

    it("falls back to the generic pre-run message when there was at least one rename", () => {
        expect(emptyStateMessage(1, 0, false)).toBe("No folders processed yet.");
    });

    it("falls back to the generic pre-run message when there was at least one error", () => {
        expect(emptyStateMessage(0, 1, false)).toBe("No folders processed yet.");
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

describe("previewEmptyStateMessage", () => {
    it("says nothing would change when the preview found zero renames, and rules are configured", () => {
        expect(previewEmptyStateMessage(0, true)).toBe(
            "Nothing would change — every folder already matches its target name."
        );
    });

    it("points to Reveal Config Folder when the preview found zero renames because no rules are configured", () => {
        expect(previewEmptyStateMessage(0, false)).toBe(
            NO_RULES_CONFIGURED_MESSAGE
        );
    });

    it("defaults to assuming rules are configured when hasConfig isn't passed", () => {
        expect(previewEmptyStateMessage(0)).toBe(
            "Nothing would change — every folder already matches its target name."
        );
    });

    it("falls back to the generic pre-preview message when there's at least one result", () => {
        expect(previewEmptyStateMessage(3, false)).toBe("No preview yet.");
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
