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
        //http_req_failed: ['rate==0'],
    },
};

const WEBHOOK_URL =
    __ENV.WEBHOOK_URL ||
    'http://localhost:3002/api/v1/webhook';

const POLL_TIMEOUT_MS = parseInt(
    __ENV.POLL_TIMEOUT_MS || '30000',
    10,
);

const POLL_INTERVAL_MS = parseInt(
    __ENV.POLL_INTERVAL_MS || '200',
    10,
);

function assert(condition, message) {
    if (condition) {
        correctnessPass.add(1);
        console.log(`✓ PASS: ${message}`);
    } else {
        correctnessFail.add(1);
        console.error(`✗ FAIL: ${message}`);
    }
}

export default function () {
    const { token } = seedData;

    const url = `${WEBHOOK_URL}/transaction/refund`;

    const payload = JSON.stringify({ token });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        responseCallback: http.expectedStatuses({
            min: 200,
            max: 399,
        }),
    };

    // ---------------------------------------------------------
    // First refund request
    // ---------------------------------------------------------

    const res1 = http.post(url, payload, params);

    assert(
        res1.status === 201,
        `First refund request returns 201 (got ${res1.status})`,
    );

    // ---------------------------------------------------------
    // Wait for worker
    // ---------------------------------------------------------

    let firstProcessed = false;

    const waitStart = Date.now();

    while (Date.now() - waitStart < POLL_TIMEOUT_MS) {
        sleep(POLL_INTERVAL_MS / 1000);

        const probe = http.post(url, payload, params);

        if (probe.status === 400) {
            try {
                const body = JSON.parse(probe.body);

                if (
                    body.message ===
                    'Refund already processed'
                ) {
                    firstProcessed = true;
                    break;
                }
            } catch {
                // Ignore malformed intermediate responses.
            }
        }
    }

    assert(
        firstProcessed,
        'Worker processed first refund within timeout',
    );

    // ---------------------------------------------------------
    // Duplicate refund
    // ---------------------------------------------------------

    const res2 = http.post(url, payload, params);

    assert(
        res2.status === 400,
        `Duplicate refund request returns 400 (got ${res2.status})`,
    );

    try {
        const body = JSON.parse(res2.body);

        assert(
            body.message ===
                'Refund already processed',
            `Duplicate refund message is 'Refund already processed'`,
        );
    } catch (error) {
        assert(
            false,
            `Duplicate refund response body is valid JSON: ${error}`,
        );
    }

    console.log(
        'Duplicate refund correctness test complete.',
    );
}