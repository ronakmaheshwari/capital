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
    const { transactionId, ticketId, eventSlotId, slotCapacityBefore } = seed;

    let hasErrors = false;

    // 1. Check Transaction type and canceled_at
    const txRes = await pool.query('SELECT id, type, canceled_at FROM "Transaction" WHERE id = $1', [transactionId]);
    if (txRes.rows.length === 0) {
      console.error(`✗ Transaction ${transactionId} not found.`);
      hasErrors = true;
    } else {
      const tx = txRes.rows[0];
      if (tx.type !== 'REFUND') {
        console.error(`✗ Transaction type is ${tx.type}, expected REFUND.`);
        hasErrors = true;
      }
      if (!tx.canceled_at) {
        console.error(`✗ Transaction canceled_at is null.`);
        hasErrors = true;
      }
      if (tx.type === 'REFUND' && tx.canceled_at) {
        console.log('✓ Transaction is REFUND and canceled_at is set');
      }
    }

    // 2. Check ticket deleted
    const ticketRes = await pool.query('SELECT id FROM "Ticket" WHERE id = $1', [ticketId]);
    if (ticketRes.rows.length > 0) {
      console.error(`✗ Ticket ${ticketId} was not deleted.`);
      hasErrors = true;
    } else {
      console.log('✓ Ticket was successfully deleted');
    }

    // 3. Check EventSlot capacity
    const slotRes = await pool.query('SELECT capacity FROM "EventSlot" WHERE id = $1', [eventSlotId]);
    if (slotRes.rows.length > 0) {
      const currentCapacity = slotRes.rows[0].capacity;
      if (currentCapacity !== slotCapacityBefore) {
        console.error(`✗ EventSlot capacity is ${currentCapacity}, expected ${slotCapacityBefore}.`);
        hasErrors = true;
      } else {
        console.log(`✓ EventSlot capacity restored to ${currentCapacity}`);
      }
    } else {
      console.error(`✗ EventSlot ${eventSlotId} not found.`);
      hasErrors = true;
    }

    if (hasErrors) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Verification failed with error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
