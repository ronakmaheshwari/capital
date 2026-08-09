export const cancellationThresholds = {
  cancellation_latency: ['p(95)<5000', 'p(99)<10000'],
  cancellation_success: ['count>0'],
  http_req_failed: ['rate<0.05'],
};
export const refundHttpThresholds = {
  refund_http_latency: ['p(50)<500', 'p(95)<2000', 'p(99)<5000'],
  refund_success: ['count>0'],
  http_req_failed: ['rate<0.05'],
};
export const refundE2eThresholds = {
  refund_e2e_latency: ['p(50)<10000', 'p(95)<30000'],
  refund_success: ['count>0'],
};
export const correctnessThresholds = {
  correctness_fail: ['count==0'],
  correctness_pass: ['count>0'],
};
