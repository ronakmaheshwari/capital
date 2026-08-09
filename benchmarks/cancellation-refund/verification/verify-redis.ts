import path from 'path';
import dotenv from 'dotenv';
import { createClient } from 'redis';

// Load root .env
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function queueContainsTransaction(redisClient: any, queueName: string, transactionId: string): Promise<boolean> {
  const items = await redisClient.lRange(queueName, 0, -1);
  return items.some((item: string) => {
    try { 
      return JSON.parse(item).transactionId === transactionId; 
    } catch { 
      return false; 
    }
  });
}

async function main() {
  const redisClient = createClient({ url: REDIS_URL });
  
  try {
    await redisClient.connect();
    
    const pendingLen = await redisClient.lLen('transactions:pending');
    const processingLen = await redisClient.lLen('transactions:processing');
    const failedLen = await redisClient.lLen('transactions:failed');
    const notifLen = await redisClient.lLen('notification:initiate');
    
    console.log(`Queue Depths:`);
    console.log(`- transactions:pending: ${pendingLen}`);
    console.log(`- transactions:processing: ${processingLen}`);
    console.log(`- transactions:failed: ${failedLen}`);
    console.log(`- notification:initiate: ${notifLen}`);

    const transactionId = process.argv[2];
    if (transactionId) {
      const inPending = await queueContainsTransaction(redisClient, 'transactions:pending', transactionId);
      const inProcessing = await queueContainsTransaction(redisClient, 'transactions:processing', transactionId);
      const inFailed = await queueContainsTransaction(redisClient, 'transactions:failed', transactionId);
      
      let hasErrors = false;
      if (inPending) {
        console.error(`✗ Transaction ${transactionId} found in transactions:pending`);
        hasErrors = true;
      }
      if (inProcessing) {
        console.error(`✗ Transaction ${transactionId} found in transactions:processing`);
        hasErrors = true;
      }
      if (inFailed) {
        console.error(`✗ Transaction ${transactionId} found in transactions:failed`);
        hasErrors = true;
      }
      
      if (!hasErrors) {
        console.log(`✓ Transaction ${transactionId} cleanly removed from all active queues`);
      } else {
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('Redis verification failed with error:', error);
    process.exit(1);
  } finally {
    await redisClient.disconnect();
  }
}

main();
