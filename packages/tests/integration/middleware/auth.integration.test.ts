/**
 * integration/middleware/auth.integration.test.ts
 *
 * Integration tests for apps/http/src/middleware.ts
 *
 * Tests cover all four middleware functions:
 *  - userMiddleware (verified user)
 *  - unVerifiedUserMiddleware
 *  - organiserMiddleware (verified organiser)
 *  - unVerifiedOrganiserMiddleware
 *
 * Each middleware is mounted on a minimal Express app and hit via supertest.
 * The Prisma db client is mocked via moduleNameMapper → mocks/db.mock.ts.
 *
 * Scenarios per middleware:
 *  1. Missing Authorization header → 403
 *  2. Authorization header without "Bearer " prefix → 403
 *  3. Invalid / malformed JWT → 403
 *  4. Valid JWT but token not found in DB (revoked/missing) → 403
 *  5. Valid JWT, token in DB but expired → 403
 *  6. Valid JWT, valid DB token, user unverified (for verified-only middleware) → 403
 *  7. Valid JWT, valid DB token, verified user → 200 (calls next)
 *  8. Organiser: wrong role in DB → 403
 *  9. Organiser: valid, verified → 200
 */

import express from "express";
import jwt from "jsonwebtoken";
import supertest from "supertest";
import db, { resetDbMocks } from "../../mocks/db.mock";
import {
    makeExpiredJwtTokenRecord,
    makeJwtTokenRecord,
    makeOrganiser,
    makeOrganiserJwt,
    makeUnverifiedUser,
    makeUser,
    makeUserJwt,
} from "../../fixtures/user.fixture";

const JWT_SECRET = "test-jwt-secret-key-for-testing";

// ─── Helper: build a mini Express app with a given middleware ─────────────────
function buildApp(middleware: express.RequestHandler) {
    const app = express();
    app.use(express.json());
    // Protected route
    app.get("/protected", middleware, (_req, res) => {
        res.status(200).json({ message: "ok" });
    });
    return app;
}

// ─── Import middleware AFTER mocks are set up ─────────────────────────────────
// We import lazily so that the mock db module is resolved first.
let userMiddleware: express.RequestHandler;
let unVerifiedUserMiddleware: express.RequestHandler;
let organiserMiddleware: express.RequestHandler;
let unVerifiedOrganiserMiddleware: express.RequestHandler;

beforeAll(async () => {
    const mod = await import("../../../../apps/http/src/middleware");
    userMiddleware = mod.default;
    unVerifiedUserMiddleware = mod.unVerifiedUserMiddleware;
    organiserMiddleware = mod.organiserMiddleware;
    unVerifiedOrganiserMiddleware = mod.unVerifiedOrganiserMiddleware;
});

beforeEach(() => {
    resetDbMocks();
});

