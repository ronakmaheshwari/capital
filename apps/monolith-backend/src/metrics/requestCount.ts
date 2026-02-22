import client from "prom-client";

export const requestCount = new client.Counter({
    help: "Total number of HTTP requests",
    labelNames: [
        "method",
        "route",
        "status_code",
        "params",
        "query",
    ] as const,
    name: "http_request_total",
});

export const activeRequestsGauge = new client.Gauge({
    help: "Number of active HTTP requests",
    name: "active_requests",
});

export const httpRequestDurationMs = new client.Histogram({
    buckets: [
        0.1,
        5,
        15,
        50,
        100,
        300,
        500,
        1000,
        3000,
        5000,
    ],
    help: "Duration of HTTP requests in milliseconds",
    labelNames: [
        "method",
        "route",
        "status_code",
        "params",
        "query",
    ] as const,
    name: "http_request_duration_ms",
});
