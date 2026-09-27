# Independent POST review received from the user

CHANGE: routing-v2-03-direction-resolver
GATE_TYPE: POST_IMPLEMENTATION
GATE_STATUS: FAIL
ARCHIVE_ALLOWED: NO
CLASSIFICATION: TEST — mutation harness evidence integrity

The user supplied the independent read-only review on 2026-09-27.
One required blocker: mutation/run.mjs classifyRun treats unrecognized
nonzero exits as killed. Reviewer reproduction classified Vitest test timeout
5000ms, SSR-directory EPERM before collection, and unexpected worker exit as
kills. Timeout must not count as a kill; infrastructure failure must abort.
The saved mutation report omits child output needed to exclude false kills.

Required repair: strengthen classifier/regression controls, retain auditable
child results, rerun the complete inventory, then repeat formal Verify and
fresh independent POST. No repair occurred during independent review.

The review found no resolver correctness blocker. It independently executed
100000 contract probes; reproduced the pinned 900 reference pairs and 9 direct
cases; confirmed seed0xFAD003 raw5106/accepted5000/rejected106 and zero domain
violations; checked compiler negatives, overflow rejection and immutable
evidence. Complete recorded tests were R03 118, R01 92, R02 126 PASS.
Fresh compiler fixtures, Draw typecheck and scoped lint passed.

Independent AST inventory matched 85 candidates; compilation reproduced all
18 invalid candidates and diagnostics. Raw/JSON matched the reported 67 kills
and score100%, but classifier defects prevent accepting that score.

Scope union: baseline-to-HEAD0, staged0, unstaged2, untracked42, total44
authorized paths. HEAD/baseline ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c.
Dependency direction, all14 planning fingerprints, frozen Git snapshots,
legacy isolation and R03/R04 boundary passed. Installed gate/strict validation/
diff checks passed; frozen self-tests recorded451 assertions, plus38 additional
read-only probes passed. Machine PASS does not resolve mutation integrity.

Environment: reviewer Vitest stopped before collection because read-only
sandbox denied SSR temporary-directory creation. This was an environment
failure, not a resolver failure; full mutation/filesystem self-tests not rerun.

## Executor acknowledgement and fresh reproduction

Read-only extraction of the actual classifyRun function, evaluated without
running main(), reproduced all three false kills:

| Synthetic child stderr, status1 | Actual outcome | Required handling |
| --- | --- | --- |
| Error: Test timed out in 5000ms | killed | timeout |
| Error: EPERM: operation not permitted, mkdir SSR directory; no tests executed | killed | abort infrastructure failure |
| Error: Unexpected worker exit | killed | abort infrastructure failure |

Tasks4.5/5.1 reopened without wording changes. Previous mutation and Verify
PASS evidence is superseded for progression, retained historically. Production,
tests, plans, frozen controls and BASE_COMMIT unchanged during acknowledgement.
Stop for Luna high harness-only repair; Sol high Verify and fresh Astra high
POST must follow. No commit/archive/R04 permitted.
