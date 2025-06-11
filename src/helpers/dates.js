/**
 * Pads a number with a leading zero if it's a single digit.
 *
 * @param {string|number} num - The number to pad.
 * @returns {string} The number as a 2-digit string.
 */
function pad(num) {
    return String(parseInt(num, 10)).padStart(2, "0");
}

/**
 * Maps three-letter month abbreviations to 2-digit numeric strings.
 * Used for parsing written month formats like "Nov 27, 2018".
 */
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

/**
 * Normalises various date formats in a string to the format (YYYY-MM-DD).
 *
 * Converts the following formats:
 * - Slashed dates: 10/26/19 or 10⁄26⁄19 → (2019-10-26)
 * - Written dates: Nov 27, 2018 or Jun 11th, 2015 → (2018-11-27)
 * - Hyphenated dates: 10-19-2018 → (2018-10-19)
 * - Bracketed day-month-year: (12-07-2020) → (2020-07-12)
 * - Dotted European dates: (07.11.2019) → (2019-11-07)
 * - Unwrapped ISO dates: 2018-01-20 → (2018-01-20)
 *
 * @param {string} name - The original string containing one or more date patterns.
 * @returns {string} The string with all recognised date formats normalised.
 */
function normaliseDates(name) {
    // 1. Convert slashed short dates (e.g. 10/26/19 or 10⁄26⁄19) → (2019-10-26)
    name = name.replace(
        /(\d{1,2})[\/⁄](\d{1,2})[\/⁄](\d{2})/g,
        (_, m, d, y) => {
            return `(${2000 + parseInt(y)}-${pad(m)}-${pad(d)})`;
        }
    );

    // 2. Convert written month dates (e.g. Nov 27, 2018 or Jun 11th, 2015) → (2018-11-27)
    name = name.replace(
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[ .]+(\d{1,2})(?:st|nd|rd|th)?,[ ]*(\d{4})/gi,
        (_, mon, day, year) => {
            const month = monthMap[mon.slice(0, 3)];
            return `(${year}-${month}-${pad(day)})`;
        }
    );

    // 3. Convert US-style dates (e.g. 10-19-2018) → (2018-10-19)
    name = name.replace(/\b(\d{1,2})-(\d{1,2})-(\d{4})\b/g, (_, m, d, y) => {
        return `(${y}-${pad(m)}-${pad(d)})`;
    });

    // 4. Convert incorrectly ordered bracketed dates (e.g. (12-07-2020)) → (2020-07-12)
    name = name.replace(/\((\d{1,2})-(\d{1,2})-(\d{4})\)/g, (_, d, m, y) => {
        return `(${y}-${pad(m)}-${pad(d)})`;
    });

    // 5. Convert dotted European-style dates (e.g. (07.11.2019)) → (2019-11-07)
    name = name.replace(/\((\d{1,2})\.(\d{1,2})\.(\d{4})\)/g, (_, d, m, y) => {
        return `(${y}-${pad(m)}-${pad(d)})`;
    });

    // 6. Wrap bare ISO-style dates (e.g. 2018-01-20) with brackets, unless already bracketed
    name = name.replace(
        /(?<!\()\b(\d{4})-(\d{2})-(\d{2})\b(?!\))/g,
        (_, y, m, d) => {
            return `(${y}-${m}-${d})`;
        }
    );

    return name;
}

export { normaliseDates };
