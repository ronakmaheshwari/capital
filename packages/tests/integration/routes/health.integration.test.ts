/**
 * integration/routes/health.integration.test.ts
 *
 * Integration tests for the base HTTP app routes:
 *  - GET /       → 200 HTML greeting
 *  - GET /pid    → 200 with process ID
 *  - GET /health → 200 when DB + Redis healthy
 *              → 503 when DB fails
 *              → 503 when Redis PING fails
 *
 * The app is imported from apps/http/src/app.ts.
 * Prisma db and Redis are mocked via moduleNameMapper.
 *
 * NOTE: We import the `app` export (not `app.listen`) so no port is bound.
 */

import supertest from "supertest";
import db, { resetDbMocks } from "../../mocks/db.mock";
import redisCache, { resetRedisMocks } from "../../mocks/redis.mock";

// Suppress morgan output during tests
jest.mock("morgan", () => () => (_req: any, _res: any, next: any) => next());

let app: import("express").Express;

beforeAll(async () => {
    // Import app after mocks are in place
    const mod = await import("../../../../apps/http/src/app");
    app = mod.app;
});

beforeEach(() => {
    resetDbMocks();
    resetRedisMocks();
});

// =============================================================================
// GET /
// =============================================================================
describe("GET /", () => {
    it("PASS: returns 200 with an HTML greeting", async () => {
        const res = await supertest(app).get("/");
        expect(res.status).toBe(200);
        expect(res.text).toContain("Hello HTTP");
    });

    it("PASS: Content-Type is text/html", async () => {
        const res = await supertest(app).get("/");
        expect(res.headers["content-type"]).toMatch(/text\/html/);
    });
});

// =============================================================================
// GET /pid
// =============================================================================
describe("GET /pid", () => {
    it("PASS: returns 200 with the process ID", async () => {
        const res = await supertest(app).get("/pid");
        expect(res.status).toBe(200);
        expect(res.text).toContain(String(process.pid));
    });

    it("PASS: response contains 'process id'", async () => {
        const res = await supertest(app).get("/pid");
        expect(res.text.toLowerCase()).toContain("process id");
    });
});

// =============================================================================
// GET /health
// =============================================================================
describe("GET /health", () => {
    it("PASS: returns 200 when DB and Redis are healthy", async () => {
        // db.$queryRaw defaults to resolving with [{1}], Redis.ping defaults to "PONG"
        const res = await supertest(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body.status).toBe("ok");
        expect(res.body.message).toBe("Server is healthy");
    });

    it("PASS: healthy response includes an ISO timestamp", async () => {
        const res = await supertest(app).get("/health");
        expect(res.status).toBe(200);
        expect(res.body.timestamp).toBeDefined();
        expect(() => new Date(res.body.timestamp)).not.toThrow();
        expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
    });

    it("FAIL: returns 503 when DB query throws", async () => {
        (db.$queryRaw as jest.Mock).mockRejectedValue(new Error("DB connection refused"));

        const res = await supertest(app).get("/health");
        expect(res.status).toBe(503);
        expect(res.body.status).toBe("fail");
        expect(res.body.message).toBe("Server is unhealthy");
        expect(res.body.error).toContain("DB connection refused");
    });

    it("FAIL: returns 503 when Redis ping does not return PONG", async () => {
        (redisCache.ping as jest.Mock).mockResolvedValue("ERROR");

        const res = await supertest(app).get("/health");
        expect(res.status).toBe(503);
        expect(res.body.status).toBe("fail");
        expect(res.body.error).toContain("Redis not responding");
    });

    it("FAIL: returns 503 when Redis ping throws", async () => {
        (redisCache.ping as jest.Mock).mockRejectedValue(new Error("Redis timeout"));

        const res = await supertest(app).get("/health");
        expect(res.status).toBe(503);
        expect(res.body.status).toBe("fail");
    });

    it("PASS: unhealthy response includes timestamp and error message", async () => {
        (db.$queryRaw as jest.Mock).mockRejectedValue(new Error("timeout"));
        const res = await supertest(app).get("/health");
        expect(res.body.timestamp).toBeDefined();
        expect(res.body.error).toBeDefined();
    });
});
