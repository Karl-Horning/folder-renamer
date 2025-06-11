import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { normaliseDates } from "./helpers/dates.js";
import { moveImageCountAndDate, cleanupPunctuation } from "./helpers/text.js";

dotenv.config();

const directoryPath = process.env.DIRECTORY_PATH;

if (!directoryPath) {
    console.error("Error: DIRECTORY_PATH not set in .env");
    process.exit(1);
}

fs.readdir(directoryPath, { withFileTypes: true }, (err, entries) => {
    if (err) {
        return console.error("Failed to read directory:", err);
    }

    entries.forEach((entry) => {
        if (entry.isDirectory()) {
            const oldName = entry.name;
            let newName = oldName
                .replace(/ - /g, ", ")
                .replace(/ • /g, ", ")
                .replace(/Re;/g, "")
                .replace(/.com/g, "")
                .replace(/.nl/g, "NL")
                .replace(/.NL/g, "NL")
                // .replace(/\./g, "-")
                // Image sizes
                .replace(/1000px/g, "")
                .replace(/1920px/g, "")
                .replace(/2500px/g, "")
                .replace(/5800px/g, "")
                .replace(/1663x2495/g, "")
                .replace(/2000x3000/g, "")
                .replace(/2495x1663/g, "")
                .replace(/2500x1667/g, "")
                .replace(/ px/g, "")
                .trim();

            // 🔄 Normalise image count patterns to (x###)
            newName = newName.replace(
                /\b(\d{2,5})(?: ?(pics?|photos?|images?)|[xX])\b|\b[xX](\d{2,5})\b/gi,
                (_, num1, _group2, num2) => `(x${num1 || num2})`
            );

            newName = normaliseDates(newName);
            newName = moveImageCountAndDate(newName);
            newName = cleanupPunctuation(newName);

            if (newName !== oldName) {
                const oldPath = path.join(directoryPath, oldName);
                const newPath = path.join(directoryPath, newName);

                fs.rename(oldPath, newPath, (renameErr) => {
                    if (renameErr) {
                        console.error(
                            `Error renaming '${oldName}' to '${newName}':`,
                            renameErr
                        );
                    } else {
                        console.log(`Renamed: '${oldName}' → '${newName}'`);
                    }
                });
            }
        }
    });
});
