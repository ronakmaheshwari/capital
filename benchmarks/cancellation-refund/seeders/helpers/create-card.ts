import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config();

import { Pool } from 'pg';
import crypto from 'crypto';


export async function createCard(
  pool: Pool,
  { userId, balance, cardNumber }: { userId: string; balance: number; cardNumber?: string }
): Promise<{ id: string; cardNumber: string }> {
  const id = crypto.randomUUID();
  const cNum = cardNumber || `4000-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  
  await pool.query(
    `INSERT INTO "Card" (id, "userId", bank_name, card_number, balance, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [id, userId, 'hdfc', cNum, balance]
  );
  
  return { id, cardNumber: cNum };
}
