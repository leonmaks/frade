# R03 structured failure classification repair

CHANGE: routing-v2-03-direction-resolver
REPAIR_TYPE: TEST_HARNESS_ONLY
REPAIR_STATUS: COMPLETE
READY_FOR_VERIFY: YES
BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c

## Root cause and classification contract

The prior classifier treated any failed test with nonempty failureMessages as
a kill after applying a numeric-format-dependent timeout regex. This allowed
unrecognized failure kinds, including scientific-notation timeout diagnostics,
to fall through to killed. This repair follows the root-cause analysis in
openspec-timeout-diagnostic-reverification.md rather than adding another numeric
format alternative.

The reporter now records schemaVersion 2, including module/suite errors and
every test's ID, state, typed error message and stack, using installed Vitest
3.2.7's errors(), children.allSuites(), children.allTests() and result() APIs.
Original stdout/stderr and the standard Vitest JSON report are still retained.

- Infrastructure/global errors retain abort precedence, including beside
  assertions and timeout text.
- Spawn ETIMEDOUT is timeout; unexpected process errors/signals/status abort.
- Vitest Test/Hook timed-out and Exceeded-timeout markers do not parse the
  duration. They require failed-run evidence and classify timeout, never kill.
- Missing or malformed schema 2 evidence aborts. Unknown structured failure
  kinds abort, including alongside assertions or timeouts. The one supported
  resolver membership-guard exception additionally requires the trusted
  isolated source-root binding and matching first-frame origin described below.
- Killed requires a valid completed failed run with matching JSON/audit test
  counts, terminal passed/failed test states, actual structured AssertionError
  or supported bound domain-guard evidence for each failed test, and no
  module/suite-only failures. Generic
  runtime errors are conservatively rejected as harness evidence; this does
  not weaken product tests or relabel them equivalent.
- Survived requires consistent successful JSON and structured run evidence.
- Timeout remains in the score denominator and never increases killed count.

Full runs now save their aggregate JSON automatically alongside the retained
per-child results, including the complete inventory and SHA-256 links. No
candidate or operator was removed or changed.

## Regression-first evidence

Added direct scientific test/hook diagnostics to the existing self-test before
repair. Actual command `node packages/draw/tests/routing-v2/direction/mutation/run.mjs --self-test`
failed with exit 1:

```text
Mutation harness self-test failed: Vitest timeout diagnostic is never a kill: Test timed out in 1e-7ms.
```

Controls now invoke the actual installed makeTimeoutError producer for both
test and hook at Number.MIN_VALUE, 1e-7, 0.5, 5, 1e21 and Number.MAX_VALUE,
classifying structured messages without stdout/stderr. Unknown runtime errors,
deceptive assertion text, missing typed errors, malformed details, duplicate
test IDs and module-only failures abort. Existing infrastructure and score
controls remain.

Actual Vitest subprocess controls cover a 1e-7ms test timeout, 0.5ms beforeEach
timeout, 5ms beforeAll timeout, typed assertion kill, passing survivor, and
generic thrown runtime error. Timeout controls also reclassify with console
output removed and standard failureMessages replaced by STACK_TRACE_ERROR,
proving the typed reporter preserves timeout messages independently.

## Checks so far

- Node syntax checks: PASS for runner and reporter.
- Harness self-test: PASS, including actual test/hook/suite-hook subprocesses.
- R03 unit/reference: 8 files, 116 tests PASS (including 900 reference cases).
- R03 property: 1 file, 2 tests PASS; all six properties raw 5106, accepted
  5000, rejected 106, seed 0xFAD003.
- Scoped R03 ESLint: PASS.
- Strict change validation: PASS.
- Installed IMPLEMENTATION gate: PASS; HEAD/INDEX/WORKTREE checked, 567 changed
  paths and 78 V2 source/test files including the then-active temporary probe.
- R01–R03 production SHA-256 snapshot comparison: identical before/after repair.
- Parallel Draw typecheck: FAIL because the self-test's temporary import-
  redirection probe was present during tsc. TS2305 reported probe-only choose
  and mutantLoaded exports absent in the real module. This is a concurrent
  validation collision, not a product type defect. Repeat typecheck sequentially
  after the complete mutation run has cleaned up its probe; do not suppress or
  change compiler assertions.

The first restricted self-test launch aborted with EPERM when creating its
temporary probe. The authorized escalated rerun passed. That environment
failure was not counted as a mutation kill.

Only the final completed inventory below is acceptance evidence; intermediate
counts are not archive permission. Production, R01/R02 dependencies, frozen contracts, planning
wording and the architecture-gate script remain unchanged by this repair.

## First complete-inventory attempt and domain-origin correction

The first attempt exited 1 at candidate 36. It retains a passing baseline,
29 killed, 6 compiler-invalid and one aborted child at
mutation-child-results-2026-09-27T20-42-26-763Z-26020/036-preferences.ts-2415.json.
No score was produced. The child contained a real domain invariant exception:
`resolveDirections: selected direction must belong to its mask`, with the first
stack frame in the isolated resolver's evidence function. There was no
infrastructure error. The assertion-only rule was overly conservative and
correctly stopped instead of silently accepting an unknown failure.

