# Verification report: frade-standard-workflow — W01 task4.1

**Formal Verify: FAIL. Ready for POST: false. Ready for archive: false — NOT_READY_FOR_ARCHIVE.**

Source: `9fcdced7bfd3e1ae3e6895de050466417b19d8c1`; fixed design SHA256 `501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a`. Approved/requested role: formal-Verify, `gpt-6-astra/high`. Actual backend/effort: `NOT_CONFIRMED`.

This is phase-scoped formal verification of the published cumulative source and supplied administrative refresh. It is not an independent PRE/POST or architecture verdict, deployment, repair authorization or archive action.

| Dimension | Result |
|---|---|
| Completeness | 14/18 tasks marked complete; all 18 ADDED requirements and 46 scenarios inspected and mapped. Tasks4.1–4.4 remain critical archive blockers. |
| Correctness | FAIL: 7 requirements have applicable implementation failures; four distinct blockers below. All 46 scenarios have code/assertion/run evidence or an explicit approved boundary. |
| Coherence | FAIL: installed manifest/role admission, bootstrap/status IDs and historical-origin status writing disagree across control layers. |

All six VERIFY-SKILL checks were performed: task completion, spec coverage, implementation mapping, scenario coverage, design adherence and code pattern consistency. Native product suites were not rerun. The two later adoption/integration scenarios are explicit design boundaries, not current implementation omissions.

## Critical implementation findings — resolve before POST

