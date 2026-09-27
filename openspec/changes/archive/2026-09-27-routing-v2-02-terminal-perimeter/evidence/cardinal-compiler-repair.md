# R02 cardinal-edge and compiler-evidence repair

CHANGE: routing-v2-02-terminal-perimeter
BASE_COMMIT: 8f349483720247fdc2c319d8228237910a48e67c
REPAIR_TYPE: IMPLEMENTATION_AND_TEST_EVIDENCE

## Regression first and root cause

Before production changes, four new deterministic fractional-axis cases failed EAST/WEST/NORTH/SOUTH exact equality (repair-ellipse-red.txt). The prior 18 ellipse cases passed.
Cause: reconstructing an edge from an already-rounded center plus/minus radius is not the same IEEE-754 operation as representing x+width / y+height.
Classification: ALGORITHM / PERIMETER. No spec or R01 change is required.
The calculation now carries the validated RectEdges and selects the exact corresponding edge in radial cardinal branches. Membership checks, formulas, EPSILON and rejection semantics remain intact.
Targeted green result: 22/22 ellipse tests (repair-ellipse-green.txt).

## Compiler evidence

Six missing explicit @ts-expect-error cases complete all six directed mixed-space pairs for both intermediate points and opposite references.
Strict R02 tsc passes. Independent in-memory compiler-host mutations erase one argument space guard at a time; each produces seven TS2578 unused-negative directives: all six pair negatives plus its union-widening negative (repair-compiler-mutation.txt). Production files are not mutated by this proof.

## Repair paths relative to the restored implementation

- packages/draw/src/routing/perimeter/ellipse.ts
- packages/draw/tests/routing-v2/perimeter/unit/ellipse.test.ts
- packages/draw/tests/routing-v2/terminal/types/floating.type-test.ts

The other 31 restored source/test/config/documentation files are unchanged.
Frozen proposal/design/delta, gate, R01, master/playbook/legacy/AGENTS remain unchanged.

## Fresh executed behavioral checks

- R02 unit: 9 files, 114 tests PASS.
- R02 property: 4 files, 12 tests PASS; seed 0xFAD002, 5000 accepted/raw each, 0 rejected.
- R01 unit: 7 files, 85 tests PASS.
- R01 property: 1 file, 7 tests PASS.
- Both isolated strict compiler projects, full Draw typecheck, scoped ESLint: PASS.

Machine/process checks and fresh formal Verify/independent POST result are recorded separately once complete.

## Final result

REPAIR_STATUS: PASS
OPEN_SPEC_TASKS: 25/25
FORMAL_VERIFICATION: PASS
POST_IMPLEMENTATION_GATE: PASS
BLOCKERS: NONE
ARCHIVE_ALLOWED: true (separately authorized checkpoint)
NEXT_CHANGE_ALLOWED: false
Fresh independent report: post-implementation-gate-after-cardinal-repair.md.
