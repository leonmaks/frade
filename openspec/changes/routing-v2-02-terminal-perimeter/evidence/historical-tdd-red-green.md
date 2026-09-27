STATUS: HISTORICAL_SUPERSEDED
SOURCE_STASH: 150af0254bd68cdb9f8c6d93f5b29d5d039b7215

Retained for historical traceability/TDD evidence. Old PASS, baseline and
archive claims do not authorize the current transition or complete tasks 8.3/8.4.

# R02 TDD red/green evidence

## Task 2.1 — terminal semantic contracts

Command:

```text
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/terminal/vitest.config.ts tests/routing-v2/terminal/unit
```

Observed before implementation: **FAIL**. `contracts.test.ts` could not resolve
`../../../../src/routing/terminal`; the independent discovery test passed (1 test). This is the
expected missing-production-boundary failure before task 2.2.

After task 2.2: **PASS**, 2 files and 16 tests. The affected package typecheck and isolated R02
compiler project also passed after resolving one exhaustive-switch diagnostic and making the
discovery fixture valid under both package-wide and isolated compiler projects.

## Tasks 2.3–2.4 — terminal coordinate-space contracts

The isolated strict compiler project passed with model/view/screen positives, generic callers,
readonly negatives, all cross-space assignment directions, and union-widening negatives. A mutation
run replaced the invariant terminal phantom with an erased `never` marker; the same compiler command
failed with five unused `@ts-expect-error` diagnostics (TS2578). Restoring the invariant phantom
returned the command to PASS. No forbidden suppression or coordinate-space-erasing cast was found.

## Task 3.1 — perimeter validation/membership support

The combined R02 unit command ran the generated-support tests successfully but produced the expected
red state for all 12 new perimeter validation tests because validation/membership exports did not yet
exist. Overall pre-implementation result: 1 failed/3 passed files, 12 failed/20 passed tests.

After task 3.2: **PASS**, 4 files and 32 tests. Exact residual-boundary evidence is asserted directly
at `EPSILON`; analytical point fixtures remain independently below/above the threshold so binary
rounding in `sqrt(1 + EPSILON)` does not widen the tolerance.

## Task 4.1 — rectangle projection

Before rectangle implementation, the combined unit suite produced the expected 23 failures in the
new analytical/rejection table while the prior 32 tests remained green. All four seeded rectangle
properties failed immediately with seed `0xFAD002`, replay path `0`, and concrete counterexamples.
After correcting the compiler include path to truly cover the perimeter tree, strict tsc also failed
on the missing `rectanglePerimeter` export and unused negative-case directives.

After task 4.2: **PASS**, 5 unit files/55 tests; 4 property tests with 5000 accepted cases each and
seed `0xFAD002`; strict R02 compiler fixtures PASS. Rectangle properties reported zero rejected cases
for the conditioned generated domain.

## Task 5.1 — ellipse projection and shape dispatch

Before implementation, the 18 new ellipse/dispatch unit cases failed on the missing APIs while all
55 prior unit tests passed. Each of four new ellipse properties reported seed `0xFAD002`, path `0`,
counts, and a concrete counterexample; the four rectangle properties remained green. Strict tsc
failed on the missing ellipse/dispatch exports and unused negative-case directives.

After task 5.2: **PASS**, 6 unit files/73 tests; 8 property tests (rectangle plus ellipse), each with
5000 accepted cases and seed `0xFAD002`; strict R02 compiler fixtures PASS. The initially incorrect
sub-unit analytical X expectation was classified as TEST and corrected from the normalized-radii
derivation without changing production code or tolerance.

## Task 6.1 — fixed terminal resolution

Before implementation, all 8 new fixed-resolution unit tests failed on the missing API while the
prior 73 unit tests passed. The seeded fixed target-independence property failed at path `0` with a
concrete counterexample while all eight perimeter properties stayed green. Strict tsc failed on the
missing resolver export and unused mixed-space directives.

After task 6.2: **PASS**, 7 unit files/81 tests; 9 properties including 5000 accepted fixed
target-independence cases; strict R02 compiler fixtures PASS.

## Task 6.3 — floating terminal resolution

Before implementation, all 8 new floating-resolution unit tests failed on the missing API while the
prior 81 unit tests passed. The three declared floating properties each failed at seed `0xFAD002`,
path `0`, with concrete counterexamples while all previous properties stayed green. Strict tsc failed
on the missing resolver export and unused mixed-space directives.

After task 6.4: **PASS**, 8 unit files/89 tests; 12 properties, each with 5000 accepted cases and seed
`0xFAD002`; strict R02 compiler fixtures PASS.

## Task 7.1 — property audit

The complete property command executed 12 declared properties. Every report used seed `0xFAD002`
(`16437250`) and recorded `raw=5000`, `accepted=5000`, `rejected=0`: rectangle membership,
rectangle/ellipse safe translation, rectangle/ellipse determinism, rectangle/ellipse non-mutation,
ellipse equation, fixed target independence, floating source/target reversal, floating safe
translation, and floating determinism/non-mutation. No implementation-time property counterexample
was reproduced; therefore no new deterministic regression fixture was required.

## Task 7.2 — dependency and compiler integration

The test-local fixture executed the frozen gate's exported `inspectSource` checker: 5 inward-import
cases passed and 15 reverse/framework/browser/legacy/vendor/root/higher-layer cases were rejected.
The complete isolated strict compiler matrix passed with generic callers, all cross-space pairs,
union-widening and result-space negatives, readonly fields, and an explicit R01 model-to-view
transform positive.

## Task 7.3 — complete R02 behavioral suites

Complete result before the final cancellation fixture: 9 unit files/109 tests PASS and 4 property files/12 properties PASS. The integrity
scan found no skipped/focused tests, snapshots, `@ts-ignore`, `@ts-nocheck`, TODOs, or placeholders
in R02 production/tests. All accepted generated domains completed without accidental rejection.

## Task 7.4 — frozen architecture boundary

The installed self-test passed 153 assertions. The unchanged architecture gate checked 37 changed
files and 56 V2 source/test files and returned `GATE_STATUS: PASS`. `git status --short` showed only
the authorized CURRENT_CHANGE phase transition, change-local tasks/evidence, and the four R02
source/test trees. The tracked baseline diff contained only CURRENT_CHANGE and tasks; there were no
R01, legacy, vendor, package-root, or frozen-gate edits.
