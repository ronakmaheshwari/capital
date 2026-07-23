import http from "k6/http";
import { check } from "k6";

export const options = {
    scenarios: {
        validation: {
            executor: "constant-arrival-rate",

            rate: 10,          // change to 10,100,300,500

            timeUnit: "1s",

            duration: "2m",

            preAllocatedVUs: 100,

            maxVUs: 300,
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

    const res = http.post(
        `${BASE_URL}/api/v1/validator/validate`,
        payload,
        {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
                "Content-Type":"application/json",
            },
        }
    );

    check(res,{
        "status 200": r=>r.status===200
    });
}