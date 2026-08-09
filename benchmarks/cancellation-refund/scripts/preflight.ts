import path from 'path';
import dotenv from 'dotenv';
import http from 'http';
import { createClient } from 'redis';
import { Pool } from 'pg';

// Load root .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3002';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL || '';

async function checkHttp(url: string, name: string): Promise<boolean> {
  return new Promise((resolve) => {
    http.get(url + '/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const body = JSON.parse(data);
          if (res.statusCode === 200 && body.status === 'ok') {
            console.log(`\x1b[32m✓\x1b[0m ${name} (200 OK)`);
            resolve(true);
          } else {
            console.error(`\x1b[31m✗\x1b[0m ${name} failed: Status ${res.statusCode}`);
            resolve(false);
          }
        } catch {
          console.error(`\x1b[31m✗\x1b[0m ${name} failed: Invalid JSON response`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.error(`\x1b[31m✗\x1b[0m ${name} failed: ${err.message}`);
      resolve(false);
    });
  });
}

async function main() {
  console.log('[Preflight] Checking services...');
  let hasErrors = false;

  if (!DATABASE_URL || !process.env.JWT_SECRET) {
    console.error('\x1b[31m✗\x1b[0m Environment (DATABASE_URL or JWT_SECRET missing)');
    hasErrors = true;
  } else {
    console.log('\x1b[32m✓\x1b[0m Environment (DATABASE_URL, JWT_SECRET set)');
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  try {
    await pool.query('SELECT 1');
    console.log('\x1b[32m✓\x1b[0m PostgreSQL (connected)');
    
    await pool.query('SELECT id FROM "User" LIMIT 1');
    console.log('\x1b[32m✓\x1b[0m Database schema (User table exists)');
  } catch (err: any) {
    console.error(`\x1b[31m✗\x1b[0m PostgreSQL or Schema failed: ${err.message}`);
    hasErrors = true;
  } finally {
    await pool.end();
  }

  const redisClient = createClient({ url: REDIS_URL });
  try {
    await redisClient.connect();
    const pingRes = await redisClient.ping();
    if (pingRes === 'PONG') {
      console.log('\x1b[32m✓\x1b[0m Redis (PONG)');
    } else {
      console.error(`\x1b[31m✗\x1b[0m Redis failed (Unexpected ping response)`);
      hasErrors = true;
    }
  } catch (err: any) {
    console.error(`\x1b[31m✗\x1b[0m Redis failed: ${err.message}`);
    hasErrors = true;
  } finally {
    await redisClient.disconnect();
  }

  const apiOk = await checkHttp(BASE_URL, 'HTTP API');
  const webhookOk = await checkHttp(WEBHOOK_URL, 'Webhook API');
  
  if (!apiOk || !webhookOk) {
    hasErrors = true;
  }

  if (hasErrors) {
    console.error('\x1b[31m[Preflight] Checks failed. Aborting.\x1b[0m');
    process.exit(1);
  } else {
    console.log('[Preflight] All checks passed. Ready to benchmark.');
  }
}

main();
