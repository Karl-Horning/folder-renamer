require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { normaliseDates } = require("./helpers/dates");

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

            newName = normaliseDates(newName);

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
