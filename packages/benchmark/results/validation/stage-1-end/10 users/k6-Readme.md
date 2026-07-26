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
              * validate_constant_load: 10.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 2402      ✗ 0
      data_received..................: 428 kB  3.6 kB/s
      data_sent......................: 1.5 MB  13 kB/s
      group_duration.................: avg=51.47ms  min=33.28ms  med=46.23ms  max=358.35ms p(90)=63.2ms   p(95)=79.01ms
      http_req_blocked...............: avg=440.3µs  min=192.45µs med=382.19µs max=13.48ms  p(90)=459.61µs p(95)=564.93µs
      http_req_connecting............: avg=303.01µs min=133.4µs  med=253.01µs max=7.1ms    p(90)=307.29µs p(95)=384.92µs
      http_req_duration..............: avg=50.66ms  min=32.66ms  med=45.48ms  max=357.44ms p(90)=62.47ms  p(95)=77.47ms
        { expected_response:true }...: avg=50.66ms  min=32.66ms  med=45.48ms  max=357.44ms p(90)=62.47ms  p(95)=77.47ms
      http_req_failed................: 0.00%   ✓ 0         ✗ 1201
      http_req_receiving.............: avg=128.1µs  min=70.04µs  med=122.25µs max=1.48ms   p(90)=160.17µs p(95)=170.7µs
      http_req_sending...............: avg=126.2µs  min=51.6µs   med=110.83µs max=2ms      p(90)=158.72µs p(95)=187.27µs
      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=50.4ms   min=32.44ms  med=45.21ms  max=357.18ms p(90)=62.23ms  p(95)=77.26ms
      http_reqs......................: 1201    10.004177/s
      iteration_duration.............: avg=51.75ms  min=33.51ms  med=46.52ms  max=358.58ms p(90)=63.44ms  p(95)=79.33ms
      iterations.....................: 1201    10.004177/s
      validate_latency_ms............: avg=50.66ms  min=32.66ms  med=45.48ms  max=357.44ms p(90)=62.47ms  p(95)=77.47ms
      validate_success_rate..........: 100.00% ✓ 1201      ✗ 0
      validate_total_requests........: 1201    10.004177/s
      vus............................: 0       min=0       max=2

running (2m00.0s), 000/100 VUs, 1201 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/100 VUs  2m0s  10.00 iters/s

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
              * validate_constant_load: 10.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 2400    ✗ 0
      data_received..................: 427 kB  3.6 kB/s
      data_sent......................: 1.5 MB  13 kB/s
      group_duration.................: avg=48.49ms  min=33.35ms  med=46.44ms  max=223.88ms p(90)=57.76ms  p(95)=66.41ms
      http_req_blocked...............: avg=441.73µs min=205.22µs med=372.05µs max=21.83ms  p(90)=504.38µs p(95)=726.88µs
      http_req_connecting............: avg=314.17µs min=136.49µs med=244.17µs max=21.44ms  p(90)=334.58µs p(95)=544.02µs
      http_req_duration..............: avg=47.66ms  min=32.62ms  med=45.67ms  max=223.16ms p(90)=56.93ms  p(95)=64.58ms
        { expected_response:true }...: avg=47.66ms  min=32.62ms  med=45.67ms  max=223.16ms p(90)=56.93ms  p(95)=64.58ms
      http_req_failed................: 0.00%   ✓ 0       ✗ 1200
      http_req_receiving.............: avg=144.48µs min=76.05µs  med=127.14µs max=1.74ms   p(90)=185.6µs  p(95)=213.21µs
      http_req_sending...............: avg=126.12µs min=53.03µs  med=110.28µs max=2.73ms   p(90)=165.25µs p(95)=185.61µs
      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=47.39ms  min=32.34ms  med=45.4ms   max=222.97ms p(90)=56.69ms  p(95)=64.28ms
      http_reqs......................: 1200    9.99988/s
      iteration_duration.............: avg=48.75ms  min=33.5ms   med=46.71ms  max=224.17ms p(90)=58.05ms  p(95)=66.68ms
      iterations.....................: 1200    9.99988/s
      validate_latency_ms............: avg=47.66ms  min=32.62ms  med=45.67ms  max=223.16ms p(90)=56.93ms  p(95)=64.58ms
      validate_success_rate..........: 100.00% ✓ 1200    ✗ 0
      validate_total_requests........: 1200    9.99988/s
      vus............................: 1       min=1     max=1

running (2m00.0s), 000/100 VUs, 1200 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/100 VUs  2m0s  10.00 iters/s

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
              * validate_constant_load: 10.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 2402      ✗ 0
      data_received..................: 428 kB  3.6 kB/s
      data_sent......................: 1.5 MB  13 kB/s
      group_duration.................: avg=48.08ms  min=33.48ms  med=47.28ms  max=154.11ms p(90)=53.45ms  p(95)=58.4ms
      http_req_blocked...............: avg=388.87µs min=200.64µs med=373.3µs  max=2.77ms   p(90)=447.55µs p(95)=500.19µs
      http_req_connecting............: avg=255.04µs min=133.12µs med=241.29µs max=2.66ms   p(90)=292.22µs p(95)=325.17µs
      http_req_duration..............: avg=47.32ms  min=32.93ms  med=46.51ms  max=153.44ms p(90)=52.69ms  p(95)=57.49ms
        { expected_response:true }...: avg=47.32ms  min=32.93ms  med=46.51ms  max=153.44ms p(90)=52.69ms  p(95)=57.49ms
      http_req_failed................: 0.00%   ✓ 0         ✗ 1201
      http_req_receiving.............: avg=127.01µs min=72.22µs  med=124.84µs max=1.16ms   p(90)=159.03µs p(95)=173.19µs
      http_req_sending...............: avg=117.45µs min=47.4µs   med=106.58µs max=775.18µs p(90)=157.53µs p(95)=179.29µs
      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=47.08ms  min=32.77ms  med=46.28ms  max=153.25ms p(90)=52.45ms  p(95)=57.18ms
      http_reqs......................: 1201    10.005019/s
      iteration_duration.............: avg=48.34ms  min=33.65ms  med=47.55ms  max=154.43ms p(90)=53.73ms  p(95)=58.7ms
      iterations.....................: 1201    10.005019/s
      validate_latency_ms............: avg=47.32ms  min=32.93ms  med=46.51ms  max=153.44ms p(90)=52.69ms  p(95)=57.49ms
      validate_success_rate..........: 100.00% ✓ 1201      ✗ 0
      validate_total_requests........: 1201    10.005019/s
      vus............................: 1       min=1       max=1

