// Reads from __ENV, provides defaults
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api/v1';
export const WEBHOOK_URL = __ENV.WEBHOOK_URL || 'http://localhost:3002/api/v1/webhook';
export const POLL_INTERVAL_MS = parseInt(__ENV.POLL_INTERVAL_MS || '200', 10);
export const POLL_TIMEOUT_MS = parseInt(__ENV.POLL_TIMEOUT_MS || '30000', 10);
export const K6_VUS = parseInt(__ENV.K6_VUS || '1', 10);
export const K6_DURATION = __ENV.K6_DURATION || '30s';
export const CANCEL_SEED_FILE = __ENV.CANCEL_SEED_FILE || '../results/raw/cancellation-seed.json';
export const REFUND_SEED_FILE = __ENV.REFUND_SEED_FILE || '../results/raw/refund-seed.json';
export const CASES_SEED_FILE = __ENV.CASES_SEED_FILE || '../results/raw/cancellation-cases-seed.json';
export const ARRIVAL_RATE = parseInt(__ENV.ARRIVAL_RATE || '10', 10);
export const REPETITIONS = parseInt(__ENV.REPETITIONS || '5', 10);
