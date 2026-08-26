/**
 * fixtures/ticket.fixture.ts
 *
 * Reusable factory functions for ticket payload test data.
 * Used in keygen unit tests and any ticket-related integration tests.
 */

export interface TicketPayloadInput {
    eventId: string;
    eventLocation: string;
    eventSlotId: string;
    eventStartTime: string;
    eventEndTime: string;
    eventTitle: string;
    firstName: string;
    lastName: string;
    email: string;
    issuedAt: string;
    quantity: number;
    ticketId: string;
    totalAmount: number;
    transactionToken: string;
}

/** A future event end time (30 min from now → ticket won't be expired) */
function futureEndTime(minutesAhead = 120): string {
    return new Date(Date.now() + minutesAhead * 60_000).toISOString();
}

/** A past event end time (ticket will be expired) */
function pastEndTime(minutesBehind = 120): string {
    return new Date(Date.now() - minutesBehind * 60_000).toISOString();
}

export function makeTicketPayload(overrides: Partial<TicketPayloadInput> = {}): TicketPayloadInput {
    return {
        eventId: "event-uuid-001",
        eventLocation: "Mumbai Arena, Mumbai",
        eventSlotId: "slot-uuid-001",
        eventStartTime: new Date(Date.now() + 60 * 60_000).toISOString(),
        eventEndTime: futureEndTime(),
        eventTitle: "Rock Concert 2025",
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        issuedAt: new Date().toISOString(),
        quantity: 2,
        ticketId: "ticket-uuid-abc123",
        totalAmount: 1000,
        transactionToken: "txn-token-xyz",
        ...overrides,
    };
}

export function makeExpiredTicketPayload(): TicketPayloadInput {
    return makeTicketPayload({
        eventEndTime: pastEndTime(200), // ended 200 minutes ago, expires_at = end + 30min = 170 min ago
    });
}
