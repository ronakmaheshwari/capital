/**
 * createVerifiers.ts
 *
 * Creates a small pool of benchmark verifier accounts.
 *
 * Production parity:
 *   - Role is set to "verifier" so validatorMiddleware passes the role check
 *   - is_verified=true to bypass email-OTP
 *   - Idempotent: returns existing verifiers if already present
 *
 * Why a pool instead of one verifier?
 *   k6 runs many VUs concurrently. Using a single verifier token means
 *   all VUs share one token. A small pool (default: 10) avoids any
 *   server-side per-user rate limiting while keeping setup simple.
 *
 * IEEE Access note:
 *   The validator token is included in the Authorization header of every
 *   /validate request. It is NOT the ticket-holder's token.
 */

import { db } from "@repo/db";
import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { BenchmarkConfig } from "./benchmark.config.js";

export interface BenchmarkVerifier {
    id: string;
    email: string;
    token: string;
}

const JWT_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Creates or retrieves a single verifier account and mints a JWT for it.
 */
async function createOrGetVerifier(
    index: number,
    config: BenchmarkConfig,
    saltRounds: number,
    jwtSecret: string,
): Promise<BenchmarkVerifier> {
    const email = `benchmarkverifier${String(index).padStart(3, "0")}@test.com`;

    const existing = await db.user.findUnique({ where: { email } });

    let userId: string;

    if (existing) {
        // Ensure role is verifier (may have been created as user in a prior run)
        if (existing.role !== "verifier") {
            await db.user.update({
                data: { is_verified: true, role: "verifier" },
                where: { id: existing.id },
            });
        }
        userId = existing.id;
    } else {
        const password = await bcrypt.hash(`VerifierPass#${index}`, saltRounds);
        const user = await db.user.create({
            data: {
                email,
                first_name: "Verifier",
                is_verified: true,
                last_name: String(index).padStart(3, "0"),
                password,
                role: "verifier",
            },
        });
        userId = user.id;
    }

    // Issue a fresh 7-day JWT and persist it
    const expiresAt = new Date(Date.now() + JWT_EXPIRY_SECONDS * 1000);
    const token = jwt.sign(
        { userId },
        jwtSecret,
        { expiresIn: JWT_EXPIRY_SECONDS as SignOptions["expiresIn"] },
    );

    await db.jwtToken.deleteMany({ where: { userId } });
    await db.jwtToken.create({
        data: { expires_at: expiresAt, issued_at: new Date(), token, userId },
    });

    return { email, id: userId, token };
}

/**
 * Creates the verifier pool (default: config.verifierCount accounts).
 * All verifiers are returned so the orchestrator can round-robin them
 * across the 1,000 benchmark records.
 */
export async function createBenchmarkVerifiers(
    config: BenchmarkConfig,
    saltRounds: number,
    jwtSecret: string,
): Promise<BenchmarkVerifier[]> {
    const count = config.verifierCount;
    const verifiers: BenchmarkVerifier[] = [];

    for (let i = 1; i <= count; i++) {
        const v = await createOrGetVerifier(i, config, saltRounds, jwtSecret);
        verifiers.push(v);
    }

    return verifiers;
}
