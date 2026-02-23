import lru from "lru-cache"

export const eventCache = new lru<string, any>({
    max: 5000,
    ttl: 1000 * 60 * 5
})