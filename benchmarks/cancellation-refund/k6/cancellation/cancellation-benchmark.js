import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import { BASE_URL, POLL_INTERVAL_MS } from '../shared/config.js';

// Metrics
const cancellationLatency = new Trend('cancellation_latency', true);
const cancellationSuccess = new Counter('cancellation_success');
const cancellationFailure = new Counter('cancellation_failure');
const refundJobsQueued = new Trend('refund_jobs_queued');

// Read seed data at init time
const seedData = JSON.parse(open('../../results/raw/cancellation-seed.json'));

export const options = {
  vus: 1,
  iterations: 1,  // Single cancellation
  thresholds: {
    cancellation_latency: ['p(95)<10000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function() {
  const { organiserId, eventId, slotId, organiserToken, ticketCount } = seedData;
  const url = `${BASE_URL}/organiser/${eventId}/${slotId}/cancel`;
  const headers = { 'Authorization': `Bearer ${organiserToken}`, 'Content-Type': 'application/json' };

  const startTime = Date.now();
  const res = http.patch(url, null, { headers });
  const endTime = Date.now();
  const latencyMs = endTime - startTime;

  cancellationLatency.add(latencyMs);

  const passed = check(res, {
    'status is 202': (r) => r.status === 202,
    'success flag is true': (r) => { try { return JSON.parse(r.body).success === true; } catch { return false; } },
    'refundsQueued field present': (r) => { try { return JSON.parse(r.body).data.refundsQueued !== undefined; } catch { return false; } },
  });

  if (res.status === 202) {
    cancellationSuccess.add(1);
    try {
      const body = JSON.parse(res.body);
      if (body.data && body.data.refundsQueued !== undefined) {
        refundJobsQueued.add(body.data.refundsQueued);
        console.log(`Cancellation successful. refundsQueued=${body.data.refundsQueued}, latency=${latencyMs}ms`);
      }
    } catch(e) {}
  } else {
    cancellationFailure.add(1);
    console.error(`Cancellation failed: status=${res.status}, body=${res.body}`);
  }

  // Output machine-readable result
  console.log(JSON.stringify({
    eventType: 'cancellation_result',
    eventId,
    slotId,
    status: res.status,
    latencyMs,
    refundsQueued: (() => { try { return JSON.parse(res.body).data?.refundsQueued; } catch { return null; } })(),
    timestamp: new Date().toISOString(),
  }));
}
