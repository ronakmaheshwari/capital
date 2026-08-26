/**
 * mocks/db.mock.ts
 *
 * Shared Prisma client mock for all tests.
 * jest-mock-extended creates a fully-typed mock that matches the real PrismaClient interface.
 * Import this file wherever `@repo/db` is used via moduleNameMapper in jest.config.ts.
 */

import { mockDeep, mockReset } from "jest-mock-extended";

// ---------------------------------------------------------------------------
// Minimal Prisma Client shape (only what our code actually uses)
// ---------------------------------------------------------------------------

export interface MockJwtToken {
    token: string;
    userId: string;
    is_revoked: boolean;
    expires_at: Date;
    user: MockUser;
}

export interface MockUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_verified: boolean;
    role: string;
}

export interface MockCard {
    id: string;
    card_number: string;
    bank_name: string;
    balance: number;
    userId: string;
}

// ---------------------------------------------------------------------------
// The mock db object
// ---------------------------------------------------------------------------

const db = {
    jwtToken: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    card: {
        findUnique: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
};

// Helper to reset all mocks between tests
export function resetDbMocks() {
    db.jwtToken.findFirst.mockReset();
    db.jwtToken.create.mockReset();
    db.jwtToken.update.mockReset();
    db.jwtToken.delete.mockReset();
    db.card.findUnique.mockReset();
    db.card.create.mockReset();
    db.card.createMany.mockReset();
    db.card.findMany.mockReset();
    db.user.findUnique.mockReset();
    db.user.findFirst.mockReset();
    db.user.create.mockReset();
    db.user.update.mockReset();
    db.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    db.$transaction.mockReset();
    db.$disconnect.mockReset();
}

export default db;
