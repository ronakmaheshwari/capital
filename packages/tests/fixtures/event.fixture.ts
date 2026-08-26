/**
 * fixtures/event.fixture.ts
 *
 * Reusable factory functions for event and slot test data.
 */

import { Decimal } from "@prisma/client/runtime/library";

export interface MockSlot {
    id: string;
    price: number | Decimal;
    total_seats: number;
    available_seats: number;
}

export interface MockEvent {
    id: string;
    title: string;
    status: string;
    category: string;
    genre: string;
    language: string;
    is_online: boolean;
    location_name: string;
    organiser?: {
        id: string;
        first_name: string;
        last_name: string;
    };
    slots: MockSlot[];
}

export function makeSlot(overrides: Partial<MockSlot> = {}): MockSlot {
    return {
        id: "slot-uuid-001",
        price: 500,
        total_seats: 100,
        available_seats: 80,
        ...overrides,
    };
}

export function makeEvent(overrides: Partial<MockEvent> = {}): MockEvent {
    return {
        id: "event-uuid-001",
        title: "Rock Concert 2025",
        status: "published",
        category: "music",
        genre: "rock",
        language: "english",
        is_online: false,
        location_name: "Mumbai Arena",
        organiser: {
            id: "organiser-uuid-5678",
            first_name: "Test",
            last_name: "Organiser",
        },
        slots: [makeSlot()],
        ...overrides,
    };
}

export function makeOnlineEvent(overrides: Partial<MockEvent> = {}): MockEvent {
    return makeEvent({
        id: "event-uuid-002",
        title: "Online Webinar",
        is_online: true,
        category: "technology",
        genre: "tech",
        location_name: "Online",
        ...overrides,
    });
}

export function makeEventWithPriceRange(min: number, max: number): MockEvent {
    return makeEvent({
        slots: [
            makeSlot({ id: "slot-min", price: min }),
            makeSlot({ id: "slot-max", price: max }),
        ],
    });
}

export function makeEventWithDecimalPrice(price: number): MockEvent {
    return makeEvent({
        slots: [makeSlot({ price: new Decimal(price) })],
    });
}
