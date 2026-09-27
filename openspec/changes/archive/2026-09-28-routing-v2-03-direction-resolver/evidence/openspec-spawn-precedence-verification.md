# R03 formal OpenSpec Verify after spawn-timeout precedence repair

CHANGE: routing-v2-03-direction-resolver
REVIEW_TYPE: OPEN_SPEC_VERIFY
VERIFICATION_STATUS: PASS
DATE: 2026-09-28 (Europe/Moscow)
BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c
READY_FOR_POST_GATE: YES
ARCHIVE_ALLOWED: false
PRODUCTION_FILES_MODIFIED_DURING_VERIFY: NONE
TEST_FILES_MODIFIED_DURING_VERIFY: NONE

This is Sol high formal Verify after the authorized harness-only repair and
complete fresh mutation inventory. It is not independent POST approval.
Earlier formal PASS and independent POST FAIL reports remain historical.

## Summary scorecard

| Dimension | Result |
| --- | --- |
| Completeness | 10 ADDED requirements and 26 scenarios mapped; task 5.1 complete, 23/26 tasks complete. |
| Correctness | Current product/scenario coverage and repaired mutation evidence verified; no unresolved implementation or required-evidence defect found. |
| Coherence | Approved scope, type/numerical contracts, reference policy, dependency direction, ownership and isolation preserved. |

OpenSpec status/apply context, proposal, delta, design and tasks were read.
Schema is spec-driven, all planning artifacts are present, and task 4.5 now
has actual completed execution evidence. No specification wording changed.

## Requirement/scenario mapping rechecked

The detailed 10-requirement mapping in openspec-final-mutation-verification.md
was rechecked against current resolve.ts, contracts.ts, relative.ts,
preferences.ts, test coverage and compiler fixtures. All 26 scenarios have
runtime, compiler, reference, property or executable process-control evidence.
The previous 25-file snapshot differs only at mutation/run.mjs; all product,
golden fixture, scenario test and property files remain byte-identical.

| Requirement group | Current evidence |
| --- | --- |
| Space safe input/result | NoInfer/readonly contracts, same-space generic calls and eight compiler-negative cases; fresh R03 strict tsc PASS. |
| Finite geometry/no quantization | Contextual validation, finite derived edges/centers/gaps; numeric partitions, overflow, zero/negative extents and sub-grid tests. |
| Quadrant/separation | Inclusive EPSILON band, pinned branch numbering, signed/policy gaps and R01 relations; axis/epsilon/overlap fixtures. |
| Constrained preferences | Complete mask filtering, FINAL singleton override and fixed filtering; all 900 expected mask pairs freshly executed. |
| Fixed side evidence | Expanded spans, vertical corner priority, degenerate/interior/detached cases and unchanged fixed-point fixtures. |
| Branch/tie ordering | Paired rows, source-role priority, axis/overlap/identical/reflected-identical bounds and role-exchange fixtures. |
| Immutability/evidence | Copied deeply frozen output, independently owned graphs, readonly compiler checks and history-independent fixtures. |
| Conditioned properties | Six unchanged quota-enforced properties at 0xFAD003, fresh raw 5106 / accepted 5000 / rejected 106 each; direct excluded-tie/cancellation evidence. |
| Reference verification | 900 per-case comparisons plus nine direct cases, pinned extraction without V2 helpers; vendor SHA freshly checked. |
| Isolation/frozen gate | Inward dependencies, no route/jetty/R04 output, exact baseline, approved fingerprints and HEAD/INDEX/WORKTREE gate checks. |

Current production and relevant test/fixture contracts were inspected, not
inferred from checkbox completion alone. The unchanged broader product
mapping and earlier R01/R02 runtime evidence remain applicable through hashes
and frozen gate checks. There is no newly skipped product check merely because
the repair is limited to the harness.

## Fresh mutation evidence verification

