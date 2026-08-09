#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCH_DIR="$(dirname "$SCRIPT_DIR")"

ROOT_ENV="$(dirname "$(dirname "$BENCH_DIR")")/.env"
if [[ -f "$ROOT_ENV" ]]; then source <(grep -v '^#' "$ROOT_ENV" | sed 's/^/export /' | sed 's/ = /=/g'); fi

BASE_URL="${BASE_URL:-http://localhost:3001/api/v1}"
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3002/api/v1/webhook}"
MODE="${1:-all}"

RESULTS_DIR="$BENCH_DIR/results/raw"
mkdir -p "$RESULTS_DIR"

run_cancel_correctness() {
  echo -e "\n=== Cancellation Correctness Tests ==="
  BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/seeders/seed-cancellation-cases.ts"
  k6 run --env BASE_URL="$BASE_URL" "$BENCH_DIR/k6/cancellation/cancellation-correctness.js"
  echo "Running DB verification after correctness tests..."
  BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/verification/verify-cancellation.ts" || true
  BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/verification/verify-redis.ts" || true
  BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/seeders/reset-benchmark.ts"
  echo "Cancellation correctness: DONE"
}

run_refund_correctness() {
  echo -e "\n=== Refund Correctness Test ==="
  BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/seeders/seed-refund.ts"
  k6 run --env WEBHOOK_URL="$WEBHOOK_URL" "$BENCH_DIR/k6/refund/refund-correctness.js"
  echo "Running financial verification..."
  BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/verification/verify-refund.ts" || true
  BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/verification/verify-ticket.ts" || true
  BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/verification/verify-card.ts" || true
  BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/verification/verify-wallet.ts" || true
  BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/verification/verify-redis.ts" || true
  BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/seeders/reset-benchmark.ts"
  echo "Refund correctness: DONE"
}

case "$MODE" in
  cancel) run_cancel_correctness ;;
  refund) run_refund_correctness ;;
  *) run_cancel_correctness; run_refund_correctness ;;
esac
