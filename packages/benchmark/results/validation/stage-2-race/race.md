
…/packages/benchmark HEAD  ? ✗ k6 run '/home/ronak/Documents/projects/capital/packages/benchmark/src/validation/race-test.js'

         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


    execution: local
    script: /home/ronak/Documents/projects/capital/packages/benchmark/src/validation/race-test.js
    output: -
    scenarios: (100.00%) 1 scenario, 500 max VUs, 1m0s max duration (incl. graceful stop):
              * race_test: 500.00 iterations/s for 30s (maxVUs: 200-500, gracefulStop: 30s)
  █ TOTAL RESULTS

    checks_total.......: 6722   207.059406/s
    checks_succeeded...: 98.14% 6597 out of 6722
    checks_failed......: 1.85%  125 out of 6722

    ✗ response handled
      ↳  98% — ✓ 6597 / ✗ 125

    CUSTOM
    duplicate_redemption...........: 6596   203.178197/s
    failed_requests................: 125    3.850405/s
    successful_redemption..........: 1      0.030803/s

    HTTP
    http_req_duration..............: avg=2.2s     min=146.62ms med=550.88ms max=30.24s   p(90)=944.92ms p(95)=21.35s
      { expected_response:true }...: avg=321.41ms min=321.41ms med=321.41ms max=321.41ms p(90)=321.41ms p(95)=321.41ms
    http_req_failed................: 99.98% 6721 out of 6722
    http_reqs......................: 6722   207.059406/s

    EXECUTION
    dropped_iterations.............: 8279   255.020057/s
    iteration_duration.............: avg=2.23s    min=155.14ms med=578.15ms max=30.29s   p(90)=971.98ms p(95)=21.37s
    iterations.....................: 6722   207.059406/s
    vus............................: 99     min=99           max=500
    vus_max........................: 500    min=267          max=500

    NETWORK
    data_received..................: 2.3 MB 72 kB/s
    data_sent......................: 2.9 MB 91 kB/s




running (0m32.5s), 000/500 VUs, 6722 complete and 0 interrupted iterations
race_test ✓ [======================================] 000/500 VUs  30s  500.00 iters/s

…/packages/benchmark HEAD  ? ✗ k6 run '/home/ronak/Documents/projects/capital/packages/benchmark/src/validation/race-test.js'

         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


     execution: local
        script: /home/ronak/Documents/projects/capital/packages/benchmark/src/validation/race-test.js
        output: -

     scenarios: (100.00%) 1 scenario, 500 max VUs, 1m0s max duration (incl. graceful stop):
              * race_test: 500.00 iterations/s for 30s (maxVUs: 200-500, gracefulStop: 30s)

INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
WARN[0002] Insufficient VUs, reached 500 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=race_test


  █ TOTAL RESULTS

    checks_total.......: 6170   192.829716/s
    checks_succeeded...: 99.88% 6163 out of 6170
    checks_failed......: 0.11%  7 out of 6170

    ✗ response handled
      ↳  99% — ✓ 6163 / ✗ 7

    CUSTOM
    duplicate_redemption...........: 6162   192.579694/s
    failed_requests................: 7      0.21877/s
    successful_redemption..........: 1      0.031253/s

    HTTP
    http_req_duration..............: avg=2.38s    min=151.04ms med=635.35ms max=30.1s    p(90)=910.08ms p(95)=29.33s
      { expected_response:true }...: avg=151.04ms min=151.04ms med=151.04ms max=151.04ms p(90)=151.04ms p(95)=151.04ms
    http_req_failed................: 99.98% 6169 out of 6170
    http_reqs......................: 6170   192.829716/s

    EXECUTION
    dropped_iterations.............: 8831   275.993391/s
    iteration_duration.............: avg=2.4s     min=175.02ms med=662.63ms max=30.12s   p(90)=939.38ms p(95)=29.34s
    iterations.....................: 6170   192.829716/s
    vus............................: 18     min=18           max=500
    vus_max........................: 500    min=261          max=500

    NETWORK
    data_received..................: 2.1 MB 67 kB/s
    data_sent......................: 2.7 MB 84 kB/s




running (0m32.0s), 000/500 VUs, 6170 complete and 0 interrupted iterations
race_test ✓ [======================================] 000/500 VUs  30s  500.00 iters/s


…/packages/benchmark HEAD  ? ❯ k6 run '/home/ronak/Documents/projects/capital/packages/benchmark/src/validation/race-test.js'

         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


     execution: local
        script: /home/ronak/Documents/projects/capital/packages/benchmark/src/validation/race-test.js
        output: -

     scenarios: (100.00%) 1 scenario, 500 max VUs, 1m0s max duration (incl. graceful stop):
              * race_test: 500.00 iterations/s for 30s (maxVUs: 200-500, gracefulStop: 30s)

INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
WARN[0002] Insufficient VUs, reached 500 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=race_test


  █ TOTAL RESULTS

    checks_total.......: 6819   210.814322/s
    checks_succeeded...: 99.94% 6815 out of 6819
    checks_failed......: 0.05%  4 out of 6819

    ✗ response handled
      ↳  99% — ✓ 6815 / ✗ 4

    CUSTOM
    duplicate_redemption...........: 6814   210.659744/s
    failed_requests................: 4      0.123663/s
    successful_redemption..........: 1      0.030916/s

    HTTP
    http_req_duration..............: avg=2.16s   min=97.04ms  med=629.92ms max=30.17s  p(90)=816.33ms p(95)=19.88s
      { expected_response:true }...: avg=97.04ms min=97.04ms  med=97.04ms  max=97.04ms p(90)=97.04ms  p(95)=97.04ms
    http_req_failed................: 99.98% 6818 out of 6819
    http_reqs......................: 6819   210.814322/s

    EXECUTION
    dropped_iterations.............: 8182   252.952454/s
    iteration_duration.............: avg=2.18s   min=108.89ms med=658.53ms max=30.22s  p(90)=846.46ms p(95)=19.91s
    iterations.....................: 6819   210.814322/s
    vus............................: 78     min=78           max=500
    vus_max........................: 500    min=272          max=500

    NETWORK
    data_received..................: 2.4 MB 73 kB/s
    data_sent......................: 3.0 MB 92 kB/s




