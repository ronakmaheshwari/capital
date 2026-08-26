/**
 * jest.setup.ts
 *
 * Global Jest setup file. Runs after the test framework is installed.
 * Sets up environment variables and any global configuration needed for tests.
 */

// ─── Environment variables ────────────────────────────────────────────────────
// These are set before any module is imported in tests so that modules
// that validate env vars at import time (e.g. emailService.ts) don't throw.

process.env.JWT_SECRET = "test-jwt-secret-key-for-testing";
process.env.TICKET_SECRET_KEY = ""; // Will be generated in keygen tests dynamically
process.env.SECRET_SALT = "TESTSALT";
process.env.RESEND_API_KEY = "re_test_fake_api_key";
process.env.RESEND_EMAIL_DOMAIN = "test@example.com";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb";
process.env.NODE_ENV = "test";
process.env.PORT = "3001";
