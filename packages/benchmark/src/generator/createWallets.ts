/**
 * createWallets.ts
 *
 * Ensures every benchmark user has an active wallet.
 *
 * Production parity:
 *   Mirrors the wallet creation performed during organiser verify and the
 *   inline upsert in the ticket purchase flow (ticketing.ts L139-151).
 *   Uses upsert with the userId unique constraint so running twice is safe.
 *
 * IEEE Access reproducibility note:
 *   Wallet balances start at 0 for benchmark users; they pay by card only.
 */

import { db } from "@repo/db";
import type { BenchmarkUser } from "./createUsers.js";

/**
 * Ensures a wallet exists for every user in the list.
 * Uses Prisma upsert (idempotent) with the userId unique index.
 *
 * @param users - Array of benchmark users that need wallets
 * @param concurrency - Batch size for parallel operations
 * @param onProgress - Optional progress callback
 * @returns Count of wallets created (already-existing wallets are not counted)
 */
export async function ensureWallets(
    users: BenchmarkUser[],
    concurrency: number,
    onProgress?: (completed: number, total: number) => void,
): Promise<number> {
    const total = users.length;
    let created = 0;

    for (let i = 0; i < total; i += concurrency) {
        const batch = users.slice(i, i + concurrency);

        const results = await Promise.allSettled(
            batch.map((user) =>
                db.wallet.upsert({
                    create: {
                        balance: 0,
                        currency: "INR",
                        status: "active",
                        userId: user.id,
                    },
                    update: {}, // No-op if wallet already exists
                    where: { userId: user.id },
                }),
            ),
        );

        for (const result of results) {
            if (result.status === "fulfilled") {
                created++;
            }
        }

        onProgress?.(Math.min(i + concurrency, total), total);
    }

    return created;
}
