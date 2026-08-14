import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config();

import { Pool } from "pg";
import fs from "fs";

import { createOrganiser } from "./helpers/create-organiser";
import { createWallet } from "./helpers/create-wallet";
import { createUser } from "./helpers/create-user";
import { createCard } from "./helpers/create-card";
import { createEvent } from "./helpers/create-event";
import { createEventSlot } from "./helpers/create-event-slot";
import { createTicket } from "./helpers/create-ticket";
import { createPurchase } from "./helpers/create-purchase";

if (process.env.BENCHMARK_MODE !== "true") {
    console.error("BENCHMARK_MODE must be set to true");
    process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("DATABASE_URL is not configured");
    process.exit(1);
}

const pool = new Pool({
    connectionString: databaseUrl,
});

async function run() {
    try {
        const timestamp = Date.now();

        const org1 = await createOrganiser(pool, {
            email: `benchmark-org-cases1-${timestamp}@benchmark.test`,
        });

        const wallet1 = await createWallet(pool, {
            userId: org1.id,
            balance: 10000,
        });

        const cust1 = await createUser(pool, {
            firstName: "Cust1",
            lastName: "C",
            email: `benchmark-cust-cases1-${timestamp}@benchmark.test`,
            role: "user",
        });

        const card1 = await createCard(pool, {
            userId: cust1.id,
            balance: 10000,
        });

        const evt1 = await createEvent(pool, {
            organiserId: org1.id,
        });

        const slot1 = await createEventSlot(pool, {
            eventId: evt1.id,
            capacity: 50,
            hoursFromNow: 72,
        });

        for (let i = 0; i < 5; i++) {
            const ticket = await createTicket(pool, {
                eventSlotId: slot1.id,
                userId: cust1.id,
            });

            await createPurchase(pool, {
                userId: cust1.id,
                cardId: card1.id,
                ticketId: ticket.id,
                amount: 100,
                walletId: wallet1.id,
            });
        }

        const org2 = await createOrganiser(pool, {
            email: `benchmark-org-cases2-${timestamp}@benchmark.test`,
        });

        const wallet2 = await createWallet(pool, {
            userId: org2.id,
            balance: 10000,
        });

        const cust2 = await createUser(pool, {
            firstName: "Cust2",
            lastName: "C",
            email: `benchmark-cust-cases2-${timestamp}@benchmark.test`,
            role: "user",
        });

        const card2 = await createCard(pool, {
            userId: cust2.id,
            balance: 10000,
        });

        const evt2 = await createEvent(pool, {
            organiserId: org2.id,
        });

        const slot2 = await createEventSlot(pool, {
            eventId: evt2.id,
            capacity: 50,
            hoursFromNow: 72,
        });

        for (let i = 0; i < 5; i++) {
            const ticket = await createTicket(pool, {
                eventSlotId: slot2.id,
                userId: cust2.id,
            });

            await createPurchase(pool, {
                userId: cust2.id,
                cardId: card2.id,
                ticketId: ticket.id,
                amount: 100,
                walletId: wallet2.id,
            });
        }
        const org3 = await createOrganiser(pool, {
            email: `benchmark-org-cases3-${timestamp}@benchmark.test`,
        });

        const wallet3 = await createWallet(pool, {
            userId: org3.id,
            balance: 10000,
        });

        const cust3 = await createUser(pool, {
            firstName: "Cust3",
            lastName: "C",
            email: `benchmark-cust-cases3-${timestamp}@benchmark.test`,
            role: "user",
        });

        const card3 = await createCard(pool, {
            userId: cust3.id,
            balance: 10000,
        });

        const evt3 = await createEvent(pool, {
            organiserId: org3.id,
        });

        const startedAt = new Date( Date.now() - 24 * 60 * 60 * 1000, ); 
        const slot3 = await createEventSlot(pool, { eventId: evt3.id, capacity: 50, startTime: startedAt, });

        for (let i = 0; i < 3; i++) {
            const ticket = await createTicket(pool, {
                eventSlotId: slot3.id,
                userId: cust3.id,
            });

            await createPurchase(pool, {
                userId: cust3.id,
                cardId: card3.id,
                ticketId: ticket.id,
                amount: 100,
                walletId: wallet3.id,
            });
        }
        const org4A = await createOrganiser(pool, {
            email: `benchmark-org-cases4a-${timestamp}@benchmark.test`,
        });

        const org4B = await createOrganiser(pool, {
            email: `benchmark-org-cases4b-${timestamp}@benchmark.test`,
        });

        const wallet4 = await createWallet(pool, {
            userId: org4A.id,
            balance: 10000,
        });

        const cust4 = await createUser(pool, {
            firstName: "Cust4",
            lastName: "C",
            email: `benchmark-cust-cases4-${timestamp}@benchmark.test`,
            role: "user",
        });

        const card4 = await createCard(pool, {
            userId: cust4.id,
            balance: 10000,
        });
        const evt4 = await createEvent(pool, {
            organiserId: org4A.id,
        });

        const slot4 = await createEventSlot(pool, {
            eventId: evt4.id,
            capacity: 50,
            hoursFromNow: 72,
        });

        for (let i = 0; i < 3; i++) {
            const ticket = await createTicket(pool, {
                eventSlotId: slot4.id,
                userId: cust4.id,
            });

            await createPurchase(pool, {
                userId: cust4.id,
                cardId: card4.id,
                ticketId: ticket.id,
                amount: 100,
                walletId: wallet4.id,
            });
        }
        const resultsDirectory = path.join(
            __dirname,
            "../results/raw",
        );

        fs.mkdirSync(resultsDirectory, {
            recursive: true,
        });

        const outputPath = path.join(
            resultsDirectory,
            "cancellation-cases-seed.json",
        );

        const fixture = {
            validFuture: {
                organiserId: org1.id,
                organiserToken: org1.jwtToken,
                eventId: evt1.id,
                slotId: slot1.id,
                ticketCount: 5,
                customerId: cust1.id,
                cardId: card1.id,
                walletId: wallet1.id,
            },

            duplicateCancellation: {
                organiserId: org2.id,
                organiserToken: org2.jwtToken,
                eventId: evt2.id,
                slotId: slot2.id,
                ticketCount: 5,
                customerId: cust2.id,
                cardId: card2.id,
                walletId: wallet2.id,
            },

            alreadyStarted: {
                organiserId: org3.id,
                organiserToken: org3.jwtToken,
                eventId: evt3.id,
                slotId: slot3.id,
                ticketCount: 3,
            },

            wrongOrganiser: {
                correctOrganiserId: org4A.id,
                correctToken: org4A.jwtToken,
                wrongOrganiserId: org4B.id,
                wrongToken: org4B.jwtToken,
                eventId: evt4.id,
                slotId: slot4.id,
                ticketCount: 3,
            },

            createdAt: new Date().toISOString(),
        };

        fs.writeFileSync(
            outputPath,
            JSON.stringify(fixture, null, 2),
        );

        const verification = await pool.query(
            `
            SELECT
                id,
                "eventId",
                start_time,
                end_time,
                "isDeleted",
                capacity
            FROM "EventSlot"
            WHERE id = ANY($1::text[])
            `,
            [[
                slot1.id,
                slot2.id,
                slot3.id,
                slot4.id,
            ]],
        );

        console.log("\nCancellation benchmark fixture:");
        console.table(
            verification.rows.map((row) => ({
                slotId: row.id,
                eventId: row.eventId,
                startTime: row.start_time,
                isDeleted: row.isDeleted,
                capacity: row.capacity,
            })),
        );

        console.log(
            "\nCancellation cases seed written to:",
            outputPath,
        );
    } catch (error) {
        console.error(
            "Error seeding cancellation cases:",
            error,
        );

        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

void run();