…/packages/benchmark HEAD  ? ❯ k6 run src/validation/ticketValidation.bench.js


         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


     execution: local
        script: src/validation/ticketValidation.bench.js
        output: -

     scenarios: (100.00%) 1 scenario, 400 max VUs, 2m30s max duration (incl. graceful stop):
              * validate_constant_load: 100.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

WARN[0016] Insufficient VUs, reached 400 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=validate_constant_load
      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 17336     ✗ 0
      data_received..................: 3.1 MB  24 kB/s
      data_sent......................: 11 MB   87 kB/s
      dropped_iterations.............: 3332    26.22747/s
      group_duration.................: avg=5.38s    min=554.28ms med=5.2s    max=13.53s  p(90)=5.75s    p(95)=9.59s
      http_req_blocked...............: avg=38µs     min=4.58µs   med=8.19µs  max=6.95ms  p(90)=11.94µs  p(95)=78.35µs
      http_req_connecting............: avg=20.86µs  min=0s       med=0s      max=5.29ms  p(90)=0s       p(95)=0s
      http_req_duration..............: avg=5.38s    min=552.77ms med=5.2s    max=13.53s  p(90)=5.75s    p(95)=9.59s
        { expected_response:true }...: avg=5.38s    min=552.77ms med=5.2s    max=13.53s  p(90)=5.75s    p(95)=9.59s
      http_req_failed................: 0.00%   ✓ 0         ✗ 8668
      http_req_receiving.............: avg=180.77µs min=28.56µs  med=97.39µs max=14.28ms p(90)=339.92µs p(95)=588.48µs
      http_req_sending...............: avg=66.43µs  min=19.24µs  med=34.61µs max=6.22ms  p(90)=75.06µs  p(95)=143.67µs
      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s      max=0s      p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=5.38s    min=552.46ms med=5.2s    max=13.53s  p(90)=5.75s    p(95)=9.59s
      http_reqs......................: 8668    68.229205/s
      iteration_duration.............: avg=5.38s    min=554.51ms med=5.2s    max=13.53s  p(90)=5.75s    p(95)=9.59s
      iterations.....................: 8668    68.229205/s
      validate_latency_ms............: avg=5.38s    min=552.77ms med=5.2s    max=13.53s  p(90)=5.75s    p(95)=9.59s
      validate_success_rate..........: 100.00% ✓ 8668      ✗ 0
      validate_total_requests........: 8668    68.229205/s
      vus............................: 22      min=22      max=400

running (2m07.0s), 000/400 VUs, 8668 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/400 VUs  2m0s  100.00 iters/s

…/packages/benchmark HEAD ❯ k6 run src/validation/ticketValidation.bench.js


         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


     execution: local
        script: src/validation/ticketValidation.bench.js
        output: -

     scenarios: (100.00%) 1 scenario, 400 max VUs, 2m30s max duration (incl. graceful stop):
              * validate_constant_load: 100.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

WARN[0017] Insufficient VUs, reached 400 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=validate_constant_load
      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 17160     ✗ 0
      data_received..................: 3.1 MB  24 kB/s
      data_sent......................: 11 MB   87 kB/s
      dropped_iterations.............: 3421    27.177715/s
      group_duration.................: avg=5.38s    min=101.75ms med=5.46s    max=9.32s   p(90)=6.85s    p(95)=7.66s
      http_req_blocked...............: avg=43.12µs  min=5.07µs   med=8.58µs   max=10.44ms p(90)=13.3µs   p(95)=174.1µs
      http_req_connecting............: avg=23.22µs  min=0s       med=0s       max=7.94ms  p(90)=0s       p(95)=0s
      http_req_duration..............: avg=5.38s    min=100.97ms med=5.46s    max=9.32s   p(90)=6.85s    p(95)=7.66s
        { expected_response:true }...: avg=5.38s    min=100.97ms med=5.46s    max=9.32s   p(90)=6.85s    p(95)=7.66s
      http_req_failed................: 0.00%   ✓ 0         ✗ 8580
      http_req_receiving.............: avg=187.63µs min=30.98µs  med=100.41µs max=6ms     p(90)=346.42µs p(95)=634.48µs
      http_req_sending...............: avg=74.99µs  min=19.94µs  med=37.35µs  max=3.91ms  p(90)=87.59µs  p(95)=218.74µs
      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s      p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=5.38s    min=100.44ms med=5.46s    max=9.32s   p(90)=6.85s    p(95)=7.66s
      http_reqs......................: 8580    68.162757/s
      iteration_duration.............: avg=5.38s    min=102ms    med=5.46s    max=9.32s   p(90)=6.85s    p(95)=7.66s
      iterations.....................: 8580    68.162757/s
      validate_latency_ms............: avg=5.38s    min=100.97ms med=5.46s    max=9.32s   p(90)=6.85s    p(95)=7.66s
      validate_success_rate..........: 100.00% ✓ 8580      ✗ 0
      validate_total_requests........: 8580    68.162757/s
      vus............................: 120     min=60      max=400

