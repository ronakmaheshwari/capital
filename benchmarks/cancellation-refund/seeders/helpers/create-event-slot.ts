import crypto from "crypto";
import type { Pool } from "pg";

interface CreateEventSlotOptions {
    eventId: string;
    capacity: number;
    price?: number;
    hoursFromNow?: number;
    startTime?: Date;
}

export async function createEventSlot(
    pool: Pool,
    {
        eventId,
        capacity,
        price = 100.0,
        hoursFromNow = 72,
        startTime,
    }: CreateEventSlotOptions,
): Promise<{ id: string }> {
    const id = crypto.randomUUID();

    const calculatedStartTime =
        startTime ??
        new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

    const endTime = new Date(
        calculatedStartTime.getTime() + 3 * 60 * 60 * 1000,
    );

    const eventDate = calculatedStartTime;

    await pool.query(
        `
        INSERT INTO "EventSlot" (
            id,
            "eventId",
            event_date,
            start_time,
            end_time,
            location_name,
            capacity,
            "isDeleted",
            price,
            created_at
        )
        VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8,
            $9,
            NOW()
        )
        `,
        [
            id,
            eventId,
            eventDate,
            calculatedStartTime,
            endTime,
            "Benchmark Location",
            capacity,
            false,
            price,
        ],
    );

    return {
        id,
    };
}