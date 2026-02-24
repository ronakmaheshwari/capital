import database from "@repo/monolith-db";
import eventMemoryCache, { slotMemoryCache } from "../utils/lru";

const SYNC_INTERVAL = 1000 * 10;
const EVENT_BATCH_SIZE = 200;
// const SLOT_BATCH_SIZE = 2000;

const MAX_BIND_PARAMS = 30000;

// async function syncEventCache() {
//   try {
//     const meta = await database.$queryRawUnsafe<
//       { last_synced_at: Date }[]
//     >(`SELECT last_synced_at FROM cache_metadata WHERE id = 'event_cache'`);

//     const lastSynced = meta[0]?.last_synced_at ?? new Date(0);

//     const updatedEvents = await database.event.findMany({
//       where: {
//         updated_at: {
//           gt: lastSynced,
//         },
//       },
//       include: { slots: true },
//     });

//     if (updatedEvents.length === 0) return;

//     for (const event of updatedEvents) {
//       await database.$executeRawUnsafe(
//         `
//         INSERT INTO event_cache (
//           id, organiser_id, title, description,
//           banner_url, hero_image_url,
//           status, category, genre,
//           language, is_online,
//           created_at, updated_at
//         )
//         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
//         ON CONFLICT (id)
//         DO UPDATE SET
//           title = EXCLUDED.title,
//           description = EXCLUDED.description,
//           banner_url = EXCLUDED.banner_url,
//           hero_image_url = EXCLUDED.hero_image_url,
//           status = EXCLUDED.status,
//           category = EXCLUDED.category,
//           genre = EXCLUDED.genre,
//           language = EXCLUDED.language,
//           is_online = EXCLUDED.is_online,
//           updated_at = EXCLUDED.updated_at
//         `,
//         event.id,
//         event.organiserId,
//         event.title,
//         event.description,
//         event.banner_url,
//         event.hero_image_url,
//         event.status,
//         event.category,
//         event.genre,
//         event.language,
//         event.is_online,
//         event.created_at,
//         event.updated_at
//       );

//       for (const slot of event.slots) {
//         await database.$executeRawUnsafe(
//           `
//           INSERT INTO event_slot_cache (
//             id,event_id,event_date,start_time,end_time,
//             location_name,location_url,capacity,price,created_at
//           )
//           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
//           ON CONFLICT (id)
//           DO UPDATE SET
//             event_date = EXCLUDED.event_date,
//             start_time = EXCLUDED.start_time,
//             end_time = EXCLUDED.end_time,
//             location_name = EXCLUDED.location_name,
//             location_url = EXCLUDED.location_url,
//             capacity = EXCLUDED.capacity,
//             price = EXCLUDED.price
//           `,
//           slot.id,
//           event.id,
//           slot.event_date,
//           slot.start_time,
//           slot.end_time,
//           slot.location_name,
//           slot.location_url,
//           slot.capacity,
//           slot.price,
//           slot.created_at
//         );
//       }
//     }

//     await database.$executeRawUnsafe(`
//       UPDATE cache_metadata
//       SET last_synced_at = NOW()
//       WHERE id = 'event_cache'
//     `);

//     console.log("Event cache synced:", updatedEvents.length);

//   } catch (err) {
//     console.error("Cache sync error:", err);
//   }
// }

const syncEventCache = async () => {
    try {
        const meta = await database.$queryRaw<
            {
                last_synced_at: Date | null;
            }[]
        >`SELECT last_synced_at FROM cache_metadata WHERE id = 'event_cache'`;

        const lastSync = meta[0]?.last_synced_at ?? new Date(0);

        const updatedEvents = await database.event.findMany({
            include: {
                slots: true,
            },
            where: {
                updated_at: {
                    gt: lastSync,
                },
            },
        });

        if (!updatedEvents.length) return;

        for (let i = 0; i < updatedEvents.length; i += EVENT_BATCH_SIZE) {
            const batch = updatedEvents.slice(i, i + EVENT_BATCH_SIZE);

            await insertEventsBatch(batch);
            await insertSlotsBatch(batch.flatMap((e) => e.slots));
        }

        await database.$executeRaw`
      UPDATE cache_metadata
      SET last_synced_at = NOW()
      WHERE id = 'event_cache'
    `;
    } catch (error) {
        console.error("Cache sync error:", error);
    }
};

