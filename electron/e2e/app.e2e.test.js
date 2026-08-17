import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { _electron as electron } from "playwright-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(__dirname, "..", "..");

const electronBin = path.join(
    APP_DIR,
    "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
);

// This dev sandbox sets ELECTRON_RUN_AS_NODE=1 by default so Electron binaries
// don't unexpectedly open GUI windows. Real Electron behaviour (app/BrowserWindow/
// ipcMain) requires it unset, so strip it for the spawned process rather than
// relying on however this command happens to be invoked.
const launchEnv = { ...process.env };
delete launchEnv.ELECTRON_RUN_AS_NODE;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Folder Renamer app (E2E)", () => {
    let app;
    let scratchDir;

    beforeAll(async () => {
        // Launched via the project directory, not a bare file path — Electron
        // only reads package.json's productName/main this way. A bare file-path
        // launch falls back to the generic "Electron" userData folder instead
        // of this app's own, which is exactly the bug this suite should catch
        // if it ever regresses.
        app = await electron.launch({
            executablePath: electronBin,
            args: [APP_DIR],
            env: launchEnv,
            timeout: 30_000,
        });
        // Let the main window's initial getSettings() IPC round-trip resolve
        // before any test reads its rendered state.
        await sleep(1000);
    });

    afterAll(async () => {
        await app?.close().catch(() => {});
    });

    afterEach(async () => {
        if (scratchDir) {
            await fs.rm(scratchDir, { recursive: true, force: true });
            scratchDir = undefined;
        }
    });

    it("seeds its own userData directory, not the generic Electron one", async () => {
        const userDataPath = await app.evaluate(({ app }) =>
            app.getPath("userData")
        );
        expect(userDataPath).toMatch(/Folder Renamer/);

        const seededFiles = await fs.readdir(path.join(userDataPath, "data"));
        expect(seededFiles.sort()).toEqual([
            "prefixes.json",
            "removePatterns.json",
            "replacePatterns.json",
        ]);
    });

    it("shows the main window with Run disabled until a folder is set", async () => {
        const mainPage = app.windows()[0];
        const pathText = await mainPage.evaluate(
            () => document.getElementById("path-display").textContent
        );
        const runDisabled = await mainPage.evaluate(
            () => document.getElementById("run-btn").disabled
        );

        expect(pathText).toMatch(/No folder selected/);
        expect(runDisabled).toBe(true);
    });

    it("runs a full batch: save a folder in Settings, then rename its contents", async () => {
        scratchDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "folder-renamer-e2e-")
        );
        await fs.mkdir(
            path.join(scratchDir, "Holiday Snaps (digital) (2 covers)")
        );

        const mainPage = app.windows()[0];

        // Open Settings and save the folder. The native folder picker can't be
        // driven from here, so save directly via the same IPC call the picker
        // flow would resolve to — this still exercises the real save/broadcast
        // path, just skips the OS dialog itself.
        await mainPage.click("#settings-btn");
        await sleep(500);
        const settingsPage = app
            .windows()
            .find((w) => w.url().includes("settings.html"));
        await settingsPage.evaluate(
            (dir) => window.api.saveSettings({ directoryPath: dir }),
            scratchDir
        );
        await settingsPage.close();
        await sleep(300);

        const mainPathText = await mainPage.evaluate(
            () => document.getElementById("path-display").textContent
        );
        expect(mainPathText).toBe(scratchDir);

        mainPage.once("dialog", (dialog) => dialog.accept());
        await mainPage.click("#run-btn");
        await sleep(1000);

        const totals = await mainPage.evaluate(
            () => document.getElementById("totals").textContent
        );
        expect(totals).toBe("Items 1 · OK 1 · Err 0");

        const remaining = await fs.readdir(scratchDir);
        expect(remaining).toEqual(["Holiday Snaps"]);
    });

    it("shows a clear error instead of crashing when a config file is missing", async () => {
        scratchDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "folder-renamer-e2e-")
        );
        await fs.mkdir(path.join(scratchDir, "Some Folder"));

        const mainPage = app.windows()[0];
        const userDataPath = await app.evaluate(({ app }) =>
            app.getPath("userData")
        );
        const prefixesPath = path.join(userDataPath, "data", "prefixes.json");
        const backup = await fs.readFile(prefixesPath, "utf8");

        try {
            await fs.rm(prefixesPath);

            await mainPage.click("#settings-btn");
            await sleep(500);
            const settingsPage = app
                .windows()
                .find((w) => w.url().includes("settings.html"));
            await settingsPage.evaluate(
                (dir) => window.api.saveSettings({ directoryPath: dir }),
                scratchDir
            );
            await settingsPage.close();
            await sleep(300);

            mainPage.once("dialog", (dialog) => dialog.accept());
            await mainPage.click("#run-btn");
            await sleep(1000);

            const totals = await mainPage.evaluate(
                () => document.getElementById("totals").textContent
            );
            expect(totals).toMatch(/^Failed:/);

            // The app itself must still be alive and responsive, not vanished.
            expect(app.windows().length).toBeGreaterThan(0);
        } finally {
            await fs.writeFile(prefixesPath, backup);
        }
    });

    it("quits within a bounded time", async () => {
        const proc = app.process();
        const exitPromise = new Promise((resolve) =>
            proc.once("exit", resolve)
        );

        const t0 = Date.now();
        app.evaluate(({ app }) => app.quit()).catch(() => {});

        await Promise.race([
            exitPromise,
            sleep(10_000).then(() => {
                throw new Error("app did not quit within 10s");
            }),
        ]);

        expect(Date.now() - t0).toBeLessThan(10_000);
        app = null; // already closed; skip afterAll's app.close()
    });
});
