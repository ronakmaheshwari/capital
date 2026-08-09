import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config();

import { Pool } from 'pg';
import crypto from 'crypto';


export async function createEvent(
  pool: Pool,
  { organiserId, title = 'Benchmark Event', category = 'concert' }: { organiserId: string; title?: string; category?: string }
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  
  await pool.query(
    `INSERT INTO "Event" (id, "organiserId", title, description, status, category, genre, language, is_online, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
    [id, organiserId, title, 'Benchmark event', 'published', category, 'rock', 'english', false]
  );
  
  return { id };
}
