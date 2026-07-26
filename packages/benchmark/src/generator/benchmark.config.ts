/**
 * benchmark.config.ts
 *
 * Single source of truth for all benchmark-generator parameters.
 * Edit these values to scale up/down without touching business logic.
 *
 * IEEE Access reproducibility note:
 *   - All values used in the published evaluation should match these defaults.
 *   - Override at runtime via environment variables where noted.
 */

const config = {
    // ── Cards ────────────────────────────────────────────────────────────────
    /** Starting balance (INR) assigned to every benchmark user's card. */
    cardBalance: 100_000,

    // ── Concurrency ──────────────────────────────────────────────────────────
    /**
     * Maximum number of users processed in parallel per batch.
     * Increase carefully — each unit opens ~3 DB connections.
     */
    concurrency: 25,

    // ── Event ────────────────────────────────────────────────────────────────
    /** Title of the benchmark event (used for idempotency lookup). */
    eventTitle: "Benchmark Event",

    /** Path for users that failed during generation. */
    failedOutput: "failed-users.json",

    // ── Organiser ────────────────────────────────────────────────────────────
    /** Organiser account that owns the benchmark event. */
    organiserEmail: "organiser@test.com",
    organiserFirstName: "Benchmark",
    organiserLastName: "Organiser",

    // ── Output ───────────────────────────────────────────────────────────────
    /** Path (relative to generator working directory) for benchmark records. */
    output: "validation-data.json",

    /** Total seat capacity for the single benchmark slot. */
    slotCapacity: 100_000,

    /**
     * Ticket price (INR).
     * Set to 0 so card balances are never exhausted across large runs.
     */
    ticketPrice: 0,

    /** Domain suffix for generated benchmark accounts. */
    userEmailDomain: "test.com",

    /** Email prefix for generated benchmark accounts. */
    userEmailPrefix: "benchmark",
    // ── Users ────────────────────────────────────────────────────────────────
    /** Total number of benchmark users to create. */
    users: 1_000,

    // ── Verifiers ─────────────────────────────────────────────────────────────
    /**
     * Number of verifier accounts to create.
     * These are round-robined across the 1,000 benchmark records.
     * Each record's Authorization header will carry one of these verifier JWTs.
     * The /validator/validate endpoint requires role=verifier.
     */
    verifierCount: 10,
} as const;

export default config;
export type BenchmarkConfig = typeof config;
