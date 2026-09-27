# R03 mutation harness classifier repair

REPAIR_TYPE: TEST_HARNESS_AND_REGRESSION_CONTROLS
PRODUCTION_FILES_MODIFIED: NONE
VERIFICATION_STATUS: PENDING_REVERIFY

`classifyRun` now accepts a kill only when the nonzero Vitest child exit has a
valid JSON report whose failed-test count matches actual failed assertions,
each failed assertion contains a failure message, and no failed suite lacks
a failed assertion. A successful exit also needs a consistent successful
report. Unknown nonzero exits, malformed/missing reports, worker exits,
permission failures and setup/config errors abort the mutation run. Process
timeouts and explicit Vitest test timeout messages are recorded as `timeout`,
never as kills; they remain in the score denominator as required by the
approved design.

The runner emits an auditable JSON file for the passing baseline and each of
the 85 candidates. Each executable child record includes exit status, signal,
spawn error, complete stdout/stderr and Vitest JSON assertions/failures. Every
record and the baseline is SHA-256 linked from the aggregate report. The 18
compiler-invalid candidates retain their diagnostics and also have hashed
records. The report points to the complete child-results directory.

## Regression controls and executed result

- `node packages/draw/tests/routing-v2/direction/mutation/run.mjs --self-test`:
  PASS. Controls cover a reported assertion kill, valid survival, spawn and
  Vitest timeouts, SSR EPERM, unexpected worker exit, failed worker startup,
  missing-report/unrecognized failure, infrastructure abort, denominator,
  import redirection, and real killed/surviving Vitest probe runs.
- Full command:
  `node packages/draw/tests/routing-v2/direction/mutation/run.mjs` — exit 0.
- Baseline: 116 unit/reference tests passed before mutation execution.
- Complete inventory: 85 candidates; 67 killed, 18 compiler-invalid, 0
  survived, 0 timeouts; executable denominator 67; score 100% (required >=90%).
- Aggregate and raw captured run:
  `mutation-results-classifier-repair.json` and
  `mutation-progress-classifier-repair.txt`.
- All 86 child records (baseline plus 85 mutants) were independently parsed;
  all SHA-256 values, candidate outcomes, Vitest reports and compiler
  diagnostics were verified. Every executable child report showed tests were
  actually collected and its failed assertion count agreed with the Vitest
  JSON summary.

The first full attempt after the initial classifier change aborted on an
incorrect assumption that Vitest's `numFailedTestSuites` equals failed file
count. The child audit captured the mismatch and assertion output. The check
was corrected to validate actual assertion counts and reject suite-only
failures, then self-tests and the entire inventory were rerun. The aborted
attempt produced no accepted mutation score and was not included in the final
result.

Formal Verify and a fresh independent POST review remain required. Do not use
the earlier PASS reports as current approval evidence until those reviews
rerun against this repair.
