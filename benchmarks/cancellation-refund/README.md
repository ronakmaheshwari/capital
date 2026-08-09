# Cancellation & Refund Benchmark Suite

IEEE Access Reproducible Benchmark — Capital Event-Ticketing System

---

## Overview

This benchmark suite measures the latency, throughput, and correctness of the **ticket cancellation** and **refund** workflows of the Capital event-ticketing platform. Every experiment exercises the actual production application stack — no mocks, no stubs.

```
k6
 ↓
HTTP / Webhook API (Express)
 ↓
Express Router
 ↓
Prisma ORM
 ↓
PostgreSQL
 ↓
Redis Queue
 ↓
Refund Worker
 ↓
Prisma / PostgreSQL
```

---

## System Requirements

| Component | Version Used | Notes |
|-----------|-------------|-------|
| Node.js | ≥ 18.x | `node --version` |
| TypeScript | 5.8.3 | monorepo devDep |
| Prisma | 6.19.3 | `packages/db` |
| PostgreSQL | 14+ | default port 5432 |
| Redis | 7+ | default port 6379 |
| k6 | ≥ 0.49 | `k6 version` |
| Docker | ≥ 24 | for compose setup |
| npm | ≥ 11 | monorepo package manager |

---

## Architecture Notes

### Services

| Service | App | Port | Purpose |
|---------|-----|------|---------|
| HTTP API | `apps/http` | 3001 | Organiser cancellation endpoint |
| Webhook API | `apps/webhook` | 3002 | Refund submission endpoint |
| Refund Worker | `apps/webhook/src/workers/worker.ts` | — | Async refund processor |

### Endpoints Under Test

| Operation | Method | URL |
|-----------|--------|-----|
| Slot cancellation | PATCH | `http://localhost:3001/api/v1/organiser/:eventId/:slotId/cancel` |
| Refund submission | POST | `http://localhost:3002/api/v1/webhook/transaction/refund` |

### Redis Queue Architecture

> **Important distinction**: The cancellation handler and the refund endpoint use **different queues**.

| Queue | Producer | Consumer |
|-------|----------|---------|
| `notification:initiate` | Cancellation PATCH handler | Notification worker (`apps/http/src/workers/worker.ts`) |
| `transactions:pending` | POST /refund endpoint | Refund worker (`apps/webhook/src/workers/worker.ts`) |
| `transactions:processing` | Refund worker (BRPOPLPUSH) | Refund worker (LREM on success) |
| `transactions:failed` | Refund worker (after 3 retries) | — |

The benchmark's refund performance experiment measures jobs flowing through `transactions:pending → transactions:processing → complete`.

### Authentication

Organiser endpoints require a JWT with payload:
```json
{ "organiserId": "<userId>", "role": "organiser" }
```
Signed with `JWT_SECRET`. The token must also exist as a non-revoked, non-expired row in the `JwtToken` table. The organiser user must have `is_verified = true`.

### Transaction Isolation Levels

| Operation | Isolation Level | Notes |
|-----------|----------------|-------|
| `refundMoney()` | READ COMMITTED (PostgreSQL default) | Application-layer idempotency guard inside the transaction |
| Slot cancellation | READ COMMITTED (PostgreSQL default) | Optimistic concurrency via `WHERE isDeleted=false` |

The application does **not** use SERIALIZABLE or REPEATABLE READ. Duplicate-processing protection is implemented at the application layer: `refundMoney` re-checks `transaction.type` inside the Prisma transaction and throws if already `REFUND`.

---

## Directory Structure

```
benchmarks/cancellation-refund/
├── README.md                  ← this file
├── package.json
├── tsconfig.json
├── .env.example
│
├── config/
│   ├── benchmark.config.ts    ← queue names, endpoints, workload sizes
│   └── environment.ts         ← typed env accessor + BENCHMARK_MODE guard
│
├── seeders/
│   ├── seed-cancellation.ts   ← N tickets + PURCHASE transactions
│   ├── seed-refund.ts         ← 1 refundable PURCHASE transaction
│   ├── seed-cancellation-cases.ts  ← 4 correctness case datasets
│   ├── reset-benchmark.ts     ← deletes all benchmark-* data
│   └── helpers/               ← composable create-* functions
│
├── k6/
│   ├── shared/                ← config, metrics, thresholds, helpers
│   ├── cancellation/          ← benchmark, correctness, concurrent scripts
│   └── refund/                ← http benchmark, e2e benchmark, correctness
│
├── verification/              ← post-run DB and Redis state assertions
├── instrumentation/           ← statistical aggregation, timestamp recording
├── scripts/                   ← shell orchestration scripts
└── results/
    ├── raw/                   ← per-run k6 JSON output
    ├── processed/             ← aggregated CSV
    └── reports/               ← JSON reports for citation
```

