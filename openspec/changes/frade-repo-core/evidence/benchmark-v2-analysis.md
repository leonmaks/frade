# Native v2 measurements and calibrated budgets

Two complete local runs used real temporary source pages and disposable SQLite catalogs on Windows 10.0.26200, Node 24.18.0, Intel Core i9-9880H (16 logical CPUs), 34,203,607,040 bytes RAM. No OS cache flush was performed: **cold open** means a new session and full private catalog construction/validation, not cold physical disk caches. Creation immediately precedes opening. These are single observations, not percentile or universal SLA claims.

The first run is preserved in `benchmark-v2-results.json` (2,854,578 ms test duration). The separate optimized run is `benchmark-v2-optimized-results.json` (902,998 ms test duration; runner start 18:29:24 local, 2026-09-24). All three datasets report MEASURED and the test exited 0. Optimizations bulk-build secondary indexes after ingestion, use compact binary UTF-16 ordering keys and a covering target-type index. Safety/decoder limits were not raised.

| Operation                                       | Small 1k/3k | Medium 100k/300k | Large 1m/3m |
| ----------------------------------------------- | ----------: | ---------------: | ----------: |
| Source creation including validation, ms        |    5,669.22 |        39,811.26 |  340,483.04 |
| New session open/index/validation, ms           |    2,610.17 |        40,544.98 |  469,511.11 |
| Source ingestion, ms                            |    2,444.41 |        20,049.20 |  227,472.79 |
| Secondary index build, ms                       |       21.65 |         5,293.43 |   63,599.81 |
| Complete semantic validation, ms                |       90.16 |        15,112.30 |  178,351.04 |
| Get by ID, ms                                   |        4.35 |             4.27 |        4.57 |
| Status filter/page 100, ms                      |       12.51 |            12.24 |       13.50 |
| Incoming relations, ms                          |        6.68 |             8.01 |       12.50 |
| Depth-3/result-100 traversal, ms                |       91.49 |           110.75 |      185.38 |
| Object update including incremental catalog, ms |       44.56 |            46.14 |       94.67 |
| Last incremental catalog patch, ms              |       0.095 |            0.097 |       0.234 |
| Last delta validation, ms                       |        1.16 |             1.16 |        2.90 |
| Sampled peak RSS, bytes                         | 106,168,320 |      268,242,944 | 328,503,296 |

Each status query examined 101 candidates and each qualified incoming query examined 3, rather than scanning all 4,000,000 records. Large cold open improved from 2,019,636.49 to 469,511.11 ms, but 7.8 minutes still precludes claiming interactive opening of this workload. Structural graph edits require complete validation and are not represented by the same-type object update timing. Directory fsync/power-loss recovery is not inferred from any timing.

RSS/heap samples are taken every 100 ms and at operation completion; synchronous SQLite work can hide brief peaks. Values are sampled measurements, not a proven upper bound. The baseline overlapped some regression tests. The optimized run overlapped small focused tests/typechecks, not the full regression gate; neither is certified idle-hardware profiling.

## Follow-up regression budgets

After observing the baseline and optimized run, the following **calibrated local regression budgets** are recorded for subsequent runs on this machine/class. This is explicitly retrospective calibration, not a claim that a predeclared performance acceptance test passed. A future repeat must satisfy them; deployment latency targets still require an operator decision.

| Budget, ms unless stated           |  Small | Medium |   Large |
| ---------------------------------- | -----: | -----: | ------: |
| Creation/full validation           | 12,000 | 90,000 | 600,000 |
| Open/index/full validation         | 10,000 | 90,000 | 600,000 |
| ID / status page / incoming (each) |    100 |    100 |     100 |
| Bounded traversal                  |  1,000 |  1,000 |   1,000 |
| Same-type object update/index      |    500 |    500 |     500 |
| Sampled peak RSS, MiB              |    256 |    512 |     768 |

The current optimized observations fit these calibrated budgets. This does not close final release acceptance. The JSON includes the five measured source SHA-256 digests captured at run start; subsequent model-view/cursor and application boundary/index-race fixes were **not** part of the measured module snapshot. They require regression verification; do not present the measured hashes as the final workspace revision. Historical measurements must not be overwritten when a final repeat is performed.
