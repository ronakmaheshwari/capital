import lru from "lru-cache";

const eventMemoryCache = new lru<string, any>({
    max: 5000,
    ttl: 1000 * 60 * 5,
});

export const slotMemoryCache = new lru<string, any>({
    max: 5000,
    ttl: 1000 * 60 * 5,
});

export default eventMemoryCache;
