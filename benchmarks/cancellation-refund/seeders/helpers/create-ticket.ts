import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config();

import { Pool } from 'pg';
import crypto from 'crypto';


export async function createTicket(
  pool: Pool,
  { eventSlotId, userId }: { eventSlotId: string; userId: string }
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  
  await pool.query(
    `INSERT INTO "Ticket" (id, "eventSlotId", "userId", qr_code_data, signature, status, issued_at, is_valid, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)`,
    [id, eventSlotId, userId, 'benchmark-qr', 'benchmark-sig', 'ISSUED', true, false]
  );
  
  return { id };
}
