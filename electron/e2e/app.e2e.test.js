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
    "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron",
);

// This dev sandbox sets ELECTRON_RUN_AS_NODE=1 by default so Electron binaries
// don't unexpectedly open GUI windows. Real Electron behaviour (app/BrowserWindow/
// ipcMain) requires it unset, so strip it for the spawned process rather than
// relying on however this command happens to be invoked.
const launchEnv = { ...process.env };
delete launchEnv.ELECTRON_RUN_AS_NODE;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Chooses a folder through the Choose… button, with the native dialog stubbed to return the given folder.
 * @param {import("playwright-core").ElectronApplication} app - The running app.
 * @param {import("playwright-core").Page} page - The main window.
 * @param {string} dir - The folder the stubbed dialog should return.
 */
async function chooseFolder(app, page, dir) {
    await app.evaluate(({ dialog }, chosen) => {
        dialog.showOpenDialog = async () => ({
            canceled: false,
            filePaths: [chosen],
        });
    }, dir);
    await page.click("#choose-btn");
    await page.waitForFunction(
        (expected) => document.getElementById("path-display").textContent === expected,
        dir,
    );
}

/**
 * Answers the native confirm dialog with the button at the given index, where 0 is Rename and 1 is Cancel.
 * @param {import("playwright-core").ElectronApplication} app - The running app.
 * @param {number} response - The index of the button to press.
 */
async function stubConfirm(app, response) {
    await app.evaluate(({ dialog }, index) => {
        dialog.showMessageBox = async () => ({ response: index });
    }, response);
}

