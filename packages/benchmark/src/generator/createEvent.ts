/**
 * createEvent.ts
 *
 * Creates or retrieves the single benchmark event and its one slot.
 *
 * Production parity:
 *   Uses the same Prisma models (Event, EventSlot) and enum values as the
 *   production event creation route (apps/http/src/routes/event.ts).
 *
 * Idempotency:
 *   - Event is looked up by (title, organiserId). If it already exists, it is
 *     reused without modification.
 *   - Slot is looked up by (eventId). The first slot found is reused.
 *     If none exists, a new one is created with config.slotCapacity.
 *
 * IEEE Access reproducibility note:
 *   The slot price is 0 so that card balances are never exhausted across
 *   large runs (1 000 – 10 000 users).
 */

import { db } from "@repo/db";
import type { BenchmarkConfig } from "./benchmark.config.js";
import type { BenchmarkOrganiser } from "./createOrganiser.js";

/** Resolved event + slot pair returned to callers. */
export interface BenchmarkEventSlot {
    eventId: string;
    eventTitle: string;
    slotId: string;
    locationName: string;
    eventDate: Date;
    startTime: Date;
    endTime: Date;
    price: number;
    capacity: number;
}

/**
 * Creates or retrieves the benchmark event and its single slot.
 *
 * @param organiser - The benchmark organiser that owns the event
 * @param config - Benchmark configuration
 * @returns BenchmarkEventSlot with all fields needed for ticket purchase + signing
 */
export async function createOrGetBenchmarkEvent(
    organiser: BenchmarkOrganiser,
    config: BenchmarkConfig,
): Promise<BenchmarkEventSlot> {
    // --- Idempotency: look up existing event by title + organiser ---
    let event = await db.event.findFirst({
        where: {
            organiserId: organiser.id,
            title: config.eventTitle,
        },
    });

    if (!event) {
        event = await db.event.create({
            data: {
                category: "conference",
                description:
                    "Automatically generated benchmark event for IEEE Access " +
                    "performance evaluation. Do not modify.",
                is_online: false,
                language: "english",
                organiserId: organiser.id,
                status: "published",
                title: config.eventTitle,
            },
        });
    }

    // --- Idempotency: look up existing slot ---
    const existingSlot = await db.eventSlot.findFirst({
        where: {
            eventId: event.id,
        },
    });

    if (existingSlot) {
        return {
            capacity: existingSlot.capacity,
            endTime: existingSlot.end_time,
            eventDate: existingSlot.event_date,
            eventId: event.id,
            eventTitle: event.title,
            locationName: existingSlot.location_name,
            price: Number(existingSlot.price),
            slotId: existingSlot.id,
            startTime: existingSlot.start_time,
        };
    }

    // --- Create the benchmark slot ---
    // Place the event 30 days from now so it is always in the future.
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 30);
    eventDate.setHours(0, 0, 0, 0);

    const startTime = new Date(eventDate);
    startTime.setHours(10, 0, 0, 0); // 10:00 UTC

    const endTime = new Date(eventDate);
    endTime.setHours(22, 0, 0, 0); // 22:00 UTC — generous window

    const slot = await db.eventSlot.create({
        data: {
            capacity: config.slotCapacity,
            end_time: endTime,
            event_date: eventDate,
            eventId: event.id,
            location_name: "Benchmark Venue",
            location_url: "https://maps.google.com?q=Benchmark+Venue",
            price: config.ticketPrice,
            start_time: startTime,
        },
    });

    return {
        capacity: slot.capacity,
        endTime: slot.end_time,
        eventDate: slot.event_date,
        eventId: event.id,
        eventTitle: event.title,
        locationName: slot.location_name,
        price: Number(slot.price),
        slotId: slot.id,
        startTime: slot.start_time,
    };
}
