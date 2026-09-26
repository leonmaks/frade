# Actual execution evidence

2026-09-24, local Windows/Node 24.18.0/pnpm 12.6.0/OpenSpec 1.13.2. No remote CI execution is claimed.

## Initial results

- Baseline `pnpm check`: exit 0. Lint/typecheck/unit/build mostly replayed valid Turbo cache; BDD ran with 3 Draw, 55 metamodel-domain and 100 metamodel-compiler tests passing; 10 architecture contract tests passed. Browser/Electron checks were not part of this command. Existing bundle-size warnings remain.
- Expanded `openspec validate frade-repo-core --strict`: exit 0.
- `pnpm install --offline --no-frozen-lockfile`: exit 0; 11 workspace projects, 0 downloads, cached dependency reuse. Lockfile now includes three new workspace packages. This was not a frozen-install check.
- Initial `pnpm --filter @frade/repository-domain test`: exit 1; 11/11 RED before implementation. Failures are missing `entityKey`, `decodeObject`, `copyJson`, `canonicalJson` exports. Property tests printed seed 20260924, paths `0:0:0:0:0` and `0:0` (missing implementations, not a claimed discovered semantic defect).
- At this initial checkpoint the linked application/storage tests were not yet passing. Their subsequent results follow below.

## Earlier checkpoint checks (before continuation)

| Command                                                 | Actual result                                                                       |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `pnpm install --offline --frozen-lockfile`              | Exit 0, 16 workspace projects, no downloads                                         |
| `pnpm exec openspec validate frade-repo-core --strict`  | Exit 0; artifact validity, not implementation acceptance                            |
| `node scripts/check-repo-traceability.mjs`              | Exit 0; 27 linked scenarios, 23 feature files, 20 CORE tags                         |
| `pnpm format:check`                                     | Exit 0                                                                              |
| `pnpm check:all`                                        | Exit 0 after fixing lint; lint/typecheck/test/BDD/boundaries/build/browser/Electron |
| `pnpm --filter @frade/repository-application typecheck` | Exit 0 after adding the final public API example                                    |

Final full gate: **214 browser tests passed** (about 1.5 minutes), **2 Electron tests passed** (about 4.8 seconds), including actual repository IPC from sandboxed preload. All ten approved visual baseline SHA256 values were unchanged before/after. No snapshot-update command ran. Turbo reused valid local results for unchanged tasks: final lint 12/15 cached, typecheck 5/15 cached, explicit build phase 12/15 cached after dependency builds. BDD/browser/Electron ran explicitly.

Repository tests: domain 16, ports 4, application 53, native adapter 10, SQLite 1, Git 1, bridge 2, API 3 (**90 tests**, overlapping with BDD reruns). Application includes 25 acceptance, 15 shared contracts, 10 conflict/cancellation/property, 1 index-failure and 2 extension tests. Existing Draw unit suite: 200, metamodel-domain: 134, compiler: 131. Root BDD reruns existing suites; do not count these as additional unique tests.

## Subsequent observed RED/GREEN and fixes

- Query/snapshot tests caught missing implementation, invalid model-binding acceptance and projection aliasing, then passed after fixes. Initial ports/native/application/index/Git/bridge tests failed against missing implementations. Application acceptance progressed from 25 failing to 19 passing/6 unfinished integrations and finally 25 passing.
- YAML preservation assertion caught removal of unknown per-record metadata; document edits now touch Core-owned fields only. A separate actual-file test caught candidate/change mismatch; the actual resulting document is now validated and compared with the candidate.
- Index consistency RED required attachIndex and post-commit failure handling; GREEN proves no source replay. Protocol RED required mutation idempotency keys and reconciliation, subsequently implemented.
- 14:06 local: 2 RED tests demonstrated missing-policy authorization and acceptance of substituted acknowledgement content. After fixes, all 53 application tests passed. A write permission alone no longer permits mutation without an explicit policy.
- 14:13 local: recovery suite 1 passed/1 failed; close returned before an already dispatched real filesystem write. Native close now drains active writes; all 10 native tests passed. Injected rename failure preserves actual source/stage/journal files. It is not an OS process-kill or power-loss test.
- Intermediate lint failures: unused local-index import and later unused RelationRef, both removed. Initial formatting command exit 1 named a nonexistent Draw document index file; the public subpath points to existing serialize.ts. Final global format check passed.
- An intermediate contract fixture syntax error was corrected before behavioral tests. Some read-only rg inventory commands used unsupported Windows globs; explicit paths corrected them. These errors are not counted as passing product checks.