running (0m32.3s), 000/500 VUs, 6819 complete and 0 interrupted iterations
race_test ✓ [======================================] 000/500 VUs  30s  500.00 iters/s

ackages/benchmark HEAD  ? ❯ k6 run '/home/ronak/Documents/projects/capital/packages/benchmark/src/validation/race-test.js'

         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


     execution: local
        script: /home/ronak/Documents/projects/capital/packages/benchmark/src/validation/race-test.js
        output: -

     scenarios: (100.00%) 1 scenario, 500 max VUs, 1m0s max duration (incl. graceful stop):
              * race_test: 500.00 iterations/s for 30s (maxVUs: 200-500, gracefulStop: 30s)

INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
WARN[0002] Insufficient VUs, reached 500 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=race_test


  █ TOTAL RESULTS

    checks_total.......: 4976   148.38437/s
    checks_succeeded...: 99.83% 4968 out of 4976
    checks_failed......: 0.16%  8 out of 4976

    ✗ response handled
      ↳  99% — ✓ 4968 / ✗ 8

    CUSTOM
    duplicate_redemption...........: 4967   148.11599/s
    failed_requests................: 8      0.23856/s
    successful_redemption..........: 1      0.02982/s

    HTTP
    http_req_duration..............: avg=3.04s    min=42.33ms  med=509.79ms max=30.94s   p(90)=3.28s    p(95)=30.75s
      { expected_response:true }...: avg=167.28ms min=167.28ms med=167.28ms max=167.28ms p(90)=167.28ms p(95)=167.28ms
    http_req_failed................: 99.97% 4975 out of 4976
    http_reqs......................: 4976   148.38437/s

    EXECUTION
    dropped_iterations.............: 10025  298.945602/s
    iteration_duration.............: avg=3.07s    min=56.63ms  med=541.56ms max=30.96s   p(90)=3.3s     p(95)=30.78s
    iterations.....................: 4976   148.38437/s
    vus............................: 79     min=79           max=500
    vus_max........................: 500    min=262          max=500

    NETWORK
    data_received..................: 1.7 MB 52 kB/s
    data_sent......................: 2.2 MB 65 kB/s




running (0m33.5s), 000/500 VUs, 4976 complete and 0 interrupted iterations
race_test ✓ [======================================] 000/500 VUs  30s  500.00 iters/s


…/packages/benchmark HEAD  ? ✗ k6 run '/home/ronak/Documents/projects/capital/packages/benchmark/src/validation/race-test.js'

         /\      Grafana   /‾‾/
    /\  /  \     |\  __   /  /
   /  \/    \    | |/ /  /   ‾‾\
  /          \   |   (  |  (‾)  |
 / __________ \  |_|\_\  \_____/


     execution: local
        script: /home/ronak/Documents/projects/capital/packages/benchmark/src/validation/race-test.js
        output: -

     scenarios: (100.00%) 1 scenario, 500 max VUs, 1m0s max duration (incl. graceful stop):
              * race_test: 500.00 iterations/s for 30s (maxVUs: 200-500, gracefulStop: 30s)

INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
INFO[0000] FAILED 404: {"message":"Invalid, expired, or already-used OTP","error":true,"success":false}  source=console
WARN[0002] Insufficient VUs, reached 500 active VUs and cannot initialize more  executor=constant-arrival-rate scenario=race_test


  █ TOTAL RESULTS

    checks_total.......: 7204   222.050493/s
    checks_succeeded...: 99.94% 7200 out of 7204
    checks_failed......: 0.05%  4 out of 7204

    ✗ response handled
      ↳  99% — ✓ 7200 / ✗ 4

    CUSTOM
    duplicate_redemption...........: 7199   221.896377/s
    failed_requests................: 4      0.123293/s
    successful_redemption..........: 1      0.030823/s

    HTTP
    http_req_duration..............: avg=2.03s    min=47.9ms   med=584.23ms max=30.02s   p(90)=750.3ms  p(95)=14.31s
      { expected_response:true }...: avg=104.24ms min=104.24ms med=104.24ms max=104.24ms p(90)=104.24ms p(95)=104.24ms
    http_req_failed................: 99.98% 7203 out of 7204
    http_reqs......................: 7204   222.050493/s

    EXECUTION
    dropped_iterations.............: 7797   240.328664/s
    iteration_duration.............: avg=2.06s    min=50.33ms  med=609.46ms max=30.07s   p(90)=782.52ms p(95)=14.32s
    iterations.....................: 7204   222.050493/s
    vus............................: 93     min=93           max=500
    vus_max........................: 500    min=251          max=500

    NETWORK
    data_received..................: 2.5 MB 77 kB/s
    data_sent......................: 3.1 MB 97 kB/s




running (0m32.4s), 000/500 VUs, 7204 complete and 0 interrupted iterations
race_test ✓ [======================================] 000/500 VUs  30s  500.00 iters/s