import { check } from "k6";
import http from "k6/http";

const tokens = new SharedArray("validator-tokens", () => JSON.parse(open("./tokens.json")));

export const options = {
    scenarios: {
        validation: {
            duration: "2m",
            executor: "constant-arrival-rate",

            maxVUs: 300,

            preAllocatedVUs: 100,

            rate: 10, // change to 10,100,300,500

            timeUnit: "1s",
        },
    },
};

const BASE_URL = "http://localhost:3003";

const TOKEN = "YOUR_VALIDATOR_TOKEN";

const payload = JSON.stringify({
    ciphertext: "...",
    nonce: "...",
});

export default function () {
    const _token = tokens[(__VU - 1) % tokens.length];
    const res = http.post(`${BASE_URL}/api/v1/validator/validate`, payload, {
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            "Content-Type": "application/json",
        },
    });

    check(res, {
        "status 200": (r) => r.status === 200,
    });
}
