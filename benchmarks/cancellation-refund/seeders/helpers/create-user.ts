import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config();

import { Pool } from 'pg';
import crypto from 'crypto';
import bcrypt from 'bcrypt';


export async function createUser(
  pool: Pool,
  { firstName, lastName, email, role, city = 'Benchmark City', phone }: { firstName: string; lastName: string; email: string; role: string; city?: string; phone?: string }
): Promise<{ id: string; email: string }> {
  const id = crypto.randomUUID();
  const password = await bcrypt.hash('Benchmark@123', 10);
  const phoneNumber = phone || `+1${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`;
  
  await pool.query(
    `INSERT INTO "User" (id, first_name, last_name, email, password, role, is_verified, public_key, encrypted_private_key, city, phone_number, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
    [id, firstName, lastName, email, password, role, true, 'benchmark-pubkey', 'benchmark-privkey', city, phoneNumber]
  );
  
  return { id, email };
}
