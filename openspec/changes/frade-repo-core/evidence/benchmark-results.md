# Baseline: actual measurements, not release acceptance

Command: `pnpm --filter @frade/repository-application benchmark` (dedicated benchmark config, separate from normal unit tests). Raw run: [benchmark-results.json](benchmark-results.json), 2026-09-24 10:37:26 UTC. This baseline predates final authorization/close hardening and has not been presented as a post-hardening performance run.

Windows 10.0.26200, Node 24.18.0, Intel i9-9880H 2.30 GHz, 16 logical processors, 34,203,607,040 bytes system RAM. Single deterministic run, not p95 or a statistically stable benchmark. Synthetic source files and SQLite databases were temporary and cleaned up.

| Dataset | Objects / relations   | Source bytes | Result                                       |
| ------- | --------------------- | -----------: | -------------------------------------------- |
| Small   | 1,000 / 3,000         |      836,858 | Opens; timings below                         |
| Medium  | 100,000 / 300,000     |   86,677,858 | RESOURCE_LIMIT; dependent operations blocked |
| Large   | 1,000,000 / 3,000,000 |  881,777,858 | RESOURCE_LIMIT; dependent operations blocked |

| Small operation                    | Measured ms |
| ---------------------------------- | ----------: |
| Cold open                          |     743.112 |
| Initial index                      |     157.324 |
| Get by ID                          |       0.691 |
| Filter                             |       9.865 |
| Incoming relations                 |       3.095 |
| Bounded traversal                  |      21.291 |
| Update including incremental index |   3,687.314 |
| Indexed point lookup               |       0.287 |

Observed Small RSS: 582,680,576 bytes; heap used: 378,402,584 bytes. This is a sampled process measurement, not isolated incremental allocation or peak tracking. Index update timing was combined with source update, not measured separately.

Medium/Large generation and explicit rejection were measured; fast rejection is not fast successful open. Native whole-document parsing/validation and limits make this architecture unsuitable for these workloads. Performance acceptance remains **INCOMPLETE**. No universal budgets are asserted. Before setting release budgets, implement the required larger-data path, repeat cold/warm trials and measure separate incremental indexing and peak memory on agreed target hardware. Write/recovery correctness remains a separate mandatory gate regardless of speed.