describe("Folder Renamer app (E2E)", () => {
    let app;
    let scratchDir;
    let testUserDataDir;

    beforeAll(async () => {
        // Isolated from the real userData directory: Karl actually uses this
        // app now (a real, hand-curated removePatterns.json and a real saved
        // directoryPath), so these tests must never read from or write to
        // ~/Library/Application Support/Folder Renamer — only this temp copy.
        testUserDataDir = await fs.mkdtemp(path.join(os.tmpdir(), "folder-renamer-e2e-userdata-"));
        // macOS's /var/folders is itself a symlink to /private/var/folders —
        // Electron reports the resolved path, so match it to avoid a false
        // mismatch between two strings that name the same real directory.
        testUserDataDir = await fs.realpath(testUserDataDir);

        // Launched via the project directory, not a bare file path — Electron
        // only reads package.json's productName/main this way. A bare file-path
        // launch falls back to the generic "Electron" userData folder instead
        // of this app's own, which is exactly the bug this suite should catch
        // if it ever regresses.
        app = await electron.launch({
            executablePath: electronBin,
            args: [APP_DIR, `--user-data-dir=${testUserDataDir}`],
            env: launchEnv,
            timeout: 30_000,
        });
        // Let the main window's initial getSettings() IPC round-trip resolve
        // before any test reads its rendered state.
        await sleep(1000);
    });

    afterAll(async () => {
        await app?.close().catch(() => {});
        await fs.rm(testUserDataDir, { recursive: true, force: true });
    });

    afterEach(async () => {
        if (scratchDir) {
            await fs.rm(scratchDir, { recursive: true, force: true });
            scratchDir = undefined;
        }
    });

    it("seeds the data files into its (isolated, test-only) userData directory", async () => {
        const userDataPath = await app.evaluate(({ app }) => app.getPath("userData"));
        expect(userDataPath).toBe(testUserDataDir);

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
            () => document.getElementById("path-display").textContent,
        );
        const runDisabled = await mainPage.evaluate(
            () => document.getElementById("run-btn").disabled,
        );

        expect(pathText).toMatch(/No folder selected/);
        expect(runDisabled).toBe(true);
    });

    it("rejects a chosen path that isn't a folder and keeps the current state", async () => {
        scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "folder-renamer-e2e-"));
        const filePath = path.join(scratchDir, "note.txt");
        await fs.writeFile(filePath, "hello");

        const mainPage = app.windows()[0];
        await app.evaluate(({ dialog }, chosen) => {
            dialog.showOpenDialog = async () => ({
                canceled: false,
                filePaths: [chosen],
            });
        }, filePath);
        await mainPage.click("#choose-btn");
        await mainPage.waitForSelector("#path-hint:not([hidden])");

        const hint = await mainPage.textContent("#path-hint");
        const pathText = await mainPage.textContent("#path-display");
        const runDisabled = await mainPage.evaluate(
            () => document.getElementById("run-btn").disabled,
        );

        expect(hint).toBe("That is a file, not a folder.");
        expect(pathText).toMatch(/No folder selected/);
        expect(runDisabled).toBe(true);
    });

    it("enables the Preview and Process Batch menu items only once a folder is chosen", async () => {
        scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "folder-renamer-e2e-"));
        const mainPage = app.windows()[0];
        const menuEnabled = () =>
            app.evaluate(({ Menu }) => {
                const menu = Menu.getApplicationMenu();
                return ["choose", "preview", "run"].map((id) => menu.getMenuItemById(id).enabled);
            });

        expect(await menuEnabled()).toEqual([true, false, false]);

        await chooseFolder(app, mainPage, scratchDir);
        await expect.poll(menuEnabled).toEqual([true, true, true]);
    });

    it("runs a full batch: choose a folder, then rename its contents", async () => {
        scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "folder-renamer-e2e-"));
        await fs.mkdir(path.join(scratchDir, "Holiday Snaps (digital) (2 covers)"));

        const mainPage = app.windows()[0];

        await chooseFolder(app, mainPage, scratchDir);

        const mainPathText = await mainPage.evaluate(
            () => document.getElementById("path-display").textContent,
        );
        expect(mainPathText).toBe(scratchDir);

        await stubConfirm(app, 0);
        await mainPage.click("#run-btn");
        await sleep(1000);

        const totals = await mainPage.evaluate(() => document.getElementById("totals").textContent);
        expect(totals).toBe("Items 1 · OK 1 · Err 0");

        const remaining = await fs.readdir(scratchDir);
        expect(remaining).toEqual(["Holiday Snaps"]);
    });

    it("previews a batch without touching the filesystem, then the real run still works", async () => {
        scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "folder-renamer-e2e-"));
        await fs.mkdir(path.join(scratchDir, "Sandman Vol 3 (digital) (2 covers)"));

        const mainPage = app.windows()[0];

        await chooseFolder(app, mainPage, scratchDir);

        await mainPage.click("#preview-btn");
        await sleep(800);

        const previewTotals = await mainPage.evaluate(
            () => document.getElementById("totals").textContent,
        );
        const previewChip = await mainPage.evaluate(
            () => document.querySelector(".log-row:not(.head) .chip")?.textContent,
        );
        expect(previewTotals).toBe("Would rename 1 folder");
        expect(previewChip).toBe("PREVIEW");

        // Nothing should have actually changed on disk.
        expect(await fs.readdir(scratchDir)).toEqual(["Sandman Vol 3 (digital) (2 covers)"]);

        // The real run should still work correctly afterward.
        await stubConfirm(app, 0);
        await mainPage.click("#run-btn");
        await sleep(1000);

        const runChip = await mainPage.evaluate(
            () => document.querySelector(".log-row:not(.head) .chip")?.textContent,
        );
        expect(runChip).toBe("OK");
        expect(await fs.readdir(scratchDir)).toEqual(["Sandman Vol 3"]);
    });

    it("exposes the path, results and final status to assistive technology", async () => {
        scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "folder-renamer-e2e-"));
        await fs.mkdir(path.join(scratchDir, "Holiday Snaps (digital)"));

        const mainPage = app.windows()[0];
        await chooseFolder(app, mainPage, scratchDir);

        await mainPage.getByRole("textbox", { name: "Origin" }).waitFor();

        await mainPage.click("#preview-btn");
        await expect.poll(() => mainPage.textContent("#announcer")).toBe("Would rename 1 folder");

        const table = mainPage.getByRole("table", { name: "Renamed folders" });
        expect(await table.getByRole("row").count()).toBe(2);
        expect(await table.locator(".before").textContent()).toBe("Holiday Snaps (digital)");
        expect(await table.locator(".after").textContent()).toBe("Holiday Snaps");

        const fontStyles = await mainPage.evaluate(() =>
            ["path-display", "empty-state", "log-table"].map(
                (id) => getComputedStyle(document.getElementById(id)).fontStyle,
            ),
        );
        expect(fontStyles).toEqual(["normal", "normal", "normal"]);
    });

    it("shows a clear error instead of crashing when a config file is missing", async () => {
        scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "folder-renamer-e2e-"));
        await fs.mkdir(path.join(scratchDir, "Some Folder"));

        const mainPage = app.windows()[0];
        const userDataPath = await app.evaluate(({ app }) => app.getPath("userData"));
        const prefixesPath = path.join(userDataPath, "data", "prefixes.json");
        const backup = await fs.readFile(prefixesPath, "utf8");

        try {
            await fs.rm(prefixesPath);

            await chooseFolder(app, mainPage, scratchDir);

            await stubConfirm(app, 0);
            await mainPage.click("#run-btn");
            await sleep(1000);

            await mainPage.waitForSelector("#run-error:not([hidden])");
            const errorText = await mainPage.textContent("#run-error");
            expect(errorText).toMatch(/^Failed to load JSON from .*prefixes\.json/);

            // The app itself must still be alive and responsive, not vanished.
            expect(app.windows().length).toBeGreaterThan(0);
        } finally {
            await fs.writeFile(prefixesPath, backup);
        }
    });

    it("leaves folders alone when the confirm dialog is cancelled", async () => {
        scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "folder-renamer-e2e-"));
        await fs.mkdir(path.join(scratchDir, "Holiday Snaps (digital)"));

        const mainPage = app.windows()[0];
        await chooseFolder(app, mainPage, scratchDir);

        await stubConfirm(app, 1);
        await mainPage.click("#run-btn");
        await sleep(500);

        expect(await fs.readdir(scratchDir)).toEqual(["Holiday Snaps (digital)"]);
        expect(await mainPage.textContent("#totals")).toBe("");
    });

    it("shows a readable message when the chosen folder has been deleted", async () => {
        scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "folder-renamer-e2e-"));
        const mainPage = app.windows()[0];
        await chooseFolder(app, mainPage, scratchDir);
        await fs.rm(scratchDir, { recursive: true, force: true });

        await mainPage.click("#preview-btn");
        await mainPage.waitForSelector("#run-error:not([hidden])");

        expect(await mainPage.textContent("#run-error")).toBe("That folder no longer exists.");
    });

    it("shows an error box when the config folder can't be opened", async () => {
        const mainPage = app.windows()[0];
        await app.evaluate(({ dialog, shell }) => {
            globalThis.errorBoxes = [];
            shell.openPath = async () => "Nothing to open it with.";
            dialog.showErrorBox = (title, content) => globalThis.errorBoxes.push([title, content]);
        });

        await mainPage.click("#config-btn");

        await expect
            .poll(() => app.evaluate(() => globalThis.errorBoxes))
            .toEqual([["Can't open the config folder", "Nothing to open it with."]]);
    });

    it("points to Reveal Config Folder in Preview when no rename rules are configured at all", async () => {
        scratchDir = await fs.mkdtemp(path.join(os.tmpdir(), "folder-renamer-e2e-"));
        await fs.mkdir(path.join(scratchDir, "Some Folder"));

        const mainPage = app.windows()[0];
        const userDataPath = await app.evaluate(({ app }) => app.getPath("userData"));
        const dataDir = path.join(userDataPath, "data");
        const patternFiles = ["prefixes.json", "removePatterns.json", "replacePatterns.json"];
        const backups = {};
        for (const file of patternFiles) {
            backups[file] = await fs.readFile(path.join(dataDir, file), "utf8");
        }

        try {
            for (const file of patternFiles) {
                await fs.writeFile(path.join(dataDir, file), "[]");
            }

            await chooseFolder(app, mainPage, scratchDir);

            await mainPage.click("#preview-btn");
            await sleep(800);

            const emptyStateText = await mainPage.evaluate(
                () => document.getElementById("empty-state").textContent,
            );
            expect(emptyStateText).toBe(
                "No rename rules configured yet. Click Reveal Config Folder to add some.",
            );
        } finally {
            for (const file of patternFiles) {
                await fs.writeFile(path.join(dataDir, file), backups[file]);
            }
        }
    });

    it("quits within a bounded time", async () => {
        const proc = app.process();
        const exitPromise = new Promise((resolve) => proc.once("exit", resolve));

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
