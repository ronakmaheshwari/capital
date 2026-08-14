import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { Pool } from "pg";

import { createOrganiser } from "./helpers/create-organiser";
import { createWallet } from "./helpers/create-wallet";
import { createUser } from "./helpers/create-user";
import { createCard } from "./helpers/create-card";
import { createEvent } from "./helpers/create-event";
import { createEventSlot } from "./helpers/create-event-slot";
import { createTicket } from "./helpers/create-ticket";
import { createPurchase } from "./helpers/create-purchase";

dotenv.config({
    path: path.join(__dirname, "../../../.env"),
});

dotenv.config();

if (process.env.BENCHMARK_MODE !== "true") {
    console.error("BENCHMARK_MODE must be set to true");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        const ticketCount = parseInt(
            process.env.TICKET_COUNT || "1",
            10,
        );

        if (!Number.isInteger(ticketCount) || ticketCount <= 0) {
            throw new Error(
                `TICKET_COUNT must be a positive integer. Got: ${ticketCount}`,
            );
        }

        const pricePerTicket = 100;

        /*
         * Give the customer and organiser enough balance
         * to purchase all benchmark tickets.
         */
        const buffer =
            ticketCount * pricePerTicket * 2;

        // =====================================================
        // ORGANISER
        // =====================================================

        const {
            id: organiserId,
            jwtToken: organiserToken,
        } = await createOrganiser(pool, {
            email:
                `benchmark-organiser-refund-${Date.now()}` +
                "@benchmark.test",
        });

        const {
            id: walletId,
        } = await createWallet(pool, {
            userId: organiserId,
            balance: buffer,
        });

        const walletBalanceBefore = buffer;

        // =====================================================
        // CUSTOMER
        // =====================================================

        const {
            id: customerId,
        } = await createUser(pool, {
            firstName: "Bench",
            lastName: "Customer",
            email:
                `benchmark-customer-refund-${Date.now()}` +
                "@benchmark.test",
            role: "user",
        });

        const {
            id: cardId,
        } = await createCard(pool, {
            userId: customerId,
            balance: buffer,
        });

        const cardBalanceBefore = buffer;

        // =====================================================
        // EVENT
        // =====================================================

        const {
            id: eventId,
        } = await createEvent(pool, {
            organiserId,
        });

        /*
         * Capacity represents AVAILABLE capacity.
         *
         * If we create 10 tickets:
         *
         *   initial capacity = 10
         *
         * After refunding one:
         *
         *   capacity = 11
         *
         * Therefore slotCapacityBefore must be 10.
         */
        const {
            id: slotId,
        } = await createEventSlot(pool, {
            eventId,
            capacity: ticketCount,
            price: pricePerTicket,
            hoursFromNow: 72,
        });

        const slotCapacityBefore = ticketCount;

        // =====================================================
        // TICKETS + PURCHASES
        // =====================================================

        const ticketIds: string[] = [];
        const purchaseTokens: string[] = [];
        const transactionIds: string[] = [];

        for (let i = 0; i < ticketCount; i++) {
            const {
                id: ticketId,
            } = await createTicket(pool, {
                eventSlotId: slotId,
                userId: customerId,
            });

            /*
             * IMPORTANT:
             *
             * createPurchase must return transactionId.
             *
             * The refund verifier needs the transaction that
             * is converted/marked as REFUND by the refund flow.
             */
            const purchase = await createPurchase(pool, {
                userId: customerId,
                cardId,
                ticketId,
                amount: pricePerTicket,
                ticketCount: 1,
                walletId,
            });

            const {
                token,
                id: transactionId,
            } = purchase;

            if (!token) {
                throw new Error(
                    `Purchase ${i + 1} did not return a token`,
                );
            }

            if (!transactionId) {
                throw new Error(
                    `Purchase ${i + 1} did not return transactionId`,
                );
            }

            ticketIds.push(ticketId);
            purchaseTokens.push(token);
            transactionIds.push(transactionId);
        }

        // =====================================================
        // VALIDATE SEED DATA
        // =====================================================

        if (ticketIds.length !== ticketCount) {
            throw new Error(
                `Expected ${ticketCount} tickets, created ${ticketIds.length}`,
            );
        }

        if (purchaseTokens.length !== ticketCount) {
            throw new Error(
                `Expected ${ticketCount} purchase tokens, created ${purchaseTokens.length}`,
            );
        }

        if (transactionIds.length !== ticketCount) {
            throw new Error(
                `Expected ${ticketCount} transaction IDs, created ${transactionIds.length}`,
            );
        }

        // =====================================================
        // WRITE REFUND SEED
        // =====================================================

        const resultsDirectory = path.join(
            __dirname,
            "../results/raw",
        );

        fs.mkdirSync(resultsDirectory, {
            recursive: true,
        });

        const outputPath = path.join(
            resultsDirectory,
            "refund-seed.json",
        );

        /*
         * The current correctness test refunds only the FIRST
         * ticket.
         *
         * Therefore these fields describe ticket #1.
         *
         * ticketIds / purchaseTokens / transactionIds contain
         * all seeded tickets for future 10/50-ticket tests.
         */
        const seedData = {
            // Organiser
            organiserId,
            organiserToken,

            // Customer
            customerId,

            // Card
            cardId,
            cardBalanceBefore,

            // Wallet
            walletId,
            walletBalanceBefore,

            // Event
            eventId,

            // Slot
            slotId,
            eventSlotId: slotId,
            slotCapacityBefore,

            // Number of seeded tickets
            ticketCount,

            // All tickets
            ticketIds,

            // First ticket used by current correctness test
            ticketId: ticketIds[0],

            // All purchase tokens
            purchaseTokens,

            // First purchase token used by current correctness test
            token: purchaseTokens[0],

            // All transactions
            transactionIds,

            // First transaction used by current correctness test
            transactionId: transactionIds[0],

            // Refund
            refundAmount: pricePerTicket,
            pricePerTicket,

            createdAt: new Date().toISOString(),
        };

        fs.writeFileSync(
            outputPath,
            JSON.stringify(
                seedData,
                null,
                2,
            ),
        );

        console.log(
            "Refund seed written to " +
            "results/raw/refund-seed.json",
        );

        console.log(
            JSON.stringify(
                {
                    ticketCount,
                    slotCapacityBefore,
                    cardBalanceBefore,
                    walletBalanceBefore,
                    refundAmount: pricePerTicket,
                    transactionId: transactionIds[0],
                    ticketId: ticketIds[0],
                },
                null,
                2,
            ),
        );
    } catch (error) {
        console.error(
            "Error seeding refund:",
            error,
        );

        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();