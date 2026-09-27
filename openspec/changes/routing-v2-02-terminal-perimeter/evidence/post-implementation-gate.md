STATUS: HISTORICAL_SUPERSEDED
SUPERSEDED_BY: post-implementation-gate-after-cardinal-repair.md

# Independent POST_IMPLEMENTATION Gate

CHANGE: routing-v2-02-terminal-perimeter
GATE_TYPE: POST_IMPLEMENTATION
BASE_COMMIT: 8f349483720247fdc2c319d8228237910a48e67c
REVIEWER: fresh independent GPT-6 Sol high, read-only
GATE_STATUS: FAIL
MACHINE_GATE_INTEGRITY: PASS
ARCHIVE_ALLOWED: false
NEXT_CHANGE_ALLOWED: false

## Blockers

1. ALGORITHM / PERIMETER: exact ellipse cardinal boundary violated. ellipse.ts radialProjection reconstructs center +/- radius. Actual API bounds (0.2,0,0.1,2), toward (1,1), orthogonal=false returns x=0.3; rectEdges(bounds).right=0.30000000000000004. Delta requires exact cardinal coordinates. EPSILON membership does not satisfy exactness.
2. TEST / MISSING_EVIDENCE: floating.type-test.ts has 4/6 intermediate and 2/6 opposite-reference directed mixed-space negatives. Missing intermediate cases: view/screen, screen/model. Missing opposite: model/screen, view/model, screen/model, screen/view. No type escape established; required full executable matrix is incomplete.

## Independently executed checks

- R02 unit: 110/110 tests, 9 files PASS.
- R02 property: 12/12 tests, 4 files PASS; seed 0xFAD002; raw/accepted=5000 each, rejected=0.
- R01 regression: 92/92 tests, 85 unit plus 7 property PASS.
- R01/R02 isolated strict compilers: exit 0.
- Full @frade/draw typecheck and scoped ESLint: exit 0.
- OpenSpec strict validation: valid, exit 0.
- Gate self-tests: 339 assertions PASS.
- Installed gate: PASS; 51 changed paths and 56 source/test files at execution.
- Actual API reproduction: exactEast=false.
- Git status, baseline protected-path diff and diff --check reviewed; protected diff empty, whitespace exit 0.

## Architecture and machine integrity

Terminal -> perimeter -> geometry -> model is preserved. No R01/legacy/vendor/root exports/R03+/frozen-control modifications.
Changed discovery independently unions baseline-to-HEAD, staged, unstaged, untracked. HEAD/INDEX/WORKTREE source snapshots, frozen approved controls, cycles, symlinks and unmerged entries are checked. Adversarial fixtures were inspected and rerun.
Conditioned generated properties do not promise arbitrary finite-input exactness. The fractional cardinal regression is absent.
Reference divergences remain approved/documented; full differential harness is deferred to R09.
No additional non-blocking warnings. Historical evidence did not establish current approval.

## Decision

STOP progression. Resolve both blockers in an explicit repair phase, add failing regressions first, rerun verification and obtain a fresh independent POST gate.
Tasks 8.3/8.4 remain unchecked. No archive or R03 work started. Reviewer modified no repository files.
