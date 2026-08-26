/**
 * unit/helpers/date.unit.test.ts
 *
 * Unit tests for apps/http/src/helper/date.ts
 *
 * Tests cover:
 *  - formatDate: day/month/year/weekday in Indian locale
 *  - formatTime: 12-hour clock with AM/PM
 */

import {
    formatDate,
    formatTime,
} from "../../../../apps/http/src/helper/date";

describe("Date Helpers – apps/http/src/helper/date.ts", () => {
    // ─────────────────────────────────────────────────────────────────────────
    // formatDate
    // ─────────────────────────────────────────────────────────────────────────
    describe("formatDate(date)", () => {
        it("PASS: returns a non-empty string", () => {
            const result = formatDate(new Date("2025-08-15T10:00:00"));
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(0);
        });

        it("PASS: includes the year in the formatted output", () => {
            const result = formatDate(new Date("2025-01-20T10:00:00"));
            expect(result).toContain("2025");
        });

        it("PASS: includes a valid month name (long format)", () => {
            const result = formatDate(new Date("2025-08-15T10:00:00"));
            // Month names in en-IN locale (August = "August")
            expect(result).toContain("August");
        });

        it("PASS: includes a weekday name (long format)", () => {
            // 2025-08-15 is a Friday
            const result = formatDate(new Date("2025-08-15T10:00:00"));
            expect(result).toContain("Friday");
        });

        it("PASS: day is zero-padded (2-digit)", () => {
            const result = formatDate(new Date("2025-01-05T10:00:00"));
            // Should contain "05" for the day in en-IN locale
            expect(result).toMatch(/\b05\b/);
        });

        it("PASS: different dates produce different outputs", () => {
            const d1 = formatDate(new Date("2025-01-01T00:00:00"));
            const d2 = formatDate(new Date("2025-12-31T00:00:00"));
            expect(d1).not.toBe(d2);
        });

        it("PASS: works for a date at midnight (start of day)", () => {
            expect(() => formatDate(new Date("2025-06-01T00:00:00"))).not.toThrow();
        });

        it("PASS: works for a date at end of day", () => {
            expect(() => formatDate(new Date("2025-06-01T23:59:59"))).not.toThrow();
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // formatTime
    // ─────────────────────────────────────────────────────────────────────────
    describe("formatTime(date)", () => {
        it("PASS: returns a non-empty string", () => {
            const result = formatTime(new Date("2025-08-15T14:30:00"));
            expect(typeof result).toBe("string");
            expect(result.length).toBeGreaterThan(0);
        });

        it("PASS: includes AM or PM for 12-hour format", () => {
            const morning = formatTime(new Date("2025-08-15T09:00:00"));
            const afternoon = formatTime(new Date("2025-08-15T14:00:00"));
            expect(morning.toLowerCase()).toMatch(/am|pm/);
            expect(afternoon.toLowerCase()).toMatch(/am|pm/);
        });

        it("PASS: morning time shows AM", () => {
            const result = formatTime(new Date("2025-08-15T09:30:00"));
            expect(result.toUpperCase()).toContain("AM");
        });

        it("PASS: afternoon time shows PM", () => {
            const result = formatTime(new Date("2025-08-15T14:30:00"));
            expect(result.toUpperCase()).toContain("PM");
        });

        it("PASS: midnight time shows 12:00 AM", () => {
            const result = formatTime(new Date("2025-08-15T00:00:00"));
            expect(result).toContain("12:00");
            expect(result.toUpperCase()).toContain("AM");
        });

        it("PASS: noon time shows 12:00 PM", () => {
            const result = formatTime(new Date("2025-08-15T12:00:00"));
            expect(result).toContain("12:00");
            expect(result.toUpperCase()).toContain("PM");
        });

        it("PASS: different times produce different outputs", () => {
            const t1 = formatTime(new Date("2025-08-15T08:00:00"));
            const t2 = formatTime(new Date("2025-08-15T20:00:00"));
            expect(t1).not.toBe(t2);
        });
    });
});
