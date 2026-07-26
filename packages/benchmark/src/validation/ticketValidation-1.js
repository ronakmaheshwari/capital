import { check } from "k6";
import { SharedArray } from "k6/data";
import http from "k6/http";

const validationData = new SharedArray("validation-data", () =>
    JSON.parse(open("./validation-data.json")),
);

export const options = {
    scenarios: {
        validation: {
            duration: "2m",
            executor: "constant-arrival-rate",
            maxVUs: 300,
            preAllocatedVUs: 100,
            rate: 1000,
            timeUnit: "1s",
        },
    },
};

const BASE = "http://localhost:3003";

export default function () {
    const data = validationData[__ITER % validationData.length];

    const res = http.post(
        `${BASE}/api/v1/validator/validate`,
        JSON.stringify({
            ciphertext: data.ciphertext,
            nonce: data.nonce,
        }),
        {
            headers: {
                Authorization: `Bearer ${data.token}`,
                "Content-Type": "application/json",
            },
        },
    );

    check(res, {
        200: (r) => r.status === 200,
    });
}