running (2m05.9s), 000/400 VUs, 8580 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/400 VUs  2m0s  100.00 iters/s

…/packages/benchmark HEAD  ? ❯ k6 run src/validation/ticketValidation.bench.js


         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


     execution: local
        script: src/validation/ticketValidation.bench.js
        output: -

     scenarios: (100.00%) 1 scenario, 400 max VUs, 2m30s max duration (incl. graceful stop):
              * validate_constant_load: 100.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

WARN[0016] Insufficient VUs, reached 400 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=validate_constant_load
      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 17362     ✗ 0
      data_received..................: 3.1 MB  25 kB/s
      data_sent......................: 11 MB   89 kB/s
      dropped_iterations.............: 3320    26.722143/s
      group_duration.................: avg=5.27s    min=73.74ms med=5.49s   max=6.72s  p(90)=6.17s    p(95)=6.27s
      http_req_blocked...............: avg=37.71µs  min=4.29µs  med=8.23µs  max=8.6ms  p(90)=11.95µs  p(95)=51.11µs
      http_req_connecting............: avg=21.66µs  min=0s      med=0s      max=8.51ms p(90)=0s       p(95)=0s
      http_req_duration..............: avg=5.27s    min=70.27ms med=5.49s   max=6.72s  p(90)=6.17s    p(95)=6.27s
        { expected_response:true }...: avg=5.27s    min=70.27ms med=5.49s   max=6.72s  p(90)=6.17s    p(95)=6.27s
      http_req_failed................: 0.00%   ✓ 0         ✗ 8681
      http_req_receiving.............: avg=177.31µs min=23.86µs med=97.22µs max=3.61ms p(90)=320.28µs p(95)=609.4µs
      http_req_sending...............: avg=67.23µs  min=20.03µs med=34.82µs max=4.06ms p(90)=79.33µs  p(95)=154.76µs
      http_req_tls_handshaking.......: avg=0s       min=0s      med=0s      max=0s     p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=5.27s    min=70.05ms med=5.49s   max=6.72s  p(90)=6.17s    p(95)=6.27s
      http_reqs......................: 8681    69.871964/s
      iteration_duration.............: avg=5.27s    min=74.01ms med=5.49s   max=6.72s  p(90)=6.17s    p(95)=6.27s
      iterations.....................: 8681    69.871964/s
      validate_latency_ms............: avg=5.27s    min=70.27ms med=5.49s   max=6.72s  p(90)=6.17s    p(95)=6.27s
      validate_success_rate..........: 100.00% ✓ 8681      ✗ 0
      validate_total_requests........: 8681    69.871964/s
      vus............................: 77      min=52      max=400

running (2m04.2s), 000/400 VUs, 8681 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/400 VUs  2m0s  100.00 iters/s

…/packages/benchmark HEAD  ? ❯ k6 run src/validation/ticketValidation.bench.js


         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


     execution: local
        script: src/validation/ticketValidation.bench.js
        output: -

     scenarios: (100.00%) 1 scenario, 400 max VUs, 2m30s max duration (incl. graceful stop):
              * validate_constant_load: 100.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

