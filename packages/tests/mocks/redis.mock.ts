/**
 * mocks/redis.mock.ts
 *
 * Shared Redis client mock that replaces `@repo/cache` in tests.
 * Mapped via moduleNameMapper in jest.config.ts.
 */

const redisCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ping: jest.fn().mockResolvedValue("PONG"),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isOpen: true,
    on: jest.fn(),
};

export async function initRedis(): Promise<void> {
    // no-op in tests
}

export function resetRedisMocks() {
    redisCache.get.mockReset();
    redisCache.set.mockReset();
    redisCache.del.mockReset();
    redisCache.exists.mockReset();
    redisCache.expire.mockReset();
    redisCache.ping.mockResolvedValue("PONG");
    redisCache.connect.mockResolvedValue(undefined);
    redisCache.disconnect.mockResolvedValue(undefined);
}

export default redisCache;
