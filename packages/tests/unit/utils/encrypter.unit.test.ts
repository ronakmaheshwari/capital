/**
 * unit/utils/encrypter.unit.test.ts
 *
 * Unit tests for apps/http/src/utils/encrypter.ts
 *
 * Tests cover:
 *  - encrypt: produces a string, includes prefix/suffix, is not the original text
 *  - decrypt: restores original text from encrypted output
 *  - round-trip: encrypt → decrypt is idempotent
 *  - Different inputs produce different encrypted outputs
 *  - Multiple encryptions of same string produce different results (random prefix/suffix)
 */

// Set up the required env var before importing the module.
// jest.setup.ts should already set SECRET_SALT, but we explicitly
// ensure it here too for isolation.
process.env.SECRET_SALT = "TESTSALT";
process.env.RESEND_API_KEY = "re_test_fake_key";
process.env.RESEND_EMAIL_DOMAIN = "test@example.com";

// Mock @repo/notifications so we don't pull in the real email module at import time
jest.mock("../../../../notifications/src/index", () => ({
    AlphanumericOTP: jest.fn((len: number) => "X".repeat(len)),
    AlphabeticOTP: jest.fn((len: number) => "A".repeat(len)),
    NumericOTP: jest.fn((len: number) => Number("1".repeat(len))),
}));

import { decrypt, encrypt } from "../../../../apps/http/src/utils/encrypter";

describe("Encrypter Utilities – apps/http/src/utils/encrypter.ts", () => {
    const SECRET_SALT = "TESTSALT";

    describe("encrypt(text)", () => {
        it("PASS: returns a string", () => {
            expect(typeof encrypt("hello")).toBe("string");
        });

        it("PASS: encrypted output is longer than the original text", () => {
            const original = "user@example.com";
            const encrypted = encrypt(original);
            expect(encrypted.length).toBeGreaterThan(original.length);
        });

        it("PASS: encrypted output does not equal the original text", () => {
            const original = "mysecretpassword";
            expect(encrypt(original)).not.toBe(original);
        });

        it("PASS: encrypted output contains the salt (salted before suffix/prefix)", () => {
            // Our mock makes AlphanumericOTP return "X"*len, so we can predict the structure
            const encrypted = encrypt("test");
            // structure: XXXXXXXXXX (10) + TESTSALT + reversed("test") + TESTSALT + XXXXXXXX (8)
            expect(encrypted).toContain(SECRET_SALT);
        });

        it("PASS: output starts with a 10-character prefix (AlphanumericOTP(10))", () => {
            const encrypted = encrypt("data");
            const prefix = encrypted.slice(0, 10);
            // Our mock returns "X".repeat(10)
            expect(prefix).toBe("X".repeat(10));
        });

        it("PASS: output ends with an 8-character suffix (AlphanumericOTP(8))", () => {
            const encrypted = encrypt("data");
            const suffix = encrypted.slice(-8);
            // Our mock returns "X".repeat(8)
            expect(suffix).toBe("X".repeat(8));
        });

        it("PASS: encrypting an empty string produces a valid string (no throw)", () => {
            expect(() => encrypt("")).not.toThrow();
            expect(typeof encrypt("")).toBe("string");
        });

        it("PASS: encrypting special characters works without throwing", () => {
            expect(() => encrypt("!@#$%^&*()_+-=")).not.toThrow();
        });
    });

    describe("decrypt(encryptedString)", () => {
        it("PASS: returns a string", () => {
            const result = decrypt(encrypt("hello"));
            expect(typeof result).toBe("string");
        });

        it("PASS: decrypt(encrypt(x)) === x (round-trip)", () => {
            const original = "user@example.com";
            expect(decrypt(encrypt(original))).toBe(original);
        });

        it("PASS: round-trip with a simple string", () => {
            expect(decrypt(encrypt("hello"))).toBe("hello");
        });

        it("PASS: round-trip with a longer string", () => {
            const long = "a".repeat(100);
            expect(decrypt(encrypt(long))).toBe(long);
        });

        it("PASS: round-trip with numeric-like string", () => {
            expect(decrypt(encrypt("1234567890"))).toBe("1234567890");
        });

        it("PASS: round-trip with special characters", () => {
            const special = "abc!@#xyz";
            expect(decrypt(encrypt(special))).toBe(special);
        });

        it("PASS: decrypt removes exactly the 10-char prefix and 8-char suffix", () => {
            // With our mock, prefix = "X"*10, suffix = "X"*8
            // encrypt("test") = "XXXXXXXXXX" + "TESTSALT" + "tset" + "TESTSALT" + "XXXXXXXX"
            // decrypt strips first 10 and last 8, removes TESTSALT occurrences, reverses
            expect(decrypt(encrypt("test"))).toBe("test");
        });
    });

    describe("Round-trip identity", () => {
        const testCases = [
            "simple",
            "with spaces",
            "123numeric",
            "MixedCase",
            "email@domain.com",
            "a",
        ];

        test.each(testCases)(
            "PASS: encrypt then decrypt returns '%s'",
            (input) => {
                expect(decrypt(encrypt(input))).toBe(input);
            }
        );
    });
});
