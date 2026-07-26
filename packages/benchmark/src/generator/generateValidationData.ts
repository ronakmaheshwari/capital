/**
 * generateValidationData.ts
 *
 * Assembles the final validation-data.json consumed by k6.
 *
 * Each record contains:
 *   - token        : JWT for the ticket-holder (user role) — NOT used by /validate
 *   - verifierToken: JWT for the verifier account (verifier role) — used in Authorization header
 *   - ciphertext   : XSalsa20-Poly1305 encrypted ticket payload (Base64)
 *   - nonce        : Encryption nonce (Base64)
 *   - ticketId     : UUID of the ticket row
 *
 * Production parity — validatorMiddleware requirements:
 *   1. Token must be a valid JWT signed with JWT_SECRET
 *   2. Token must exist in JwtToken table (not revoked, not expired)
 *   3. The token's user must have role="verifier"
 *   4. The token's user must have is_verified=true
 *
 * The `token` field (regular user JWT) is included for completeness and for
 * future component tests that may hit the user-facing HTTP API.
 *
 * The `verifierToken` field is the one the k6 script uses in Authorization.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { db } from "@repo/db";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { BenchmarkConfig } from "./benchmark.config.js";
import type { BenchmarkUser } from "./createUsers.js";
import type { BenchmarkVerifier } from "./createVerifiers.js";
import type { ValidationPayload } from "./encryptTickets.js";
import type { TicketRecord } from "./purchaseTickets.js";

/** Final record shape consumed by k6. */
export interface BenchmarkRecord {
    /** JWT of the ticket-holder (role=user). Included for completeness. */
    token: string;
    /** JWT of the verifier (role=verifier). Used in k6 Authorization header. */
    verifierToken: string;
    /** XSalsa20-Poly1305 ciphertext (Base64). */
    ciphertext: string;
    /** XSalsa20-Poly1305 nonce (Base64). */
    nonce: string;
    /** UUID of the Ticket row. */
    ticketId: string;
}

const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Generates and persists a JWT for a single benchmark user (role=user).
 * This token is stored for reference but is NOT used by /validate.
 */
async function generateAndPersistUserToken(userId: string, jwtSecret: string): Promise<string> {
    const expiresAt = new Date(Date.now() + JWT_EXPIRY_SECONDS * 1000);
    const token = jwt.sign(
        {
            userId,
        },
        jwtSecret,
        {
            expiresIn: JWT_EXPIRY_SECONDS as SignOptions["expiresIn"],
        },
    );
    await db.jwtToken.deleteMany({
        where: {
            userId,
        },
    });
    await db.jwtToken.create({
        data: {
            expires_at: expiresAt,
            issued_at: new Date(),
            token,
            userId,
        },
    });
    return token;
}

/**
 * Generates JWTs for all benchmark users and assembles the validation dataset.
 *
 * Verifier tokens are round-robined from the verifier pool so each record
 * carries a valid verifier-role JWT for the Authorization header.
 *
 * @param users - Benchmark users (role=user)
 * @param ticketRecords - From purchaseTickets.ts
 * @param payloads - From encryptTickets.ts
 * @param verifiers - Pool of verifier accounts (role=verifier) with minted JWTs
 * @param config - Benchmark configuration
 * @param jwtSecret - JWT signing secret
 * @param onProgress - Optional progress callback
 */
export async function generateValidationDataset(
    users: BenchmarkUser[],
    ticketRecords: TicketRecord[],
    payloads: ValidationPayload[],
    verifiers: BenchmarkVerifier[],
    config: BenchmarkConfig,
    jwtSecret: string,
    onProgress?: (completed: number, total: number) => void,
): Promise<BenchmarkRecord[]> {
    const ticketByUserId = new Map<string, TicketRecord>();
    for (const record of ticketRecords) {
        ticketByUserId.set(record.userId, record);
    }

    const payloadByTicketId = new Map<string, ValidationPayload>();
    for (const payload of payloads) {
        payloadByTicketId.set(payload.ticketId, payload);
    }

    const total = users.length;
    const batchSize = config.concurrency;
    const records: BenchmarkRecord[] = [];

    for (let i = 0; i < total; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        const results = await Promise.allSettled(
            batch.map(async (user, batchIdx) => {
                const globalIdx = i + batchIdx;

                const ticketRecord = ticketByUserId.get(user.id);
                if (!ticketRecord) {
                    throw new Error(`No ticket record found for user ${user.email}`);
                }

                const payload = payloadByTicketId.get(ticketRecord.ticketId);
                if (!payload) {
                    throw new Error(
                        `No validation payload found for ticket ${ticketRecord.ticketId}`,
                    );
                }

                // User JWT (role=user) — for reference / future user-facing tests
                const token = await generateAndPersistUserToken(user.id, jwtSecret);

                // Round-robin verifier token from the pool
                const verifier = verifiers[globalIdx % verifiers.length];
                if (!verifier) {
                    throw new Error("Verifier pool is empty");
                }

                return {
                    ciphertext: payload.ciphertext,
                    nonce: payload.nonce,
                    ticketId: ticketRecord.ticketId,
                    token,
                    verifierToken: verifier.token,
                } satisfies BenchmarkRecord;
            }),
        );

        for (const result of results) {
            if (result.status === "fulfilled") {
                records.push(result.value);
            }
        }

        onProgress?.(Math.min(i + batchSize, total), total);
    }

    return records;
}

/**
 * Writes the final validation dataset to disk as pretty-printed JSON.
 */
export async function writeValidationData(
    records: BenchmarkRecord[],
    outputPath: string,
): Promise<void> {
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, {
        recursive: true,
    });
    await fs.writeFile(outputPath, JSON.stringify(records, null, 2), "utf-8");
}
