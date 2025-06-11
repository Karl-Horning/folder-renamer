require("dotenv").config();
const fs = require("fs");
const path = require("path");

const directoryPath = process.env.DIRECTORY_PATH;

if (!directoryPath) {
    console.error("Error: DIRECTORY_PATH not set in .env");
    process.exit(1);
}

// Helper to pad numbers
function pad(num) {
    return String(parseInt(num, 10)).padStart(2, "0");
}

// Month lookup for written dates
const monthMap = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
};

// Replace slashed or written date strings with (YYYY-MM-DD)
function normaliseDates(name) {
    // 1. Convert slashed dates like 10⁄26⁄19 or 10/26/19 → (2019-10-26)
    name = name.replace(
        /(\d{1,2})[\/⁄](\d{1,2})[\/⁄](\d{2})/g,
        (_, m, d, y) => {
            return `(${2000 + parseInt(y)}-${pad(m)}-${pad(d)})`;
        }
    );

    // 2. Convert written dates like "Nov 27, 2018" or "Jun 11th, 2015" → (2018-11-27)
    name = name.replace(
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[ .]+(\d{1,2})(?:st|nd|rd|th)?,[ ]*(\d{4})/gi,
        (_, mon, day, year) => {
            const month = monthMap[mon.slice(0, 3)];
            return `(${year}-${month}-${pad(day)})`;
        }
    );

    // 3. Convert MM-DD-YYYY (e.g. 10-19-2018) → (2018-10-19)
    name = name.replace(/\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g, (_, m, d, y) => {
        return `(${y}-${pad(m)}-${pad(d)})`;
    });

    // 4. Convert wrongly formatted bracketed dates like (12-07-2020) → (2020-07-12)
    name = name.replace(/\((\d{1,2})-(\d{1,2})-(\d{4})\)/g, (_, d, m, y) => {
        return `(${y}-${pad(m)}-${pad(d)})`;
    });

    // 4.5 Convert dotted European-style dates like (07.11.2019) → (2019-11-07)
    name = name.replace(/\((\d{1,2})\.(\d{1,2})\.(\d{4})\)/g, (_, d, m, y) => {
        return `(${y}-${pad(m)}-${pad(d)})`;
    });

    // 5. Wrap bare ISO-style YYYY-MM-DD in brackets, unless already wrapped
    name = name.replace(
        /(?<!\()\b(\d{4})-(\d{2})-(\d{2})\b(?!\))/g,
        (_, y, m, d) => {
            return `(${y}-${m}-${d})`;
        }
    );

    return name;
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
