import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { validateEnv } from "./validateEnv.js";

describe("validateEnv", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(process, "exit").mockImplementation(() => {});
    });

    afterEach(() => {
        process.env = { ...originalEnv };
        vi.restoreAllMocks();
    });

    it("does nothing when all required keys are set", () => {
        process.env.DIRECTORY_PATH = "/some/path";

        validateEnv(["DIRECTORY_PATH"]);

        expect(console.error).not.toHaveBeenCalled();
        expect(process.exit).not.toHaveBeenCalled();
    });

    it("logs the missing keys and exits when a required key is unset", () => {
        delete process.env.DIRECTORY_PATH;

        validateEnv(["DIRECTORY_PATH"]);

        expect(console.error).toHaveBeenCalledWith(
            "Missing required environment variables:",
            "DIRECTORY_PATH"
        );
        expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("lists every missing key when several are unset", () => {
        delete process.env.DIRECTORY_PATH;
        delete process.env.OTHER_KEY;

        validateEnv(["DIRECTORY_PATH", "OTHER_KEY"]);

        expect(console.error).toHaveBeenCalledWith(
            "Missing required environment variables:",
            "DIRECTORY_PATH, OTHER_KEY"
        );
    });
});
