/**
 * Environment variable accessor with type safety and validation.
 * All benchmark infrastructure reads configuration through this module.
 */

import path from 'path';
import dotenv from 'dotenv';

// Load root .env (2 levels up from benchmark root: benchmarks/cancellation-refund/ -> root)
dotenv.config({ path: path.join(__dirname, '../../.env') });
// Load local .env if present (override or supplement)
dotenv.config();

function requireEnv(name: string): string {
    const val = process.env[name];
    if (!val) {
        throw new Error(`Required environment variable ${name} is not set`);
    }
    return val;
}

function optionalEnv(name: string, defaultValue: string): string {
    return process.env[name] ?? defaultValue;
}

function optionalEnvInt(name: string, defaultValue: number): number {
    const val = process.env[name];
    if (!val) return defaultValue;
    const parsed = parseInt(val, 10);
    if (isNaN(parsed)) throw new Error(`Environment variable ${name} must be an integer, got: ${val}`);
    return parsed;
}

export const env = {
    // ─── Database ────────────────────────────────────────────────────────────
    DATABASE_URL: optionalEnv('DATABASE_URL', 'postgresql://postgres:mysecretpassword@localhost:5432/postgres'),

    // ─── Redis ───────────────────────────────────────────────────────────────
    REDIS_URL: optionalEnv('REDIS_URL', 'redis://localhost:6379'),

    // ─── Application ─────────────────────────────────────────────────────────
    BASE_URL: optionalEnv('BASE_URL', 'http://localhost:3001/api/v1'),
    WEBHOOK_URL: optionalEnv('WEBHOOK_URL', 'http://localhost:3002/api/v1/webhook'),
    JWT_SECRET: optionalEnv('JWT_SECRET', '123456'),

    // ─── Benchmark Safety ─────────────────────────────────────────────────────
    BENCHMARK_MODE: process.env.BENCHMARK_MODE === 'true',

    // ─── Workload ─────────────────────────────────────────────────────────────
    TICKET_COUNT: optionalEnvInt('TICKET_COUNT', 100),
    REFUND_AMOUNT: optionalEnv('REFUND_AMOUNT', '100'),

    // ─── k6 ───────────────────────────────────────────────────────────────────
    K6_VUS: optionalEnvInt('K6_VUS', 1),
    K6_DURATION: optionalEnv('K6_DURATION', '30s'),
    POLL_INTERVAL_MS: optionalEnvInt('POLL_INTERVAL_MS', 200),
    POLL_TIMEOUT_MS: optionalEnvInt('POLL_TIMEOUT_MS', 30000),
    ARRIVAL_RATE: optionalEnvInt('ARRIVAL_RATE', 10),
    REPETITIONS: optionalEnvInt('REPETITIONS', 5),
} as const;

/**
 * Asserts that BENCHMARK_MODE is set to true.
 * All seeders must call this before performing any database writes.
 */
export function requireBenchmarkMode(): void {
    if (process.env.BENCHMARK_MODE !== 'true') {
        console.error(
            '❌ BENCHMARK_MODE is not set to "true".\n' +
            '   Seeders refuse to run outside benchmark mode to prevent accidental data mutation.\n' +
            '   Run with: BENCHMARK_MODE=true npm run seed:cancel\n' +
            '   Or set BENCHMARK_MODE=true in your .env file.'
        );
        process.exit(1);
    }
}

export default env;
