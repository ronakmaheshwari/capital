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
    const ticketCount = parseInt(process.env.TICKET_COUNT || '100', 10);
    const pricePerTicket = 100;
    const buffer = ticketCount * pricePerTicket * 2;
    
    // Organiser
    const { id: organiserId, jwtToken: organiserToken } = await createOrganiser(pool, { 
      email: `benchmark-organiser-cancel-${Date.now()}@benchmark.test` 
    });
    const { id: walletId } = await createWallet(pool, { userId: organiserId, balance: buffer });
    
    // Customer
    const { id: customerId } = await createUser(pool, { 
      firstName: 'Bench', lastName: 'Customer', 
      email: `benchmark-customer-cancel-${Date.now()}@benchmark.test`, 
      role: 'user' 
    });
    const { id: cardId } = await createCard(pool, { userId: customerId, balance: buffer });
    
    // Event
    const { id: eventId } = await createEvent(pool, { organiserId });
    const { id: slotId } = await createEventSlot(pool, { 
      eventId, capacity: ticketCount, price: pricePerTicket, hoursFromNow: 72 
    });
    
    const ticketIds: string[] = [];
    const purchaseTokens: string[] = [];
    
    for (let i = 0; i < ticketCount; i++) {
      const { id: ticketId } = await createTicket(pool, { eventSlotId: slotId, userId: customerId });
      const { token } = await createPurchase(pool, { 
        userId: customerId, cardId, ticketId, amount: pricePerTicket, ticketCount: 1, walletId
      });
      ticketIds.push(ticketId);
      purchaseTokens.push(token);
    }
    
    fs.mkdirSync(path.join(__dirname, '../results/raw'), { recursive: true });
    const outputPath = path.join(__dirname, '../results/raw/cancellation-seed.json');
    fs.writeFileSync(outputPath, JSON.stringify({
      organiserId,
      eventId,
      slotId,
      ticketCount,
      organiserToken,
      customerId,
      cardId,
      walletId,
      ticketIds,
      purchaseTokens,
      pricePerTicket,
      createdAt: new Date().toISOString()
    }, null, 2));
    
    console.log('Cancellation seed written to results/raw/cancellation-seed.json');
  } catch (error) {
    console.error('Error seeding cancellation:', error);
  } finally {
    await pool.end();
  }
}

run();
