#!/usr/bin/env bash
set -euo pipefail

# Run: bash scripts/run-all.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCH_DIR="$(dirname "$SCRIPT_DIR")"

ROOT_ENV="$(dirname "$(dirname "$BENCH_DIR")")/.env"
if [[ -f "$ROOT_ENV" ]]; then
  set -a
  source <(grep -v '^#' "$ROOT_ENV" | sed 's/[[:space:]]*=[[:space:]]*/=/' | grep -v '^$')
  set +a
fi

export BENCHMARK_MODE=true

log_step() {
  echo ""
  echo "╔══════════════════════════════════════════╗"
  printf  "║ %-40s ║\n" "$1"
  echo "╚══════════════════════════════════════════╝"
}

check_fail() {
  echo "✗ FAILED: $1"
  echo "Stopping execution."
  exit 1
}

# Step 1: Preflight
log_step "Step 1: Preflight"
npx ts-node "$BENCH_DIR/scripts/preflight.ts" || check_fail "Preflight checks"

# Step 2: Reset
log_step "Step 2: Reset benchmark data"
npx ts-node "$BENCH_DIR/seeders/reset-benchmark.ts" || check_fail "Reset"

# Step 3: Cancellation correctness
log_step "Step 3: Cancellation correctness"
bash "$SCRIPT_DIR/run-correctness.sh" cancel || check_fail "Cancellation correctness"

# Step 4: Cancellation performance
log_step "Step 4: Cancellation performance"
bash "$SCRIPT_DIR/run-cancellation.sh" || check_fail "Cancellation performance"

# Step 5: Reset
log_step "Step 5: Reset benchmark data"
npx ts-node "$BENCH_DIR/seeders/reset-benchmark.ts" || check_fail "Reset"

# Step 6: Refund correctness
log_step "Step 6: Refund correctness"
bash "$SCRIPT_DIR/run-correctness.sh" refund || check_fail "Refund correctness"

# Step 7: Refund performance
log_step "Step 7: Refund HTTP and E2E benchmarks"
bash "$SCRIPT_DIR/run-refund.sh" || check_fail "Refund benchmark"

# Step 8: Aggregate results
log_step "Step 8: Aggregate results and generate reports"
npx ts-node "$BENCH_DIR/instrumentation/aggregate-results.ts" || check_fail "Aggregation"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║ All benchmarks complete!                 ║"
echo "║ Reports: benchmarks/cancellation-refund/ ║"
echo "║         results/reports/                 ║"
echo "╚══════════════════════════════════════════╝"
