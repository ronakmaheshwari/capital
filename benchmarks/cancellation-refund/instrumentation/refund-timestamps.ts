import path from 'path';
import dotenv from 'dotenv';
import { createClient } from 'redis';

// Load root .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config(); // local .env fallback

export async function recordTimestamp(redisClient: any, transactionId: string, phase: 'enqueue' | 'pickup' | 'processing_start' | 'completed') {
  const key = `benchmark:refund:timestamps:${transactionId}`;
  await redisClient.hSet(key, phase, Date.now().toString());
  await redisClient.expire(key, 86400); // 24h TTL
}

export async function getTimestamps(redisClient: any, transactionId: string) {
  const key = `benchmark:refund:timestamps:${transactionId}`;
  const data = await redisClient.hGetAll(key);
  
  const enqueue = data.enqueue ? parseInt(data.enqueue) : null;
  const pickup = data.pickup ? parseInt(data.pickup) : null;
  const processingStart = data.processing_start ? parseInt(data.processing_start) : null;
  const completed = data.completed ? parseInt(data.completed) : null;
  
  return {
    enqueue, 
    pickup, 
    processingStart, 
    completed,
    queueWaitMs: (pickup && enqueue) ? pickup - enqueue : null,
    processingMs: (completed && pickup) ? completed - pickup : null,
    e2eMs: (completed && enqueue) ? completed - enqueue : null,
  };
}

async function main() {
  if (process.argv[2] === 'get' && process.argv[3]) {
    const transactionId = process.argv[3];
    const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    
    try {
      await redisClient.connect();
      const timestamps = await getTimestamps(redisClient, transactionId);
      console.log(`Timestamps for ${transactionId}:`, timestamps);
    } catch (err) {
      console.error(err);
    } finally {
      await redisClient.disconnect();
    }
  }
}

if (require.main === module) {
  main();
}
