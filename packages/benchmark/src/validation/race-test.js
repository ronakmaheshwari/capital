import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import http from "k6/http";
import { Counter } from "k6/metrics";

const tokens = new SharedArray("validator-tokens", () => JSON.parse(open("./tokens.json")));

export const options = {
    scenarios: {
        race_test: {
            duration: "30s",
            executor: "constant-arrival-rate",
            maxVUs: 500,
            preAllocatedVUs: 200,
            rate: 500,
            timeUnit: "1s",
        },
    },
};

const success = new Counter("successful_redemption");
const duplicate = new Counter("duplicate_redemption");
const failed = new Counter("failed_requests");

const BASE_URL = "http://localhost:3003";

// Ticket ID returned from /validator/validate
const TICKET_ID = "7def4997-23a3-4fed-bef8-eba3c27998bd";

export default function () {
    const token = tokens[(__VU - 1) % tokens.length];

    const payload = JSON.stringify({
        otp_code: "1234",
        ticketId: TICKET_ID,
    });

    const params = {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    };

    const res = http.post(`${BASE_URL}/api/v1/validator/validate/otp`, payload, params);

    if (res.status === 200) {
        success.add(1);
    } else if (res.status === 409) {
        duplicate.add(1);
    } else {
        failed.add(1);
    }

    check(res, {
        "response handled": (r) => r.status === 200 || r.status === 400 || r.status === 409,
    });

    sleep(Math.random() * 0.05);
}
