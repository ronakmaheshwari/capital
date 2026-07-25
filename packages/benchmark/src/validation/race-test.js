import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";
import { SharedArray } from "k6/data";

const tokens = new SharedArray("validator-tokens", function () {
    return JSON.parse(open("./tokens.json"));
});

export const options = {
    scenarios: {
        race_test: {
            executor: "constant-arrival-rate",
            rate: 500,
            timeUnit: "1s",
            duration: "30s",
            preAllocatedVUs: 200,
            maxVUs: 500,
        },
    },
};

const success = new Counter("successful_redemption");
const duplicate = new Counter("duplicate_redemption");
const failed = new Counter("failed_requests");

const BASE_URL = "http://localhost:3003";

// Ticket ID returned from /validator/validate
const TICKET_ID = "a70f70cd-792e-4879-b63a-041c4f42de25";

export default function () {
    const token = tokens[(__VU - 1) % tokens.length];

    const payload = JSON.stringify({
        otp_code: "1234",
        ticketId: TICKET_ID,
    });

    const params = {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    };

    const res = http.post(
        `${BASE_URL}/api/v1/validator/validate/otp`,
        payload,
        params
    );

    if (res.status === 200) {
        success.add(1);
    } else if (res.status === 409) {
        duplicate.add(1);
    } else {
        failed.add(1);
        console.log(`FAILED ${res.status}: ${res.body}`);
    }

    check(res, {
        "response handled": (r) =>
            r.status === 200 || r.status === 400 || r.status === 409,
    });

    sleep(Math.random() * 0.05);
}