# R03 structured mutation-runner repair

REPAIR_TYPE: TEST_HARNESS_AND_REGRESSION_CONTROLS
PRODUCTION_FILES_MODIFIED: NONE
FORMAL_VERIFY_STATUS: PENDING_REVERIFY

The prior classifier accepted test-level assertion failures as kills even when
the child also had a global Vitest error, and it checked timeout text before
infrastructure errors. The repair adds `mutation/audit-reporter.mjs`, which
uses Vitest's `onTestRunEnd(testModules, unhandledErrors, reason)` hook. Each
child result now records the run-completion reason, every module's state and
`ok()` value, and serialized global/unhandled errors alongside the existing
Vitest JSON assertions and full stdout/stderr.

The classifier fails closed on missing or malformed structured run evidence,
unhandled errors, worker/setup/permission errors, unexpected process status,
interrupted runs and suite-only failures. Infrastructure checks run before
timeout classification. Spawn timeouts remain `timeout`; Vitest test timeouts
count as `timeout` only when the child exit is expected and the structured
report confirms a failed assertion with Vitest's timeout diagnostic. Timeout
remains in the executable denominator and never counts as killed.

## Executed controls and complete inventory

- `node packages/draw/tests/routing-v2/direction/mutation/run.mjs --self-test`:
  PASS. Controls cover assertion kill, survival, spawn timeout, test timeout,
  SSR EPERM, worker exit/start failure, unhandled errors combined with failed
  assertions, EPERM plus timeout, unexpected exit status, missing report,
  score denominator, reporter serialization, import redirection and actual
  Vitest killed/surviving probes with their structured run audits.
- `node --check` on `run.mjs` and `audit-reporter.mjs`: PASS.
- Scoped ESLint on the runner, reporter and runner test: PASS.
- Complete `node packages/draw/tests/routing-v2/direction/mutation/run.mjs`:
  exit 0. Baseline: 116 unit/reference tests passed.
- Inventory: 85 candidates; 67 killed, 18 compiler-invalid, 0 survived,
  0 timeouts; denominator67; score100% (required >=90%).
- Final aggregate/raw output: `mutation-results-structured-reporter.json` and
  `mutation-progress-structured-reporter.txt`.
- Baseline plus 85 candidate records are in the directory named by
  `childResultsDirectory` in the aggregate. All 86 file hashes were verified.
  Each of the 67 executable records has child exit/signal/error, full
  stdout/stderr, Vitest assertion JSON and structured run audit. All captured
  runs reported zero unhandled errors; every kill has failed-assertion
  evidence. The 18 compile-invalid records retain compiler diagnostics.

Fresh regression controls reject all three prior blocker cases, including
mixed failures. They also reject an unhandled-error audit combined with valid
failed assertions, a worker/global error string beside such assertions,
unexpected child status42, and EPERM combined with a timeout string. The
captured full run and every child report are independently hash-linked; no
resolver production source was changed.

Strict OpenSpec validation, installed architecture gate and `git diff --check`
passed after process-state update. Formal Sol high Verify and a fresh
independent Astra high POST review remain required; the previous POST FAIL
continues to block commit/archive progression.
