# @repo/tests

Central Jest test suite for the **Capital** monorepo.

---

## Structure

```
packages/tests/
├── jest.config.ts               # Jest root config with coverage thresholds
├── jest.setup.ts                # Global env vars loaded before every test
├── mocks/
│   ├── db.mock.ts               # Prisma client mock (@repo/db)
│   ├── redis.mock.ts            # Redis client mock (@repo/cache)
│   ├── resend.mock.ts           # Resend email SDK mock
│   └── sodium.mock.ts           # libsodium mock (for failure-path tests)
├── fixtures/
│   ├── user.fixture.ts          # User / organiser / JWT token factories
│   ├── event.fixture.ts         # Event / slot factories
│   └── ticket.fixture.ts        # Ticket payload factories
├── unit/
│   ├── keygen/
│   │   └── keygen.unit.test.ts          # packages/keygen cryptographic functions
│   ├── notifications/
│   │   └── otpGenerator.unit.test.ts    # OTP generation (Numeric, Alphabetic, Alphanumeric)
│   ├── helpers/
│   │   ├── date.unit.test.ts            # formatDate / formatTime
│   │   ├── pagination.unit.test.ts      # paginate<T>
│   │   └── eventFilters.unit.test.ts    # filterEvents (all filter combinations)
│   └── utils/
│       └── encrypter.unit.test.ts       # encrypt / decrypt round-trip
└── integration/
    ├── middleware/
    │   └── auth.integration.test.ts     # All 4 auth middleware variants
    └── routes/
        └── health.integration.test.ts   # GET / /pid /health
```

---

## Running Tests

```bash
# From this package
cd packages/tests

# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage report
npm run test:coverage

# CI mode (coverage + forceExit)
npm run test:ci
```

```bash
# From the monorepo root
npm run test
npm run test:coverage
npm run test:unit
npm run test:integration
```

---

## Coverage Thresholds

| Metric     | Threshold |
|------------|-----------|
| Branches   | 75%       |
| Functions  | 80%       |
| Lines      | 80%       |
| Statements | 80%       |

Coverage reports are written to `packages/tests/coverage/` (HTML + LCOV).

---

## Packages Covered

| Package / Module | Test File |
|-----------------|-----------|
| `packages/keygen` | `unit/keygen/keygen.unit.test.ts` |
| `packages/notifications` OTP utils | `unit/notifications/otpGenerator.unit.test.ts` |
| `apps/http` date helper | `unit/helpers/date.unit.test.ts` |
| `apps/http` pagination helper | `unit/helpers/pagination.unit.test.ts` |
| `apps/http` event filters | `unit/helpers/eventFilters.unit.test.ts` |
| `apps/http` encrypter util | `unit/utils/encrypter.unit.test.ts` |
| `apps/http` middleware (all 4) | `integration/middleware/auth.integration.test.ts` |
| `apps/http` base routes | `integration/routes/health.integration.test.ts` |

---

## Mock Strategy

| Import         | Resolved to           | Notes |
|----------------|-----------------------|-------|
| `@repo/db`     | `mocks/db.mock.ts`    | All Prisma methods are `jest.fn()` |
| `@repo/cache`  | `mocks/redis.mock.ts` | `ping` returns `"PONG"` by default |
| `resend`       | via `resend.mock.ts`  | `emails.send` returns `{ id: "mock-id" }` |

Real `libsodium-wrappers` is used in keygen tests (no mock) for cryptographic accuracy.
