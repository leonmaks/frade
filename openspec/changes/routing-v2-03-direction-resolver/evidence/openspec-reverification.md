# OpenSpec re-verification: R03 Direction Resolver

CHANGE: routing-v2-03-direction-resolver
VERIFICATION_STATUS: PASS
READY_FOR_POST_GATE: YES
ARCHIVE_ALLOWED: false
PRODUCTION_FILES_MODIFIED_DURING_VERIFY: NONE
TEST_FILES_MODIFIED_DURING_VERIFY: NONE

Formal Sol high OpenSpec Verify on 2026-09-27. This report supersedes the
current result of openspec-verification.md; that earlier FAIL and its audit
remain historical evidence. This is not independent POST approval.
Approved planning baseline remains ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c.

## Scorecard

| Dimension | Result |
| --- | --- |
| Completeness | 10/10 requirements, 26/26 scenarios mapped; task 5.1 completed, 23/26 tasks complete. |
| Correctness | Both required test-evidence gaps resolved; no unresolved correctness blocker found. |
| Coherence | Implementation follows the approved ownership, ordering, numerical and dependency design. |

No applicable verification check was skipped. Latest full suites are recorded
in test-only-repair-results.md and were executed after the test repair. They
were not repeated during this read-only review. Fresh compiler and evidence
audits below supplement those results; process checks run after state updates.
Planning artifacts, tests, production, frozen controls and R01/R02 were not
modified during this review.

## Required evidence repairs verified

W1: read-only extraction/transpilation of the actual sample/safe/gapEvidence
functions and unchanged shared seededRandom/integer helpers reproduces seed
0xFAD003 with raw=5106, accepted=5000, rejected=106. Independently checking all
accepted origin/fixed/delta and reflected-origin coordinates, even extents
and opposing-gap conditioning finds zero domain violations. Structural rect
construction is used only for finite generator samples; no production
decision or property assertion is substituted. Replay path 94 now rejects
fixedSource=(-63318,100568). The direct test also asserts rejection of this
case and acceptance of the inclusive fixed-coordinate boundary 100000.
All six actual generated property executions meet the 5000 accepted quota.

W2: unit/preferences.test.ts now directly resolves identical bounds at
(13,17,10,10), horizontal reflection (-23,17,10,10), and vertical reflection
(13,-27,10,10). Each independently asserts NORTH/SOUTH and quadrant 2.
The floating-point cancellation fixture remains in unit/relative.test.ts.
The test pins the explicit tie policy without claiming universal reflection
equivariance at a tie.

## Requirement and scenario coverage

Production paths below are relative to src/routing/orthogonal/direction;
test paths are relative to tests/routing-v2/direction in packages/draw.

| Requirement | Implementation | Required scenario evidence |
| --- | --- | --- |
| Space safe direction input and result | contracts.ts, resolve.ts, relative.ts | Cardinal target semantics in unit/contracts.test.ts; mixed/widened spaces and readonly result in types/space.type-test.ts, compiled by strict tsc. |
| Finite validated geometry without quantization | resolve.ts copies/validation, relative.ts finite derived results, preferences.ts fixed differences | Non-finite inputs, malformed options/masks, derived overflow and degenerate bounds in unit/contracts.test.ts and direct geometry fixtures. |
| Relative quadrant and separation evidence | relative.ts | Four quadrants, axes/coincident ties and EPSILON partitions in unit/relative.test.ts. |
| Complete constrained preference selection | preferences.ts, resolve.ts membership invariant | Singleton override/filtering in unit/fixed.test.ts; 900 mask pairs in unit/reference.test.ts and unit/preferences.test.ts. |
| Fixed side evidence without relocating endpoints | preferences.ts fixedCandidate, resolve.ts copied points | Cardinal edges/corners, interior/out-of-span, source/target/both and unchanged points in unit/fixed.test.ts. |
| Pinned preference branch order and explicit ties | preferences.ts selectPreferences | Both separated axes, identical bounds, single-axis arrangements, role exchange and paired-row singleton regression in preferences/fixed/reference tests. |
| Inspectable preference evidence and immutability | resolve.ts frozen independently copied result graph | Deep-frozen inputs, ownership, stable evidence in unit/evidence.test.ts; explicit ordered list/reasons in fixed/preferences tests. |
| Conditioned metamorphic and reproducible properties | property/core.property.test.ts, unchanged shared R02 harness | Safe translation and both reflections; independent accepted-domain audit; direct reflected identical bounds and cancellation fixtures. W1/W2 resolved. |
| Direct exhaustive and reference verification | reference/generate.mjs, fixtures/reference-cases.json | Independent 900 expected pairs and 9 direct cases; pinned vendor hash; direct documented V2 EPSILON/span/filter adaptations. |
| R03 isolation and frozen machine gate | Directory-local exports and inward imports; approved frozen gate | Current machine gate inspects independent discovery/snapshots and reviewed baseline binding. Independent POST remains the next lifecycle checkpoint. |

All 26 delta scenarios have direct/runtime/compiler/property or process-gate
evidence as appropriate. No requirement was changed to match implementation.

## Executed evidence and integrity

- Latest repaired R03 suite: 9 files / 118 tests PASS (116 unit/reference and
  2 property-file tests; six core property runs each raw5106/accepted5000/
  rejected106, seed0xFAD003). Latest R01: 8 files / 92 tests PASS. Latest R02:
  13 files / 126 tests PASS. See test-only-repair-results.md.
- Fresh `pnpm --filter @frade/draw exec tsc --noEmit -p
  tests/routing-v2/direction/types/tsconfig.json`: PASS. Latest full Draw
  typecheck, lower-layer compiler fixtures and scoped lint: PASS in repair
  and implementation evidence; earlier-layer trees remain unchanged.
- Fresh independent mutation-output audit: saved mutation-results-rerun.json
  exactly equals the final JSON captured in mutation-progress-rerun.txt;
  all 85 per-mutant entries present. 67 killed, 18 compiler-invalid,
  zero survived/timeouts, denominator67, score100% against required90%.
- Fresh fixture provenance audit: vendor SHA256 matches pinned fixture
  8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d;
  900 matrix and 9 direct cases. Extraction reads pinned vendor direction
  logic in a VM with test-local constants; it imports no V2 decision helper.
  No expected fixture was regenerated during Verify.
- Fresh source/test scan finds no focused/skipped tests or forbidden
  ts-ignore/ts-nocheck. Negative compiler assertions use ts-expect-error.
- Final process checks: installed architecture gate, strict OpenSpec change
  validation and git diff --check PASS. Git status inspected; changes remain
  within R03 product/process scope. Approved BASE_COMMIT was not moved.

## Remaining tasks — critical for archive readiness

Tasks 5.2, 5.3 and 5.4 remain open: fresh independent POST review, implementation
commit, then archive/global validation/separate archive and CLOSED commits.
Under the Verify skill these incomplete tasks block archive readiness. They
are the explicitly ordered future lifecycle steps, not unresolved product
defects. Archive readiness: NO. Required correctness/evidence warnings: 0.

Stop for the model checkpoint: fresh read-only Astra high POST review must
follow this PASS. Do not commit, archive or start R04 from this Verify result.
