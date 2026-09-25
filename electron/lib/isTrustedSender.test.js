import { describe, expect, it } from "vitest";

import { isTrustedSender } from "./isTrustedSender.js";

const PREFIX = "file:///app/electron/renderer/";

describe("isTrustedSender", () => {
    it("accepts a frame inside the renderer folder", () => {
        expect(isTrustedSender({ senderFrame: { url: `${PREFIX}index.html` } }, PREFIX)).toBe(true);
    });

    it("rejects a frame from another location", () => {
        expect(isTrustedSender({ senderFrame: { url: "https://example.com/" } }, PREFIX)).toBe(
            false,
        );
        expect(
            isTrustedSender({ senderFrame: { url: "file:///elsewhere/index.html" } }, PREFIX),
        ).toBe(false);
    });

    it("rejects an event with no sender frame or URL", () => {
        expect(isTrustedSender({}, PREFIX)).toBe(false);
        expect(isTrustedSender({ senderFrame: null }, PREFIX)).toBe(false);
        expect(isTrustedSender({ senderFrame: {} }, PREFIX)).toBe(false);
    });
});
