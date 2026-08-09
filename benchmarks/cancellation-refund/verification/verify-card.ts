import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load root .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config(); // local .env fallback
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const seedPath = path.join(__dirname, '../results/raw/refund-seed.json');
    if (!fs.existsSync(seedPath)) {
      console.error('✗ Refund seed file not found.');
      process.exit(1);
    }

    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const { userCardId, refundAmount, cardBalanceBefore } = seed;

    const res = await pool.query('SELECT balance FROM "Card" WHERE id = $1', [userCardId]);
    if (res.rows.length === 0) {
      console.error(`✗ User card ${userCardId} not found.`);
      process.exit(1);
    }

    const currentBalance = res.rows[0].balance;
    console.log(`Current Card Balance: ${currentBalance}`);

    if (cardBalanceBefore !== undefined) {
      const expectedBalance = cardBalanceBefore + refundAmount;
      if (currentBalance !== expectedBalance) {
        console.error(`✗ Card balance is ${currentBalance}, expected ${expectedBalance}.`);
        process.exit(1);
      } else {
        console.log(`✓ Card balance increased correctly by ${refundAmount}`);
      }
    } else {
      console.log(`✓ Checked card balance`);
    }
  } catch (error) {
    console.error('Verification failed with error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
