import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["electron/e2e/**/*.test.js"],
        // Driving the Electron app is slower than a unit test, so the timeouts are raised.
        testTimeout: 30_000,
        hookTimeout: 30_000,
        // Each test file launches an app, and parallel apps would compete for the same userData directory.
        fileParallelism: false,
    },
});
