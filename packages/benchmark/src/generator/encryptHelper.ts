/**
 * encryptHelper.ts
 *
 * Re-exports the application's private-key encryption helpers so they can be
 * imported by the generator without pulling in Express or other HTTP-layer deps.
 *
 * Production parity:
 *   The encrypt/decrypt logic is identical to apps/http/src/utils/encrypter.ts:
 *     1. Reverse the plaintext.
 *     2. Wrap with SECRET_SALT on both sides.
 *     3. Prepend a random 10-char prefix and append a random 8-char suffix.
 *
 *   Decryption strips the prefix/suffix and reverses the salting.
 *
 * Rationale for a separate file:
 *   apps/http/src/utils/encrypter.ts imports @repo/notifications (for OTP
 *   helpers) which in turn wires email services. Importing it directly in the
 *   generator would require Resend/Redis credentials at generation time.
 *   This file reproduces only the encrypt/decrypt functions and their deps.
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the monorepo root and apps/http as a fallback.
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../../apps/http/.env") });

const SECRET_SALT = process.env.SECRET_SALT;

if (!SECRET_SALT) {
    throw new Error(
        "[encryptHelper] SECRET_SALT is not set. " +
        "Please ensure it is present in packages/benchmark/.env or apps/http/.env.",
    );
}

/**
 * Generates a random alphanumeric string of the given length.
 * Mirrors the AlphanumericOTP() utility from @repo/notifications.
 */
function randomAlphanumeric(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Encrypts a plaintext string using the same algorithm as the production
 * apps/http/src/utils/encrypter.ts#encrypt().
 *
 * Algorithm:
 *   encrypted = randomPrefix(10) + SECRET_SALT + reverse(text) + SECRET_SALT + randomSuffix(8)
 */
export function encrypt(text: string): string {
    const randomPrefix = randomAlphanumeric(10);
    const randomSuffix = randomAlphanumeric(8);
    const reverseText = text.split("").reverse().join("");
    const saltedText = `${SECRET_SALT}${reverseText}${SECRET_SALT}`;
    return `${randomPrefix}${saltedText}${randomSuffix}`;
}

/**
 * Decrypts a string previously encrypted with encrypt().
 * Mirrors apps/http/src/utils/encrypter.ts#decrypt().
 */
export function decrypt(encryptedString: string): string {
    const coreString = encryptedString.slice(10, -8);
    const unsalted = coreString.split(SECRET_SALT as string).join("");
    return unsalted.split("").reverse().join("");
}
