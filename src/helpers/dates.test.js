import { describe, expect, it } from "vitest";

import { normaliseDates } from "./dates.js";

describe("normaliseDates", () => {
    it("converts dot-separated ISO-style dates", () => {
        expect(normaliseDates("Photos 2022.03.23")).toBe(
            "Photos (2022-03-23)"
        );
    });

    it("converts slashed short dates", () => {
        expect(normaliseDates("Photos 10/26/19")).toBe(
            "Photos (2019-10-26)"
        );
    });

    it("converts slashed short dates using a fraction slash", () => {
        expect(normaliseDates("Photos 10⁄26⁄19")).toBe(
            "Photos (2019-10-26)"
        );
    });

    it("converts dotted short US-style dates", () => {
        expect(normaliseDates("Photos 03.28.13")).toBe(
            "Photos (2013-03-28)"
        );
    });

    it("converts dotted full US-style dates", () => {
        expect(normaliseDates("Photos 03.23.2022")).toBe(
            "Photos (2022-03-23)"
        );
    });

    it("converts abbreviated written month dates", () => {
        expect(normaliseDates("Photos Nov 27, 2018")).toBe(
            "Photos (2018-11-27)"
        );
    });

    it("converts abbreviated written month dates with an ordinal day", () => {
        expect(normaliseDates("Photos Jun 11th, 2015")).toBe(
            "Photos (2015-06-11)"
        );
    });

    it("converts US-style hyphenated dates", () => {
        expect(normaliseDates("Photos 10-19-2018")).toBe(
            "Photos (2018-10-19)"
        );
    });

    it("converts incorrectly ordered bracketed dates", () => {
        expect(normaliseDates("Photos (12-07-2020)")).toBe(
            "Photos (2020-07-12)"
        );
    });

    it("converts dotted European-style bracketed dates", () => {
        expect(normaliseDates("Photos (07.11.2019)")).toBe(
            "Photos (2019-11-07)"
        );
    });

    it("wraps bare ISO-style dates in brackets", () => {
        expect(normaliseDates("Photos 2018-01-20")).toBe(
            "Photos (2018-01-20)"
        );
    });

    it("leaves already-bracketed ISO-style dates untouched", () => {
        expect(normaliseDates("Photos (2018-01-20)")).toBe(
            "Photos (2018-01-20)"
        );
    });

    it("converts written full month name dates", () => {
        expect(normaliseDates("Photos 16 February 2025")).toBe(
            "Photos (2025-02-16)"
        );
    });

    it("converts full month name dates with an ordinal day", () => {
        expect(normaliseDates("Photos 23rd March, 2022")).toBe(
            "Photos (2022-03-23)"
        );
    });

    it("leaves strings with no recognisable date unchanged", () => {
        expect(normaliseDates("No dates here")).toBe("No dates here");
    });
});