**V-01: Installed W01 manifest is rejected by review preparation scope admission.** The review adapter compares each manifest allowed pattern by literal Set membership. Its hard-coded .github/workflows/** does not contain the exact approved .github/workflows/ci.yml entry. The root loader correctly requires the narrower exact entry.

Read-only packet import with a complete POST request and unchanged installed manifest returns REVIEW_SOURCE before ownerIdentity, role resolution, canary or dispatch. This is not an unavailable external owner/runtime.

Source: [scripts/directions/review.mjs:256](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/review.mjs:256), [scripts/directions/review.mjs:563](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/review.mjs:563), [docs/engineering/directions/frade-standard-workflow/direction.json:27](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/docs/engineering/directions/frade-standard-workflow/direction.json:27), [scripts/directions/root-loader.mjs:155](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/root-loader.mjs:155).

Test gap: Synthetic W01 fixture scopes use the adapter-compatible wildcard; no positive installed-manifest preparation assertion reaches this mismatch.

Required action: In an authorized owner repair, reconcile the adapter with the exact approved W01 scope, without widening the manifest or frozen rules. Add an installed-manifest positive preflight and retain widened/foreign scope rejection. Recheck cumulative controls before fresh formal Verify.

**V-02: Installed role provenance cannot resolve any of the five approved W01 roles.** The installed roleAuthority supplies path/hash/humanDecision but lacks revision and the separately hash-bound decision descriptor required by canonicalSource/verifySource. approvedW01 builds trusted bindings but passes that incomplete manifest through unchanged.

Read-only resolveRole calls for planning-architecture, tooling-tests, formal-Verify, independent-PRE and independent-POST all return ROLE_SOURCE. The deliberately non-approving authority callback is never called (0 calls); missing provenance fails before approval, so this probe does not invent approval.

Source: [docs/engineering/directions/frade-standard-workflow/direction.json:116](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/docs/engineering/directions/frade-standard-workflow/direction.json:116), [scripts/directions/roles.mjs:38](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/roles.mjs:38), [scripts/directions/roles.mjs:61](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/roles.mjs:61), [scripts/directions/review.mjs:596](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/review.mjs:596).

Test gap: The tests construct completed roleAuthority revision/decision descriptors rather than consuming the installed direction.json unchanged.

Required action: Reconcile the owning metadata/adapter with the resolver’s authenticated provenance contract while preserving design4, exact pairs and historical admission. Add installed-manifest resolution for all five roles and genuine D03 authority, plus drift/self-approval negatives; do not relax source validation.

**V-03: Bootstrap generates task IDs that the status parser rejects.** The seed producer emits S01.1–S01.4, while the shared task parser accepts only numeric dotted IDs. Seed rendering passes an empty task string instead of the four generated tasks, concealing the incompatible output.

Read-only extraction of all four literal generated checklist lines, passed to the actual projectStatus, yields TASK_MALFORMED and complete/total/remaining = 0/0/0. No new direction, temporary Git owner or product test suite was run here.

Source: [scripts/directions/bootstrap.mjs:491](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/bootstrap.mjs:491), [scripts/directions/bootstrap.mjs:370](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/bootstrap.mjs:370), [scripts/directions/status.mjs:98](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/status.mjs:98), [scripts/directions/status.mjs:112](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/status.mjs:112).

Test gap: Parser tests use numeric IDs; bootstrap tests validate creation/retry/scope but do not parse their generated tasks through public status. The guide test exercises invalid arguments only.

Required action: Make the seed and parser use the same approved stable-ID contract and derive the initial projection from the actual seeded tasks. Add a real plan/create/check/status chain asserting four tasks and no TASK_MALFORMED; preserve malformed/duplicate-ID rejection.

**V-04: Historical W01 origin is admitted by check but cannot refresh status with --write.** Status write maintains a separate origin validator requiring both bootstrap intent journals. check explicitly authenticates historical W01 when both are absent. The status path has no corresponding historical-origin admission.

Native original-owner replay asserts check VALID and only status preview (no --write). With the installed historical shared-policy/agent-workflow.md path, check’s journal branch would reject; its passing replay therefore exercised historical admission. The write path unconditionally requires the absent journals before freeze handling. This is a source/native-evidence inference; actual original-owner status --write was not run.

Source: [scripts/directions/bootstrap.mjs:884](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/bootstrap.mjs:884), [scripts/directions/bootstrap.mjs:859](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/bootstrap.mjs:859), [scripts/directions/status.mjs:448](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/status.mjs:448), [scripts/directions/status.mjs:551](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/status.mjs:551).

Test gap: The W01-named status test creates synthetic bootstrap journals through actualOwner. The new native original-origin test only previews; it does not prove post-unfreeze write viability.

Required action: Reuse or coherently implement the authenticated original-origin admission for status writes, retaining owner/source/hash/freeze checks. Add historical W01 write coverage without fabricated bootstrap journals, including frozen deferral and successful refresh after release. Do not create false origin records or modify original approvals.

## Critical pending closure tasks

These four unchecked tasks each remain an archive blocker. Their order is Verify → independent POST → release/adoption decision → archive. Future release/archive need not already exist for a phase-scoped Verify PASS; the four implementation defects above cause this FAIL.

- **4.1 — INCOMPLETE:** Retain this failed Verify report outside frozen source; owner must resolve V-01–V-04 within authorized scope, rerun affected/cumulative checks and obtain a fresh complete formal Verify. Do not mark 4.1 complete from report existence. ([openspec/changes/frade-standard-workflow/tasks.md:30](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/openspec/changes/frade-standard-workflow/tasks.md:30))
- **4.2 — INCOMPLETE:** After successful formal Verify, perform fresh cumulative independent POST with exact gpt-6-astra/xhigh and full immutable raw reception; this report is not POST. ([openspec/changes/frade-standard-workflow/tasks.md:31](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/openspec/changes/frade-standard-workflow/tasks.md:31))
- **4.3 — INCOMPLETE:** After applicable POST, record authorized standard Git-control adoption or publish a new supplier release via its reviewed protocol, preserving v1.1; verify discovery/canary. ([openspec/changes/frade-standard-workflow/tasks.md:32](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/openspec/changes/frade-standard-workflow/tasks.md:32))
- **4.4 — INCOMPLETE:** After preceding gates and decisions, activate only the three declared engineering spec destinations and the W01 dated archive, retain relocation/origin evidence and exact authorized publication, then STOP. ([openspec/changes/frade-standard-workflow/tasks.md:33](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/openspec/changes/frade-standard-workflow/tasks.md:33))

## Evidence assessment

- All 132 current packet bindings match. Of 129 prior bindings, 127 match; only controller-generated `openspec-strict.json` and `probe.cjs` differ. Prior source/config bytes match. The prior capacity ERROR is not a verdict.
- Native Windows Node24.18.0: **193 passing executions, 177 unique test titles**, 16 repeated bootstrap registrations, 0 failed/skipped. Every title was reconciled to current assertions. Separate actual W01 owner replay passes 1/1. All 17 captured native command records have matching 54 source/config bindings.
- General lint/typecheck/build each report 20/20 **Turbo cache hits**; boundary tests 19/19 and four boundary commands pass. Scoped lint/format, content/links, integrity, applicability, loader, metadata, strict 16/16, discovery and confinement records were audited. No unexecuted product `check:all`, browser/desktop or visual suite is claimed PASS.
- The actual authorized push and fresh remote query match 9fcdced7 on `refs/heads/codex/frade-standard-workflow`. Task3.2 completion/status refresh is administrative evidence, not requirement acceptance. Immutable `traceability.json` remains planning-only.
- Older task3.1 findings are reconciled: task3.2 substantively closes numeric-budget and unsupported-writer gaps; it adds genuine historical-origin check coverage. Its guide test asserts wording and rejected argv, while valid installed flows still fail. The newer overlay is not automatically accepted.
- Older task2.5 actual **scoped PRE** remains bounded historical evidence. It is not cumulative POST or proof that the current installed manifest works. Its complete external raw stream is not supplied; only available source-bound receipt/pointer evidence was inspected.
- Root17 and the fixed plan remain intact. Common v1.1 is frozen; Routing/UI/Repo Core adoption remains `NOT_STARTED`. Exact pairs and unsupported writer boundaries remain mandatory. Closure executor assertions use controlled temporary Git fixtures; actual W01 closure remains task4.4.
- Verify-side read-only packet probes reproduced `REVIEW_SOURCE`, five `ROLE_SOURCE` results before approval callbacks, and seeded `TASK_MALFORMED`/0-task metrics. These Linux Node18 probes are distinct from the supplied native suites. V-04 is a source-bound inference; original-owner `status --write` was not run.

## Warnings and suggestion

- **W-01 (WARNING): Public bootstrap documentation retains obsolete cumulative-command/origin claims.** After authorized fixes, update the template’s final paragraph to describe current status/review/checkpoint/publish and the narrow authenticated historical W01 exception. Keep unrelated legacy adoption blocked and preserve the NOT_DEPLOYED notice. Source: [docs/engineering/templates/task-2.3-bootstrap.md:51](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/docs/engineering/templates/task-2.3-bootstrap.md:51), [docs/engineering/newcomer-guide.md:9](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/docs/engineering/newcomer-guide.md:9).
- **W-02 (WARNING): Administrative status refresh is not a generated, source-bound projection.** After review unfreeze and authorized status-origin repair, regenerate the current header using VERIFICATION and a source hash. Preserve prior dated history; do not use manual VERIFY/READY_FOR_VERIFY text or 14/18 task counts as gate/requirement acceptance. Source: [docs/engineering/BRANCH-STATUS.md:9](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/docs/engineering/BRANCH-STATUS.md:9), [scripts/directions/status.mjs:271](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/status.mjs:271), [scripts/directions/contracts.mjs:3](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/scripts/directions/contracts.mjs:3).
- **S-01 (SUGGESTION): Distinguish repeated test registrations from distinct coverage.** Keep reporting 193 executions / 177 unique titles. If deduplicating the helper import later, preserve all 177 unique assertions and their native bindings; do not describe 193 as distinct cases. Source: [tests/directions/bootstrap-repair.test.mjs:1](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/tests/directions/bootstrap-repair.test.mjs:1), [openspec/changes/frade-standard-workflow/evidence/task32-final-20261005/native/task32-final-native-full.json:1](/mnt/e/dev/codex/frade-worker-staging/w01-formal-verify-20261005-retry1/input/openspec/changes/frade-standard-workflow/evidence/task32-final-20261005/native/task32-final-native-full.json:1).

## Complete requirement/scenario mapping

The machine-readable [VERIFY-REPORT.json](./VERIFY-REPORT.json) contains all 18 requirement rows and 46 scenario rows, exact code/test lines, meaningful assertion descriptions and literal samples, native run paths/SHA256 bindings, the 177-title execution inventory, approved human/future boundaries, origins, checks and limitations. A row-level PASS is control evidence only; accepted requirements remain 0.

| Requirement | Phase-scoped result | Scenarios |
|---|---|---|
| FWE-001 — Direction ownership | PASS | S01:PASS, S02:PASS, S03:PASS, S04:PASS |
| FWE-002 — Uniform intake and research | PASS | S01:PASS, S02:PASS |
| FWE-003 — Safe repeatable bootstrap | FAIL | S01:PASS, S02:PASS |
| FWE-004 — Requirements and executable traceability | PASS | S01:PASS, S02:PASS |
| FWE-005 — Sequential stage barriers | PASS | S01:PASS, S02:PASS, S03:PASS |
| FWE-006 — STOP and root cause integrity | PASS | S01:PASS, S02:PASS |
| FWE-007 — Applicable contract preservation | PASS | S01:PASS, S02:PASS |
| FWE-008 — Owner-controlled adoption and integration | PASS_WITH_FUTURE_BOUNDARY | S01:APPROVED_FUTURE_BOUNDARY, S02:APPROVED_FUTURE_BOUNDARY, S03:PASS |
| FWE-009 — Exact model resolution | FAIL | S01:PASS, S02:PASS, S03:PASS |
| FWE-010 — Automatic independent review | FAIL | S01:FAIL, S02:PASS, S03:PASS |
| FWE-011 — Complete immutable review reception | PASS | S01:PASS, S02:PASS, S03:PASS |
| FWE-012 — Separate requested and actual execution | PASS | S01:PASS, S02:PASS |
| FWE-013 — Uniform status projection | FAIL | S01:PASS, S02:PASS |
| FWE-014 — Truthful source-bound metrics | FAIL | S01:PASS, S02:PASS, S03:PASS |
| FWE-015 — Event-driven status freshness | FAIL | S01:FAIL, S02:FAIL |
| FWE-016 — Durable checkpoint cadence | PASS | S01:PASS, S02:PASS, S03:PASS |
| FWE-017 — Authorized verified publication | PASS | S01:PASS, S02:PASS, S03:PASS |
| FWE-018 — Minimal human decision boundary and onboarding | FAIL | S01:FAIL, S02:PASS |

**Final assessment:** 8 critical issues (4 implementation defects and 4 incomplete closure tasks), 2 warnings, 1 suggestion. Required repairs and a fresh formal Verify precede POST. W01 remains NOT_READY_FOR_ARCHIVE. No production/source changes or gate approvals were made.
