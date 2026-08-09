import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config();

import { Pool } from 'pg';
import crypto from 'crypto';


export async function createPurchase(
  pool: Pool,
  { userId, cardId, ticketId, amount, ticketCount = 1, walletId }: { userId: string; cardId: string; ticketId: string; amount: number; ticketCount?: number; walletId?: string }
): Promise<{ id: string; token: string }> {
  const id = crypto.randomUUID();
  const token = 'BM' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
  
  await pool.query(
    `INSERT INTO "Transaction" (id, "userId", "cardId", bank_name, "ticketId", amount, type, description, ticket_count, token, created_at, "walletId")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)`,
    [id, userId, cardId, 'hdfc', ticketId, amount, 'PURCHASE', 'Benchmark purchase', ticketCount, token, walletId || null]
  );
  
  return { id, token };
}
