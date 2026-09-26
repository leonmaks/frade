# Tasks

## 9. Approved native v2 expansion

- [x] 9.1 Reconcile SDD/ADR-008 and V2-001–006 BDD traceability; validate OpenSpec before implementation.
- [x] 9.2 Implement bounded immutable page/manifest format, private derived catalog and complete streaming integrity; prove cross-page targets, corruption, duplicates, containment and decoder limits.
- [x] 9.3 Implement equivalent indexed queries and revision-bound paging; compare against v1 and prove bounded working set/indexed point and adjacency reads.
- [x] 9.4 Implement authorized paged command preparation, guarded delta publication and explicit recovery; prove validation equivalence, stale writes, atomicity, process interruption and no replay.
- [ ] 9.5 Integrate opt-in host routing and explicit destination-only v1 export without changing v1 persistence or renderer authority.
- [x] 9.6 Execute Small/Medium/Large v2 benchmarks, record hardware/operation/memory evidence and budgets, rerun complete regression and keep unfinished gates unarchived.

## 1. Package contracts and acceptance harness

- [ ] 1.0 Record G0 discovery and reconcile expanded CORE-001–020 scope, ADRs, phase gates and machine-verifiable BDD mapping; verify strict OpenSpec validation before dependent implementation.

- [x] 1.1 Scaffold repository-domain, repository-ports and repository-application with the dependency matrix in design.md and existing pinned tools; verify frozen installation, dependency-aware builds and ES2022-only public consumer typechecks.
- [x] 1.2 Copy all three planning feature files into repository-application tests and implement an awaited Gherkin harness with assertion-bearing bindings; record RED for missing behavior and verify missing/ambiguous steps, rejected async assertions and unexpanded outlines fail.

## 2. Repository entities

- [x] 2.1 Write failing identity/revision/provenance tests, then implement portable object/relation DTOs and reuse public metamodel reference/binding types; verify RE-1 including colliding local IDs, delimiter-containing IDs, resource relocation and opaque revision equality.
- [x] 2.2 Implement bounded unknown-input decoding for entities, provenance and snapshot envelopes after RED safety tests; verify RE-2 with getter counters, dangerous keys, sparse/cyclic/prototype inputs, exact depth/value boundaries and independent copies.
- [x] 2.3 Implement pure validation projection and exact model binding checks; verify RE-3 with real compiled models, omitted storage fields, unchanged defaults and qualified diagnostic attribution.

## 3. Ports and application session wrapper

- [x] 3.1 Define capability-shaped adapter/session, readers, query, writer, change/history and cancellation contracts; verify RP-1/RP-4 positive/negative consumer fixtures and runtime capability/service mismatch rejection.
- [x] 3.2 Build deterministic read-only, guarded single-resource and atomic-batch memory adapters under tests with controlled barriers and observable I/O; verify their own create-if-absent, revision, snapshot-guard and batch rollback conformance before using them as service fixtures.
- [x] 3.3 Implement application open/close and cancellation cleanup; verify RP-2 for pre-cancelled calls, cancellation during subscribe, late opens, uncooperative/failed reads, duplicate close and late rejection handling with no leaked listeners.
- [ ] 3.4 Implement guarded point/paged/query/history reads and defensive response validation; verify RP-3 for 1/1000/invalid page limits, stale/cross-session/query-mismatched cursors, missing/wrong-repository data and malformed/oversized responses.
- [ ] 3.5 Implement subscription lifecycle, sequence handling and optional history behavior; verify RP-5 for duplicate/gap events, invalidation, unsupported history, exception isolation and no callbacks after unsubscribe/close.

## 4. Validated repository commands

