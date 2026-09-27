# R03 spawn-timeout precedence repair

CHANGE: routing-v2-03-direction-resolver
REPAIR_TYPE: TEST_HARNESS_ONLY
DATE: 2026-09-28 (Europe/Moscow)
BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c
MUTATION_TESTING: PASS
PRODUCTION_FILES_MODIFIED: NONE
READY_FOR_FORMAL_VERIFY: YES
ARCHIVE_ALLOWED: false

## Root cause and regression-first evidence

The independent POST FAIL is retained in
post-implementation-gate-fail-spawn-precedence.md. Fatal evidence validation
was split between branches; the spawn ETIMEDOUT return bypassed unknown
test/suite/module errors. Earlier controls tested spawn timeouts and unknown
errors separately, missing their composition. Failure class: TEST /
ABSTRACTION_BOUNDARY. No specification or production change is necessary.

Before the classifier fix, new self-test controls failed deterministically:

```text
node packages/draw/tests/routing-v2/direction/mutation/run.mjs --self-test
exit 1
Mutation harness self-test failed: unknown test error aborts: diagnostic=false, spawnTimeout=true
```

Only mutation/run.mjs changed among the 25 source/test paths in the previous
formal Verify snapshot. The fix moves assertKnownFailureKinds into the common
fatal-evidence preflight, after global/infrastructure checks and before any
outcome return. Redundant later calls were removed. This checks available
structured evidence without requiring completed reporters for ordinary spawn
timeouts. Typed assertion, timeout and precisely origin-bound membership-guard
contracts are unchanged. No tolerances, production semantics, quotas, AST
operator inventory, denominator rules or approval criteria changed.

23 new deterministic self-test controls cover all four unknown-error locations
with/without timeout diagnostics and with/without spawn ETIMEDOUT (16), ordinary
spawn timeout with partial/completed known-only audits (3), and unknown errors
in partial audits (4). Existing absent-report spawn timeout, numeric Vitest
timeout producers, live test/hook timeouts, assertion/domain-origin controls
and infrastructure/global checks remain executable.

Fresh self-test exited 0: R03_MUTATION_HARNESS_SELF_TEST: PASS. A separate
read-only 20-control replay over retained real child evidence also passed,
including infrastructure errors combined with spawn timeout. Actual results:
mutation-spawn-precedence-controls-after.json. These are composed controls,
not a claim that unknown failures occurred in the full inventory. A first
read-only audit script selected the first module rather than a failed-test
module and stopped with TypeError; correcting that selector produced the
20-control result. It did not change any repository implementation or test.

## Complete fresh execution

Command: node packages/draw/tests/routing-v2/direction/mutation/run.mjs
Exit: 0
Inventory: 85
Killed: 67
Compiler-invalid: 18
Survivors: 0
Timeouts: 0
Executable denominator: 67
Score: 100% (required >=90%)
Unmutated baseline: 116/116 passing tests

Aggregate: mutation-results-2026-09-27T21-42-21-542Z-8556.json
Child directory: mutation-child-results-2026-09-27T21-42-21-542Z-8556/
Console: mutation-spawn-precedence-rerun-stdout.txt
Progress: mutation-spawn-precedence-rerun-progress.txt

All baseline/executable child stdout, stderr, status, signal, process error,
standard Vitest JSON, schema-2 typed run audit and runner-bound isolated root
are retained. Compiler-invalid candidates retain diagnostics. Fresh audit
checked all 86 SHA-256 links, all 67 executable reclassifications, all 18
retained compiler diagnostic sets and exact current AST inventory membership.
See mutation-spawn-precedence-inventory-audit.json. The independent POST
review must assess this evidence rather than infer correctness from score.

## Other actual checks

| Command/check | Result |
| --- | --- |
| node --check mutation/run.mjs | PASS |
| node mutation/run.mjs --self-test | PASS |
| R03 direction-local Vitest unit/reference suite | 8 files, 116 tests PASS |
| R03 direction-local Vitest property suite | 1 file, 2 tests PASS |
| Full @frade/draw typecheck | PASS |
| Strict R03/R01/R02 compiler fixtures | PASS, all three commands exit 0 |
| Scoped ESLint for R03 production/test trees | PASS |
| openspec validate routing-v2-03-direction-resolver --strict | PASS |
| pnpm run routing:v2:arch-gate | PASS; 773 changed paths, 77 V2 source/test files, HEAD/INDEX/WORKTREE checked |
| git diff --check | PASS |

Every one of the six properties retained seed 0xFAD003: raw 5106, accepted
5000, rejected 106. No property test or generation domain changed.
Typechecks ran after the full inventory and temporary probe cleanup, not
concurrently with the probe. R01/R02 runtime suites and gate self-tests were
not repeated in this harness-only repair; their historical evidence and
unchanged dependencies remain subject to the frozen architecture gate.

All 29 production hashes match mutation-structured-error-production-before.json.
The previous 25-file formal snapshot differs only at mutation/run.mjs.
Proposal, delta, design, frozen controls, legacy, vendor and R04 remain unchanged.
Task 4.5 may close; task 5.1 requires fresh formal Verify. Independent POST
remains FAIL until a fresh actual review passes. No commit, archive or R04 work.

## Final handoff

IMPLEMENTED: common fatal-evidence preflight before spawn timeout/outcome returns
FILES_CHANGED: mutation/run.mjs; CURRENT_CHANGE.md; task 4.5/5.1 checkboxes;
active change evidence and POST prompt only
INVARIANTS_AFFECTED: unknown/global/infrastructure abort precedence; timeout is not kill
TESTS_ADDED: 23 permanent composition/partial-audit self-test controls
COMMANDS_EXECUTED: self-test, full inventory, R03 unit/property suites,
R01/R02/R03 compiler fixtures, Draw typecheck, scoped lint, strict validation,
installed gate, diff/status checks and read-only retained-evidence audits
TEST_RESULTS: PASS; required RED reproduction recorded above
KNOWN_BLOCKERS: independent POST still required; no unresolved implementation/evidence defect
READY_FOR_VERIFY: YES (fresh formal Verify now completed with PASS)
READY_FOR_POST_GATE: YES

Fresh formal report: openspec-spawn-precedence-verification.md. Task 5.1 is
complete; progress 23/26. Production/tests are frozen. Switch to Astra high in
a fresh read-only context and use post-implementation-gate-prompt.md.
ARCHIVE_ALLOWED and NEXT_CHANGE_ALLOWED remain false; no commit or R04 work.
