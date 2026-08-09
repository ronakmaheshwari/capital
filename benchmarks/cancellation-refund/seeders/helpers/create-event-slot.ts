import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config();

import { Pool } from 'pg';
import crypto from 'crypto';


export async function createEventSlot(
  pool: Pool,
  { eventId, capacity, price = 100.00, hoursFromNow = 72 }: { eventId: string; capacity: number; price?: number; hoursFromNow?: number }
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  const startTime = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000);
  const eventDate = startTime;
  
  await pool.query(
    `INSERT INTO "EventSlot" (id, "eventId", event_date, start_time, end_time, location_name, capacity, "isDeleted", price, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [id, eventId, eventDate, startTime, endTime, 'Benchmark Location', capacity, false, price]
  );
  
  return { id };
}
