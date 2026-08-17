import fs from "fs/promises";
import path from "path";

import { describe, expect, it } from "vitest";

// This is a static check on package.json, not a real Electron launch, on
// purpose — verifying the userData-naming fix by actually launching the app
// would mean touching real userData paths, which now hold Karl's real,
// hand-curated pattern data (not just test scaffolding).

describe("package.json userData naming", () => {
    it("sets productName and main so Electron resolves its own userData folder, not the generic 'Electron' one", async () => {
        const pkgPath = path.join(
            path.dirname(new URL(import.meta.url).pathname),
            "..",
            "package.json"
        );
        const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));

        // Without these, Electron falls back to app.getPath('userData')
        // resolving to the shared ~/Library/Application Support/Electron/
        // folder instead of this app's own — see the project's memory notes
        // on the userData-collision bug this caused.
        expect(pkg.productName).toBe("Folder Renamer");
        expect(pkg.main).toBe("electron/main.js");
    });
});
