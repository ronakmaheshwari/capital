import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const correctnessPass = new Counter('correctness_pass');
const correctnessFail = new Counter('correctness_fail');

const seedData = JSON.parse(open('../../results/raw/refund-seed.json'));

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    correctness_fail: ['count==0'],
    correctness_pass: ['count>0'],
  },
};

const WEBHOOK_URL = __ENV.WEBHOOK_URL || 'http://localhost:3002/api/v1/webhook';
const POLL_TIMEOUT_MS = parseInt(__ENV.POLL_TIMEOUT_MS || '30000', 10);
const POLL_INTERVAL_MS = parseInt(__ENV.POLL_INTERVAL_MS || '200', 10);

function assert(condition, message) {
  if (condition) {
    correctnessPass.add(1);
    console.log(`✓ PASS: ${message}`);
  } else {
    correctnessFail.add(1);
    console.error(`✗ FAIL: ${message}`);
  }
}

export default function() {
  const { token } = seedData;
  const url = `${WEBHOOK_URL}/transaction/refund`;
  const payload = JSON.stringify({ token });
  const headers = { 'Content-Type': 'application/json' };

  // First refund request
  const res1 = http.post(url, payload, { headers });
  assert(res1.status === 201, `First refund request returns 201 (got ${res1.status})`);
  console.log(`First refund: status=${res1.status}`);

  // Wait for worker to process first request
  let firstProcessed = false;
  const waitStart = Date.now();
  while (Date.now() - waitStart < POLL_TIMEOUT_MS) {
    sleep(POLL_INTERVAL_MS / 1000);
    const probe = http.post(url, payload, { headers });
    if (probe.status === 400) {
      try {
        const body = JSON.parse(probe.body);
        if (body.message === 'Refund already processed') {
          firstProcessed = true;
          break;
        }
      } catch {}
    }
  }
  assert(firstProcessed, `Worker processed first refund within timeout`);

  // Second refund request (duplicate) - should be rejected at API level
  const res2 = http.post(url, payload, { headers });
  assert(res2.status === 400, `Second refund request returns 400 (got ${res2.status})`);
  try {
    const body = JSON.parse(res2.body);
    assert(body.message === 'Refund already processed', `Second refund message is 'Refund already processed'`);
  } catch(e) {
    assert(false, `Second refund response body is valid JSON: ${e}`);
  }
  console.log(`Second refund (duplicate): status=${res2.status}`);
  console.log('Duplicate processing test complete. Verify financial state using verify-card.ts, verify-wallet.ts, verify-ticket.ts');
}
