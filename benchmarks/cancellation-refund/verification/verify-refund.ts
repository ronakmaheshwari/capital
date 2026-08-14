import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { Pool } from "pg";

dotenv.config({ path: path.join(__dirname, "../../../.env") });
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    try {
        const seedPath = path.join(
            __dirname,
            "../results/raw/refund-seed.json",
        );

        if (!fs.existsSync(seedPath)) {
            console.error("✗ Refund seed file not found.");
            process.exit(1);
        }

        const seed = JSON.parse(
            fs.readFileSync(seedPath, "utf8"),
        );

        const {
            transactionId,
            ticketId,
            slotId,
            slotCapacityBefore,
            ticketCount,
        } = seed;

        let hasErrors = false;

        if (!transactionId) {
            console.error("✗ transactionId missing from refund seed.");
            hasErrors = true;
        }

        if (!ticketId) {
            console.error("✗ ticketId missing from refund seed.");
            hasErrors = true;
        }

        if (!slotId) {
            console.error("✗ slotId missing from refund seed.");
            hasErrors = true;
        }

        if (hasErrors) {
            process.exit(1);
        }

        // ---------------------------------------------------------
        // 1. Verify transaction
        // ---------------------------------------------------------

        const txRes = await pool.query(
            `
            SELECT id, type, canceled_at
            FROM "Transaction"
            WHERE id = $1
            `,
            [transactionId],
        );

        if (txRes.rows.length === 0) {
            console.error(
                `✗ Transaction ${transactionId} not found.`,
            );
            hasErrors = true;
        } else {
            const tx = txRes.rows[0];

            if (tx.type !== "REFUND") {
                console.error(
                    `✗ Transaction type is ${tx.type}, expected REFUND.`,
                );
                hasErrors = true;
            }

            if (!tx.canceled_at) {
                console.error(
                    "✗ Transaction canceled_at is null.",
                );
                hasErrors = true;
            }

            if (
                tx.type === "REFUND" &&
                tx.canceled_at
            ) {
                console.log(
                    "✓ Transaction is REFUND and canceled_at is set",
                );
            }
        }

        // ---------------------------------------------------------
        // 2. Verify ticket deleted
        // ---------------------------------------------------------

        const ticketRes = await pool.query(
            `
            SELECT id
            FROM "Ticket"
            WHERE id = $1
            `,
            [ticketId],
        );

        if (ticketRes.rows.length > 0) {
            console.error(
                `✗ Ticket ${ticketId} was not deleted.`,
            );
            hasErrors = true;
        } else {
            console.log(
                "✓ Ticket was successfully deleted",
            );
        }

        // ---------------------------------------------------------
        // 3. Verify EventSlot capacity
        // ---------------------------------------------------------

        const slotRes = await pool.query(
            `
            SELECT capacity
            FROM "EventSlot"
            WHERE id = $1
            `,
            [slotId],
        );

        if (slotRes.rows.length === 0) {
            console.error(
                `✗ EventSlot ${slotId} not found.`,
            );
            hasErrors = true;
        } else {
            const currentCapacity = Number(
                slotRes.rows[0].capacity,
            );

            const initialCapacity =
                Number(slotCapacityBefore);

            const refundedTickets =
                Number(ticketCount || 1);

            /*
             * Your refund flow restores one slot for each
             * refunded/deleted ticket.
             *
             * Example:
             *
             * initial capacity = 10
             * refunded tickets = 1
             * expected capacity = 11
             *
             * For 10 refunded tickets:
             * 10 + 10 = 20
             */
            const expectedCapacity =
                initialCapacity + refundedTickets;

            if (
                currentCapacity !== expectedCapacity
            ) {
                console.error(
                    `✗ EventSlot capacity is ${currentCapacity}, ` +
                    `expected ${expectedCapacity}. ` +
                    `(before=${initialCapacity}, ` +
                    `refunded=${refundedTickets})`,
                );

                hasErrors = true;
            } else {
                console.log(
                    `✓ EventSlot capacity restored correctly: ` +
                    `${currentCapacity}`,
                );
            }
        }

        // ---------------------------------------------------------
        // Final result
        // ---------------------------------------------------------

        if (hasErrors) {
            console.error(
                "\n✗ Refund verification failed.",
            );
            process.exit(1);
        }

        console.log(
            "\n✓ Refund verification passed.",
        );
    } catch (error) {
        console.error(
            "Verification failed with error:",
            error,
        );
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();