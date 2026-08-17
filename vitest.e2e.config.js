import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["electron/e2e/**/*.test.js"],
        // Launching and driving the real Electron app is much slower than a
        // unit test — default timeouts are tuned for pure-JS assertions.
        testTimeout: 30_000,
        hookTimeout: 30_000,
        // These tests spawn one real app per test file; running files in
        // parallel would mean multiple GUI instances fighting for the same
        // userData directory at once.
        fileParallelism: false,
    },
});
