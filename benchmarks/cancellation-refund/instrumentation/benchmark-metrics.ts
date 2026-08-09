export interface RunMetrics {
  mean: number;
  median: number;
  stddev: number;
  min: number;
  max: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  ci95Lower: number;
  ci95Upper: number;
  n: number;
}

export function computeMetrics(values: number[]): RunMetrics {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 0) throw new Error('No values provided');
  
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (n > 1 ? n - 1 : 1);
  const stddev = Math.sqrt(variance);
  
  const p = (pct: number) => sorted[Math.ceil((pct / 100) * n) - 1];
  const sem = stddev / Math.sqrt(n);
  
  return {
    mean, 
    median: p(50), 
    stddev, 
    min: sorted[0], 
    max: sorted[n-1],
    p50: p(50), 
    p90: p(90), 
    p95: p(95), 
    p99: p(99),
    ci95Lower: mean - 1.96 * sem,
    ci95Upper: mean + 1.96 * sem,
    n,
  };
}

export function formatTable(metrics: RunMetrics, label: string): string {
  return `
${label}
${'─'.repeat(50)}
N:        ${metrics.n}
Mean:     ${metrics.mean.toFixed(2)}ms
Median:   ${metrics.median.toFixed(2)}ms
StdDev:   ${metrics.stddev.toFixed(2)}ms
Min:      ${metrics.min.toFixed(2)}ms
Max:      ${metrics.max.toFixed(2)}ms
p50:      ${metrics.p50.toFixed(2)}ms
p90:      ${metrics.p90.toFixed(2)}ms
p95:      ${metrics.p95.toFixed(2)}ms
p99:      ${metrics.p99.toFixed(2)}ms
95% CI:   [${metrics.ci95Lower.toFixed(2)}, ${metrics.ci95Upper.toFixed(2)}]ms
`;
}
