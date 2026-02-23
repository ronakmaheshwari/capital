import database from "@repo/monolith-db";

const deleteCache = async () => {
    try {
        await prisma.$executeRaw`
            TRUNCATE TABLE event_cache, event_slot_cache RESTART IDENTITY;
        `;
    } catch (error) {
        console.error(error);
    }
}

export default deleteCache;