# R03 Vitest timeout diagnostic classification repair

CHANGE: routing-v2-03-direction-resolver
REPAIR_TYPE: TEST_HARNESS_AND_REGRESSION_CONTROLS
PRODUCTION_FILES_MODIFIED: NONE
FORMAL_VERIFY_STATUS: PENDING_REVERIFY

The independent POST review reproduced two additional valid Vitest timeout
diagnostics which the integer-only matcher missed:

- `Hook timed out in 5ms.`
- `Test timed out in 0.5ms.`

The classifier now recognizes Test and Hook timeout diagnostics with integer or
fractional durations, plus the older `Exceeded timeout` wording. It classifies
such a run as `timeout` only when the process exits with status 1, the
structured Vitest run audit is valid and says `failed`, the JSON test report is
valid, and at least one assertion failed. The diagnostic can appear in Vitest
output rather than `assertionResults.failureMessages`, as happened in an
actual retained child result. A timeout diagnostic without a failed Vitest run
aborts classification. Timeouts remain in the executable denominator and do
not count as kills.

## Regression controls and execution

- `node --check packages/draw/tests/routing-v2/direction/mutation/run.mjs`:
  PASS.
- Scoped ESLint for `run.mjs` and `unit/mutation-runner.test.ts`: PASS.
- `node packages/draw/tests/routing-v2/direction/mutation/run.mjs --self-test`:
  PASS. Explicit controls classify both reproduced diagnostic strings as
  timeout and reject a timeout string without failed assertions. Existing
  spawn-timeout, integer test-timeout, infrastructure precedence, reporter,
  import-redirection, killed and surviving controls remain enabled.
- Complete
  `node packages/draw/tests/routing-v2/direction/mutation/run.mjs`: exit 0.
  Baseline: 116/116 unit/reference tests passed.
- Inventory: 85 candidates; 67 killed, 18 compiler-invalid, 0 survived,
  0 timed out; denominator 67; score 100% (required >=90%).

## Auditable child results

Every child record from the complete run is retained under
`mutation-child-results-2026-09-27T20-13-43-203Z-24432/`: one baseline plus
85 candidates. An independent read-only audit confirmed 86 JSON records,
67/67 killed records with status 1, `runAudit.reason=failed`, zero unhandled
errors, at least one failed assertion and no timeout diagnostic; all 18
compiler-invalid records carry compiler diagnostics. The baseline reports
status 0, 116 passed, zero failed and `runAudit.reason=passed`. Each executable
record retains full child stdout/stderr, Vitest assertion JSON and structured
run audit.

After recording the repair state, process checks passed:

- `openspec validate routing-v2-03-direction-resolver --strict`: PASS.
- `pnpm run routing:v2:arch-gate`: PASS; HEAD/INDEX/WORKTREE checked,
  546 changed paths and 77 V2 source/test files checked.
- `git diff --check`: PASS.
- `git status --short`: inspected; production changes remain the pre-existing
  R03 implementation, while this repair changed only the mutation runner,
  its regression test and process evidence.

An earlier attempt in this repair aborted at candidate 57 because an actual
Vitest test timeout was present in child output but absent from assertion
failure messages. It produced no aggregate score and is retained separately
under `mutation-child-results-2026-09-27T20-06-32-040Z-31184/`. The repaired
complete run then classified the same candidate as killed based on its failed
assertions while finding no timeout diagnostic in that child's output.

The independent POST report remains FAIL until fresh formal Sol high Verify
and a new independent POST review complete. BASE_COMMIT is unchanged. No
commit, archive or R04 work is authorized by this repair evidence.
