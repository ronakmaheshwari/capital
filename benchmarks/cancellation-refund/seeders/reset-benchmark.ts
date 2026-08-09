import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

import { Pool } from 'pg';

if (process.env.BENCHMARK_MODE !== 'true') {
  console.error('BENCHMARK_MODE must be set to true');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res1 = await pool.query(`DELETE FROM "Transaction" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE 'benchmark-%')`);
    console.log(`Deleted ${res1.rowCount} Transactions`);

    const res2 = await pool.query(`DELETE FROM "TicketVerification" WHERE "ticketId" IN (SELECT id FROM "Ticket" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE 'benchmark-%'))`);
    console.log(`Deleted ${res2.rowCount} TicketVerifications`);

    const res3 = await pool.query(`DELETE FROM "Otp" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE 'benchmark-%')`);
    console.log(`Deleted ${res3.rowCount} Otps`);

    const res4 = await pool.query(`DELETE FROM "Ticket" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE 'benchmark-%')`);
    console.log(`Deleted ${res4.rowCount} Tickets`);

    const res5 = await pool.query(`DELETE FROM "EventSlot" WHERE "eventId" IN (SELECT id FROM "Event" WHERE "organiserId" IN (SELECT id FROM "User" WHERE email LIKE 'benchmark-%'))`);
    console.log(`Deleted ${res5.rowCount} EventSlots`);

    const res6 = await pool.query(`DELETE FROM "Event" WHERE "organiserId" IN (SELECT id FROM "User" WHERE email LIKE 'benchmark-%')`);
    console.log(`Deleted ${res6.rowCount} Events`);

    const res7 = await pool.query(`DELETE FROM "JwtToken" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE 'benchmark-%')`);
    console.log(`Deleted ${res7.rowCount} JwtTokens`);

    const res8 = await pool.query(`DELETE FROM "Wallet" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE 'benchmark-%')`);
    console.log(`Deleted ${res8.rowCount} Wallets`);

    const res9 = await pool.query(`DELETE FROM "Card" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE 'benchmark-%')`);
    console.log(`Deleted ${res9.rowCount} Cards`);

    const res10 = await pool.query(`DELETE FROM "User" WHERE email LIKE 'benchmark-%'`);
    console.log(`Deleted ${res10.rowCount} Users`);
    
    console.log('Successfully reset benchmark data.');
  } catch (error) {
    console.error('Error resetting benchmark data:', error);
  } finally {
    await pool.end();
  }
}

run();
