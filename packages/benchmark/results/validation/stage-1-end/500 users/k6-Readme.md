…/packages/benchmark HEAD  ❯ k6 run src/validation/ticketValidation.bench.js


         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


     execution: local
        script: src/validation/ticketValidation.bench.js
        output: -

     scenarios: (100.00%) 1 scenario, 400 max VUs, 2m30s max duration (incl. graceful stop):
              * validate_constant_load: 500.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

WARN[0002] Insufficient VUs, reached 400 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=validate_constant_load
      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 24616      ✗ 0
      data_received..................: 4.4 MB  36 kB/s
      data_sent......................: 16 MB   127 kB/s
      dropped_iterations.............: 47693   386.670969/s
      group_duration.................: avg=3.93s    min=482.64ms med=3.96s   max=5.86s   p(90)=4.34s    p(95)=4.52s
      http_req_blocked...............: avg=36.57µs  min=2.95µs   med=7.57µs  max=11.11ms p(90)=10.78µs  p(95)=16.61µs
      http_req_connecting............: avg=20.69µs  min=0s       med=0s      max=5.59ms  p(90)=0s       p(95)=0s
      http_req_duration..............: avg=3.93s    min=482.41ms med=3.96s   max=5.86s   p(90)=4.34s    p(95)=4.52s
        { expected_response:true }...: avg=3.93s    min=482.41ms med=3.96s   max=5.86s   p(90)=4.34s    p(95)=4.52s
      http_req_failed................: 0.00%   ✓ 0          ✗ 12308
      http_req_receiving.............: avg=130.26µs min=24.04µs  med=91.45µs max=3.93ms  p(90)=186.81µs p(95)=373.29µs
      http_req_sending...............: avg=50.84µs  min=12.57µs  med=32.28µs max=4.58ms  p(90)=55.94µs  p(95)=98.35µs
      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s      max=0s      p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=3.93s    min=482.31ms med=3.96s   max=5.86s   p(90)=4.34s    p(95)=4.52s
      http_reqs......................: 12308   99.787103/s
      iteration_duration.............: avg=3.93s    min=483.48ms med=3.96s   max=5.86s   p(90)=4.34s    p(95)=4.52s
      iterations.....................: 12308   99.787103/s
      validate_latency_ms............: avg=3.93s    min=482.41ms med=3.96s   max=5.86s   p(90)=4.34s    p(95)=4.52s
      validate_success_rate..........: 100.00% ✓ 12308      ✗ 0
      validate_total_requests........: 12308   99.787103/s
      vus............................: 114     min=114      max=400

running (2m03.3s), 000/400 VUs, 12308 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/400 VUs  2m0s  500.00 iters/s

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
              * validate_constant_load: 500.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

WARN[0002] Insufficient VUs, reached 400 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=validate_constant_load
      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 22902      ✗ 0
      data_received..................: 4.1 MB  33 kB/s
      data_sent......................: 15 MB   119 kB/s
      dropped_iterations.............: 48550   394.070494/s
      group_duration.................: avg=4.22s    min=246.71ms med=4.21s   max=6.92s   p(90)=4.83s    p(95)=5.16s
      http_req_blocked...............: avg=47.95µs  min=3.24µs   med=7.56µs  max=18.47ms p(90)=11.83µs  p(95)=21µs
      http_req_connecting............: avg=29.03µs  min=0s       med=0s      max=6.72ms  p(90)=0s       p(95)=0s
      http_req_duration..............: avg=4.22s    min=246.06ms med=4.21s   max=6.92s   p(90)=4.83s    p(95)=5.16s
        { expected_response:true }...: avg=4.22s    min=246.06ms med=4.21s   max=6.92s   p(90)=4.83s    p(95)=5.16s
      http_req_failed................: 0.00%   ✓ 0          ✗ 11451
      http_req_receiving.............: avg=144.25µs min=26.99µs  med=90.97µs max=9.8ms   p(90)=214.26µs p(95)=455.1µs
      http_req_sending...............: avg=58.53µs  min=13.22µs  med=32.34µs max=18.72ms p(90)=61.46µs  p(95)=104.25µs
      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s      max=0s      p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=4.22s    min=245.93ms med=4.21s   max=6.92s   p(90)=4.83s    p(95)=5.16s
      http_reqs......................: 11451   92.945442/s
      iteration_duration.............: avg=4.22s    min=246.96ms med=4.21s   max=6.92s   p(90)=4.83s    p(95)=5.16s
      iterations.....................: 11451   92.945442/s
      validate_latency_ms............: avg=4.22s    min=246.06ms med=4.21s   max=6.92s   p(90)=4.83s    p(95)=5.16s
      validate_success_rate..........: 100.00% ✓ 11451      ✗ 0
      validate_total_requests........: 11451   92.945442/s
      vus............................: 65      min=65       max=400