// =============================================================================
// userMiddleware (verified users only)
// =============================================================================
describe("userMiddleware – verified users", () => {
    let app: express.Express;

    beforeAll(async () => {
        const mod = await import("../../../../apps/http/src/middleware");
        app = buildApp(mod.default);
    });

    it("FAIL: no Authorization header → 403 with 'You are not logged in'", async () => {
        const res = await supertest(app).get("/protected");
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("You are not logged in");
    });

    it("FAIL: Authorization without Bearer prefix → 403", async () => {
        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", "Token abc123");
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("You are not logged in");
    });

    it("FAIL: malformed / invalid JWT → 403 with 'Invalid or expired token'", async () => {
        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", "Bearer not.a.valid.jwt");
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Invalid or expired token");
    });

    it("FAIL: JWT signed with wrong secret → 403", async () => {
        const token = jwt.sign({ userId: "user-1" }, "wrong-secret");
        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Invalid or expired token");
    });

    it("FAIL: valid JWT but no DB token record → 403 'Token not found or revoked'", async () => {
        const user = makeUser();
        const token = makeUserJwt(user.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(null);

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Token not found or revoked");
    });

    it("FAIL: valid JWT, DB token found but expired → 403 'Token expired'", async () => {
        const user = makeUser();
        const token = makeUserJwt(user.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeExpiredJwtTokenRecord(user, token)
        );

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Token expired");
    });

    it("FAIL: valid JWT, valid token, user NOT verified → 403 'Unverified User'", async () => {
        const user = makeUnverifiedUser();
        const token = makeUserJwt(user.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeJwtTokenRecord(user, token)
        );

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toContain("Unverified");
    });

    it("PASS: valid JWT, valid DB token, verified user → 200 ok", async () => {
        const user = makeUser();
        const token = makeUserJwt(user.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeJwtTokenRecord(user, token)
        );

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("ok");
    });
});

// =============================================================================
// unVerifiedUserMiddleware (allows unverified users)
// =============================================================================
describe("unVerifiedUserMiddleware – allows unverified users", () => {
    let app: express.Express;

    beforeAll(async () => {
        const mod = await import("../../../../apps/http/src/middleware");
        app = buildApp(mod.unVerifiedUserMiddleware);
    });

    it("FAIL: no Authorization header → 403", async () => {
        const res = await supertest(app).get("/protected");
        expect(res.status).toBe(403);
    });

    it("FAIL: no DB token found → 403", async () => {
        const token = makeUserJwt();
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(null);
        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it("PASS: valid JWT, valid DB token, user unverified → 200 (unverified is allowed)", async () => {
        const user = makeUnverifiedUser();
        const token = makeUserJwt(user.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeJwtTokenRecord(user, token)
        );

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });

    it("PASS: valid JWT, valid DB token, verified user → 200", async () => {
        const user = makeUser();
        const token = makeUserJwt(user.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeJwtTokenRecord(user, token)
        );
        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });
});

// =============================================================================
// organiserMiddleware (verified organiser)
// =============================================================================
describe("organiserMiddleware – verified organisers only", () => {
    let app: express.Express;

    beforeAll(async () => {
        const mod = await import("../../../../apps/http/src/middleware");
        app = buildApp(mod.organiserMiddleware);
    });

    it("FAIL: no Authorization header → 403", async () => {
        const res = await supertest(app).get("/protected");
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("You are not logged in");
    });

    it("FAIL: user JWT (no organiserId in payload) → 403 'Invalid token payload'", async () => {
        const token = makeUserJwt(); // only has userId, not organiserId
        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Invalid token payload");
    });

    it("FAIL: valid organiser JWT, no DB token → 403 'Token not found or revoked'", async () => {
        const organiser = makeOrganiser();
        const token = makeOrganiserJwt(organiser.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(null);

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Token not found or revoked");
    });

    it("FAIL: organiser JWT, DB token found but user role is 'user' → 403", async () => {
        const user = makeUser({ role: "user" }); // wrong role
        const token = makeOrganiserJwt(user.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeJwtTokenRecord(user, token)
        );

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it("FAIL: valid organiser JWT, valid DB record, organiser NOT verified → 403", async () => {
        const organiser = makeOrganiser({ is_verified: false });
        const token = makeOrganiserJwt(organiser.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeJwtTokenRecord(organiser, token)
        );

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toContain("Unverified");
    });

    it("FAIL: organiser JWT, DB token expired → 403 'Token expired'", async () => {
        const organiser = makeOrganiser();
        const token = makeOrganiserJwt(organiser.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeExpiredJwtTokenRecord(organiser, token)
        );

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Token expired");
    });

    it("PASS: valid organiser JWT, valid DB token, verified organiser → 200", async () => {
        const organiser = makeOrganiser();
        const token = makeOrganiserJwt(organiser.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeJwtTokenRecord(organiser, token)
        );

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("ok");
    });
});

// =============================================================================
// unVerifiedOrganiserMiddleware
// =============================================================================
describe("unVerifiedOrganiserMiddleware – allows unverified organisers", () => {
    let app: express.Express;

    beforeAll(async () => {
        const mod = await import("../../../../apps/http/src/middleware");
        app = buildApp(mod.unVerifiedOrganiserMiddleware);
    });

    it("FAIL: no auth header → 403", async () => {
        const res = await supertest(app).get("/protected");
        expect(res.status).toBe(403);
    });

    it("FAIL: user JWT (no organiserId) → 403", async () => {
        const token = makeUserJwt();
        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
        expect(res.body.message).toBe("Invalid token payload");
    });

    it("FAIL: organiser JWT but role is 'user' in DB → 403", async () => {
        const user = makeUser({ role: "user" });
        const token = makeOrganiserJwt(user.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeJwtTokenRecord(user, token)
        );
        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(403);
    });

    it("PASS: valid organiser JWT, organiser role in DB, unverified → 200 (allowed)", async () => {
        const organiser = makeOrganiser({ is_verified: false });
        const token = makeOrganiserJwt(organiser.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeJwtTokenRecord(organiser, token)
        );

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });

    it("PASS: verified organiser → 200", async () => {
        const organiser = makeOrganiser();
        const token = makeOrganiserJwt(organiser.id);
        (db.jwtToken.findFirst as jest.Mock).mockResolvedValue(
            makeJwtTokenRecord(organiser, token)
        );

        const res = await supertest(app)
            .get("/protected")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });
});
