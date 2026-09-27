# R03 formal OpenSpec timeout-diagnostic reverification

CHANGE: routing-v2-03-direction-resolver
REVIEW_TYPE: OPEN_SPEC_VERIFY
VERIFICATION_STATUS: FAIL
DATE: 2026-09-27
BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c
READY_FOR_INDEPENDENT_POST: NO
ARCHIVE_ALLOWED: NO

## Completeness

After reopening task 4.5, tasks are 21/26. Required mutation evidence is not
accepted; formal Verify task 5.1 remains open. Tasks 5.2–5.4 are sequential
independent POST, commit and archive checkpoints, not missing product features.
The previous product requirement/scenario mapping remains historical evidence;
this focused reverification does not rerun or independently approve all product
behavior. No new resolver implementation defect is claimed.

## Correctness — critical blocker

The actual classifier in
`packages/draw/tests/routing-v2/direction/mutation/run.mjs:28` recognizes only
integer or ordinary decimal timeout durations. The installed Vitest 3.2.7
`makeTimeoutError` interpolates the JavaScript number directly. Its `withTimeout`
accepts positive finite durations, including `1e-7`. That number produces
`Test timed out in 1e-7ms.`. The actual classifier returns `killed`, contrary to
the mandatory rule in design.md:86: timeouts do not count as kills.

This is a direct classifier regression, not a newly executed timed-out Vitest
suite. The probe invokes the installed diagnostic constructor and current
classifier against a cloned auditable failed child report. It does not modify
the retained records or infer that any of the latest 67 kills was a timeout.

Actual executed controls:

| Installed diagnostic | Actual | Required |
| --- | --- | --- |
| Test timed out in 5ms. | timeout | timeout |
| Test timed out in 0.5ms. | timeout | timeout |
| Test timed out in 1e-7ms. | killed | timeout |
| Test timed out in 1e+21ms. | killed | timeout |

The positive finite small-duration case establishes the blocker independently
of timer overflow concerns with the additional large-duration probe.

## Executable reproduction

Executed via a PowerShell here-string piped to `node`, exit 0:

```javascript
const fs = require('node:fs');
const root = 'openspec/changes/routing-v2-03-direction-resolver/evidence/mutation-child-results-2026-09-27T20-13-43-203Z-24432';
const runner = fs.readFileSync('packages/draw/tests/routing-v2/direction/mutation/run.mjs', 'utf8');
const source = runner.slice(runner.indexOf('const vitestTimeoutDiagnostic'), runner.indexOf('function readTestReport')).replaceAll('export function', 'function');
const { classifyRun } = new Function(source + ';return {classifyRun};')();
const vitest = fs.readFileSync('node_modules/.pnpm/@vitest+runner@3.2.7/node_modules/@vitest/runner/dist/chunk-hooks.js', 'utf8');
const timeoutSource = vitest.slice(vitest.indexOf('function makeTimeoutError('), vitest.indexOf('const fileContexts'));
const makeTimeoutError = new Function(timeoutSource + ';return makeTimeoutError;')();
const records = fs.readdirSync(root).map(name => JSON.parse(fs.readFileSync(root + '/' + name, 'utf8')));
const example = records.find(record => record.outcome === 'killed');
for (const duration of [5, 0.5, 1e-7, 1e21]) {
  const child = structuredClone(example.child);
  const message = makeTimeoutError(false, duration).message;
  child.stdout = '';
  child.stderr = message;
  const failed = child.testReport.testResults.flatMap(result => result.assertionResults).filter(result => result.status === 'failed');
  failed[0].failureMessages = [message];
  let actual;
  try { actual = classifyRun(child); } catch (error) { actual = 'ABORT: ' + error.message; }
  console.log(JSON.stringify({ duration, diagnostic: message.split('\n')[0], actual, required: 'timeout' }));
}
let counts = {}, mismatches = [];
for (const record of records) {
  counts[record.outcome] = (counts[record.outcome] || 0) + 1;
  if (record.child) {
    let actual;
    try { actual = classifyRun(record.child); } catch (error) { actual = 'ABORT: ' + error.message; }
    if (actual !== record.outcome) mismatches.push({ expected: record.outcome, actual });
  }
}
console.log(JSON.stringify({ recordCount: records.length, counts, mismatches }));
```

Record audit output: 86 records; 1 survived baseline, 67 killed, 18
compiler-invalid; no classification mismatches. These counts describe retained
results, not an accepted mutation score. The complete inventory was not rerun
during this blocked Verify.

## Coherence and root cause

FAILED_INVARIANT: Every Vitest timeout must be timeout, never killed.
RESPONSIBLE_LAYER: R03 test-local mutation harness.
ROOT_CAUSE: Text matching accepts a restricted numeric spelling; unrecognized
failed runs with assertion evidence fall through to killed.
WHY_PREVIOUS_FIXES_FAILED: Controls covered integer test durations, then hooks
and ordinary fractional durations, without covering the diagnostic producer's
complete numeric formatting domain or preventing unknown failure kinds from
being accepted as kills.
SPEC_CHANGE_REQUIRED: NO.

Stop the diagnostic-specific patch loop. Before another authorized repair,
define an exhaustive or structured failure-classification contract using actual
Vitest evidence, require negative controls for unsupported failure categories,
and preserve infrastructure-abort precedence. Do not weaken assertions, alter
resolver semantics, or accept a mutation score solely because the latest
inventory happened not to exercise this diagnostic.

## Checks actually executed

- `openspec validate routing-v2-03-direction-resolver --strict`: PASS.
- `pnpm run routing:v2:arch-gate`: PASS; HEAD/INDEX/WORKTREE checked,
  546 changed paths and 77 V2 source/test files inspected before this report.
- `git diff --check`: PASS before process-state update; CRLF conversion warnings
  only.
- `git status --short` and `git rev-parse HEAD`: inspected; HEAD remains the
  approved baseline. Existing implementation and historical evidence remain
  untracked; no commit, archive or R04 work performed.
- Actual installed Vitest timeout source inspection and classifier/record
  audit above: executed, blocker reproduced.

No full unit/property/typecheck/lint/mutation reruns were performed during this
Verify after the required correctness blocker was reproduced. No production,
test, planning, gate-script or frozen-contract files were modified. Changes in
this Verify are limited to this report, CURRENT_CHANGE.md and the task 4.5 mark.

After recording the process state, strict validation and git diff --check passed
again. The installed gate passed again with 547 changed paths, 77 V2 source/test
files, and HEAD/INDEX/WORKTREE snapshot checks. Machine PASS does not resolve the
classifier blocker.
