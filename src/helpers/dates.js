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
 * Maps full month names (case-insensitive) to 2-digit numeric strings.
 * Used for parsing full month name formats like "16 February 2025".
 */
const fullMonthMap = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
};

/**
 * Normalises various date formats in a string to the format (YYYY-MM-DD).
 *
 * Converts the following formats:
 * - Slashed dates: 10/26/19 or 10⁄26⁄19 → (2019-10-26)
 * - Written month (abbr.) dates: Nov 27, 2018 or Jun 11th, 2015 → (2018-11-27)
 * - US-style hyphenated dates: 10-19-2018 → (2018-10-19)
 * - Incorrectly ordered bracketed dates: (12-07-2020) → (2020-07-12)
 * - Dotted European dates: (07.11.2019) → (2019-11-07)
 * - Bare ISO dates: 2018-01-20 → (2018-01-20)
 * - Written full month name: 16 February 2025 → (2025-02-16)
 *
 * @param {string} name - The original string containing one or more date patterns.
 * @returns {string} The string with all recognised date formats normalised.
 */
function normaliseDates(name) {
    // 0. Convert dot-separated ISO-style dates (e.g. 2022.03.23) → (2022-03-23)
    name = name.replace(/\b(\d{4})\.(\d{1,2})\.(\d{1,2})\b/g, (_, y, m, d) => {
        return `(${y}-${pad(m)}-${pad(d)})`;
    });

    // 1. Convert slashed short dates (e.g. 10/26/19 or 10⁄26⁄19) → (2019-10-26)
    name = name.replace(
        /(\d{1,2})[\/⁄](\d{1,2})[\/⁄](\d{2})/g,
        (_, m, d, y) => {
            return `(${2000 + parseInt(y)}-${pad(m)}-${pad(d)})`;
        }
    );

    // 1b. Convert dotted short US-style dates (e.g. 03.28.13) → (2013-03-28)
    name = name.replace(/\b(\d{1,2})\.(\d{1,2})\.(\d{2})\b/g, (_, m, d, y) => {
        return `(${2000 + parseInt(y)}-${pad(m)}-${pad(d)})`;
    });

    // 1c. Convert dotted full US-style dates (e.g. 03.23.2022) → (2022-03-23)
    // Skips dates already wrapped in brackets, e.g. (07.11.2019), since those
    // are handled by rule 5 below using European (day-first) ordering.
    name = name.replace(
        /(?<!\()\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b(?!\))/g,
        (_, m, d, y) => {
            return `(${y}-${pad(m)}-${pad(d)})`;
        }
    );

    // 2. Convert written month (abbr.) dates (e.g. Nov 27, 2018 or Jun 11th, 2015) → (2018-11-27)
    name = name.replace(
        /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[ .]+(\d{1,2})(?:st|nd|rd|th)?,[ ]*(\d{4})/gi,
        (_, mon, day, year) => {
            const month = monthMap[mon.slice(0, 3)];
            return `(${year}-${month}-${pad(day)})`;
        }
    );

    // 3. Convert US-style hyphenated dates (e.g. 10-19-2018) → (2018-10-19)
    // Skips dates already wrapped in brackets, e.g. (12-07-2020), since those
    // are handled by rule 4 below using European (day-first) ordering.
    name = name.replace(
        /(?<!\()\b(\d{1,2})-(\d{1,2})-(\d{4})\b(?!\))/g,
        (_, m, d, y) => {
            return `(${y}-${pad(m)}-${pad(d)})`;
        }
    );

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

    // 7. Convert written full month name dates (e.g. 16 February 2025) → (2025-02-16)
    name = name.replace(
        /\b(\d{1,2})[ ]+(January|February|March|April|May|June|July|August|September|October|November|December)[ ]+(\d{4})\b/gi,
        (_, day, month, year) => {
            const monthNum = fullMonthMap[month.toLowerCase()];
            return `(${year}-${monthNum}-${pad(day)})`;
        }
    );

    // 7b. Convert full month name with ordinal day (e.g. 23rd March, 2022) → (2022-03-23)
    name = name.replace(
        /\b(\d{1,2})(?:st|nd|rd|th)?[ ]+(January|February|March|April|May|June|July|August|September|October|November|December),?[ ]+(\d{4})\b/gi,
        (_, day, month, year) => {
            const monthNum = fullMonthMap[month.toLowerCase()];
            return `(${year}-${monthNum}-${pad(day)})`;
        }
    );

    return name;
}

export { normaliseDates };
