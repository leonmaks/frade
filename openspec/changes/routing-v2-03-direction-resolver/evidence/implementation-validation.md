# R03 implementation command evidence

Baseline: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c (unchanged).

Production consists only of directory-local contracts, relative geometry,
preference/fixed-side decisions, resolution/export and README under
packages/draw/src/routing/orthogonal/direction/. No route construction or
previous-layer change is included. Output graphs are frozen copies; strict
compiler fixtures enforce input space isolation and readonly output evidence.

## Executed checks

- Direction strict compiler fixtures: PASS (mixed/widened inputs and readonly/output-space negative assertions retained).
- Direction complete unit/reference run: 8 files / 97 tests PASS, including 900 individually asserted matrix cases and 9 direct reference cases.
- Six direction core properties: PASS; seed 0xFAD003; each reports raw=5000, accepted=5000, rejected=0. No counterexamples occurred; replay/error/accounting controls are separately executed.
- Unchanged R01 strict compiler fixture: PASS.
- Unchanged R02 strict compiler fixture: PASS.
- Full @frade/draw typecheck: PASS after correcting runtime invalid-source test casts that suppressed generic inference (no production API weakening).
- Scoped ESLint: PASS after replacing unused destructured selection with the required selected-mask membership invariant assertion.
- Unchanged R01 unit/property run: 8 files / 92 tests PASS (85 unit + 7 property tests; six core properties each 5000 accepted, conditioned round trip raw=5313/rejected=313).
- Unchanged R02 unit/property run: 13 files / 126 tests PASS (114 unit + 12 property tests; each core property 5000 accepted, seed 0xFAD002).
- Installed architecture gate: PASS; HEAD/INDEX/WORKTREE independently inspected; 28 changed paths and 76 V2 source/test files before mutation evidence files were added.
- OpenSpec strict validation: PASS.
- git diff --check: PASS.
- Earlier-layer source/test diff audit: empty.

Commands executed match the command plan in tasks.md. Historical import-only
RED evidence is retained in bdd-tdd-red.md and is not claimed as behavioral RED.
The prepared assertions now execute and pass against the implementation.

## Mutation testing result — FAIL

The isolated runner enumerates the complete applicable operator inventory and
runs the actual unit/reference suite. It now uses strict TypeScript semantic
checking for the isolated mutant in addition to syntax diagnostics: compiler
invalidity is reported separately instead of being misreported as a killed test.
No repository production file is mutated. Every outcome is retained in
mutation-results.json; progress/errors are captured in mutation-progress.txt.
Task 4.5 remains open until the completed score is >=90%. No independent POST
approval, formal verification, commit or archive is claimed by this evidence.

Complete execution: 84 mutants; 54 killed / 12 survived / 18 compiler-invalid / 0 timeouts. Score 81.82%, below 90%. Task 4.5 is a blocker; see mutation-blocker.md. No formal verification or phase advancement is permitted.

Final installed gate: PASS, 32 changed paths / 76 V2 source-test files, HEAD INDEX WORKTREE snapshots checked. Gate self-tests: PASS, 451 assertions. Final process strict validation and diff check: PASS. Tasks 21/26 complete; task 4.5 and formal review/commit/archive tasks 5.1–5.4 remain open.
