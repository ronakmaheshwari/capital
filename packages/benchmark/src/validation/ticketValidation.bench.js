/**
 * ticketValidation.bench.js
 *
 * k6 Component Benchmark — POST /api/v1/validator/validate
 *
 * Tests the ticket validation endpoint in isolation under a sustained
 * constant-arrival-rate load for IEEE Access performance evaluation.
 *
 * How to run:
 *   k6 run packages/benchmark/src/validation/ticketValidation.bench.js
 *
 *   Override base URL or rate at runtime:
 *   k6 run -e BASE_URL=http://localhost:3003 -e RATE=500 ticketValidation.bench.js
 *
 * Prerequisites:
 *   1. Run the data generator:  cd packages/benchmark && npm run generate:compiled
 *   2. Start the validator app: cd apps/validator && npm run dev
 *   3. Ensure DATABASE_URL, JWT_SECRET, and TICKET_SECRET_KEY match your .env
 *
 * Data file:
 *   The generator writes packages/benchmark/results/validation-data.json.
 *   Each record contains { verifierToken, ciphertext, nonce, ticketId }.
 *   The verifierToken carries role=verifier — required by validatorMiddleware.
 *   open() below uses a path relative to where you invoke k6 from.
 *
 * Endpoint contract (POST /api/v1/validator/validate):
 *   Request:
 *     Authorization: Bearer <verifierToken>
 *     Content-Type:  application/json
 *     Body: { "ciphertext": "...", "nonce": "..." }
 *   Success response (200):
 *     { "message": "OTP for person validation", "ticketId": "uuid" }
 *   Error responses:
 *     400 — Missing/invalid payload or invalid ticket
 *     401 — Caller is not a verifier
 *     403 — Token not found / expired / revoked
 *     500 — Internal server error
 */

import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";
import { check, group } from "k6";
import { SharedArray } from "k6/data";
import http from "k6/http";
import { Counter, Rate, Trend } from "k6/metrics";

// ── Dataset ───────────────────────────────────────────────────────────────────
// open() in k6 resolves paths relative to THIS script file's directory.
// Script is at:  packages/benchmark/src/validation/ticketValidation.bench.js
// Results are at: packages/benchmark/results/validation-data.json
// Relative path:  ../../results/validation-data.json
const validationData = new SharedArray("validation-data", () =>
    JSON.parse(open("../../results/validation-data.json")),
);

// ── Custom Metrics ────────────────────────────────────────────────────────────

/** End-to-end latency of the /validate call (ms). Published in the IEEE paper. */
const validationLatency = new Trend("validate_latency_ms", true);

/** Rate of HTTP 200 responses. */
const successRate = new Rate("validate_success_rate");

/** Total requests attempted. */
const totalRequests = new Counter("validate_total_requests");

/** Count of 4xx / 5xx responses for error breakdown. */
const errorCount = new Counter("validate_error_count");

// ── Options ───────────────────────────────────────────────────────────────────

const RATE = parseInt(__ENV.RATE || "1000", 10);
const DURATION = __ENV.DURATION || "2m";

// Must match preAllocatedVUs in options below.
// Defined as a constant because k6 does NOT expose `options` inside VU code.
const PRE_ALLOCATED_VUS = 100;

export const options = {
    scenarios: {
        /**
         * constant-arrival-rate: k6 attempts exactly RATE iterations per second
         * regardless of VU count. This models a realistic fixed-throughput load
         * and gives clean req/s numbers for the IEEE paper.
         */
        validate_constant_load: {
            duration: DURATION,
            executor: "constant-arrival-rate",
            maxVUs: 400,
            preAllocatedVUs: 100,
            rate: RATE,
            timeUnit: "1s",
        },
    },

    /**
     * IEEE Access thresholds:
     *   - p(95) latency < 500 ms   (95th percentile)
     *   - p(99) latency < 1000 ms  (99th percentile)
     *   - error rate    < 1%
     *   - success rate  > 99%
     */
    thresholds: {
        // Built-in k6 metrics
        http_req_duration: [
            "p(50)<200",
            "p(95)<500",
            "p(99)<1000",
        ],
        http_req_failed: [
            "rate<0.01",
        ],
        // Custom metrics
        validate_latency_ms: [
            "p(50)<200",
            "p(95)<500",
            "p(99)<1000",
        ],
        validate_success_rate: [
            "rate>0.99",
        ],
    },
};

// ── Configuration ─────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:3003";
const VALIDATE_URL = `${BASE_URL}/api/v1/validator/validate`;

const HEADERS_TEMPLATE = {
    "Content-Type": "application/json",
};

// ── Default function (one iteration = one validate call) ──────────────────────

export default function () {
    /**
     * Index distribution strategy:
     *   (__VU - 1) spreads VUs across distinct starting positions.
     *   Adding __ITER * validationData.length advances through the full dataset
     *   on each VU's successive iterations.
     *   The modulo wraps when the dataset is exhausted (expected: ~120 wraps
     *   over a 2-minute run at 1000 rps with 1000 records).
     *
     *   This avoids all VUs hitting index 0 simultaneously at iteration 0,
     *   which would hammer a single DB row and skew latency measurements.
     */
    const idx = (__VU - 1 + __ITER * PRE_ALLOCATED_VUS) % validationData.length;
    const record = validationData[idx];

    const payload = JSON.stringify({
        ciphertext: record.ciphertext,
        nonce: record.nonce,
    });

    const headers = {
        ...HEADERS_TEMPLATE,
        Authorization: `Bearer ${record.verifierToken}`,
    };

    const start = Date.now();

    group("POST /validate", () => {
        const res = http.post(VALIDATE_URL, payload, {
            headers,
            tags: {
                endpoint: "validate",
            },
        });

        const latency = Date.now() - start;

        totalRequests.add(1);
        validationLatency.add(latency);

        const isSuccess = check(res, {
            // Response must contain a ticketId (proves the endpoint did real work)
            "response has ticketId": (r) => {
                try {
                    const body = JSON.parse(r.body);
                    return typeof body.ticketId === "string" && body.ticketId.length > 0;
                } catch {
                    return false;
                }
            },
            // Response time under 1 second (soft check; hard limit is in thresholds)
            "response time < 1s": (r) => r.timings.duration < 1000,
            // Status must be 200
            "status is 200": (r) => r.status === 200,
        });

        successRate.add(isSuccess);

        if (!isSuccess) {
            errorCount.add(1);

            // Log first failure per VU for debugging (avoid flooding logs)
            if (__ITER === 0) {
                console.warn(
                    `[VU ${__VU}] Validation failed: status=${res.status} ` +
                        `body=${res.body?.substring(0, 200)}`,
                );
            }
        }
    });
}

// ── Summary handler ───────────────────────────────────────────────────────────

/**
 * handleSummary is called once after the test completes.
 * Writes a machine-readable JSON summary alongside the human-readable stdout
 * output — useful for CI and IEEE paper result tables.
 */
export function handleSummary(data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    // handleSummary output paths are relative to the CWD where k6 is invoked.
    // Run k6 from packages/benchmark/ → results/ is a direct child.
    const jsonPath = `results/validate-summary-${timestamp}.json`;

    return {
        stdout: textSummary(data, {
            enableColors: true,
            indent: "  ",
        }),
        [jsonPath]: JSON.stringify(data, null, 2),
    };
}