- [x] 4.1 Implement copied create/replace/delete and atomic-batch command decoding plus capability/session/authorization guards; verify RC-1 with missing/denied/throwing policies, missing expected revisions, wrong targets and zero writer calls on rejection.
- [x] 4.2 Implement complete bound snapshot acquisition and prospective-state construction using full-model validation; verify RC-2 for all object/relation operations, inherited/defaulted attributes, in-batch references, dangling deletions, duplicate policies, cardinality, invalid-state repair and rejected incomplete/external-reference snapshots.
- [x] 4.3 Implement guarded dispatch and acknowledgement decoding; verify RC-3/RP-4 for stale entities, concurrent unrelated relation/model-binding changes, create collisions, atomic failure, unsupported batches, fresh returned revisions and uncertain malformed acknowledgements without automatic retries.
- [x] 4.4 Implement bounded operation-ID tracking and concurrent/repeated submission behavior; verify RC-4 with payload/precondition collisions, record-key reordering, array-order changes, secondary-waiter cancellation, defensive cached results and exact 1024/1025 admission boundaries.
- [x] 4.5 Implement post-dispatch cancellation/close/failure handling and explicit reconciliation; verify RC-4 with commit-before-lost-ack races, committed/not-committed/pending/unknown lookups, lookup failures and no replay after uncertainty or session loss.

## 5. Integration and verification evidence

- [x] 5.1 Add five seeded property suites and two organization metamodel fixtures; verify at least 200 runs each with seed 20260924 for identity injectivity, copy isolation, failed-commit state preservation, valid final-state preservation and replay suppression.
- [x] 5.2 Extend root BDD registration and repository source/manifest architecture checks; verify RC-5 with negative Node/DOM/Electron/adapter/private-import/dynamic-loading fixtures and unchanged metamodel/Draw boundaries.
- [ ] 5.3 Document public APIs, adapter conformance, snapshot/permission/default policies, resource limits, uncertain outcomes and session-only retention; typecheck examples and map every requirement to executed evidence in docs/verification/repository-core.md.
- [x] 5.4 Run strict OpenSpec validation, frozen installation, formatting and pnpm check:all; record actual RED/GREEN, unit/BDD/property/consumer/boundary/browser/Electron outcomes and unchanged visual baseline hashes before marking complete, without claiming production persistence or remote CI execution.

## 6. Native storage and profiles (P0)

- [ ] 6.1 Implement profile/session state machine, compatibility and redacted exports with positive/negative/boundary tests and API documentation.
- [x] 6.2 Define native YAML/JSON profile/mapping/sample model; implement discovery, stable identity, safe reads and preservation-aware writes, verified against isolated actual files and shared adapter contracts.
- [x] 6.3 Implement staged write, revision checks, cooperating-writer coordination and recovery diagnostics; prove stale writes, unsafe paths, symlink escapes, duplicate IDs and interrupted writes preserve source data.
- [ ] 6.4 Implement bounded query DSL, incoming/outgoing, neighbors/subgraph/dependencies, lifecycle/policy validation and CRUD ChangeSets; verify deterministic pagination, cyclic termination, denied operations and idempotency with executable BDD/property tests.

## 7. Integration (P1)

- [ ] 7.1 Implement SQLite derived index/rebuild/incremental invalidation/corruption recovery and external-change watch; verify actual SQLite/filesystem behavior including index failure after confirmed source write.
- [x] 7.2 Implement separate Git versioning status/history/conflict/explicit commit API; verify temporary Git repositories receive no implicit commit or push from domain commands.
- [x] 7.3 Implement bridge binding states, cached snapshots, dependencies, detach/reconnect/conflicts and visual override independence; verify integration and existing standalone Draw regression.
- [ ] 7.4 Implement authorized Desktop/Web application transport integration with request limits and redacted errors; verify actual transport interfaces without renderer filesystem authority.

## 8. Extension contracts and release evidence

- [ ] 8.1 Deliver restricted PostgreSQL/remote/federation/search contracts and batch import/export, executable contract tests and adapter guide; implement PostgreSQL only if local DB/migration infrastructure is available.
- [x] 8.2 Measure Small/Medium/Large deterministic datasets and document hardware, operation timing/memory, limits and measured budgets; do not mark unsupported sizes successful.
- [ ] 8.3 Finalize API/metamodel/diagram/security/deployment guides, requirement-to-test links and actual G0–G8 evidence; rerun regression after final edits and archive only if all mandatory gates pass.
