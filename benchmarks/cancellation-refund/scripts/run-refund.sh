#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCH_DIR="$(dirname "$SCRIPT_DIR")"

ROOT_ENV="$(dirname "$(dirname "$BENCH_DIR")")/.env"
if [[ -f "$ROOT_ENV" ]]; then source <(grep -v '^#' "$ROOT_ENV" | sed 's/^/export /' | sed 's/ = /=/g'); fi

WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3002/api/v1/webhook}"
RESULTS_DIR="$BENCH_DIR/results/raw/refund"
mkdir -p "$RESULTS_DIR"

MODE="${1:-all}"
REPETITIONS=5

run_http_benchmark() {
  echo -e "\n=== Refund HTTP Benchmark ==="
  for REP in $(seq 1 $REPETITIONS); do
    printf "  Run %d/%d... " "$REP" "$REPETITIONS"
    BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/seeders/seed-refund.ts"
    OUTPUT="$RESULTS_DIR/http-run-$(printf '%02d' $REP).json"
    k6 run --env WEBHOOK_URL="$WEBHOOK_URL" --out "json=$OUTPUT" \
      "$BENCH_DIR/k6/refund/refund-http-benchmark.js" 2>&1 | tail -3
    echo "done."
    BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/seeders/reset-benchmark.ts"
    sleep 1
  done
}

run_e2e_benchmark() {
  echo -e "\n=== Refund E2E Benchmark ==="
  for REP in $(seq 1 $REPETITIONS); do
    printf "  Run %d/%d... " "$REP" "$REPETITIONS"
    BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/seeders/seed-refund.ts"
    OUTPUT="$RESULTS_DIR/e2e-run-$(printf '%02d' $REP).json"
    k6 run \
      --env WEBHOOK_URL="$WEBHOOK_URL" \
      --env POLL_INTERVAL_MS=200 \
      --env POLL_TIMEOUT_MS=30000 \
      --out "json=$OUTPUT" \
      "$BENCH_DIR/k6/refund/refund-e2e-benchmark.js" 2>&1 | tail -3
    echo "done."
    BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/verification/verify-refund.ts" || true
    BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/verification/verify-card.ts" || true
    BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/verification/verify-wallet.ts" || true
    BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/seeders/reset-benchmark.ts"
    sleep 1
  done
}

case "$MODE" in
  http) run_http_benchmark ;;
  e2e) run_e2e_benchmark ;;
  *) run_http_benchmark; run_e2e_benchmark ;;
esac

echo -e "\nRefund benchmarks complete."
