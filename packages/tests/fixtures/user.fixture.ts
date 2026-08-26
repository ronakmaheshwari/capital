/**
 * fixtures/user.fixture.ts
 *
 * Reusable factory functions for user and JWT token test data.
 * Use these in both unit and integration tests to avoid duplicating fake data.
 */

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret-key-for-testing";

// ─── User Factories ───────────────────────────────────────────────────────────

export function makeUser(overrides: Partial<MockUser> = {}): MockUser {
    return {
        id: "user-uuid-1234",
        email: "testuser@example.com",
        first_name: "Test",
        last_name: "User",
        is_verified: true,
        role: "user",
        ...overrides,
    };
}

export function makeOrganiser(overrides: Partial<MockUser> = {}): MockUser {
    return makeUser({
        id: "organiser-uuid-5678",
        email: "organiser@example.com",
        first_name: "Test",
        last_name: "Organiser",
        role: "organiser",
        ...overrides,
    });
}

export function makeUnverifiedUser(overrides: Partial<MockUser> = {}): MockUser {
    return makeUser({ is_verified: false, ...overrides });
}

// ─── JWT Token Factories ──────────────────────────────────────────────────────

export interface MockUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_verified: boolean;
    role: string;
}

export interface MockJwtTokenRecord {
    token: string;
    userId: string;
    is_revoked: boolean;
    expires_at: Date;
    user: MockUser;
}

/** Creates a valid signed JWT string for a user */
export function makeUserJwt(userId: string = "user-uuid-1234"): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

/** Creates a valid signed JWT string for an organiser */
export function makeOrganiserJwt(organiserId: string = "organiser-uuid-5678"): string {
    return jwt.sign({ organiserId, role: "organiser" }, JWT_SECRET, { expiresIn: "7d" });
}

/** Creates an expired JWT string */
export function makeExpiredJwt(userId: string = "user-uuid-1234"): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "-1s" });
}

/** Creates a JWT token DB record (as returned by Prisma findFirst) */
export function makeJwtTokenRecord(
    user: MockUser,
    token: string,
    overrides: Partial<MockJwtTokenRecord> = {}
): MockJwtTokenRecord {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    return {
        token,
        userId: user.id,
        is_revoked: false,
        expires_at: futureDate,
        user,
        ...overrides,
    };
}

/** Creates an expired DB token record */
export function makeExpiredJwtTokenRecord(
    user: MockUser,
    token: string
): MockJwtTokenRecord {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    return makeJwtTokenRecord(user, token, { expires_at: pastDate });
}
