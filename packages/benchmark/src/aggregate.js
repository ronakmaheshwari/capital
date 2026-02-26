import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resultsDir = path.join(
  __dirname,
  "monolith_doc",
  "Autocannon_3000"
);

const files = fs
  .readdirSync(resultsDir)
  .filter((f) => /^run_\d+\.json$/.test(f))
  .sort((a, b) => {
    const numA = Number(a.match(/\d+/)[0]);
    const numB = Number(b.match(/\d+/)[0]);
    return numA - numB;
  });

const runs = files.map((file) =>
  JSON.parse(
    fs.readFileSync(path.join(resultsDir, file), "utf8")
  )
);

console.log(`Loaded ${runs.length} runs\n`);

const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const min = (arr) => Math.min(...arr);
const max = (arr) => Math.max(...arr);

function stats(arr) {
  return {
    min: min(arr),
    mean: avg(arr),
    max: max(arr),
  };
}

function row(name, s, unit = "ms") {
  const u = unit ? ` ${unit}` : "";
  console.log(
    name.padEnd(22),
    `min: ${s.min.toFixed(2)}${u}`.padEnd(20),
    `mean: ${s.mean.toFixed(2)}${u}`.padEnd(20),
    `max: ${s.max.toFixed(2)}${u}`
  );
}

const p50 = runs.map((r) => r.latency.p50);
const p90 = runs.map((r) => r.latency.p90);
const p95 = runs.map((r) => r.latency.p95);
const p97 = runs.map((r) => r.latency.p97_5);
const p99 = runs.map((r) => r.latency.p99);

const meanLatency = runs.map((r) => r.latency.average);
const minLatency = runs.map((r) => r.latency.min);
const maxLatency = runs.map((r) => r.latency.max);

const rps = runs.map((r) => r.requests.average);
const mbps = runs.map((r) => r.throughput.average / (1024 * 1024));

console.log("===== LATENCY =====");
row("p50 latency", stats(p50));
row("p90 latency", stats(p90));
row("p95 latency", stats(p95));
row("p97.5 latency", stats(p97));
row("p99 latency", stats(p99));
row("Average latency", stats(meanLatency));
row("Minimum latency", stats(minLatency));
row("Maximum latency", stats(maxLatency));

console.log("\n===== THROUGHPUT =====");
row("Requests/sec", stats(rps), "");
row("Throughput (MB/s)", stats(mbps), "");