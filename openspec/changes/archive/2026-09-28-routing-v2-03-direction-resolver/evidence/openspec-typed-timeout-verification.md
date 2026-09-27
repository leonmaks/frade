# R03 formal OpenSpec Verify after typed timeout repair

CHANGE: routing-v2-03-direction-resolver
REVIEW_TYPE: OPEN_SPEC_VERIFY
VERIFICATION_STATUS: PASS
DATE: 2026-09-28 (Europe/Moscow)
BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c
READY_FOR_POST_GATE: YES
ARCHIVE_ALLOWED: false
PRODUCTION_FILES_MODIFIED_DURING_VERIFY: NONE
TEST_FILES_MODIFIED_DURING_VERIFY: NONE

This Sol high formal Verify follows the authorized test-harness repair and
complete fresh mutation run. It is not independent POST approval. The previous
formal PASS was superseded by the independent typed-timeout POST FAIL.

## Summary scorecard

| Dimension | Result |
| --- | --- |
| Completeness | 10 ADDED requirements and 26 scenarios mapped; task 5.1 complete, 23/26 tasks complete. |
| Correctness | Current product/scenario coverage and repaired mutation evidence verified; no unresolved implementation or required-evidence defect found. |
| Coherence | Approved scope, numerical/type policy, pinned reference, immutable evidence, dependency direction and process boundary preserved. |

OpenSpec status/apply context, proposal, delta, design and tasks were read.
The schema is spec-driven, and all planning artifacts are present. Task 4.5
has fresh full-run evidence, not merely a checked box.

## Requirement and scenario coverage

The ten requirement groups and 26 scenarios in the delta have runtime,
compiler, property, reference or executable process-control evidence. Their
detailed mapping in openspec-spawn-precedence-verification.md was rechecked
against the current source/test snapshot. Of 25 R03 source/test files in that
prior formal snapshot, only mutation/run.mjs changed; production, goldens,
unit/property tests, type fixtures and reference generator are byte-identical.
The fresh 116-test unit/reference suite includes per-case comparison of 900
mask pairs, fixed-side and singleton controls, numeric partitions, ties and
immutable evidence. Strict R03 compiler fixtures passed. Six properties ran
at seed 0xFAD003, each with 5106 raw / 5000 accepted / 106 rejected. The
pinned vendor SHA was freshly checked. No planning contract was rewritten.

## Fresh mutation verification

The common fatal-evidence preflight precedes every outcome. A structured
timeout error now requires coherent `Error` type/name and the full installed
Vitest Test/Hook producer message; a TypeError with embedded timeout text or
adapter-prefixed generic Error is unknown and aborts. Assertion identity
requires both type and name. Global/infrastructure/unknown errors retain abort
precedence. Plain spawn ETIMEDOUT remains timeout with absent or partial
known-only reporters. The exact first-frame resolver membership-guard exception
and all duration formats remain supported. Duration formatting is not parsed.

Fresh read-only controls over a retained real child covered all 16 reported
test/suite/module/global x complete/partial x spawn-on/off cases. All 16
explicitly aborted as unknown failure. The new 128-cell permanent synthetic
matrix and actual schema-2 reporter controls ran in the repaired self-test and
fresh 116-test baseline. Installed Vitest Test/Hook producer cases and live
timeouts remained in that executable self-test.

Fresh audit checked 86 baseline/candidate SHA-256 links, reclassified all 67
executable children, checked 18 compiler-invalid diagnostic records,
recomputed the exact 85-candidate AST inventory, denominator and score,
confirmed raw console JSON equals aggregate JSON, and matched all 85 progress
outcomes. Baseline: 116 passing tests. Outcomes: 67 killed, 18
compiler-invalid, zero survivors/timeouts; denominator 67, score 100%
(required >=90%). All 29 R01–R03 production hashes match the prior manifest.
Actual audit: openspec-typed-timeout-verification-audit.json. Complete child
results: mutation-child-results-2026-09-27T22-22-04-681Z-22644/;
aggregate: mutation-results-2026-09-27T22-22-04-681Z-22644.json. Composed
unknown-error controls are not claimed to have appeared in mutant children.

## Fresh checks and limits

This frozen Verify executed OpenSpec status/apply, read-only classifier and
retained-inventory audits, strict R03 compiler fixture, pinned vendor SHA
check and a focus/suppression scan (rg exit 1 means no matches). Vendor SHA:
8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d.
The 25-file snapshot is openspec-typed-timeout-verification-frozen.json.

The preceding completed repair freshly executed R03 unit/reference 116 PASS,
property 2 PASS, full mutation run exit 0, @frade/draw typecheck, strict
R03/R01/R02 compiler fixtures, scoped lint, strict validation, diff check and
installed VERIFICATION gate PASS (870 changed paths, 77 V2 source/test files,
HEAD/INDEX/WORKTREE inspected before this review's process files were added).
See mutation-typed-timeout-repair.md. R01/R02 runtime suites and gate self-tests
were not repeated during the harness-only repair; their historical evidence
and unchanged dependencies remain applicable. Full Vitest/mutation suites were
not rerun inside this frozen Verify, and no fresh execution is claimed for
those suites or the gate self-tests.

## Issues and assessment

CRITICAL before archive: tasks 5.2 (fresh independent POST), 5.3 (final
implementation commit) and 5.4 (archive/closure). These are sequential future
lifecycle checkpoints, not unresolved implementation/verification defects.
WARNING: NONE.
SUGGESTION: NONE.
UNRESOLVED_IMPLEMENTATION_OR_VERIFICATION_BLOCKERS: NONE.

Ready for new independent Astra high POST. POST_IMPLEMENTATION_GATE remains
FAIL pending an actual new review; ARCHIVE_ALLOWED and NEXT_CHANGE_ALLOWED
remain false. BASE_COMMIT is unchanged. No commit, archive or R04 work.

Post-recording checks passed: strict OpenSpec validation, installed gate
(875 changed paths, 77 V2 source/test files, HEAD/INDEX/WORKTREE) and diff
check. NUL-safe expanded status found 875 authorized paths and no unexpected
path. The frozen 25-file snapshot remained identical throughout Verify,
HEAD still equals the approved planning baseline, and task progress is 23/26.
