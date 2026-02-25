import { check, sleep } from "k6";
import http from "k6/http";
import { Trend } from "k6/metrics";
import { BASE_URL, THRESHOLDS } from "./config.js";

export const eventLatency = new Trend("event_list_latency", true);

export const options = {
    scenarios: {
        load: {
            executor: "ramping-vus",
            gracefulRampDown: "30s",
            stages: [
                {
                    duration: "30s",
                    target: 50,
                },
                {
                    duration: "30s",
                    target: 100,
                },
                {
                    duration: "30s",
                    target: 200,
                },
                {
                    duration: "30s",
                    target: 500,
                },
                {
                    duration: "30s",
                    target: 800,
                },
                {
                    duration: "30s",
                    target: 1000,
                },
                {
                    duration: "30s",
                    target: 2000,
                },
                {
                    duration: "30s",
                    target: 2500,
                },
                // { duration: "30s", target: 3000},
                // { duration: "30s", target: 3500},
                // { duration: "30s", target: 4000},
                // { duration: "30s", target: 4500},
                // { duration: "30s", target: 5000},
            ],
            startVUs: 10,
        },
    },
    thresholds: THRESHOLDS,
};

export default function () {
    const res = http.get(`${BASE_URL}`); //${QUERY}

    check(res, {
        "200 OK": (r) => r.status === 200,
        "events present": (r) => {
            const body = r.json();
            return (
                typeof body === "object" &&
                body !== null &&
                "data" in body &&
                Array.isArray((body as any).data.events) &&
                (body as any).data.events.length > 0
            );
        },
    });

    eventLatency.add(res.timings.duration);
    sleep(1);
}
