import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load root .env (3 levels up from benchmark verification dir)
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config(); // local .env fallback
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const seedPath = path.join(__dirname, '../results/raw/cancellation-seed.json');
    if (!fs.existsSync(seedPath)) {
      console.error('✗ Cancellation seed file not found.');
      process.exit(1);
    }

    const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    const { eventSlotId, ticketCount } = seed;

    let hasErrors = false;

    // 1. Check EventSlot isDeleted
    const slotRes = await pool.query('SELECT "isDeleted" FROM "EventSlot" WHERE id = $1', [eventSlotId]);
    if (slotRes.rows.length === 0) {
      console.error(`✗ EventSlot ${eventSlotId} not found.`);
      hasErrors = true;
    } else if (!slotRes.rows[0].isDeleted) {
      console.error(`✗ EventSlot isDeleted is false, expected true.`);
      hasErrors = true;
    } else {
      console.log('✓ Slot isDeleted: true');
    }

    // 2. Check all tickets are CANCELLED and is_valid is false
    const ticketsRes = await pool.query('SELECT id, status, is_valid FROM "Ticket" WHERE "eventSlotId" = $1', [eventSlotId]);
    const cancelledTickets = ticketsRes.rows.filter(t => t.status === 'CANCELLED' && t.is_valid === false);
    if (cancelledTickets.length !== ticketCount) {
      console.error(`✗ Expected ${ticketCount} cancelled tickets, found ${cancelledTickets.length}.`);
      hasErrors = true;
    } else {
      console.log(`✓ Tickets cancelled: ${cancelledTickets.length}/${ticketCount}`);
    }

    // 3. Check for any remaining ISSUED tickets
    const issuedRes = await pool.query('SELECT id FROM "Ticket" WHERE "eventSlotId" = $1 AND status = $2 AND is_valid = $3', [eventSlotId, 'ISSUED', true]);
    if (issuedRes.rows.length > 0) {
      console.error(`✗ Found ${issuedRes.rows.length} tickets still ISSUED.`);
      hasErrors = true;
    } else {
      console.log('✓ No remaining ISSUED tickets');
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
