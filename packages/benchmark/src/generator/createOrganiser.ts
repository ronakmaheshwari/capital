/**
 * createOrganiser.ts
 *
 * Creates or retrieves the single benchmark organiser account.
 *
 * Production parity:
 *   - Creates a user with role="organiser" and is_verified=true
 *   - Creates a wallet for the organiser (receives ticket revenue during purchases)
 *   - Creates one card for the organiser
 *
 * Idempotency:
 *   If an organiser with config.organiserEmail already exists, it is reused.
 *   Wallet and card are created via upsert/findFirst to avoid duplicates.
 */

import { db } from "@repo/db";
import bcrypt from "bcrypt";
import type { BenchmarkConfig } from "./benchmark.config.js";

/** Minimal organiser record returned to callers. */
export interface BenchmarkOrganiser {
    id: string;
    email: string;
}

/**
 * Creates or retrieves the benchmark organiser account.
 *
 * @param config - Benchmark configuration
 * @param saltRounds - bcrypt salt rounds
 * @returns BenchmarkOrganiser
 */
export async function createOrGetOrganiser(
    config: BenchmarkConfig,
    saltRounds: number,
): Promise<BenchmarkOrganiser> {
    const { organiserEmail, organiserFirstName, organiserLastName } = config;

    // --- Idempotency check ---
    const existing = await db.user.findUnique({
        where: { email: organiserEmail },
    });

    let organiserId: string;

    if (existing) {
        organiserId = existing.id;

        // Ensure the account is an organiser and is verified (may have been
        // created as a different role in a previous partial run).
        if (!existing.is_verified || existing.role !== "organiser") {
            await db.user.update({
                data: { is_verified: true, role: "organiser" },
                where: { id: existing.id },
            });
        }
    } else {
        const password = await bcrypt.hash("OrgPass#Benchmark2024", saltRounds);

        const organiser = await db.user.create({
            data: {
                email: organiserEmail,
                first_name: organiserFirstName,
                is_verified: true,
                last_name: organiserLastName,
                password,
                role: "organiser",
            },
        });

        organiserId = organiser.id;
    }

    // --- Ensure organiser wallet exists ---
    await db.wallet.upsert({
        create: {
            balance: 0,
            currency: "INR",
            status: "active",
            userId: organiserId,
        },
        update: {}, // Keep existing balance intact on re-run
        where: { userId: organiserId },
    });

    // --- Ensure organiser has at least one card ---
    const existingCard = await db.card.findFirst({
        where: { userId: organiserId },
    });

    if (!existingCard) {
        // Use a deterministic card number for the organiser to keep idempotency
        const cardNumber = "5210-9999-9999-0001";
        const alreadyTaken = await db.card.findUnique({
            where: { card_number: cardNumber },
        });

        if (!alreadyTaken) {
            await db.card.create({
                data: {
                    balance: 10_000,
                    bank_name: "hdfc",
                    card_number: cardNumber,
                    userId: organiserId,
                },
            });
        }
    }

    return { email: organiserEmail, id: organiserId };
}