---

## Quick Start

### 1. Install dependencies

```bash
cd benchmarks/cancellation-refund
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL, REDIS_URL, JWT_SECRET
```

Or the scripts will auto-load the root `../../.env`.

### 3. Verify services are running

```bash
# Start the stack (from monorepo root):
docker-compose up -d postgres redis
npm run start:backend       # apps/http on port 3001
npm run start:webhook       # apps/webhook on port 3002
npm run start:tworker       # apps/webhook worker

# Then:
BENCHMARK_MODE=true npm run preflight
```

Expected output:
```
✓ PostgreSQL (connected)
✓ Redis (PONG)
✓ HTTP API (200 OK)
✓ Webhook API (200 OK)
✓ Database schema (User table exists)
✓ Environment (DATABASE_URL, JWT_SECRET set)
[Preflight] All checks passed. Ready to benchmark.
```

### 4. Run everything

```bash
bash scripts/run-all.sh
```

Or run individual stages:

```bash
# Correctness tests
npm run benchmark:cancel:correctness
npm run benchmark:refund:correctness

# Performance benchmarks
npm run benchmark:cancel:performance
npm run benchmark:refund:http
npm run benchmark:refund:e2e

# View reports
cat results/reports/combined-report.json
cat results/processed/cancellation-summary.csv
```

---

## Seeder Commands

| Command | Description |
|---------|-------------|
| `npm run seed:cancel` | Seeds N tickets for the cancellation benchmark |
| `npm run seed:cancel:cases` | Seeds all 4 correctness case datasets |
| `npm run seed:refund` | Seeds 1 refundable purchase for the refund benchmark |
| `npm run reset` | Deletes all data with `benchmark-` email prefix |

Control ticket count:
```bash
TICKET_COUNT=500 npm run seed:cancel
```

> **Safety**: All seeders refuse to execute unless `BENCHMARK_MODE=true`.

---

## Benchmark Commands

| Command | k6 Script | Description |
|---------|-----------|-------------|
| `npm run benchmark:cancel:seed` | — | Seed cancellation data |
| `npm run benchmark:cancel:correctness` | `cancellation-correctness.js` | 4-case correctness test |
| `npm run benchmark:cancel:performance` | `cancellation-benchmark.js` | 5 sizes × 5 repetitions |
| `npm run benchmark:refund:seed` | — | Seed refund data |
| `npm run benchmark:refund:correctness` | `refund-correctness.js` | Duplicate-processing test |
| `npm run benchmark:refund:http` | `refund-http-benchmark.js` | Synchronous HTTP latency |
| `npm run benchmark:refund:e2e` | `refund-e2e-benchmark.js` | Full pipeline E2E latency |

---

## Cancellation Correctness Cases

| Case | Setup | Expected HTTP Status | Expected DB State |
|------|-------|--------------------|--------------------|
| 1 — Valid future slot | Future slot + ISSUED tickets | **202** | slot.isDeleted=true, tickets CANCELLED |
| 2 — Already cancelled | Same slot, cancel twice | First: **202**, Second: **401** | No additional refund jobs |
| 3 — Slot already started | start_time < now | **409** | No state changes |
| 4 — Wrong organiser | Organiser B tries event owned by A | **403** | No state changes |

> Note: Case 2 returns **401** (not 409) because the application code at `organiser.ts:2097` checks `checkSlot.isDeleted === true` before any other already-cancelled check and returns 401.

---

## Refund Correctness Assertions

After each successful refund, the verification scripts check:

| Invariant | Verification Script | Expected |
|-----------|--------------------|---------:|
| Transaction type changed | `verify-refund.ts` | `type = REFUND` |
| Transaction has canceled_at | `verify-refund.ts` | `canceled_at IS NOT NULL` |
| Ticket deleted | `verify-ticket.ts` | 0 rows with ticket ID |
| Card balance increased | `verify-card.ts` | `+refundAmount` |
| Organiser wallet decreased | `verify-wallet.ts` | `-refundAmount` |
| Slot capacity restored | `verify-refund.ts` | `+ticketCount` |

**Duplicate processing guard**: Submitting the same token twice to `POST /refund` after the worker completes returns `400 Refund already processed`. The worker itself also re-checks `transaction.type` inside the DB transaction.

---

## Financial Invariants

For each successful refund:

```
card.balance_after = card.balance_before + refund_amount   ✓
wallet.balance_after = wallet.balance_before - refund_amount  ✓
slot.capacity_after = slot.capacity_before + ticket_count  ✓
transaction.type = REFUND                                  ✓
ticket does not exist                                      ✓
```

