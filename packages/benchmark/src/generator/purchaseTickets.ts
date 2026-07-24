/**
 * purchaseTickets.ts
 *
 * Purchases exactly one ticket per benchmark user against the benchmark slot.
 *
 * Production parity:
 *   Replicates the exact DB writes from apps/http/src/routes/ticketing.ts:
 *     1. Creates the Ticket row
 *     2. Creates a PURCHASE Transaction (buyer's card → event)
 *     3. Decrements slot capacity
 *     4. Decrements buyer's card balance (by ticket price; 0 if free)
 *     5. Credits the organiser's wallet
 *     6. Creates a PAYOUT Transaction (event → organiser wallet)
 *     7. Calls createSignedTicket() to sign + encrypt the payload (Ed25519 + XSalsa20)
 *     8. Stores the signed payload in ticket.signature (JSON-stringified)
 *     9. Sets ticket.qr_code_data to a placeholder (no Supabase upload in generator)
 *
 * Idempotency:
 *   If the user already has a ticket for this slot, returns the stored
 *   ciphertext/nonce from the existing signature field without re-purchasing.
 *
 * IEEE Access reproducibility note:
 *   No HTTP calls are made. No email or Supabase dependencies are needed.
 *   createSignedTicket() is the single authoritative signing function shared
 *   with the production purchase flow.
 */

import { db } from "@repo/db";
import { createSignedTicket } from "@repo/keygen";
import { Decimal } from "decimal.js";
import { AlphanumericOTP } from "@repo/notifications";
import type { BenchmarkEventSlot } from "./createEvent.js";
import type { BenchmarkCard } from "./createCards.js";
import type { BenchmarkUser } from "./createUsers.js";
import type { BenchmarkConfig } from "./benchmark.config.js";
import { decrypt } from "./encryptHelper.js";

/** The benchmark record produced for a single user. */
export interface TicketRecord {
    userId: string;
    ticketId: string;
    ciphertext: string;
    nonce: string;
}

/**
 * Purchases (or retrieves) a ticket for a single benchmark user.
 *
 * @param user - The benchmark user
 * @param card - The user's payment card
 * @param slot - The benchmark event slot
 * @returns TicketRecord containing the signed, encrypted payload
 * @throws If the Prisma transaction fails
 */
export async function purchaseOrGetTicket(
    user: BenchmarkUser,
    card: BenchmarkCard,
    slot: BenchmarkEventSlot,
): Promise<TicketRecord> {
    // --- Idempotency: check if this user already has a ticket for this slot ---
    const existingTicket = await db.ticket.findFirst({
        where: {
            eventSlotId: slot.slotId,
            status: "ISSUED",
            userId: user.id,
        },
    });

    if (existingTicket && existingTicket.signature) {
        // Parse stored signed payload to extract ciphertext + nonce
        try {
            const stored = JSON.parse(existingTicket.signature) as {
                ciphertext: string;
                nonce: string;
            };
            if (stored.ciphertext && stored.nonce) {
                return {
                    ciphertext: stored.ciphertext,
                    nonce: stored.nonce,
                    ticketId: existingTicket.id,
                    userId: user.id,
                };
            }
        } catch {
            // Signature field is malformed — fall through to re-sign
        }

        // Re-sign the ticket using the stored private key
        const dbUser = await db.user.findUnique({ where: { id: user.id } });
        if (!dbUser?.encrypted_private_key) {
            throw new Error(`User ${user.email} has no encrypted private key in the database`);
        }

        const privateKey = decrypt(dbUser.encrypted_private_key);
        const signed = await createSignedTicket(
            buildTicketPayload(user, existingTicket.id, slot, 1, 0),
            privateKey,
        );

        // Patch the stored signature so future re-runs are fully idempotent
        await db.ticket.update({
            data: { signature: JSON.stringify(signed) },
            where: { id: existingTicket.id },
        });

        return {
            ciphertext: signed.ciphertext,
            nonce: signed.nonce,
            ticketId: existingTicket.id,
            userId: user.id,
        };
    }

    // --- New ticket: run the full purchase transaction ---
    const totalAmount = new Decimal(slot.price).mul(1); // quantity = 1

    const ticket = await db.$transaction(async (tx) => {
        // Verify capacity
        const currentSlot = await tx.eventSlot.findUnique({
            where: { id: slot.slotId },
        });
        if (!currentSlot || currentSlot.capacity < 1) {
            throw new Error(`Slot ${slot.slotId} has no remaining capacity`);
        }

        // 1. Create ticket (signature filled after signing below)
        const newTicket = await tx.ticket.create({
            data: {
                eventSlotId: slot.slotId,
                qr_code_data: "", // Placeholder; no Supabase upload in generator
                signature: "",
                userId: user.id,
            },
        });

        // 2. Purchase transaction (buyer's card)
        const purchaseToken = AlphanumericOTP(24);
        await tx.transaction.create({
            data: {
                amount: totalAmount,
                bank_name: card.bankName,
                cardId: card.cardId,
                description: `[Benchmark] Ticket purchase for ${slot.eventTitle}`,
                ticket_count: 1,
                ticketId: newTicket.id,
                token: purchaseToken,
                type: "PURCHASE",
                userId: user.id,
            },
        });

        // 3. Decrement slot capacity
        await tx.eventSlot.update({
            data: { capacity: { decrement: 1 } },
            where: { id: slot.slotId },
        });

        // 4. Decrement buyer's card balance (no-op when price = 0)
        if (totalAmount.gt(0)) {
            await tx.card.update({
                data: { balance: { decrement: totalAmount } },
                where: { id: card.cardId },
            });
        }

        // 5. Ensure organiser wallet exists + credit it
        const organiserEvent = await tx.event.findUnique({
            select: { organiserId: true },
            where: { id: slot.eventId },
        });

        if (organiserEvent) {
            const organiserWallet =
                (await tx.wallet.findUnique({
                    where: { userId: organiserEvent.organiserId },
                })) ??
                (await tx.wallet.create({
                    data: {
                        balance: 0,
                        currency: "INR",
                        userId: organiserEvent.organiserId,
                    },
                }));

            if (totalAmount.gt(0)) {
                await tx.wallet.update({
                    data: { balance: { increment: totalAmount } },
                    where: { id: organiserWallet.id },
                });
            }

            // 6. PAYOUT transaction (organiser wallet)
            const payoutToken = AlphanumericOTP(24);
            await tx.transaction.create({
                data: {
                    amount: totalAmount,
                    cardId: card.cardId,
                    description: `[Benchmark] Ticket sold for ${slot.eventTitle}`,
                    ticketId: newTicket.id,
                    token: payoutToken,
                    type: "PAYOUT",
                    userId: organiserEvent.organiserId,
                    walletId: organiserWallet.id,
                },
            });
        }

        return newTicket;
    });

    // --- 7. Sign + encrypt the ticket payload (production algorithm) ---
    const signed = await createSignedTicket(
        buildTicketPayload(user, ticket.id, slot, 1, totalAmount.toNumber()),
        user.privateKey,
    );

    // --- 8 & 9. Persist signature on the ticket row ---
    await db.ticket.update({
        data: {
            qr_code_data: `benchmark://ticket/${ticket.id}`,
            signature: JSON.stringify(signed),
        },
        where: { id: ticket.id },
    });

    return {
        ciphertext: signed.ciphertext,
        nonce: signed.nonce,
        ticketId: ticket.id,
        userId: user.id,
    };
}

