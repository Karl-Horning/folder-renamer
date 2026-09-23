import fs from "fs/promises";
import path from "path";

import { describe, expect, it } from "vitest";

// This is a static check on package.json, because launching the app would touch the installed app's userData folder.

describe("package.json userData naming", () => {
    it("sets productName and main so Electron resolves its own userData folder, not the generic 'Electron' one", async () => {
        const pkgPath = path.join(
            path.dirname(new URL(import.meta.url).pathname),
            "..",
            "package.json",
        );
        const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));

        // Without these, Electron resolves userData to the shared ~/Library/Application Support/Electron/ folder.
        expect(pkg.productName).toBe("Folder Renamer");
        expect(pkg.main).toBe("electron/main.js");
    });
});
