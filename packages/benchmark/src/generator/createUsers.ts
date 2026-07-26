/**
 * createUsers.ts
 *
 * Creates benchmark users with Ed25519 keypairs.
 *
 * Production parity:
 *   - Calls generateKeyPair() from @repo/keygen (libsodium Ed25519)
 *   - Encrypts private key with the application's encrypt() utility (same SECRET_SALT)
 *   - Sets is_verified=true to bypass the email-OTP flow (benchmark only)
 *   - Idempotent: returns the existing user if the email already exists
 *
 * IEEE Access reproducibility note:
 *   - User identifiers follow the pattern benchmark00001@test.com … benchmarkNNNNN@test.com
 *   - Padding width is 5 digits regardless of the user count configured.
 */

import { db } from "@repo/db";
import { generateKeyPair } from "@repo/keygen";
import bcrypt from "bcrypt";
import type { BenchmarkConfig } from "./benchmark.config.js";
import { decrypt, encrypt } from "./encryptHelper.js";

/** Minimal user record returned to callers. */
export interface BenchmarkUser {
    id: string;
    email: string;
    /** Base64-encoded Ed25519 private key (plaintext — used for signing tickets). */
    privateKey: string;
    /** Base64-encoded Ed25519 public key (stored on the User record). */
    publicKey: string;
}

/** Failure record written to failed-users.json. */
export interface FailedUser {
    email: string;
    reason: string;
}

/**
 * Formats a 1-based user index into the padded email format:
 *   1  → "benchmark00001@test.com"
 *   42 → "benchmark00042@test.com"
 */
function formatEmail(index: number, prefix: string, domain: string): string {
    return `${prefix}${String(index).padStart(5, "0")}@${domain}`;
}

/**
 * Returns a deterministic first/last name pair for a given index.
 */
function nameForIndex(index: number): {
    firstName: string;
    lastName: string;
} {
    const firstNames = [
        "Alice",
        "Bob",
        "Carol",
        "Dave",
        "Eve",
        "Frank",
        "Grace",
        "Hank",
        "Irene",
        "Jack",
    ];
    const lastNames = [
        "Smith",
        "Jones",
        "Williams",
        "Taylor",
        "Brown",
        "Davies",
        "Evans",
        "Wilson",
        "Thomas",
        "Roberts",
    ];
    return {
        firstName: firstNames[index % firstNames.length] ?? "Benchmark",
        lastName: lastNames[Math.floor(index / firstNames.length) % lastNames.length] ?? "User",
    };
}

/**
 * Creates or retrieves a single benchmark user.
 *
 * If the user already exists with keypair + is_verified, returns existing record.
 * If keypair is missing (partial prior run), regenerates and patches.
 */
export async function createOrGetUser(
    index: number,
    config: BenchmarkConfig,
    saltRounds: number,
): Promise<BenchmarkUser> {
    const email = formatEmail(index, config.userEmailPrefix, config.userEmailDomain);
    const { firstName, lastName } = nameForIndex(index);

    const existing = await db.user.findUnique({
        where: {
            email,
        },
    });

    if (existing) {
        if (existing.encrypted_private_key && existing.public_key) {
            const privateKey = decrypt(existing.encrypted_private_key);
            return {
                email: existing.email,
                id: existing.id,
                privateKey,
                publicKey: existing.public_key,
            };
        }

        // Missing keypair — regenerate
        const { publicKey, privateKey } = await generateKeyPair();
        const encrypted_private_key = encrypt(privateKey);
        await db.user.update({
            data: {
                encrypted_private_key,
                is_verified: true,
                public_key: publicKey,
            },
            where: {
                id: existing.id,
            },
        });
        return {
            email: existing.email,
            id: existing.id,
            privateKey,
            publicKey,
        };
    }

    // New user
    const { publicKey, privateKey } = await generateKeyPair();
    const encrypted_private_key = encrypt(privateKey);
    const password = await bcrypt.hash(`BenchPass#${index}`, saltRounds);

    const user = await db.user.create({
        data: {
            email,
            encrypted_private_key,
            first_name: firstName,
            is_verified: true,
            last_name: lastName,
            password,
            public_key: publicKey,
            role: "user",
        },
    });

    return {
        email: user.email,
        id: user.id,
        privateKey,
        publicKey,
    };
}

/**
 * Creates all benchmark users in parallel batches.
 *
 * Uses Promise.allSettled so individual failures do not abort the entire run.
 */
export async function createBenchmarkUsers(
    config: BenchmarkConfig,
    saltRounds: number,
    onProgress?: (completed: number, total: number) => void,
): Promise<{
    users: BenchmarkUser[];
    failed: FailedUser[];
}> {
    const total = config.users;
    const batchSize = config.concurrency;
    const users: BenchmarkUser[] = [];
    const failed: FailedUser[] = [];

    for (let batchStart = 1; batchStart <= total; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize - 1, total);
        const indices = Array.from(
            {
                length: batchEnd - batchStart + 1,
            },
            (_, i) => batchStart + i,
        );

        const results = await Promise.allSettled(
            indices.map((idx) => createOrGetUser(idx, config, saltRounds)),
        );

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            const idx = indices[i];
            if (result === undefined || idx === undefined) continue;

            if (result.status === "fulfilled") {
                users.push(result.value);
            } else {
                failed.push({
                    email: formatEmail(idx, config.userEmailPrefix, config.userEmailDomain),
                    reason:
                        result.reason instanceof Error
                            ? result.reason.message
                            : String(result.reason),
                });
            }
        }

        onProgress?.(Math.min(batchEnd, total), total);
    }

    return {
        failed,
        users,
    };
}