running (2m00.0s), 000/100 VUs, 1201 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/100 VUs  2m0s  10.00 iters/s

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
              * validate_constant_load: 10.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 2402      ✗ 0
      data_received..................: 428 kB  3.6 kB/s
      data_sent......................: 1.5 MB  13 kB/s
      group_duration.................: avg=47.79ms  min=31.45ms  med=44.24ms  max=555.32ms p(90)=53.44ms  p(95)=64.21ms
      http_req_blocked...............: avg=388.27µs min=203.57µs med=366.12µs max=3.63ms   p(90)=425.42µs p(95)=457.48µs
      http_req_connecting............: avg=261.53µs min=137.91µs med=241.81µs max=3.49ms   p(90)=289.13µs p(95)=306.42µs
      http_req_duration..............: avg=47.03ms  min=30.99ms  med=43.49ms  max=554.65ms p(90)=52.59ms  p(95)=63.61ms
        { expected_response:true }...: avg=47.03ms  min=30.99ms  med=43.49ms  max=554.65ms p(90)=52.59ms  p(95)=63.61ms
      http_req_failed................: 0.00%   ✓ 0         ✗ 1201
      http_req_receiving.............: avg=130.68µs min=55.66µs  med=122.03µs max=2.15ms   p(90)=163.64µs p(95)=188.25µs
      http_req_sending...............: avg=116.91µs min=52.47µs  med=105.82µs max=1.87ms   p(90)=147.03µs p(95)=164.85µs
      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=46.78ms  min=30.84ms  med=43.25ms  max=554.31ms p(90)=52.18ms  p(95)=62.78ms
      http_reqs......................: 1201    10.004834/s
      iteration_duration.............: avg=48.04ms  min=31.61ms  med=44.5ms   max=555.57ms p(90)=53.66ms  p(95)=64.4ms
      iterations.....................: 1201    10.004834/s
      validate_latency_ms............: avg=47.03ms  min=30.99ms  med=43.49ms  max=554.65ms p(90)=52.59ms  p(95)=63.61ms
      validate_success_rate..........: 100.00% ✓ 1201      ✗ 0
      validate_total_requests........: 1201    10.004834/s
      vus............................: 1       min=0       max=2

running (2m00.0s), 000/100 VUs, 1201 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/100 VUs  2m0s  10.00 iters/s

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
              * validate_constant_load: 10.00 iterations/s for 2m0s (maxVUs: 100-400, gracefulStop: 30s)

      █ POST /validate

        ✓ status is 200
        ✓ response has ticketId

      checks.........................: 100.00% ✓ 2402      ✗ 0
      data_received..................: 428 kB  3.6 kB/s
      data_sent......................: 1.5 MB  13 kB/s
      group_duration.................: avg=45.67ms  min=31.78ms  med=44.06ms  max=238.84ms p(90)=50.04ms  p(95)=55.67ms
      http_req_blocked...............: avg=401.19µs min=206.48µs med=378.51µs max=4.16ms   p(90)=442.5µs  p(95)=479.54µs
      http_req_connecting............: avg=270.94µs min=142.62µs med=250.88µs max=4.04ms   p(90)=299.86µs p(95)=329.98µs
      http_req_duration..............: avg=44.9ms   min=31.31ms  med=43.3ms   max=238.09ms p(90)=49.28ms  p(95)=54.96ms
        { expected_response:true }...: avg=44.9ms   min=31.31ms  med=43.3ms   max=238.09ms p(90)=49.28ms  p(95)=54.96ms
      http_req_failed................: 0.00%   ✓ 0         ✗ 1201
      http_req_receiving.............: avg=129.31µs min=75.5µs   med=127.4µs  max=1.18ms   p(90)=162.61µs p(95)=176.41µs
      http_req_sending...............: avg=122.3µs  min=52.91µs  med=109.67µs max=2.58ms   p(90)=156.8µs  p(95)=175.6µs
      http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s
      http_req_waiting...............: avg=44.65ms  min=31.14ms  med=43.06ms  max=237.86ms p(90)=49.03ms  p(95)=54.72ms
      http_reqs......................: 1201    10.004455/s
      iteration_duration.............: avg=45.94ms  min=31.93ms  med=44.33ms  max=239.07ms p(90)=50.29ms  p(95)=55.9ms
      iterations.....................: 1201    10.004455/s
      validate_latency_ms............: avg=44.9ms   min=31.31ms  med=43.3ms   max=238.09ms p(90)=49.28ms  p(95)=54.96ms
      validate_success_rate..........: 100.00% ✓ 1201      ✗ 0
      validate_total_requests........: 1201    10.004455/s
      vus............................: 0       min=0       max=1

running (2m00.0s), 000/100 VUs, 1201 complete and 0 interrupted iterations
validate_constant_load ✓ [======================================] 000/100 VUs  2m0s  10.00 iters/s