#!/bin/bash

URL="http://localhost:3001/api/v1/events/"
CONNECTIONS=30
DURATION=60
AMOUNT=3000

for i in {1..5}
do
  echo "===== Run $i ====="
  npx autocannon \
    -c $CONNECTIONS \
    -d $DURATION \
    -a $AMOUNT \
    -p 1 \
    --json \
    $URL > run_$i.json

  sleep 10  
done
