import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const refundHttpLatency = new Trend('refund_http_latency', true);
const refundSuccess = new Counter('refund_success');
const refundFailure = new Counter('refund_failure');

const seedData = JSON.parse(open('../../results/raw/refund-seed.json'));

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    refund_http_latency: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

const WEBHOOK_URL = __ENV.WEBHOOK_URL || 'http://localhost:3002/api/v1/webhook';

export default function() {
  const { token } = seedData;
  const url = `${WEBHOOK_URL}/transaction/refund`;
  const payload = JSON.stringify({ token });
  const headers = { 'Content-Type': 'application/json' };

  const startTime = Date.now();
  const res = http.post(url, payload, { headers });
  const endTime = Date.now();
  const latencyMs = endTime - startTime;

  refundHttpLatency.add(latencyMs);

  const passed = check(res, {
    'status is 201': (r) => r.status === 201,
    'body contains queued message': (r) => (r.body || '').includes('queued'),
  });

  if (res.status === 201) {
    refundSuccess.add(1);
    console.log(`Refund HTTP: status=201, latency=${latencyMs}ms`);
  } else {
    refundFailure.add(1);
    console.error(`Refund HTTP failed: status=${res.status}, body=${res.body}, latency=${latencyMs}ms`);
  }

  console.log(JSON.stringify({
    eventType: 'refund_http_result',
    token,
    status: res.status,
    latencyMs,
    timestamp: new Date().toISOString(),
  }));
}