Property suites use seed **20260924**, 200 runs for implemented invariants. Initial missing-implementation failures printed paths `0:0:0:0:0` and `0:0`. The entire requested property/fuzz matrix is NOT complete.

Dedicated benchmark harness finished, but **performance acceptance failed**: Medium/Large returned RESOURCE_LIMIT; dependent measurements were blocked. Small is a baseline only. See benchmark-results.md/JSON. The original 112-case awaited BDD harness was unfinished at this earlier checkpoint; it is now implemented, as recorded below.

Warnings retained: existing Draw bundle-size warnings, Playwright color-environment warnings, Electron test-launch DEP0190 warning. No commit/push, real external repository mutation or automatic archive occurred.

## Continuation — actual RED/GREEN

- Original planning features: 112 missing-step RED failures, then 112 expanded executable scenarios plus one negative runner test passed. Two cardinality fixture orientation errors were corrected; an actual omitted-lifecycle-default defect was fixed.
- Advanced contract tests: 5 pass after RED for synchronous close exceptions and invalid-state repair. Adapter boundary tests: 9 pass after 7 RED failures for invalid service/capability/error envelopes. History has a real bounded service path and explicit unsupported result.
- Declarative policy tests: 3 pass after missing-policy enforcement RED. Tests exercise readonly/computed fields, cycle/creation/deletion constraints and invalid policy grammar. State assertions now read the live fixture getter, not a copied initial snapshot.
- Watch integration: 2 real asynchronous filesystem tests pass after failures to degrade and emit model-change events. Invalid source blocks writes; repair and profile changes restore appropriate capabilities; close removes watchers.
- Explicit recovery: 2 service tests pass using actual files and injected rename failure. Two separate child-process tests terminate the writer at STAGED and post-replacement barriers, reject intervention while it is alive, then recover and reopen. The initial worker-bundle CommonJS/ESM error was a harness setup failure, not a product RED result.
- 15:00: 3 intended RED failures exposed mixed-revision traversal, uncancelled adjacency waits and lost diagnostics on idempotent failed-command replay; all 3 pass after fixes.
- Memory adapter conformance: 5 intended RED cases, then 5 pass for create-if-absent, hidden candidate changes, unsupported batch, staged failure rollback and controlled competing writes. A further 600 property cases pass for copy isolation, failed commit preservation and directed graph validity across two model configurations.
- Profile/architecture negatives caught accepted URL credentials and DOM access. Both suites pass after fixes.
- Bridge controller: 2 RED then GREEN for wrong-identity responses and automatic style/detach/reconnect behavior; bridge total 4 tests.
- Actual native duplicate-ID and relocation tests: 2 pass. Additional actual Git tests: 2 pass, proving domain writes leave HEAD/history unchanged and conflicted files are never resolved by commit orchestration.
- Initial continuation lint reported four unused test imports/variables; removed. Strict typecheck found unsupported ForkOptions.windowsHide and mutation of readonly fixture model ID; switched to hidden spawn with IPC and immutable model construction. These failures are recorded, not presented as successful checks.

Final consolidated regression after all source/test additions: `pnpm check:all` exit 0. Lint/typecheck/build passed across 15 packages; all unit/contract/property suites passed. The eight repository packages total **243 tests**: domain 16, ports 4, application 198, native 16, index 1, Git 1, bridge 4, API 3. Root BDD explicitly ran 138 repository tests (a rerun, not additional unique tests), and the trace checker verified 27 linked CORE scenarios plus 112 executable legacy cases/all 13 RE/RP/RC IDs. Twelve architecture contract tests passed. **214 browser tests passed (1.5m); 2 Electron tests passed (4.4s)**. Unchanged tasks used local Turbo cache; browser/Electron ran explicitly. Frozen offline installation and strict OpenSpec validation passed. Final format check initially flagged architecture-review.md and adapter-yaml/package.json; only formatting was corrected. Benchmarks were not rerun during this continuation; their capacity failure remains unresolved.

After evidence formatting: `pnpm format:check` exit 0 and strict OpenSpec validation exit 0. Repeated SHA256 reads of all ten approved win32 production snapshots matched exactly; no snapshot-update command was used. Final OpenSpec apply progress is 19 complete, 12 remaining; planning completeness is not implementation acceptance.