running (2m03.2s), 000/400 VUs, 11451 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/400 VUs  2m0s  500.00 iters/s


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
              * validate_constant_load: 500.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

WARN[0002] Insufficient VUs, reached 400 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=validate_constant_load
      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 22818     ✗ 0
      data_received..................: 4.1 MB  33 kB/s
      data_sent......................: 15 MB   118 kB/s
      dropped_iterations.............: 48592   393.57221/s
      group_duration.................: avg=4.24s    min=297.17ms med=4.26s   max=6.04s   p(90)=4.78s    p(95)=4.95s
      http_req_blocked...............: avg=44.5µs   min=2.84µs   med=7.59µs  max=10.37ms p(90)=10.74µs  p(95)=17.56µs
      http_req_connecting............: avg=24.46µs  min=0s       med=0s      max=10.29ms p(90)=0s       p(95)=0s
      http_req_duration..............: avg=4.24s    min=295.84ms med=4.26s   max=6.03s   p(90)=4.78s    p(95)=4.95s
        { expected_response:true }...: avg=4.24s    min=295.84ms med=4.26s   max=6.03s   p(90)=4.78s    p(95)=4.95s
      http_req_failed................: 0.00%   ✓ 0         ✗ 11409
      http_req_receiving.............: avg=134.53µs min=19.92µs  med=89.91µs max=4.71ms  p(90)=197.27µs p(95)=395.2µs
      http_req_sending...............: avg=51.66µs  min=13.94µs  med=31.6µs  max=6.42ms  p(90)=54.45µs  p(95)=96.28µs
      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s      max=0s      p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=4.24s    min=295.63ms med=4.26s   max=6.03s   p(90)=4.78s    p(95)=4.95s
      http_reqs......................: 11409   92.407502/s
      iteration_duration.............: avg=4.24s    min=297.41ms med=4.26s   max=6.04s   p(90)=4.78s    p(95)=4.95s
      iterations.....................: 11409   92.407502/s
      validate_latency_ms............: avg=4.24s    min=295.84ms med=4.26s   max=6.03s   p(90)=4.78s    p(95)=4.95s
      validate_success_rate..........: 100.00% ✓ 11409     ✗ 0
      validate_total_requests........: 11409   92.407502/s
      vus............................: 83      min=83      max=400

running (2m03.5s), 000/400 VUs, 11409 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/400 VUs  2m0s  500.00 iters/s

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
              * validate_constant_load: 500.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

