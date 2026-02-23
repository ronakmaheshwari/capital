import { eventCache } from "../utils/lru";

const deleteCache = async (eventId?: string) => {
    try {
        eventCache.delete(`event:${eventId}`);
        await prisma.$executeRaw`
            TRUNCATE TABLE event_cache, event_slot_cache RESTART IDENTITY;
        `;
    } catch (error) {
        console.error(error);
    }
}

export default deleteCache;