async function insertEventsBatch(events: any[]) {
    if (!events.length) return;

    const values: any[] = [];
    const placeholders: string[] = [];

    events.forEach((event, i) => {
        const base = i * 13;

        placeholders.push(`
      ($${base + 1}::uuid,
       $${base + 2}::uuid,
       $${base + 3},
       $${base + 4},
       $${base + 5},
       $${base + 6},
       $${base + 7},
       $${base + 8},
       $${base + 9},
       $${base + 10},
       $${base + 11},
       $${base + 12},
       $${base + 13})
    `);

        values.push(
            event.id,
            event.organiserId,
            event.title,
            event.description,
            event.banner_url,
            event.hero_image_url,
            event.status,
            event.category,
            event.genre,
            event.language,
            event.is_online,
            event.created_at,
            event.updated_at,
        );
    });

    await database.$executeRawUnsafe(
        `
    INSERT INTO event_cache (
      id, organiser_id, title, description,
      banner_url, hero_image_url,
      status, category, genre, language,
      is_online, created_at, updated_at
    )
    VALUES ${placeholders.join(",")}
    ON CONFLICT (id)
    DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      banner_url = EXCLUDED.banner_url,
      hero_image_url = EXCLUDED.hero_image_url,
      status = EXCLUDED.status,
      category = EXCLUDED.category,
      genre = EXCLUDED.genre,
      language = EXCLUDED.language,
      is_online = EXCLUDED.is_online,
      updated_at = EXCLUDED.updated_at
    `,
        ...values,
    );
}

async function insertSlotsBatch(slots: any[]) {
    if (!slots.length) return;

    const rowsPerBatch = Math.floor(MAX_BIND_PARAMS / 10);

    for (let i = 0; i < slots.length; i += rowsPerBatch) {
        const chunk = slots.slice(i, i + rowsPerBatch);

        const values: any[] = [];
        const placeholders: string[] = [];

        chunk.forEach((slot, idx) => {
            const base = idx * 10;

            placeholders.push(`
        ($${base + 1}::uuid,
         $${base + 2}::uuid,
         $${base + 3},
         $${base + 4},
         $${base + 5},
         $${base + 6},
         $${base + 7},
         $${base + 8},
         $${base + 9},
         $${base + 10})
      `);

            values.push(
                slot.id,
                slot.eventId,
                slot.event_date,
                slot.start_time,
                slot.end_time,
                slot.location_name,
                slot.location_url,
                slot.capacity,
                slot.price,
                slot.created_at,
            );
        });

        await database.$executeRawUnsafe(
            `
      INSERT INTO event_slot_cache (
        id, event_id, event_date,
        start_time, end_time,
        location_name, location_url,
        capacity, price, created_at
      )
      VALUES ${placeholders.join(",")}
      ON CONFLICT (id)
      DO UPDATE SET
        event_date = EXCLUDED.event_date,
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        location_name = EXCLUDED.location_name,
        location_url = EXCLUDED.location_url,
        capacity = EXCLUDED.capacity,
        price = EXCLUDED.price
      `,
            ...values,
        );
    }
}

export const syncEventToCache = async (eventId: string) => {
    try {
        const event = await database.event.findUnique({
            include: {
                slots: true,
            },
            where: {
                id: eventId,
            },
        });

        if (!event) {
            await database.$executeRawUnsafe(
                `DELETE FROM event_cache WHERE id = $1::uuid`,
                eventId,
            );
            await database.$executeRawUnsafe(
                `DELETE FROM event_slot_cache WHERE event_id = $1::uuid`,
                eventId,
            );

            eventMemoryCache.clear();
            slotMemoryCache.clear();
            return;
        }

        await database.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(
                `
        INSERT INTO event_cache (
          id,
          organiser_id,
          title,
          description,
          banner_url,
          hero_image_url,
          status,
          category,
          genre,
          language,
          is_online,
          created_at,
          updated_at
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
        )
        ON CONFLICT (id)
        DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          banner_url = EXCLUDED.banner_url,
          hero_image_url = EXCLUDED.hero_image_url,
          status = EXCLUDED.status,
          category = EXCLUDED.category,
          genre = EXCLUDED.genre,
          language = EXCLUDED.language,
          is_online = EXCLUDED.is_online,
          updated_at = EXCLUDED.updated_at
        `,
                event.id,
                event.organiserId,
                event.title,
                event.description,
                event.banner_url,
                event.hero_image_url,
                event.status,
                event.category,
                event.genre,
                event.language,
                event.is_online,
                event.created_at,
                event.updated_at,
            );

            await tx.$executeRawUnsafe(
                `DELETE FROM event_slot_cache WHERE event_id = $1::uuid`,
                eventId,
            );

            for (const slot of event.slots) {
                await tx.$executeRawUnsafe(
                    `
          INSERT INTO event_slot_cache (
            id,
            event_id,
            event_date,
            start_time,
            end_time,
            location_name,
            location_url,
            capacity,
            price,
            created_at
          )
          VALUES (
            $1::uuid,
            $2::uuid,
            $3,$4,$5,$6,$7,$8,$9,$10
          )
          `,
                    slot.id,
                    event.id,
                    slot.event_date,
                    slot.start_time,
                    slot.end_time,
                    slot.location_name,
                    slot.location_url,
                    slot.capacity,
                    slot.price,
                    slot.created_at,
                );
            }
        });

        eventMemoryCache.clear();
        slotMemoryCache.clear();
    } catch (error) {
        console.error("Error in syncEventToCache:", error);
    }
};

setInterval(syncEventCache, SYNC_INTERVAL);

export default syncEventCache;