For duplicate attempts:
```
max(card_credit) = 1 × refund_amount                      ✓
max(wallet_debit) = 1 × refund_amount                     ✓
max(capacity_increment) = 1 × ticket_count                ✓
```

---

## Result Files

```
results/
├── raw/
│   ├── cancellation-seed.json          ← seed metadata
│   ├── refund-seed.json
│   ├── cancellation-cases-seed.json
│   ├── cancellation/
│   │   ├── 10-tickets-run-01.json      ← k6 NDJSON output
│   │   ├── 10-tickets-run-02.json
│   │   └── ...
│   └── refund/
│       ├── http-run-01.json
│       ├── e2e-run-01.json
│       └── ...
├── processed/
│   ├── cancellation-summary.csv        ← aggregated statistics
│   └── refund-summary.csv
└── reports/
    ├── cancellation-report.json
    ├── refund-report.json
    └── combined-report.json
```

### CSV columns
```
metric, mean, median, stddev, p50, p90, p95, p99, ci95Lower, ci95Upper, n
```

---

## Cancellation Results Table

Run `npm run benchmark:cancel:performance` to populate.

| Ticket Count | Mean (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Tickets Cancelled | Refunds Queued | Validation Rejected |
|-------------:|----------:|---------:|---------:|---------:|------------------:|---------------:|--------------------:|
| 10 | | | | | | | |
| 50 | | | | | | | |
| 100 | | | | | | | |
| 500 | | | | | | | |
| 1000 | | | | | | | |

---

## Refund Results Table

Run `npm run benchmark:refund` to populate.

| Arrival Rate | HTTP p50 | HTTP p95 | Queue Wait p50 | Queue Wait p95 | Processing p50 | Processing p95 | E2E p50 | E2E p95 | Success |
|-------------:|---------:|---------:|---------------:|---------------:|---------------:|---------------:|--------:|--------:|--------:|
| 10 req/s | | | | | | | | | |
| 50 req/s | | | | | | | | | |
| 100 req/s | | | | | | | | | |

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `BASE_URL` | `http://localhost:3001/api/v1` | HTTP API base URL |
| `WEBHOOK_URL` | `http://localhost:3002/api/v1/webhook` | Webhook API base URL |
| `JWT_SECRET` | `123456` | Must match apps/http JWT_SECRET |
| `BENCHMARK_MODE` | — | **Must be `true`** for seeders to run |
| `TICKET_COUNT` | `100` | Tickets to create for cancellation seeder |
| `POLL_INTERVAL_MS` | `200` | E2E polling frequency |
| `POLL_TIMEOUT_MS` | `30000` | E2E polling timeout |
| `REPETITIONS` | `5` | Repetitions per workload size |

---

## Worker Configuration

The refund worker (`apps/webhook/src/workers/worker.ts`) uses:
- `BRPOPLPUSH transactions:pending transactions:processing 0` — blocking pop with move
- On success: `LREM transactions:processing 1 <job>` — remove from processing queue
- On failure (< 3 attempts): exponential back-off + re-queue to `transactions:pending`
- On failure (≥ 3 attempts): move to `transactions:failed`
- `MAX_ATTEMPTS = 3`

The worker is **not modified** by this benchmark suite. The `refundMoney()` function already rethrows errors after logging, so failed jobs are correctly classified.

---

## Reproducibility Statement

The following statement can be supported by data produced by this suite:

> "The ticket-cancellation and refund workflows were evaluated using the actual REST endpoints and asynchronous Redis-backed transaction worker. Cancellation experiments measured HTTP response latency, ticket-state transitions, refund-job generation, and post-cancellation validation behaviour. Refund experiments measured synchronous API latency and end-to-end latency from refund submission through asynchronous worker completion. Each workload was independently repeated five times, and mean, percentile, standard-deviation, and confidence-interval statistics were computed from the recorded measurements."

---

## Reproducing from a Clean Environment

```bash
# 1. Clone and install
git clone <repo>
cd capital-1
npm install

# 2. Start infrastructure
docker-compose up -d postgres redis

# 3. Apply schema
npm run database

# 4. Start services (3 terminals)
npm run start:backend
npm run start:webhook
npm run start:tworker

# 5. Install benchmark dependencies
cd benchmarks/cancellation-refund
npm install

# 6. Configure
cp .env.example .env
# Edit .env

# 7. Run full suite
bash scripts/run-all.sh
```

Total estimated runtime: **30–90 minutes** depending on hardware and ticket counts.