WARN[0017] Insufficient VUs, reached 400 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=validate_constant_load
      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 17458     ✗ 0
      data_received..................: 3.1 MB  25 kB/s
      data_sent......................: 11 MB   89 kB/s
      dropped_iterations.............: 3272    26.11822/s
      group_duration.................: avg=5.25s    min=615.03ms med=5.47s   max=6.92s  p(90)=5.98s    p(95)=6.22s
      http_req_blocked...............: avg=37.57µs  min=4.8µs    med=8.3µs   max=6.78ms p(90)=12.25µs  p(95)=41.3µs
      http_req_connecting............: avg=22.07µs  min=0s       med=0s      max=5.91ms p(90)=0s       p(95)=0s
      http_req_duration..............: avg=5.25s    min=612.67ms med=5.47s   max=6.92s  p(90)=5.98s    p(95)=6.22s
        { expected_response:true }...: avg=5.25s    min=612.67ms med=5.47s   max=6.92s  p(90)=5.98s    p(95)=6.22s
      http_req_failed................: 0.00%   ✓ 0         ✗ 8729
      http_req_receiving.............: avg=176.77µs min=28.4µs   med=97.15µs max=5.65ms p(90)=335.42µs p(95)=600.09µs
      http_req_sending...............: avg=66.35µs  min=17.45µs  med=34.04µs max=7.72ms p(90)=74.78µs  p(95)=147.35µs
      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s      max=0s     p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=5.25s    min=612.53ms med=5.47s   max=6.92s  p(90)=5.98s    p(95)=6.22s
      http_reqs......................: 8729    69.677855/s
      iteration_duration.............: avg=5.25s    min=615.3ms  med=5.47s   max=6.92s  p(90)=5.99s    p(95)=6.22s
      iterations.....................: 8729    69.677855/s
      validate_latency_ms............: avg=5.25s    min=612.67ms med=5.47s   max=6.92s  p(90)=5.98s    p(95)=6.22s
      validate_success_rate..........: 100.00% ✓ 8729      ✗ 0
      validate_total_requests........: 8729    69.677855/s
      vus............................: 66      min=66      max=400

running (2m05.3s), 000/400 VUs, 8729 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/400 VUs  2m0s  100.00 iters/s

…/packages/benchmark HEAD  ? ❯ k6 run src/validation/ticketValidation.bench.js


         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


     execution: local
        script: src/validation/ticketValidation.bench.js
        output: -

     scenarios: (100.00%) 1 scenario, 400 max VUs, 2m30s max duration (incl. graceful stop):
              * validate_constant_load: 100.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

WARN[0019] Insufficient VUs, reached 400 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=validate_constant_load
      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 16736     ✗ 0
      data_received..................: 3.0 MB  24 kB/s
      data_sent......................: 11 MB   86 kB/s
      dropped_iterations.............: 3633    29.161177/s
      group_duration.................: avg=5.42s    min=86.03ms med=5.7s    max=8.2s   p(90)=6.35s    p(95)=6.82s
      http_req_blocked...............: avg=41.66µs  min=4.74µs  med=8.51µs  max=6.72ms p(90)=13.26µs  p(95)=178.55µs
      http_req_connecting............: avg=22.76µs  min=0s      med=0s      max=6.15ms p(90)=0s       p(95)=0s
      http_req_duration..............: avg=5.42s    min=85.13ms med=5.7s    max=8.19s  p(90)=6.35s    p(95)=6.82s
        { expected_response:true }...: avg=5.42s    min=85.13ms med=5.7s    max=8.19s  p(90)=6.35s    p(95)=6.82s
      http_req_failed................: 0.00%   ✓ 0         ✗ 8368
      http_req_receiving.............: avg=180.14µs min=23.39µs med=98.96µs max=8.67ms p(90)=324.52µs p(95)=606.94µs
      http_req_sending...............: avg=71.7µs   min=19.28µs med=35.6µs  max=7.36ms p(90)=80.03µs  p(95)=166.91µs
      http_req_tls_handshaking.......: avg=0s       min=0s      med=0s      max=0s     p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=5.42s    min=84.95ms med=5.7s    max=8.19s  p(90)=6.35s    p(95)=6.82s
      http_reqs......................: 8368    67.167831/s
      iteration_duration.............: avg=5.42s    min=86.24ms med=5.7s    max=8.2s   p(90)=6.35s    p(95)=6.82s
      iterations.....................: 8368    67.167831/s
      validate_latency_ms............: avg=5.42s    min=85.13ms med=5.7s    max=8.19s  p(90)=6.35s    p(95)=6.82s
      validate_success_rate..........: 100.00% ✓ 8368      ✗ 0
      validate_total_requests........: 8368    67.167831/s
      vus............................: 117     min=54      max=400

running (2m04.6s), 000/400 VUs, 8368 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/400 VUs  2m0s  100.00 iters/s