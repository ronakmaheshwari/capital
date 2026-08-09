import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../../.env') });
dotenv.config();

import { Pool } from 'pg';
import { createUser } from './create-user';
import { createAuthToken } from './create-auth-token';


export async function createOrganiser(
  pool: Pool,
  { email, firstName = 'Benchmark', lastName = 'Organiser' }: { email: string; firstName?: string; lastName?: string }
): Promise<{ id: string; email: string; jwtToken: string }> {
  const user = await createUser(pool, { firstName, lastName, email, role: 'organiser' });
  const jwtToken = await createAuthToken(pool, { userId: user.id });
  
  return { id: user.id, email: user.email, jwtToken };
}
