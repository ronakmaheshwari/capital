import http from 'k6/http';
import { check } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const cancellationLatency = new Trend('cancellation_latency', true);
const cancellationSuccess = new Counter('cancellation_success');
const cancellationFailure = new Counter('cancellation_failure');

const slots = JSON.parse(__ENV.SLOT_LIST || '[]');

export const options = {
  vus: parseInt(__ENV.K6_VUS || String(slots.length || 1), 10),
  iterations: slots.length || 1,
  thresholds: {
    cancellation_latency: ['p(95)<10000'],
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api/v1';

export default function(data) {
  const slot = slots[__VU - 1] || slots[0];
  if (!slot) { console.error('No slot data for VU ' + __VU); return; }

  const url = `${BASE_URL}/organiser/${slot.eventId}/${slot.slotId}/cancel`;
  const headers = { Authorization: `Bearer ${slot.organiserToken}` };

  const start = Date.now();
  const res = http.patch(url, null, { headers });
  const latency = Date.now() - start;
  cancellationLatency.add(latency);

  if (res.status === 202) {
    cancellationSuccess.add(1);
    console.log(`VU${__VU}: slot ${slot.slotId} cancelled in ${latency}ms`);
  } else {
    cancellationFailure.add(1);
    console.error(`VU${__VU}: slot ${slot.slotId} failed: ${res.status} ${res.body}`);
  }
}
