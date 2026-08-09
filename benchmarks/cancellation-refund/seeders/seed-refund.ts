import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config();

import { Pool } from 'pg';
import fs from 'fs';
import { createOrganiser } from './helpers/create-organiser';
import { createWallet } from './helpers/create-wallet';
import { createUser } from './helpers/create-user';
import { createCard } from './helpers/create-card';
import { createEvent } from './helpers/create-event';
import { createEventSlot } from './helpers/create-event-slot';
import { createTicket } from './helpers/create-ticket';
import { createPurchase } from './helpers/create-purchase';

if (process.env.BENCHMARK_MODE !== 'true') {
  console.error('BENCHMARK_MODE must be set to true');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const { id: organiserId } = await createOrganiser(pool, { 
      email: `benchmark-organiser-refund-${Date.now()}@benchmark.test` 
    });
    const { id: organiserWalletId } = await createWallet(pool, { userId: organiserId, balance: 10000 });
    
    const { id: customerId } = await createUser(pool, { 
      firstName: 'Bench', lastName: 'Customer', 
      email: `benchmark-customer-refund-${Date.now()}@benchmark.test`, 
      role: 'user' 
    });
    const { id: cardId } = await createCard(pool, { userId: customerId, balance: 10000 });
    
    const { id: eventId } = await createEvent(pool, { organiserId });
    const { id: eventSlotId } = await createEventSlot(pool, { 
      eventId, capacity: 10, price: 100, hoursFromNow: 72 
    });
    
    const { id: ticketId } = await createTicket(pool, { eventSlotId, userId: customerId });
    const { id: transactionId, token } = await createPurchase(pool, { 
      userId: customerId, cardId, ticketId, amount: 100, ticketCount: 1, walletId: organiserWalletId
    });
    
    fs.mkdirSync(path.join(__dirname, '../results/raw'), { recursive: true });
    const outputPath = path.join(__dirname, '../results/raw/refund-seed.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      transactionId,
      token,
      ticketId,
      cardId,
      organiserWalletId,
      eventSlotId,
      refundAmount: "100",
      ticketCount: 1,
      organiserId,
      customerId,
      slotCapacityBefore: 10,
      createdAt: new Date().toISOString()
    }, null, 2));
    
    console.log('Refund seed written to results/raw/refund-seed.json');
  } catch (error) {
    console.error('Error seeding refund:', error);
  } finally {
    await pool.end();
  }
}

run();