The shared fatal-evidence preflight now runs before every outcome return.
Global/infrastructure checks and available typed unknown-error checks have
precedence over spawn ETIMEDOUT. Ordinary spawn timeout still returns timeout
with absent, partial or completed known-only reporter evidence. Complete
schema/count validation remains required for ordinary killed/survived and
Vitest diagnostic outcomes. Known assertion and precisely first-frame-bound
resolver membership errors remain distinct from unknown runtime failures.

During this frozen Verify, 20 read-only controls were executed again over a
retained actual child: test/suite/module/global unknown errors with/without
spawn timeout, partial unknown audits, ordinary spawn-timeout positives,
infrastructure+spawn compositions and an assertion-kill positive. Every
expected result matched. The new 23 permanent self-test controls and all
existing installed numeric timeout producers/live Vitest controls were
executed during the completed repair and passing inventory baseline; they
were inspected, not rerun as a full suite during this frozen Verify.

Fresh retained-run audit verified:

- Exact AST inventory: 85 candidates, none omitted.
- All 86 baseline/candidate SHA-256 links.
- All 67 executable child reclassifications.
- All 18 retained compiler-invalid diagnostic sets and null child records.
- Baseline 116 passing tests.
- 67 killed, 18 compiler-invalid, zero survivors/timeouts; denominator 67,
  score 100%, exceeding unchanged >=90% target.
- Raw console JSON equals aggregate JSON; all 85 progress outcomes agree.
- All 29 production hashes unchanged.
- Only mutation/run.mjs differs from the prior 25-file formal snapshot.

Aggregate: mutation-results-2026-09-27T21-42-21-542Z-8556.json.
Actual fresh audit: openspec-spawn-precedence-verification-audit.json.
Frozen source/test snapshot: openspec-spawn-precedence-verification-frozen.json.
Child output, typed reports, isolated roots, failures and diagnostics remain
auditable; composed controls do not imply these failures occurred in inventory.

## Executed checks and limits

This Verify executed OpenSpec status/apply context, read-only classifier,
inventory/hash/raw/progress/vendor audits and strict R03 compiler fixtures.
The prohibited skip/focus/suppression scan found no matches (rg exit 1 is
the expected no-match result). Vendor SHA remains
8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d.

Fresh completed repair evidence: self-test PASS; R03 unit/reference 116 PASS;
property 2 PASS; full mutation run exit 0; full Draw typecheck, all three
R01/R02/R03 compiler-fixture commands, scoped lint, strict validation, diff
check and installed VERIFICATION gate PASS. The installed gate checked 773
changed paths and 77 V2 source/test files before recording new process evidence.
Commands/results are recorded in mutation-spawn-precedence-repair.md.

Full suites, full mutation execution, full typecheck and gate self-tests were
not repeated inside this frozen Verify. R01/R02 runtime and unchanged machine
self-test execution evidence is historical, not falsely claimed fresh. The
repair's fresh executions and current read-only checks supply required evidence.
Only process-state/task completion and review evidence are written during Verify.

## Issues and assessment

CRITICAL before archive: remaining tasks 5.2 (independent POST), 5.3 (final
implementation commit) and 5.4 (archive/closure). These sequential future
lifecycle checkpoints are not missing implementation or verification evidence.
WARNING: NONE.
SUGGESTION: NONE.
UNRESOLVED_IMPLEMENTATION_OR_VERIFICATION_BLOCKERS: NONE.

Ready for fresh independent Astra high POST. POST_IMPLEMENTATION_GATE remains
FAIL until an actual independent review passes. ARCHIVE_ALLOWED and
NEXT_CHANGE_ALLOWED remain false. BASE_COMMIT is unchanged. No commit,
archive or R04 work is authorized by this report.

Post-recording checks passed: strict OpenSpec validation, installed gate
(778 changed paths, 77 V2 source/test files, HEAD/INDEX/WORKTREE), and diff
check. NUL-safe status with --untracked-files=all found exactly 778 authorized
paths and no unexpected file. The initial default status view collapsed the
untracked orthogonal tree into a directory entry; expanding files resolved that
audit-script scope false alarm without any repository change. All 25 frozen
source/test hashes are unchanged during Verify, HEAD still equals the approved
baseline, and task progress is 23/26.