Root cause of that stop: the known membership guard in production throws Error,
not AssertionError. That is a meaningful mutant rejection, distinct from a
generic runtime/worker failure. A new deterministic regression failed before
the correction. The supported domain failure is now narrowly bound to its exact
message/type and FIRST stack frame `evidence` in the actual isolated
`resolve.ts`. The source root is supplied by the runner's own import-redirection
environment and retained in child audit metadata. An absent/different root, a
matching later frame behind a worker origin, unknown messages or infrastructure
errors still abort. No other generic runtime errors become kills.

The final self-test passed, including a real Vitest invocation of an isolated
domain guard and a negative control removing the trusted source-root binding.
Syntax checks and mutation-scoped ESLint passed again. Draw typecheck was
repeated sequentially after probe cleanup and passed. The full inventory is
restarted from candidate 1 with separate rerun stdout/progress logs; the
aborted attempt and its logs are preserved.

## Final complete inventory and audit

The rerun completed with exit 0. Aggregate:
`mutation-results-2026-09-27T20-51-08-572Z-27144.json`.
Child results:
`mutation-child-results-2026-09-27T20-51-08-572Z-27144/`.
Raw console evidence:
`mutation-structured-errors-rerun-stdout.txt` and
`mutation-structured-errors-rerun-progress.txt`.

Inventory 85: cardinal-opposite 20, comparison-operator 44, logical-operator 19,
boolean-negation 2. Killed 67; compiler-invalid 18; survived 0; timeouts 0.
Executable denominator 67; score 100%. Passing baseline: 116/116 unit/reference
tests. No candidate was omitted; the current production AST enumeration matches
every saved location/edit/category in the aggregate.

Read-only audit checked all 86 baseline/candidate SHA-256 links, reclassified
all 67 executable mutant child records with the actual final classifier, checked
the baseline survived result, and confirmed diagnostics for all 18 invalid
candidates. No mismatches. All 29 R01–R03 production file hashes equal the
before-repair snapshot. No temporary mutation probe remains. Results are saved
in `mutation-structured-error-audit.json`; the original hashes are retained in
`mutation-structured-error-production-before.json`.

Final sequential @frade/draw typecheck: PASS. Final full scoped R03 ESLint:
PASS. Strict OpenSpec validation and git diff --check: PASS. The final baseline
unit suite includes the expanded actual regression controls; the earlier
property run remains valid because property tests and production were unchanged.
R01/R02 suites were not rerun in this repair; their production dependencies were
hash-checked unchanged and historical regression evidence is preserved.

The first audit command validated inventory, hashes, classifications and
production contents but hit sandbox EPERM while writing its summary. It was
repeated read-only with exit 0; its actual JSON output was saved with apply_patch.
No failed write or incomplete inventory is counted as a pass.

Changed test files: mutation/run.mjs and mutation/audit-reporter.mjs only.
Process changes: CURRENT_CHANGE.md, the task 4.5 completion mark, this repair
report, audit/snapshot JSON, retained child/aggregate JSON and console logs.
Production files modified: NONE. Planning/spec wording, gate, R01/R02 tests,
legacy/vendor and R04+ files modified by this repair: NONE.

Task 4.5 is complete, 22/26 tasks total. PHASE is VERIFICATION with
PENDING_REVERIFY; task 5.1 stays open. POST_IMPLEMENTATION_GATE remains FAIL,
ARCHIVE_ALLOWED remains false and NEXT_CHANGE_ALLOWED remains false. A fresh
formal Sol high Verify is required before a fresh independent Astra high POST;
this repair does not declare either review passed.

Final post-transition process check: installed VERIFICATION gate PASS,
HEAD/INDEX/WORKTREE checked, 678 changed paths and 77 V2 source/test files.
Strict validation and diff check passed after the state/task changes. Git
status was inspected; existing implementation/historical evidence is preserved,
HEAD and BASE_COMMIT remain ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c.
OpenSpec apply progress independently reports 22 complete / 26 total / 4 remaining.

## Commands executed

```powershell
node --check packages/draw/tests/routing-v2/direction/mutation/run.mjs
node --check packages/draw/tests/routing-v2/direction/mutation/audit-reporter.mjs
node packages/draw/tests/routing-v2/direction/mutation/run.mjs --self-test
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/direction/vitest.config.ts tests/routing-v2/direction/unit
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/direction/vitest.config.ts tests/routing-v2/direction/property
node packages/draw/tests/routing-v2/direction/mutation/run.mjs 1> openspec/changes/routing-v2-03-direction-resolver/evidence/mutation-structured-errors-rerun-stdout.txt 2> openspec/changes/routing-v2-03-direction-resolver/evidence/mutation-structured-errors-rerun-progress.txt
pnpm --filter @frade/draw typecheck
pnpm exec eslint packages/draw/src/routing/orthogonal/direction packages/draw/tests/routing-v2/direction
openspec validate routing-v2-03-direction-resolver --strict
pnpm run routing:v2:arch-gate
git diff --check
git status --short
git rev-parse HEAD
openspec instructions apply --change routing-v2-03-direction-resolver --json
```

The read-only Node inventory/hash/reclassification/production comparison was
also executed; its actual output is the linked audit JSON. Earlier failed
commands and the aborted first inventory are explicitly retained above.
