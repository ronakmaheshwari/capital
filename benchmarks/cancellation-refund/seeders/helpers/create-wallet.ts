import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config();

import { Pool } from 'pg';
import crypto from 'crypto';


export async function createWallet(
  pool: Pool,
  { userId, balance }: { userId: string; balance: number }
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  
  await pool.query(
    `INSERT INTO "Wallet" (id, "userId", balance, currency, status, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [id, userId, balance, 'INR', 'active']
  );
  
  return { id };
}