/**
 * Assembles the canonical ticket payload used by createSignedTicket().
 * Mirrors the ticketPayload object constructed in ticketing.ts L196-211.
 */
function buildTicketPayload(
    user: BenchmarkUser,
    ticketId: string,
    slot: BenchmarkEventSlot,
    quantity: number,
    totalAmount: number,
): {
    eventId: string;
    eventLocation: string;
    eventSlotId: string;
    eventStartTime: string;
    eventEndTime: string;
    eventTitle: string;
    firstName: string;
    lastName: string;
    email: string;
    issuedAt: string;
    quantity: number;
    ticketId: string;
    totalAmount: number;
    transactionToken: string;
} {
    // Extract first/last name from email when not stored locally
    const nameParts = user.email.split("@")[0]?.replace(/\d+/g, "") ?? "Benchmark";

    return {
        email: user.email,
        eventEndTime: slot.endTime.toISOString(),
        eventId: slot.eventId,
        eventLocation: slot.locationName,
        eventSlotId: slot.slotId,
        eventStartTime: slot.startTime.toISOString(),
        eventTitle: slot.eventTitle,
        firstName: nameParts,
        issuedAt: new Date().toISOString(),
        lastName: "User",
        quantity,
        ticketId,
        totalAmount,
        transactionToken: AlphanumericOTP(12),
    };
}

/**
 * Purchases tickets for all benchmark users in parallel batches.
 *
 * Uses Promise.allSettled so individual failures do not abort the run.
 * Returns an array of successful TicketRecords and collects failures.
 *
 * @param users - Benchmark users (must have privateKey populated)
 * @param cardMap - userId → BenchmarkCard map
 * @param slot - The benchmark event slot
 * @param config - Benchmark configuration
 * @param onProgress - Optional progress callback
 * @returns { tickets: TicketRecord[], failures: Array<{email, reason}> }
 */
export async function purchaseBenchmarkTickets(
    users: BenchmarkUser[],
    cardMap: Map<string, BenchmarkCard>,
    slot: BenchmarkEventSlot,
    config: BenchmarkConfig,
    onProgress?: (completed: number, total: number) => void,
): Promise<{ tickets: TicketRecord[]; failures: Array<{ email: string; reason: string }> }> {
    const total = users.length;
    const batchSize = config.concurrency;
    const tickets: TicketRecord[] = [];
    const failures: Array<{ email: string; reason: string }> = [];

    for (let i = 0; i < total; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        const results = await Promise.allSettled(
            batch.map(async (user) => {
                const card = cardMap.get(user.id);
                if (!card) {
                    throw new Error(`No card found for user ${user.email}`);
                }
                return purchaseOrGetTicket(user, card, slot);
            }),
        );

        for (let j = 0; j < results.length; j++) {
            const result = results[j];
            const user = batch[j];
            if (!result || !user) continue;

            if (result.status === "fulfilled") {
                tickets.push(result.value);
            } else {
                failures.push({
                    email: user.email,
                    reason:
                        result.reason instanceof Error
                            ? result.reason.message
                            : String(result.reason),
                });
            }
        }

        onProgress?.(Math.min(i + batchSize, total), total);
    }

    return { failures, tickets };
}
