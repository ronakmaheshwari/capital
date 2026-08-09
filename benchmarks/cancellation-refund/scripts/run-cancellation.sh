#!/usr/bin/env bash
set -euo pipefail

# Resolve script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BENCH_DIR="$(dirname "$SCRIPT_DIR")"

# Source .env from root (2 levels up from benchmark dir)
ROOT_ENV="$(dirname "$(dirname "$BENCH_DIR")")/.env"
if [[ -f "$ROOT_ENV" ]]; then source <(grep -v '^#' "$ROOT_ENV" | sed 's/^/export /' | sed 's/ = /=/g'); fi

BASE_URL="${BASE_URL:-http://localhost:3001/api/v1}"
RESULTS_DIR="$BENCH_DIR/results/raw/cancellation"
mkdir -p "$RESULTS_DIR"

TICKET_COUNTS=(10 50 100 500 1000)
REPETITIONS=5

for COUNT in "${TICKET_COUNTS[@]}"; do
  echo ""
  echo "========================================="
  echo "Cancellation benchmark: $COUNT tickets"
  echo "========================================="
  
  for REP in $(seq 1 $REPETITIONS); do
    printf "  Run %d/%d... " "$REP" "$REPETITIONS"
    
    # Reset and seed
    BENCHMARK_MODE=true TICKET_COUNT=$COUNT npx ts-node "$BENCH_DIR/seeders/seed-cancellation.ts"
    
    # Run k6 benchmark  
    OUTPUT_FILE="$RESULTS_DIR/${COUNT}-tickets-run-$(printf '%02d' $REP).json"
    k6 run \
      --env BASE_URL="$BASE_URL" \
      --out "json=$OUTPUT_FILE" \
      "$BENCH_DIR/k6/cancellation/cancellation-benchmark.js" 2>&1 | tail -5
    
    echo "done. Output: $OUTPUT_FILE"
    
    # Run verification
    BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/verification/verify-cancellation.ts" || true
    
    # Reset between runs
    BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/seeders/reset-benchmark.ts"
    sleep 1
  done
done

echo ""
echo "Cancellation benchmarks complete. Aggregating results..."
BENCHMARK_MODE=true npx ts-node "$BENCH_DIR/instrumentation/aggregate-results.ts"
echo "Done. Results in $BENCH_DIR/results/"
