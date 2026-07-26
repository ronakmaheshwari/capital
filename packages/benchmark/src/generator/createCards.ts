/**
 * createCards.ts
 *
 * Creates payment cards for benchmark users.
 *
 * Production parity:
 *   Reuses the bank prefix scheme from apps/http/src/utils/bankCards.ts.
 *   Card numbers follow the format: PREFIX-XXXX-XXXX-XXXX (16 digits total).
 *   Each card is assigned a configurable balance (config.cardBalance).
 *
 *   Idempotency: if the user already has at least one card, the first one
 *   is returned without creating a new one. This avoids duplicate card
 *   numbers and preserves balances across re-runs.
 *
 * IEEE Access reproducibility note:
 *   Only one card per user is needed — it is used as the payment instrument
 *   for the single ticket purchase.
 */

import { type BankName, db } from "@repo/db";
import type { BenchmarkConfig } from "./benchmark.config.js";
import type { BenchmarkUser } from "./createUsers.js";

/** Matches the BankPrefixes in apps/http/src/utils/bankCards.ts */
const BANK_PREFIXES: Record<BankName, string> = {
    bob: "7890",
    hdfc: "5210",
    icic: "6543",
    kotak: "4321",
    yesbank: "3456",
} as const;

const ALL_BANKS = Object.keys(BANK_PREFIXES) as BankName[];

/** Result of card creation/retrieval for a single user. */
export interface BenchmarkCard {
    userId: string;
    cardId: string;
    cardNumber: string;
    bankName: BankName;
}

/**
 * Generates a candidate card number for a given bank prefix.
 * Format: PREFIX-XXXX-XXXX-XXXX
 */
function generateCandidateNumber(bankName: BankName): string {
    const prefix = BANK_PREFIXES[bankName];
    const segments = Array.from(
        {
            length: 3,
        },
        () => Math.floor(1000 + Math.random() * 9000),
    );
    return [
        prefix,
        ...segments,
    ].join("-");
}

/**
 * Generates a card number that is guaranteed to be unique in the database.
 * Retries until a non-colliding number is found.
 */
async function generateUniqueCardNumber(bankName: BankName): Promise<string> {
    while (true) {
        const candidate = generateCandidateNumber(bankName);
        const existing = await db.card.findUnique({
            where: {
                card_number: candidate,
            },
        });
        if (!existing) return candidate;
    }
}

/**
 * Creates or retrieves a payment card for a single benchmark user.
 *
 * If the user already has cards, the first one is returned (idempotent).
 * Otherwise, a new card is created with config.cardBalance balance.
 */
async function createOrGetCard(user: BenchmarkUser, cardBalance: number): Promise<BenchmarkCard> {
    // Idempotency check: return existing card if present
    const existing = await db.card.findFirst({
        where: {
            userId: user.id,
        },
    });

    if (existing) {
        return {
            bankName: existing.bank_name,
            cardId: existing.id,
            cardNumber: existing.card_number,
            userId: user.id,
        };
    }

    // Select a bank deterministically based on user email suffix to spread load
    const bankIndex =
        parseInt(user.email.replace(/\D/g, "").slice(-2) || "0", 10) % ALL_BANKS.length;
    const bankName = ALL_BANKS[bankIndex] ?? "hdfc";
    const cardNumber = await generateUniqueCardNumber(bankName);

    const card = await db.card.create({
        data: {
            balance: cardBalance,
            bank_name: bankName,
            card_number: cardNumber,
            userId: user.id,
        },
    });

    return {
        bankName: card.bank_name,
        cardId: card.id,
        cardNumber: card.card_number,
        userId: user.id,
    };
}

/**
 * Creates payment cards for all benchmark users in parallel batches.
 *
 * Returns a Map from userId → BenchmarkCard for O(1) lookup in later stages.
 * Failed card creations are silently skipped (the user is retained; the ticket
 * purchase stage will fail gracefully for users without cards).
 *
 * @param users - Array of benchmark users
 * @param config - Benchmark configuration (cardBalance, concurrency)
 * @param onProgress - Optional progress callback
 */
export async function createBenchmarkCards(
    users: BenchmarkUser[],
    config: BenchmarkConfig,
    onProgress?: (completed: number, total: number) => void,
): Promise<Map<string, BenchmarkCard>> {
    const total = users.length;
    const batchSize = config.concurrency;
    const cardMap = new Map<string, BenchmarkCard>();

    for (let i = 0; i < total; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        const results = await Promise.allSettled(
            batch.map((user) => createOrGetCard(user, config.cardBalance)),
        );

        for (const result of results) {
            if (result.status === "fulfilled") {
                cardMap.set(result.value.userId, result.value);
            }
        }

        onProgress?.(Math.min(i + batchSize, total), total);
    }

    return cardMap;
}
