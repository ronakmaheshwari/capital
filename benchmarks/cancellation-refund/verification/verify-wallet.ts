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
    const { organiserWalletId, refundAmount, walletBalanceBefore } = seed;

    const res = await pool.query('SELECT balance FROM "Wallet" WHERE id = $1', [organiserWalletId]);
    if (res.rows.length === 0) {
      console.error(`✗ Organiser wallet ${organiserWalletId} not found.`);
      process.exit(1);
    }

    const currentBalance = res.rows[0].balance;
    console.log(`Current Organiser Wallet Balance: ${currentBalance}`);

    if (walletBalanceBefore !== undefined) {
      const expectedBalance = walletBalanceBefore - refundAmount;
      if (currentBalance !== expectedBalance) {
        console.error(`✗ Wallet balance is ${currentBalance}, expected ${expectedBalance}.`);
        process.exit(1);
      } else {
        console.log(`✓ Wallet balance decreased correctly by ${refundAmount}`);
      }
    } else {
      if (currentBalance < 0) {
        console.error(`✗ Wallet balance is negative (${currentBalance}).`);
        process.exit(1);
      } else {
        console.log(`✓ Wallet balance is non-negative`);
      }
    }
  } catch (error) {
    console.error('Verification failed with error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
