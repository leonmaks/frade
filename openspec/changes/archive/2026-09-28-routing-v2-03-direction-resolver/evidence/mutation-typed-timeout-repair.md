# R03 typed timeout recognition repair

CHANGE: routing-v2-03-direction-resolver
REPAIR_TYPE: TEST_HARNESS_ONLY
DATE: 2026-09-28 (Europe/Moscow)
BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c
MUTATION_TESTING: PASS
PRODUCTION_FILES_MODIFIED: NONE
READY_FOR_FORMAL_VERIFY: YES
ARCHIVE_ALLOWED: false

## Regression-first root cause

The independent POST FAIL is recorded in
post-implementation-gate-fail-embedded-timeout-type.md. The shared preflight
ran before every outcome but treated any structured error containing a timeout
marker as known, regardless of its preserved type/name. A TypeError saying
"adapter failure while handling: Test timed out in 5ms." could therefore
become a timeout. The defect is in the R03 test-local classifier, not production
or the specification. Previous controls tested unknown errors without embedded
markers and valid Vitest timeouts separately.

Before the fix, the new permanent controls failed deterministically:

```text
node packages/draw/tests/routing-v2/direction/mutation/run.mjs --self-test
exit 1
Mutation harness self-test failed: embedded-timeout unknown TypeError/TypeError at test; partial=false, spawn=false, diagnostic=false
```

The new 128-cell matrix covers four unknown type/name combinations (including
inconsistent assertion identity), four error locations, complete/partial
audits, spawn ETIMEDOUT on/off and an independent Hook diagnostic on/off.
Every cell requires an explicit unknown-error abort, not merely any exception.
Four additional controls pass a real TypeError through the actual schema-2
reporter at test/suite/module/global and verify that its serialized type/name
remain TypeError before classifier rejection. One reporter-preservation control
checks all four locations. An independent 16-cell retained-child replay now
reports 16/16 explicit unknown aborts; see
post-implementation-embedded-timeout-controls-after.json.

The classifier now accepts a structured timeout error only with type/name
both `Error` and the full message template emitted by installed Vitest
`makeTimeoutError` (Test or Hook, including its matching guidance suffix).
Duration formatting is not parsed, so integer, decimal, scientific and
subnormal producer cases remain supported. AssertionError likewise requires
both type and name; one misleading field cannot exempt an unknown error.
The exact first-frame domain-origin exception, unhandled/global/infrastructure
abort precedence, ordinary spawn timeout, denominator, operator inventory,
numeric tolerances, seeds, quotas and product semantics are unchanged.

## Fresh full mutation execution

Command: `node packages/draw/tests/routing-v2/direction/mutation/run.mjs`
Exit: 0
Inventory: 85
Killed: 67
Compiler-invalid: 18
Survivors: 0
Timeouts: 0
Executable denominator: 67
Score: 100% (required >=90%)
Unmutated unit/reference baseline: 116 passing tests

Aggregate: mutation-results-2026-09-27T22-22-04-681Z-22644.json
Child directory: mutation-child-results-2026-09-27T22-22-04-681Z-22644/
Raw output: mutation-typed-timeout-rerun-stdout.txt
Progress: mutation-typed-timeout-rerun-progress.txt

All baseline and candidate outcomes are retained. For executable children,
stdout, stderr, status, signal, process error, standard Vitest JSON, schema-2
typed audit and isolated mutant root are saved. Compiler-invalid candidates
retain diagnostics. Fresh audit checked 86 SHA-256 links, reclassified all 67
executable children, checked 18 compiler-invalid diagnostic records, recomputed
the exact AST inventory and denominator, compared raw stdout with aggregate
JSON, and matched all 85 progress outcomes. See
mutation-typed-timeout-inventory-audit.json. This audit does not claim that the
composed unknown-error counterexample occurred in a real mutant child.

## Actual commands and limits

| Check | Result |
| --- | --- |
| node mutation/run.mjs --self-test | PASS after the expected RED result before fix |
| R03 unit/reference Vitest | 8 files, 116 tests PASS |
| R03 property Vitest | 1 file, 2 tests PASS |
| Full 85-candidate mutation run and retained audit | PASS, score 100% |
| Full @frade/draw typecheck | PASS |
| Strict R03/R01/R02 compiler fixtures | PASS, all three commands |
| Scoped ESLint | PASS |
| Strict OpenSpec validation | PASS |
| Installed architecture gate | PASS, 870 changed paths and 77 V2 source/test files; HEAD/INDEX/WORKTREE checked |
| git diff --check | PASS |

All six unchanged R03 properties again used seed 0xFAD003 and each recorded
5106 raw / 5000 accepted / 106 rejected. R01/R02 runtime suites were not
rerun for this test-only repair; their historical evidence remains applicable
through unchanged hashes and frozen gate checks. No full gate self-test rerun
is claimed. Typechecks ran after the mutation probe was removed.

All 29 R01–R03 production hashes match the prior manifest. Of the prior
25-file formal source/test snapshot, only mutation/run.mjs differs. No
proposal/spec/design, approved gate, workflow, legacy/vendor, earlier-layer
or R04 file changed. Task 4.5 may close; fresh formal Verify is still required
for task 5.1. Independent POST remains FAIL until a new actual review passes.
No commit, archive or R04 work.
