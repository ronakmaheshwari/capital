import { Counter, Trend, Rate } from 'k6/metrics';
// Cancellation metrics
export const cancellationLatency = new Trend('cancellation_latency', true); // true = ms
export const cancellationSuccess = new Counter('cancellation_success');
export const cancellationFailure = new Counter('cancellation_failure');
export const refundJobsQueued = new Trend('refund_jobs_queued');
export const cancellationStatus = new Counter('cancellation_status_2xx');

// Refund HTTP metrics  
export const refundHttpLatency = new Trend('refund_http_latency', true);
export const refundQueueWait = new Trend('refund_queue_wait_ms', true);
export const refundProcessingTime = new Trend('refund_processing_time_ms', true);
export const refundE2eLatency = new Trend('refund_e2e_latency', true);
export const refundSuccess = new Counter('refund_success');
export const refundFailure = new Counter('refund_failure');

// Correctness metrics
export const correctnessPass = new Counter('correctness_pass');
export const correctnessFail = new Counter('correctness_fail');