WARN[0004] Insufficient VUs, reached 400 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=validate_constant_load
      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 22044      ✗ 0
      data_received..................: 3.9 MB  32 kB/s
      data_sent......................: 14 MB   113 kB/s
      dropped_iterations.............: 48979   393.392374/s
      group_duration.................: avg=4.43s    min=81.19ms med=4.37s   max=8.16s  p(90)=4.8s     p(95)=5.34s
      http_req_blocked...............: avg=34.25µs  min=3.65µs  med=7.18µs  max=6.49ms p(90)=10.38µs  p(95)=17.5µs
      http_req_connecting............: avg=19.71µs  min=0s      med=0s      max=5.16ms p(90)=0s       p(95)=0s
      http_req_duration..............: avg=4.43s    min=79.84ms med=4.37s   max=8.16s  p(90)=4.8s     p(95)=5.34s
        { expected_response:true }...: avg=4.43s    min=79.84ms med=4.37s   max=8.16s  p(90)=4.8s     p(95)=5.34s
      http_req_failed................: 0.00%   ✓ 0          ✗ 11022
      http_req_receiving.............: avg=125.63µs min=23.34µs med=88.88µs max=4.21ms p(90)=182.89µs p(95)=351.85µs
      http_req_sending...............: avg=48.41µs  min=12.95µs med=31.47µs max=6.37ms p(90)=55.26µs  p(95)=96.15µs
      http_req_tls_handshaking.......: avg=0s       min=0s      med=0s      max=0s     p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=4.43s    min=77.6ms  med=4.37s   max=8.16s  p(90)=4.8s     p(95)=5.34s
      http_reqs......................: 11022   88.527139/s
      iteration_duration.............: avg=4.43s    min=81.34ms med=4.37s   max=8.16s  p(90)=4.8s     p(95)=5.34s
      iterations.....................: 11022   88.527139/s
      validate_latency_ms............: avg=4.43s    min=79.84ms med=4.37s   max=8.16s  p(90)=4.8s     p(95)=5.34s
      validate_success_rate..........: 100.00% ✓ 11022      ✗ 0
      validate_total_requests........: 11022   88.527139/s
      vus............................: 78      min=78       max=400

running (2m04.5s), 000/400 VUs, 11022 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/400 VUs  2m0s  500.00 iters/s


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
              * validate_constant_load: 500.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

WARN[0002] Insufficient VUs, reached 400 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=validate_constant_load
      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 20740      ✗ 0
      data_received..................: 3.7 MB  30 kB/s
      data_sent......................: 13 MB   107 kB/s
      dropped_iterations.............: 49631   401.458377/s
      group_duration.................: avg=4.67s    min=75.01ms med=4.65s   max=6.51s   p(90)=5.18s    p(95)=5.5s
      http_req_blocked...............: avg=59.83µs  min=2.96µs  med=7.58µs  max=12.34ms p(90)=10.74µs  p(95)=22.78µs
      http_req_connecting............: avg=38.83µs  min=0s      med=0s      max=9.16ms  p(90)=0s       p(95)=0s
      http_req_duration..............: avg=4.67s    min=73.66ms med=4.65s   max=6.51s   p(90)=5.18s    p(95)=5.5s
        { expected_response:true }...: avg=4.67s    min=73.66ms med=4.65s   max=6.51s   p(90)=5.18s    p(95)=5.5s
      http_req_failed................: 0.00%   ✓ 0          ✗ 10370
      http_req_receiving.............: avg=137.08µs min=23.17µs med=91.97µs max=14.07ms p(90)=198.02µs p(95)=376.22µs
      http_req_sending...............: avg=53.69µs  min=12.77µs med=31.68µs max=6.13ms  p(90)=56.08µs  p(95)=105.16µs
      http_req_tls_handshaking.......: avg=0s       min=0s      med=0s      max=0s      p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=4.67s    min=73.47ms med=4.65s   max=6.51s   p(90)=5.18s    p(95)=5.5s
      http_reqs......................: 10370   83.881513/s
      iteration_duration.............: avg=4.67s    min=75.22ms med=4.65s   max=6.51s   p(90)=5.18s    p(95)=5.5s
      iterations.....................: 10370   83.881513/s
      validate_latency_ms............: avg=4.67s    min=73.66ms med=4.65s   max=6.51s   p(90)=5.18s    p(95)=5.5s
      validate_success_rate..........: 100.00% ✓ 10370      ✗ 0
      validate_total_requests........: 10370   83.881513/s
      vus............................: 91      min=91       max=400

running (2m03.6s), 000/400 VUs, 10370 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/400 VUs  2m0s  500.00 iters/s