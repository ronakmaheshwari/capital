/**
 * Central benchmark configuration.
 * All workload parameters, queue names, endpoint paths, and thresholds
 * are defined here so they can be updated in one place.
 */

// ─── Redis Queue Names ─────────────────────────────────────────────────────
// NOTE: The cancellation handler (apps/http/src/routes/organiser.ts) pushes
// refund jobs to notification:initiate, NOT transactions:pending.
// The standalone POST /refund endpoint (apps/webhook) pushes to transactions:pending.
// The refund worker (apps/webhook/src/workers/worker.ts) consumes transactions:pending.
export const QUEUES = {
    /** Queue that cancellation handler pushes refund jobs into */
    CANCELLATION_REFUND_QUEUE: 'notification:initiate',
    /** Queue that POST /refund pushes into; worker consumes this */
    REFUND_PENDING: 'transactions:pending',
    REFUND_PROCESSING: 'transactions:processing',
    REFUND_FAILED: 'transactions:failed',
} as const;

// ─── Endpoint Paths ────────────────────────────────────────────────────────
export const ENDPOINTS = {
    CANCEL_SLOT: (eventId: string, slotId: string) =>
        `/organiser/${eventId}/${slotId}/cancel`,
    REFUND: '/transaction/refund',
    TICKET_DETAIL: (ticketId: string) => `/tickets/${ticketId}`,
    HEALTH_HTTP: '/health',
    HEALTH_WEBHOOK: '/health',
} as const;

// ─── Workload Sizes ────────────────────────────────────────────────────────
export const CANCELLATION_TICKET_COUNTS = [10, 50, 100, 500, 1000] as const;
export const REFUND_ARRIVAL_RATES = [10, 50, 100] as const; // requests/sec
export const REPETITIONS = 5;

// ─── Financial Constants ───────────────────────────────────────────────────
export const DEFAULT_TICKET_PRICE = 100; // INR
export const ORGANISER_WALLET_MULTIPLIER = 2; // wallet = tickets * price * multiplier

// ─── Polling ───────────────────────────────────────────────────────────────
export const POLL_INTERVAL_MS = 200;
export const POLL_TIMEOUT_MS = 30_000;

// ─── k6 Thresholds (in milliseconds) ─────────────────────────────────────
export const THRESHOLDS = {
    cancellation: {
        p95_latency_ms: 10_000,
        p99_latency_ms: 20_000,
        failure_rate: 0.05,
    },
    refund_http: {
        p50_latency_ms: 500,
        p95_latency_ms: 2_000,
        p99_latency_ms: 5_000,
        failure_rate: 0.05,
    },
    refund_e2e: {
        p50_latency_ms: 10_000,
        p95_latency_ms: 30_000,
        failure_rate: 0.1,
    },
} as const;

// ─── Seed File Paths ───────────────────────────────────────────────────────
export const SEED_FILES = {
    CANCELLATION: 'results/raw/cancellation-seed.json',
    CANCELLATION_CASES: 'results/raw/cancellation-cases-seed.json',
    REFUND: 'results/raw/refund-seed.json',
} as const;

// ─── Result Directories ────────────────────────────────────────────────────
export const RESULT_DIRS = {
    RAW: 'results/raw',
    RAW_CANCELLATION: 'results/raw/cancellation',
    RAW_REFUND: 'results/raw/refund',
    PROCESSED: 'results/processed',
    REPORTS: 'results/reports',
} as const;

// ─── Database Isolation Level Documentation ───────────────────────────────
/**
 * PostgreSQL isolation levels used by this application:
 *
 * refundMoney() (apps/webhook/src/workers/worker.ts):
 *   Uses db.$transaction() which defaults to PostgreSQL READ COMMITTED.
 *   Includes an intra-transaction re-check of transaction.type before
 *   proceeding, providing idempotency at the application layer.
 *
 * cancellation transaction (apps/http/src/routes/organiser.ts):
 *   Uses db.$transaction() with READ COMMITTED isolation.
 *   The slot update uses isDeleted=false in the WHERE clause
 *   (updateMany returns count=0 if already deleted), providing
 *   optimistic concurrency control at the application layer.
 *
 * This is PostgreSQL's default isolation level. The application does NOT
 * use SERIALIZABLE or REPEATABLE READ.
 */
export const ISOLATION_LEVEL_DOCS = {
    cancellation: 'READ COMMITTED (PostgreSQL default)',
    refundMoney: 'READ COMMITTED (PostgreSQL default)',
    duplicate_protection: 'Application-layer re-check inside transaction',
} as const;
