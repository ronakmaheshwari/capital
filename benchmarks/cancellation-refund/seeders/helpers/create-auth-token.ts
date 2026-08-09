import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config();

import { Pool } from 'pg';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export async function createAuthToken(
  pool: Pool,
  { userId }: { userId: string }
): Promise<string> {
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ organiserId: userId, role: 'organiser' }, secret, { expiresIn: '365d' });
  
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  
  await pool.query(
    `INSERT INTO "JwtToken" (id, "userId", token, issued_at, expires_at, is_revoked)
     VALUES ($1, $2, $3, NOW(), $4, false)`,
    [id, userId, token, expiresAt]
  );
  
  return token;
}
