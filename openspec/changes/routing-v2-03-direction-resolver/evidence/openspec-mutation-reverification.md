# Formal Sol high mutation-repair re-verification

CHANGE: routing-v2-03-direction-resolver
VERIFICATION_STATUS: FAIL
CLASSIFICATION: TEST
READY_FOR_POST_GATE: NO
ARCHIVE_ALLOWED: false
PRODUCTION_FILES_MODIFIED_DURING_VERIFY: NONE
TEST_FILES_MODIFIED_DURING_VERIFY: NONE

Review performed on 2026-09-27 against approved baseline
ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c. Previous formal reports remain
historical; this is the current formal Verify result, not independent POST.

## Scorecard

| Dimension | Result |
| --- | --- |
| Completeness | Planning artifacts complete; 21/26 task marks after reopening 4.5. Product mappings remain 10 requirements / 26 scenarios in the earlier full Verify report. |
| Correctness | Original three classifier regressions repaired and captured run auditable; required infrastructure-error handling remains incomplete. |
| Coherence | Mutation runner does not yet satisfy design's infrastructure-abort rule when a test failure and process error coexist. |

This re-verification focuses on the changed harness and its evidence. Resolver
runtime/property suites were not rerun: the repair did not modify resolver or
property tests. Earlier product mappings and independent POST product probes
remain existing evidence, not new tests executed here. Fresh full product
runtime review was not repeated because the required harness blocker below
already prevents progression. No new resolver correctness finding is claimed.

## Required blocker: assertions still hide child-process errors

Read-only extraction of actual mutationScore/classifyRun and their helper
functions was evaluated without executing runner main(). All 85 aggregate
entries were hash-checked; all 67 executable outcomes were reclassified against
their saved child data. Counts agree: 67 kills, 18 compiler-invalid,
denominator67, score100%. The final run retains stdout/stderr and test reports.
No unhandled-error, EPERM or timeout marker was found in its saved child output.
This confirms that captured run's attribution; it does not validate the
runner's required behavior on future child infrastructure failures.

Boundary probes reused the actual failed assertion report from
`mutation-results-classifier-repair.json`'s first killed child, preserving its
Vitest counts/failure messages and changing only the specified process fields:

| Probe | Actual classifier result | Required result |
| --- | --- | --- |
| stderr = Test timed out in 5000ms | timeout | timeout |
| stderr = EPERM during SSR directory creation | abort | abort |
| stderr = Unexpected worker exit | abort | abort |
| status = 42 with the same valid failed-test JSON | killed | abort unexpected exit |
| existing assertion stderr followed by Unhandled Errors / Unhandled Error / Error: Child process crashed | killed | abort child infrastructure failure |
| stderr includes both EPERM and Test timed out in 5000ms | timeout | abort infrastructure failure |

The last three are synthetic deterministic boundary probes, not claims that
these errors occurred in the captured full inventory. They demonstrate the
same unresolved classification invariant. The current controls cover those
errors only without a simultaneously valid failed-test report.

Root cause: classifyRun (mutation/run.mjs:38) prioritizes timeout text before
process/infrastructure errors and treats any remaining nonzero status with
failed assertions as a kill. The installed Vitest 3.2.7 JSON reporter ignores
its onFinished `_errors` argument (dist/chunks/index.VByaPkjc.js:1765); assertion
JSON can coexist with global/unhandled worker errors. Vitest separately emits
an Unhandled Errors banner through printUnhandledErrors in
dist/chunks/cli-api.DVe0nWUx.js:5581. The classifier currently ignores that
channel unless its text matches a short infrastructure deny-list.

Required repair: capture global/unhandled errors and run-completion reason
as structured child evidence (for example a test-local Vitest reporter),
reject unexpected exit statuses, and ensure infrastructure/process failures
take precedence over test-level timeout. Add regression controls combining
valid failed assertions with worker/global failures, unexpected status and
permission-plus-timeout. Preserve real assertion kills and timeout denominator
policy. Rerun self-tests and complete inventory; then repeat formal Verify and
fresh independent POST. Do not weaken failures or modify production/plans.

## Remaining checklist / readiness

Task4.5 reopened; task5.1 remains open. Tasks5.2–5.4 remain the future
independent POST, implementation commit and archive checkpoints. All five
incomplete tasks are CRITICAL for archive readiness under the Verify skill;
the harness invariant above is one required correctness/evidence blocker.
Archive readiness NO, required blocker count1, suggestion count0.

Fresh process checks: installed machine gate PASS (HEAD/INDEX/WORKTREE,
309 changed paths, 76 V2 source/test files), strict change validation PASS,
git diff --check PASS; git status inspected. Their PASS does not resolve this
semantic blocker. BASE_COMMIT remains unchanged. Stop for Luna high
harness-only repair.
