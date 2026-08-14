import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const correctnessPass = new Counter('correctness_pass');
const correctnessFail = new Counter('correctness_fail');

const cases = JSON.parse(open('../../results/raw/cancellation-cases-seed.json'));

function assert(condition, message) {
  if (condition) {
    correctnessPass.add(1);
    console.log(`✓ PASS: ${message}`);
  } else {
    correctnessFail.add(1);
    console.error(`✗ FAIL: ${message}`);
  }
}

export const options = {
  scenarios: {
    case1_valid: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'case1Valid' },
    case2_duplicate: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'case2Duplicate', startTime: '2s' },
    case3_started: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'case3Started', startTime: '4s' },
    case4_wrong_org: { executor: 'shared-iterations', vus: 1, iterations: 1, exec: 'case4WrongOrg', startTime: '6s' },
  },
  thresholds: { correctness_fail: ['count==0'] },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001/api/v1';

export function case1Valid() {
  const c = cases.validFuture;
  const url = `${BASE_URL}/organiser/${c.eventId}/${c.slotId}/cancel`;
  const headers = { Authorization: `Bearer ${c.organiserToken}` };
  const res = http.patch(url, null, { headers });
  assert(res.status === 202, `Case1 valid future: expect 202, got ${res.status}`);
  try {
    const body = JSON.parse(res.body);
    assert(body.success === true, `Case1: response.success === true`);
    assert(body.data.refundsQueued === c.ticketCount, `Case1: refundsQueued (${body.data.refundsQueued}) === ticketCount (${c.ticketCount})`);
  } catch(e) {
    assert(false, `Case1: response body parse failed: ${e}`);
  }
  console.log(`Case1 valid future cancellation: status=${res.status}`);
}

export function case2Duplicate() {
    const c = cases.duplicateCancellation;

    const url =
        `${BASE_URL}/organiser/${c.eventId}/${c.slotId}/cancel`;

    const headers = {
        Authorization: `Bearer ${c.organiserToken}`,
    };

    const res1 = http.patch(url, null, {
        headers,
    });

    assert(
        res1.status === 202,
        `Case2 first cancel: expect 202, got ${res1.status}`,
    );

    const res2 = http.patch(url, null, {
        headers,
    });

    assert(
        res2.status === 401,
        `Case2 second cancel: expect 401, got ${res2.status}`,
    );

    console.log(
        `Case2 duplicate cancellation: first=${res1.status}, second=${res2.status}`,
    );
}

export function case3Started() {
  const c = cases.alreadyStarted;
  const url = `${BASE_URL}/organiser/${c.eventId}/${c.slotId}/cancel`;
  const headers = { Authorization: `Bearer ${c.organiserToken}` };
  const res = http.patch(url, null, { headers });
  assert(res.status === 409, `Case3 already started: expect 409, got ${res.status}`);
  console.log(`Case3 already started: status=${res.status}`);
}

export function case4WrongOrg() {
  const c = cases.wrongOrganiser;
  const url = `${BASE_URL}/organiser/${c.eventId}/${c.slotId}/cancel`;
  const headers = { Authorization: `Bearer ${c.wrongToken}` };
  const res = http.patch(url, null, { headers });
  assert(res.status === 403, `Case4 wrong organiser: expect 403, got ${res.status}`);
  console.log(`Case4 wrong organiser: status=${res.status}`);
}
