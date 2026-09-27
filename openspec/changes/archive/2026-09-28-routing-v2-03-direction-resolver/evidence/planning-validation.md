SUPERSEDED: independent PRE FAIL on 2026-09-27 invalidated readiness below. Historical command results remain recorded; use process-control-repair.md for the repaired planning state.

# R03 planning validation evidence — superseded

CHANGE: routing-v2-03-direction-resolver
PHASE: PLANNING
DATE: 2026-09-27
BASE_COMMIT: 2b6619627e3e744007b06251a05dad86e7bce634
PRE_IMPLEMENTATION_GATE: PENDING
READY_FOR_INDEPENDENT_PRE_REVIEW: YES
READY_FOR_IMPLEMENTATION: NO

## Delivered planning

- proposal.md
- specs/routing-direction-resolver/spec.md
- design.md (reference provenance, numeric domains, API, test plan, traceability)
- tasks.md (24 tracked tasks; product work blocked until independent PRE/checkpoint)
- evidence/pre-implementation-gate-prompt.md

## Actual checks

| Command                                                     | Result                                                                                   |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| openspec status --change routing-v2-03-direction-resolver   | 4/4 planning artifacts complete                                                          |
| openspec validate routing-v2-03-direction-resolver --strict | PASS                                                                                     |
| node --check scripts/routing-v2-architecture-gate.mjs       | PASS                                                                                     |
| node scripts/routing-v2-architecture-gate.mjs --self-test   | PASS — 425 assertions                                                                    |
| pnpm run routing:v2:arch-gate                               | PASS — PLANNING; HEAD/INDEX/WORKTREE source snapshots; 56 V2 source/test files inspected |
| pnpm exec eslint scripts/routing-v2-architecture-gate.mjs   | PASS                                                                                     |
| git diff --check                                            | PASS                                                                                     |

Gate extension adds R03 exact scope/previous-state checks, preserved lower-layer
dependency rules, R03 subtree import limits and approved-checkpoint freeze of
seven control files. The existing four-source discovery algorithm is unchanged.
All previous 339 self-test assertions remain; total is now 425. New executable
cases cover planning product rejection, readonly/outside paths, state drift,
inward/reverse/later/framework dependencies, staged/worktree cancellation for
each frozen control, restored positive controls and committed inverse-worktree
control edits.

## Scope audit

No production/test files were added or modified in this planning pass.
R01/R02 source/tests, archived specs, root/scoped AGENTS, master spec, playbook,
legacy boundary and pinned vendor source remain unchanged.
Only this change, CURRENT_CHANGE.md, the installed gate and the separately
requested workflow reference are planning/control changes.

R03 test configs, reference matrix, unit/property/compiler suites are planned
work. They were not executed or claimed as implemented. The 900-case mask
matrix and six properties are requirements for implementation evidence.

## Next action and model

Stop before independent PRE review. Use GPT-6 Astra high in a fresh read-only
context with the saved prompt. Do not reuse this execution context to
self-certify independent PASS. No approved planning commit has been made and
no implementation baseline is pinned yet.

After real PRE PASS, record the review; commit explicit approved planning/control
paths; use that resulting SHA as APPROVED_PLANNING_COMMIT and BASE_COMMIT.
