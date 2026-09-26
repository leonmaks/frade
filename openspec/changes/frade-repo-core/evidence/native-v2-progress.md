# Native v2 implementation evidence — active change

User explicitly approved expanding the existing change to native v2. The proposal, ADR-008/design, RC-2 preparation contract and V2-001–006 requirements were updated; installed OpenSpec 1.13.2 strict validation passed before dependent implementation and again after linking BDD. This change remains unarchived.

## Observed RED → GREEN

- 15:43:10: six initial format/read tests failed because the v2 API was absent. At 15:49:51 all six passed; the subsequent strict TypeScript run failed on narrowing through an arrow-form `never` helper. Converting that helper to an explicit function declaration fixed all three impacted package typechecks.
- Initial command test collection failed on a missing workspace **test** dependency, not on behavior. After connecting that dependency, three command tests failed with `REPOSITORY_READ_ONLY` (15:54:58); after paged preparation/guarded publication they passed (15:56:50).
- Recovery RED: missing inspector at 15:58:44. The first implemented run exposed a crash-fixture lifetime issue (worker exited rather than waiting for kill); after fixing the fixture, actual process termination before/after publication passed at 16:00:59. An additional stale-preview/keep-source test passed at 16:12:31.
- Routing/export/events RED at 16:03:26; all three passed at 16:05:57 after implementation.
- Two 200-run properties now compare streaming graph integrity and paged query results with existing portable semantics. Initial query generators used an invalid unqualified type ID; that fixture error was corrected. The real cancellation RED then returned success instead of CANCELLED; bounded yielding/cancellation fixed it. All three tests passed at 16:09:08.
- Policy RED returned UNSUPPORTED_CAPABILITY at 16:10:08; readonly/acyclic policy test and strict typechecks passed at 16:11:08.
- Containment RED at 16:12:31 found an empty-page-directory symlink bypass. Checking the page root even when the manifest is empty fixed it; both safety tests passed at 16:13:04.
- Application regression after initial paged-command integration: 198 existing tests passed (15:59:52). This is a historical focused checkpoint, not the final post-edit regression.

Timestamps above are the local runner's printed start times on 2026-09-24. Test runs include isolated temporary files/SQLite databases and explicit worker termination; no real architecture repository was modified.

## Further observed RED → GREEN

- An interrupted pre-journal writer initially had no recovery path; LOCK_ONLY inspection/keep-source recovery passed after the 16:29 failing test.
- Bulk index construction and binary UTF-16 ordering keys were implemented after their focused failing assertions (16:34 and 16:45 respectively).
- Malformed configuration JSON initially returned the generic availability error; profile/model/manifest-specific error assertions passed after the 16:39 correction.
- Retained reconciliation results and capability arrays were mutable through caller references. The 18:01 failures passed after defensive copying/freezing at 18:08.
- Oversized creation profiles and operation IDs were initially accepted (18:19). Read-back/journal budget checks passed in the subsequent full regression.
- The added Electron v2 verification initially used incorrect fixture expectations (v1 creation returns void; v2 JSONL contains a kind/entity envelope). Correcting these test expectations produced 3/3 passing real Electron tests; this was not a production implementation defect or a fabricated behavioral RED.

## Current executed regression

`pnpm check:all` completed with exit 0 after the baseline benchmark stopped: 278 unique repository-package tests (domain 16, ports 4, application 207, YAML adapter 42, local index 1, Git 1, bridge 4, API 3), Desktop unit 7, browser 214 and then-current Electron 2. Root lint/typechecks/builds/boundary checks also passed. Existing cached Draw/metamodel/compiler suites are cache hits, not newly executed measurements. A subsequent `pnpm test:desktop` rebuilt the application and passed 3 Electron tests, including source-persisted v2 commands via sandboxed preload.

Two earlier full runs failed on Git integration five-second timeouts while the Large benchmark was competing for I/O. Those failures are retained as observed environmental contention, not hidden; isolated Git passed without timeout changes, and the final non-overlapping full gate passed. Do not run heavy benchmarks concurrently with release regression.

The trace checker verifies 31 native-v2 scenarios for six V2 requirements, alongside 27 CORE-linked scenarios and 112 original executable cases. Structural benchmark links are not measurement evidence. Final formatting, frozen installation and evidence reconciliation remain required after final edits.

## Measurements

The first complete source-backed Small/Medium/Large benchmark passed (2,854,578 ms total). `benchmark-v2-results.json` is the historical initial implementation, not the later optimized code. Large opened all 1,000,000 objects and 3,000,000 relations: cold open/index/full validation 2,019,636 ms, point read 5.219 ms, update/index 63.946 ms and sampled peak RSS 303,992,832 bytes. The 33.7-minute cold open is a significant limitation, not a satisfactory interactive target. This baseline overlapped some test execution and is not an idle-hardware SLA.

A separate optimized run completed all three datasets with exit 0 (902,998 ms). `benchmark-v2-optimized-results.json` includes measured source hashes and separate ingest/index/validation metrics. Large open/index/validation was 469,511 ms and sampled peak RSS 328,503,296 bytes. `benchmark-v2-analysis.md` records all requested operations, sampling limitations, concurrent workload and retrospective local regression budgets. Both runs use deterministic synthetic temporary repositories; no user data is benchmarked. Later safety/application edits differ from the captured module hashes and are not silently attributed to these measurements.

Further audit at 18:34 reproduced and fixed mutable model/policy views and INVALID_CURSOR instead of STALE_CURSOR after external reload. Both focused tests passed. At 18:35–18:47 optional query/snapshot services, hostile cancellation/events, HTTP deadline cleanup and delayed index rebuild races received failing tests and fixes; the new SQLite query/rebuild property passed 200 cases with seed 20260924. A final whole-workspace regression after these edits is in progress, not yet claimed successful here.

## Latest completed gate (supersedes in-flight statements above)

The final `pnpm check:all` run completed with exit 0 after fixing a new property's TypeScript generic and a native v1 event-compatibility regression. The latter reproduced as nine application failures; accepting valid native v1 state-bearing CRUD envelopes restored the existing contract while retaining malformed-event checks. All 49 affected acceptance/contract/hostile tests passed before the successful whole gate. Browser: 214 passed (1.4m); Electron: 3 passed (6.7s). Lint, strict types, unit/contract/BDD, architecture boundaries and builds passed. `pnpm format:check`, offline frozen installation and strict OpenSpec validation also exited 0. Traceability: 33 V2 scenarios, 27 CORE-linked scenarios, 112 original executable cases.

Tasks 9.2, 9.3, 9.4, 9.6, 3.1 and 8.2 now have implementation and executed evidence and are marked complete (26/37 total). Task 9.5 retains final adoption/export containment review despite passing host routing/Electron/semantic export tests. Other mandatory gaps remain active; no archive, commit or push was performed. Performance budgets are retrospective calibration with explicit measured-code hashes, not a new benchmark of the later boundary fixes.

The change remains active. General pre-v2 evidence is historical; this progress file and the actual measurement JSON take precedence for v2 status until final reconciliation. Native v2 does not complete remaining metamodel migration, optional-port, hostile-boundary and release-evidence tasks by implication.
