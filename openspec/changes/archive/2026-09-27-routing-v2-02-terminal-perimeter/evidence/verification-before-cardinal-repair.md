# OpenSpec Verification: routing-v2-02-terminal-perimeter

BASE_COMMIT: 8f349483720247fdc2c319d8228237910a48e67c
IMPLEMENTATION_VERIFICATION: FAIL
ARCHIVE_ALLOWED: false

## Completeness

23/25 tasks checked. All product tasks and 14 ADDED requirements are implemented.
Tasks 8.3 and 8.4 remain final process obligations: obtain fresh independent POST gate, then record its actual result.
These two incomplete tasks prevent archive; they are not missing production implementation.
No task is marked complete on the basis of superseded evidence.

## Correctness

Reviewed all 65 delta scenarios against actual unit/property/compiler fixtures and pure terminal/perimeter modules.
The requirement/scenario evidence map is acceptance.md. The additional fractional-axis reproduction below found a correctness blocker; existing passing suites do not cover it.
Analytical cardinal, diagonal, corner, band, inside, center, finite/degenerate and sub-grid cases agree with the approved formulas.
Fixed points retain authority; floating resolution uses first/last adjacency and pre-floating opposite references.
Strict compiler fixtures cover model/view/screen, invariant ownership, union widening, readonly results and explicit transforms.
The historical TDD mutation evidence is retained as historical, not presented as a fresh mutation execution.

## Coherence

Production dependency direction is terminal -> perimeter -> geometry -> model with inward shortcuts.
R01, legacy, vendor, root exports and R03+ remain unchanged. No framework/display, persistence or routing policy enters R02.
Full-precision geometry, EPSILON membership, explicit numeric rejection and reference divergences follow design.

## Fresh executed evidence

- R02 unit: 9 files, 110 tests PASS (rerun-r02-unit.txt).
- R02 property: 4 files, 12 tests PASS (rerun-r02-property.txt); 5000 accepted cases each, seed 0xFAD002, raw=5000/rejected=0.
- R01 regression: 7 unit files/85 tests and 1 property file/7 tests PASS (rerun-r01-unit.txt, rerun-r01-property.txt).
- R01/R02 isolated strict compiler projects PASS (rerun-r01-compiler.txt, rerun-r02-compiler.txt).
- @frade/draw typecheck PASS (rerun-typecheck.txt).
- Scoped ESLint PASS (rerun-lint.txt).

## Process checks

- node scripts/routing-v2-architecture-gate.mjs --self-test: PASS, 339 assertions.
- pnpm run routing:v2:arch-gate: PASS after restore in IMPLEMENTATION (40 changed paths, 56 source/test files) and after formal phase transition in VERIFICATION (47 changed paths at that execution, 56 source/test files). Evidence additions may increase the path count without changing code.
- openspec validate routing-v2-02-terminal-perimeter --strict: PASS.
- openspec show routing-v2-02-terminal-perimeter --json --deltas-only: exit 0, output retained in verified-deltas.json.
- git diff --check: PASS.
- Baseline diff for frozen gate and R01 model/geometry source/tests: empty.
- git status --short: only CURRENT_CHANGE, active change tasks/evidence and the four approved R02 source/test trees.

## Assessment

Existing executed suites PASS, but the direct fractional-axis contract assertion FAILS.
Archive is blocked by the correctness defect and pending tasks 8.3/8.4.
No production or test changes were made during this verification review.

## Critical: exact ellipse cardinal edge

The approved Ellipse radial perimeter requirement states that axis-aligned rays set the cardinal boundary coordinate exactly.
A read-only execution of the actual TypeScript API (transpiled in memory through installed TypeScript, no product files changed) used bounds (0.2,0,0.1,2), toward (1,1), orthogonal=false.
Actual result: (0.3,1). R01 rectEdges(bounds).right: 0.30000000000000004.
A strict Node assertion of result.x === right failed, exit code 1.
Cause: radialProjection reconstructs the edge as centerX + halfWidth; IEEE-754 rounding differs from the represented edge x + width. EPSILON membership passes but cannot satisfy the explicit exact-edge contract.
Classification: ALGORITHM / NUMERICAL_CONTRACT. Add a deterministic failing regression before a separately authorized implementation repair; use represented edges for cardinal results without changing EPSILON or R01.
Progression STOPPED. Independent POST reviewer has received the concrete reproduction. Production and tests remain unchanged during gate.

## Critical: incomplete floating compiler matrix

Independent reviewer confirmed the strict compiler currently executes 4/6 directed mixed-space intermediate cases and 2/6 opposite-reference cases. Missing intermediate negatives: view geometry/screen point and screen geometry/model point. Missing opposite-reference negatives: model/screen, view/model, screen/model, screen/view.
Task 2.3 requires all mixed pairs; task 6.3 requires the full compiler API matrix. No type escape is established, but the executable evidence is incomplete. The earlier acceptance statement of all mixed pairs is superseded for floating resolution. Add six explicit @ts-expect-error fixtures and execute strict tsc during an authorized repair; do not weaken the contract or use transpilation as proof.
