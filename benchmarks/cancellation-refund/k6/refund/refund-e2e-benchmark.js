import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const refundHttpLatency = new Trend('refund_http_latency', true);
const refundE2eLatency = new Trend('refund_e2e_latency', true);
const refundSuccess = new Counter('refund_success');
const refundFailure = new Counter('refund_failure');

const seedData = JSON.parse(open('../../results/raw/refund-seed.json'));

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    refund_http_latency: ['p(95)<2000'],
    refund_e2e_latency: ['p(95)<30000'],
  },
};

const WEBHOOK_URL = __ENV.WEBHOOK_URL || 'http://localhost:3002/api/v1/webhook';
const POLL_INTERVAL_MS = parseInt(__ENV.POLL_INTERVAL_MS || '200', 10);
const POLL_TIMEOUT_MS = parseInt(__ENV.POLL_TIMEOUT_MS || '30000', 10);

export default function() {
  const { token } = seedData;
  const url = `${WEBHOOK_URL}/transaction/refund`;
  const payload = JSON.stringify({ token });
  const headers = { 'Content-Type': 'application/json' };

  // Step 1: Send refund request
  const e2eStart = Date.now();
  const httpStart = Date.now();
  const res = http.post(url, payload, { headers });
  const httpEnd = Date.now();
  const httpLatencyMs = httpEnd - httpStart;

  refundHttpLatency.add(httpLatencyMs);

  check(res, {
    'refund queued: status 201': (r) => r.status === 201,
  });

  if (res.status !== 201) {
    refundFailure.add(1);
    console.error(`Refund request failed: status=${res.status}, body=${res.body}`);
    return;
  }

  console.log(`Refund queued in ${httpLatencyMs}ms. Waiting for worker...`);

  // Step 2: Poll for worker completion
  // When POST /refund returns 400 with 'Refund already processed', worker has changed type to REFUND
  let workerDone = false;
  let pollAttempts = 0;
  const pollStart = Date.now();

  while (Date.now() - pollStart < POLL_TIMEOUT_MS) {
    sleep(POLL_INTERVAL_MS / 1000);
    pollAttempts++;
    const pollRes = http.post(url, payload, { headers });
    if (pollRes.status === 400) {
      let body;
      try { body = JSON.parse(pollRes.body); } catch { body = {}; }
      if (body.message === 'Refund already processed') {
        workerDone = true;
        break;
      }
    }
  }

  const e2eEnd = Date.now();
  const e2eLatencyMs = e2eEnd - e2eStart;
  refundE2eLatency.add(e2eLatencyMs);

  if (workerDone) {
    refundSuccess.add(1);
    console.log(`Worker completed. E2E latency=${e2eLatencyMs}ms, HTTP latency=${httpLatencyMs}ms, pollAttempts=${pollAttempts}`);
  } else {
    refundFailure.add(1);
    console.error(`Worker did not complete within ${POLL_TIMEOUT_MS}ms timeout. E2E latency=${e2eLatencyMs}ms`);
  }

  console.log(JSON.stringify({
    eventType: 'refund_e2e_result',
    token,
    httpLatencyMs,
    e2eLatencyMs,
    workerDone,
    pollAttempts,
    timestamp: new Date().toISOString(),
  }));
}
