# OpenSpec structured-mutation re-verification: R03 Direction Resolver

CHANGE: routing-v2-03-direction-resolver
VERIFICATION_STATUS: PASS
READY_FOR_POST_GATE: YES
ARCHIVE_ALLOWED: false
PRODUCTION_FILES_MODIFIED_DURING_VERIFY: NONE
TEST_FILES_MODIFIED_DURING_VERIFY: NONE

Formal Sol high OpenSpec Verify on 2026-09-27. This report supersedes
`openspec-mutation-reverification.md` for progression. The earlier report and
the independent POST FAIL remain historical evidence; this report is not an
independent POST approval. The approved planning baseline remains
`ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c`.

## Summary scorecard

| Dimension | Result |
| --- | --- |
| Completeness | 10/10 ADDED requirements and 26/26 scenarios mapped; task 5.1 completed, 23/26 tracked tasks complete. |
| Correctness | 10/10 requirements covered; structured mutation evidence closes the only prior blocker. |
| Coherence | Implementation and tests follow the approved numerical, ownership, ordering, isolation and evidence design. |

No applicable verification check was skipped. Production, product tests,
planning artifacts, frozen controls and R01/R02 dependencies were not modified
during this Verify. R01/R02 regression results remain valid recorded evidence:
the architecture gate confirms those trees have not changed from the approved
baseline.

## Prior mutation blocker resolved

The repaired runner captures a structured Vitest `onTestRunEnd` audit for each
child, including completion reason, module states and serialized unhandled
errors. Classification now rejects missing/malformed audits, unhandled/global
errors, permission/setup/worker failures, unexpected status or signal and
suite-only failures. Infrastructure checks precede timeout handling. A Vitest
test timeout requires a matching failed assertion and remains a timeout in the
score denominator; it cannot count as killed.

Fresh unit execution ran the actual mutation-runner self-test. Its controls
cover real killed/surviving probes, spawn and assertion timeouts, EPERM/SSR and
worker failures, unhandled errors combined with valid failed assertions,
unexpected exit status, permission-plus-timeout precedence, missing reports,
score calculation, reporter serialization and source redirection. Result:
PASS.

The complete post-repair inventory contains 85 candidates: 67 killed,
18 compiler-invalid, 0 survived and 0 timed out; denominator 67, score 100%
against the required 90%. Independent Verify checks found:

- all 86 baseline/candidate child-result SHA-256 values match the aggregate;
- every one of 67 killed records has status 1, failed assertion evidence,
  `runAudit.reason=failed` and zero unhandled errors;
- every one of 18 compiler-invalid records retains compiler diagnostics;
- child stdout/stderr, Vitest assertion JSON and structured run audit remain
  individually available from the aggregate's `childResultsDirectory`.

Thus a timeout or infrastructure failure cannot satisfy the evidence accepted
for any reported kill, and the prior POST mutation-evidence blocker is closed.

## Requirement and scenario coverage

Production paths below are relative to
`packages/draw/src/routing/orthogonal/direction/`; test paths are relative to
`packages/draw/tests/routing-v2/direction/`.

| ADDED requirement | Implementation | Scenario evidence |
| --- | --- | --- |
| Space safe direction input and result | `contracts.ts`, `resolve.ts:27`, `relative.ts:25` | Outward endpoint semantics in `unit/contracts.test.ts`; same-space and mixed/widened rejection in strict `types/space.type-test.ts`. |
| Finite validated geometry without quantization | copied/validated inputs in `resolve.ts`; finite derived values in `relative.ts` and `preferences.ts` | All numeric partitions, overflow and degenerate bounds in `unit/contracts.test.ts`; sub-grid/no-quantization evidence in `unit/relative.test.ts`. |
| Relative quadrant and separation evidence | `relative.ts:25` | Four quadrants, axes/coincident ties, signed gaps and inclusive EPSILON partitions in `unit/relative.test.ts`. |
| Complete constrained preference selection | `preferences.ts:49`, membership invariant in `resolve.ts` | Singleton/filtering fixtures plus all 900 mask pairs and explicit membership assertions. |
| Fixed side evidence without relocating endpoints | `preferences.ts:29`, copied points in `resolve.ts` | Cardinal/corner, interior/out-of-span, source/target/both, degenerate and unchanged-point fixtures in `unit/fixed.test.ts`. |
| Pinned preference branch order and explicit ties | `preferences.ts:49` | Both-axis, single-axis, overlap, identical bounds, paired-row and reverse-role cases in preferences/fixed/reference tests. |
| Inspectable preference evidence and immutability | readonly contracts and frozen independently owned result graph in `resolve.ts` | Deep-frozen inputs, ownership, determinism, ordering branch/list and selection-reason assertions. |
| Conditioned metamorphic and reproducible properties | `property/core.property.test.ts` and unchanged R02 property harness | Six properties at seed 0xFAD003, each raw 5106 / accepted 5000 / rejected 106; direct reflected-tie and cancellation fixtures retained. |
| Direct exhaustive and reference verification | independent `reference/generate.mjs` and pinned fixture | 900 per-case expected pairs, 9 direct reference cases and explicit V2 adaptation fixtures. Vendor SHA-256 matches `8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d`. |
| R03 isolation and frozen machine gate | directory-local API with imports only to model/geometry/terminal | Installed gate validates scope, dependency direction, independent changed-path union and HEAD/INDEX/WORKTREE snapshots. Fresh independent POST remains the next lifecycle checkpoint. |

All 26 scenarios have direct runtime, compiler, property, reference or process
gate evidence appropriate to their contract. No requirement or expectation was
changed during Verify.

## Fresh commands and evidence

- R03 unit/reference: 8 files, 116 tests PASS, including the mutation-runner
  self-test, 900 reference matrix and nine direct reference cases.
- R03 properties: 1 file, 2 Vitest tests PASS; all six core properties report
  seed 0xFAD003, raw 5106, accepted 5000 and rejected 106.
- Direction strict compiler fixture: PASS.
- Full `@frade/draw` typecheck: PASS.
- Scoped source/test ESLint: PASS.
- Structured inventory audit: 85/85 records present; 86/86 hashes match;
  67/67 killed records and 18/18 invalid records have required evidence.
- Source/test scan: no focused/skipped tests or forbidden `@ts-ignore` /
  `@ts-nocheck` directives.
- Pinned draw.io vendor SHA-256: PASS.
- Installed architecture gate: PASS, with HEAD/INDEX/WORKTREE inspected.
- Strict OpenSpec change validation: PASS.
- `git diff --check`: PASS.

The first property command attempt stopped before collection with filesystem
`EPERM` while Vite tried to create its temporary bundled configuration. The
identical command was rerun with the required filesystem permission and passed;
this was an environment failure, not a test failure.

## Issues by priority

### CRITICAL for archive readiness

Tasks 5.2, 5.3 and 5.4 remain intentionally incomplete: obtain a fresh
independent POST PASS, reconcile/stage/commit the authorized implementation,
then archive and perform global validation plus separate archive/CLOSED
transitions. These are ordered lifecycle checkpoints, not implementation or
verification defects.

### WARNING

None.

### SUGGESTION

None.

## Final assessment

All implementation correctness, scenario, design and evidence checks passed.
There are no verification warnings or suggestions. R03 is ready for a fresh
independent Astra high POST_IMPLEMENTATION review. It is not ready for archive
until tasks 5.2-5.4 complete. Do not commit, archive or start R04 from this
Verify result.
