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
            cardId,
            refundAmount,
            cardBalanceBefore,
        } = seed;

        if (!cardId) {
            console.error(
                "✗ cardId missing from refund seed.",
            );
            process.exit(1);
        }

        if (refundAmount === undefined) {
            console.error(
                "✗ refundAmount missing from refund seed.",
            );
            process.exit(1);
        }

        const res = await pool.query(
            `
            SELECT id, balance
            FROM "Card"
            WHERE id = $1
            `,
            [cardId],
        );

        if (res.rows.length === 0) {
            console.error(
                `✗ User card ${cardId} not found.`,
            );
            process.exit(1);
        }

        const currentBalance = Number(
            res.rows[0].balance,
        );

        console.log(
            `Current Card Balance: ${currentBalance}`,
        );

        if (cardBalanceBefore !== undefined) {
            const expectedBalance =
                Number(cardBalanceBefore) +
                Number(refundAmount);

            if (
                currentBalance !== expectedBalance
            ) {
                console.error(
                    `✗ Card balance is ${currentBalance}, ` +
                    `expected ${expectedBalance}.`,
                );
                process.exit(1);
            }

            console.log(
                `✓ Card balance increased correctly by ${refundAmount}`,
            );
        } else {
            console.error(
                "✗ cardBalanceBefore missing from refund seed.",
            );
            process.exit(1);
        }

        console.log(
            "✓ Card refund verification passed.",
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