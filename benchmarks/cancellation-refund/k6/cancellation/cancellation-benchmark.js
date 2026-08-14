import http from "k6/http";
import { check } from "k6";
import { Trend, Counter } from "k6/metrics";

import { BASE_URL } from "../shared/config.js";

const cancellationLatency = new Trend(
    "cancellation_latency",
    true,
);

const cancellationSuccess = new Counter(
    "cancellation_success",
);

const cancellationFailure = new Counter(
    "cancellation_failure",
);

const refundJobsQueued = new Trend(
    "refund_jobs_queued",
);

const seedData = JSON.parse(
    open("../../results/raw/cancellation-seed.json"),
);

export const options = {
    vus: 1,
    iterations: 1,

    thresholds: {
        cancellation_latency: ["p(95)<10000"],
        http_req_failed: ["rate<0.05"],
        cancellation_success: ["count==1"],
        cancellation_failure: ["count==0"],
    },
};

export default function () {
    const {
        eventId,
        slotId,
        organiserToken,
        ticketCount,
    } = seedData;

    if (!eventId) {
        throw new Error("Missing eventId in cancellation seed");
    }

    if (!slotId) {
        throw new Error("Missing slotId in cancellation seed");
    }

    if (!organiserToken) {
        throw new Error("Missing organiserToken in cancellation seed");
    }

    if (!ticketCount) {
        throw new Error("Missing ticketCount in cancellation seed");
    }

    const url =
        `${BASE_URL}/organiser/${eventId}/${slotId}/cancel`;

    const headers = {
        Authorization: `Bearer ${organiserToken}`,
        "Content-Type": "application/json",
    };

    console.log(`POST/PATCH URL: ${url}`);
    console.log(`Expected tickets: ${ticketCount}`);

    const startTime = Date.now();

    const response = http.patch(
        url,
        null,
        {
            headers,
        },
    );

    const latencyMs = Date.now() - startTime;

    cancellationLatency.add(latencyMs);

    let body = null;

    try {
        body = JSON.parse(response.body);
    } catch {
        console.error(
            `Unable to parse response body: ${response.body}`,
        );
    }

    const checksPassed = check(response, {
        "status is 202": (r) => r.status === 202,

        "success flag is true": () =>
            body?.success === true,

        "refundsQueued field present": () =>
            body?.data?.refundsQueued !== undefined,

        "all tickets queued for refund": () =>
            body?.data?.refundsQueued === ticketCount,
    });

    if (response.status === 202 && checksPassed) {
        cancellationSuccess.add(1);

        const queued =
            body?.data?.refundsQueued ?? 0;

        refundJobsQueued.add(queued);

        console.log(
            `Cancellation successful: ` +
            `refundsQueued=${queued}, ` +
            `latency=${latencyMs}ms`,
        );
    } else {
        cancellationFailure.add(1);

        console.error(
            `Cancellation failed: ` +
            `status=${response.status}, ` +
            `body=${response.body}`,
        );
    }

    console.log(
        JSON.stringify({
            eventType: "cancellation_result",
            eventId,
            slotId,
            status: response.status,
            latencyMs,
            refundsQueued:
                body?.data?.refundsQueued ?? null,
            expectedRefunds: ticketCount,
            timestamp: new Date().toISOString(),
        }),
    );
}
