/**
 * unit/notifications/otpGenerator.unit.test.ts
 *
 * Unit tests for packages/notifications/src/utils/otpGenerator.ts
 *
 * Tests cover:
 *  - NumericOTP: correct length (as string digits), is a number, uses only digits
 *  - AlphabeticOTP: correct length, only uppercase letters
 *  - AlphanumericOTP: correct length, only alphanumeric chars
 *  - Edge cases: length 0, length 1, large length
 *  - Randomness: consecutive calls produce different outputs (statistical)
 */

import {
    AlphabeticOTP,
    AlphanumericOTP,
    NumericOTP,
} from "../../../../notifications/src/utils/otpGenerator";

describe("OTP Generator – @repo/notifications", () => {
    // ─────────────────────────────────────────────────────────────────────────
    // NumericOTP
    // ─────────────────────────────────────────────────────────────────────────
    describe("NumericOTP(length)", () => {
        it("PASS: returns a number", () => {
            const otp = NumericOTP(6);
            expect(typeof otp).toBe("number");
        });

        it("PASS: generated number has at most `length` digits", () => {
            const otp = NumericOTP(6);
            // Number could have fewer digits if leading zeros get dropped (e.g. 012345 → 12345)
            expect(String(otp).length).toBeLessThanOrEqual(6);
        });

        it("PASS: returns 0 for length 0 (empty string → Number('') = 0)", () => {
            const otp = NumericOTP(0);
            expect(otp).toBe(0);
        });

        it("PASS: length 1 returns a single digit (1-9 range from charset)", () => {
            for (let i = 0; i < 20; i++) {
                const otp = NumericOTP(1);
                expect(otp).toBeGreaterThanOrEqual(1);
                expect(otp).toBeLessThanOrEqual(9);
            }
        });

        it("PASS: generates non-zero values most of the time for length ≥ 4", () => {
            // Run 50 times; at least 40 should be non-zero
            let nonZeroCount = 0;
            for (let i = 0; i < 50; i++) {
                if (NumericOTP(4) !== 0) nonZeroCount++;
            }
            expect(nonZeroCount).toBeGreaterThanOrEqual(40);
        });

        it("PASS: produces statistically different values (not always the same)", () => {
            const results = new Set(Array.from({ length: 20 }, () => NumericOTP(6)));
            expect(results.size).toBeGreaterThan(1);
        });

        it("PASS: works for large length (20 digits)", () => {
            const otp = NumericOTP(20);
            expect(typeof otp).toBe("number");
            expect(otp).toBeGreaterThan(0);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // AlphabeticOTP
    // ─────────────────────────────────────────────────────────────────────────
    describe("AlphabeticOTP(length)", () => {
        it("PASS: returns a string", () => {
            expect(typeof AlphabeticOTP(6)).toBe("string");
        });

        it("PASS: returns a string of exactly `length` characters", () => {
            expect(AlphabeticOTP(6)).toHaveLength(6);
            expect(AlphabeticOTP(10)).toHaveLength(10);
            expect(AlphabeticOTP(1)).toHaveLength(1);
        });

        it("PASS: contains only uppercase letters A–Z", () => {
            const otp = AlphabeticOTP(50);
            expect(otp).toMatch(/^[A-Z]+$/);
        });

        it("PASS: returns empty string for length 0", () => {
            expect(AlphabeticOTP(0)).toBe("");
        });

        it("FAIL: does NOT contain lowercase letters or digits", () => {
            const otp = AlphabeticOTP(100);
            expect(otp).not.toMatch(/[a-z0-9]/);
        });

        it("PASS: produces statistically different values", () => {
            const results = new Set(Array.from({ length: 20 }, () => AlphabeticOTP(8)));
            expect(results.size).toBeGreaterThan(1);
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // AlphanumericOTP
    // ─────────────────────────────────────────────────────────────────────────
    describe("AlphanumericOTP(length)", () => {
        it("PASS: returns a string", () => {
            expect(typeof AlphanumericOTP(8)).toBe("string");
        });

        it("PASS: returns a string of exactly `length` characters", () => {
            expect(AlphanumericOTP(8)).toHaveLength(8);
            expect(AlphanumericOTP(10)).toHaveLength(10);
            expect(AlphanumericOTP(1)).toHaveLength(1);
        });

        it("PASS: contains only uppercase letters A–Z and digits 1–9", () => {
            const otp = AlphanumericOTP(200);
            expect(otp).toMatch(/^[A-Z1-9]+$/);
        });

        it("PASS: returns empty string for length 0", () => {
            expect(AlphanumericOTP(0)).toBe("");
        });

        it("FAIL: does NOT contain lowercase letters or special characters", () => {
            const otp = AlphanumericOTP(200);
            expect(otp).not.toMatch(/[a-z!@#$%^&*]/);
        });

        it("PASS: produces statistically different values", () => {
            const results = new Set(Array.from({ length: 20 }, () => AlphanumericOTP(10)));
            expect(results.size).toBeGreaterThan(1);
        });

        it("PASS: used correctly as a prefix/suffix in encrypter — 10 and 8 char variants work", () => {
            const prefix = AlphanumericOTP(10);
            const suffix = AlphanumericOTP(8);
            expect(prefix).toHaveLength(10);
            expect(suffix).toHaveLength(8);
        });
    });
});
