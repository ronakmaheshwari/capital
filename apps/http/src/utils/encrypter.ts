import { AlphanumericOTP } from "@repo/notifications";
import dotenv from "dotenv";

dotenv.config();

const SECRET_SALT = process.env.SECRET_SALT;

if (!SECRET_SALT) {
    throw new Error("No Secret KEY was provided! ");
}

export function encrypt(text: string): string {
    const randomPrefix = AlphanumericOTP(10);
    const randomSuffix = AlphanumericOTP(8);
    const reverseText = text.split("").reverse().join("");
    const saltedText = `${SECRET_SALT}${reverseText}${SECRET_SALT}`;
    return `${randomPrefix}${saltedText}${randomSuffix}`;
}

export function decrypt(encryptedString: string): string {
    const coreString = encryptedString.slice(10, -8);
    const unsalted = coreString.replace(new RegExp(SECRET_SALT, "g"), "");
    const originalText = unsalted.split("").reverse().join("");
    return originalText;
}

// ----------------- Helper functions -----------------

// Convert string to byte array
function strToBytes(str: string): number[] {
    return Array.from(new TextEncoder().encode(str));
}

// Convert byte array to hex string
function bytesToHex(bytes: Uint8Array | number[]): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// Simple pseudo SHA256 digest using Web Crypto API
async function sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    return bytesToHex(new Uint8Array(hashBuffer));
}

// ----------------- Signing / Verification -----------------

/**
 * Signs a message with a private key (pseudo signature)
 * @param message - string to sign
 * @param privateKey - string used as key
 * @returns base16 signature string
 */
export async function signMessage(message: string, privateKey: string): Promise<string> {
    const keyBytes = strToBytes(privateKey);
    const msgBytes = strToBytes(message);

    // Simple XOR with private key bytes
    const signatureBytes = msgBytes.map((b, i) => b ^ keyBytes[i % keyBytes.length]);

    // Hash the result to produce signature
    return await sha256(bytesToHex(signatureBytes));
}

/**
 * Verifies a message signature with a private key
 * @param message - original message
 * @param signature - signature to verify
 * @param privateKey - key used to sign
 * @returns boolean
 */
export async function verifySignature(
    message: string,
    signature: string,
    privateKey: string,
): Promise<boolean> {
    const expectedSignature = await signMessage(message, privateKey);
    return expectedSignature === signature;
}
