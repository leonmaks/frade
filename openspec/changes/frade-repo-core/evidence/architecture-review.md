# Architecture review

## Completeness

Eight production packages implement a bounded semantic/storage/integration slice; existing metamodel packages and Draw serializer are reused. 19/31 tasks are complete after continuation. Every still-unchecked item in tasks.md is an open completion issue. Do not interpret OpenSpec `status.isComplete` (planning artifacts) as completed implementation.

## Correctness

Observed RED tests found and drove fixes for entity decoding/query/model projection, missing application/storage APIs, YAML unknown metadata loss, candidate/change mismatch, index coordination, transport idempotency/reconciliation, missing authorization policy, substituted commit acknowledgement and close-before-write completion. Shared adapter contracts run real native YAML/JSON and memory. Source bytes, revisions and dispatch counts are asserted.

All 112 original expanded planning scenarios now execute with assertions, plus negative harness tests. Actual watcher and process-kill recovery tests pass. CRITICAL: broader policy/migration, optional service and history/event obligations remain incomplete despite scenario coverage. Resource-limit rejection means no Medium/Large functional/performance acceptance.

## Coherence

Portable source and manifests enforce inward dependencies; repository-domain's compiler binding import is type-only. Domain/application ES2022 builds exclude Node/DOM. Hosts alone own fs/SQLite/Git, IPC/HTTP and authentication. Draw stays independent; its existing document API is exposed through a public subpath.

WARNING: the capability-shaped factory covers writer/watch/history but query and snapshot remain mandatory, contrary to RP-1. Do not weaken this normative requirement merely to match current code. Single-file native transaction scope is intentional and explicit; external schema mapping remains inspection-only.

WARNING: native whole-snapshot loading is consistent with the original bounded safety design but does not meet the expanded workload targets. Revise the scaling design before implementing dependent higher-scale features. Verification skill therefore prohibits an archive-ready assessment. No archive was attempted.

## Remaining task audit (critical before archive)

| Task | Concrete next action                                                                                                       |
| ---- | -------------------------------------------------------------------------------------------------------------------------- |
| 1.0  | Resolve the native v1 full-snapshot/large-workload design conflict and reconcile G1 before dependent scale implementation. |
| 3.1  | Make query/snapshot services genuinely optional with compile/runtime capability conformance.                               |
| 3.4  | Complete history cursor scope/staleness and malformed response matrix.                                                     |
| 3.5  | Validate all event envelopes and prove invalidation/history/subscriber edge cases.                                         |
| 5.3  | Extend implemented-state API examples and traceability for remaining clauses.                                              |
| 6.1  | Finish profile export/adapter-specific secret validation and state-machine acceptance.                                     |
| 6.4  | Finish configuration migration, policy combinations and critical native lifecycle rechecks.                                |
| 7.1  | Prove concurrent watch/index refresh ordering and randomized source/index equivalence.                                     |
| 7.4  | Complete transport security/deadline matrix beyond existing real HTTP/IPC tests.                                           |
| 8.1  | Add executable restriction/conformance coverage for every remaining extension, including search.                           |
| 8.2  | Implement agreed capacity design, measure all operations and set hardware-specific budgets.                                |
| 8.3  | Close mandatory gaps, repeat G0–G8 and only then archive.                                                                  |

Requested decision: extend this change to a new paged native format with revision-pinned streaming validation, or explicitly scope native v1 and schedule the scale architecture separately. No answer is assumed. This is not permission to mark the original master prompt complete.
