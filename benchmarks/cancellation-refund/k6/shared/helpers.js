import http from 'k6/http';
import { sleep } from 'k6';

// Poll until condition returns true or timeout
// conditionFn receives the http response
export function pollUntil(url, headers, conditionFn, timeoutMs, intervalMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = http.get(url, { headers });
    if (conditionFn(res)) {
      return { elapsed: Date.now() - start, response: res, timedOut: false };
    }
    sleep(intervalMs / 1000);
  }
  return { elapsed: Date.now() - start, response: null, timedOut: true };
}

export function authHeaders(token) {
  return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export function jsonBody(obj) {
  return JSON.stringify(obj);
}
