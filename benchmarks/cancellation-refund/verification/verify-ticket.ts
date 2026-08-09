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
    let ticketId = process.argv[2];
    
    if (!ticketId) {
      const seedPath = path.join(__dirname, '../results/raw/refund-seed.json');
      if (fs.existsSync(seedPath)) {
        const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
        ticketId = seed.ticketId;
      }
    }

    if (!ticketId) {
      console.error('✗ No ticket ID provided or found in seed file.');
      process.exit(1);
    }

    const ticketRes = await pool.query('SELECT id FROM "Ticket" WHERE id = $1', [ticketId]);
    if (ticketRes.rows.length > 0) {
      console.error(`✗ Ticket ${ticketId} still exists (expected deleted).`);
      process.exit(1);
    } else {
      console.log(`✓ Ticket ${ticketId} successfully deleted`);
    }

  } catch (error) {
    console.error('Verification failed with error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
