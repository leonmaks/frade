SUPERSEDED READINESS: the second independent PRE found a remaining report-to-fingerprint binding defect. Historical results below remain valid command evidence. See pre-implementation-revalidation-fail.md and approval-binding-repair.md for the next repair.

# R03 planning/process-control repair

CHANGE: routing-v2-03-direction-resolver
REPAIR_TYPE: PLANNING_AND_PROCESS_CONTROL
DATE: 2026-09-27
PHASE: PLANNING
BASE_COMMIT: 2b6619627e3e744007b06251a05dad86e7bce634
INDEPENDENT_PRE_GATE: FAIL — previous report retained; fresh revalidation required
READY_FOR_IMPLEMENTATION: NO

## Repairs for the four independent blockers

1. Approved checkpoint: committed PRE PASS and linked review JSON/report are required. Hashes bind all 14 reviewed artifacts; exact approved scope/state and every intervening planning commit are checked. Forbidden changes later reverted cannot be absorbed into the baseline. Missing/PENDING/failed evidence, stale report/artifact hashes and forbidden checkpoint/history have executable negative fixtures, with an approved positive control.
2. Properties: use existing R02 runConditionedProperty, seededRandom and integer as read-only test dependencies, explicitly seeded 0xFAD003. No fast-check installation or dependency-manifest changes are planned. Raw/accepted/rejected, exhaustion, replay and concrete failure evidence remain mandatory.
3. Modes: actual owner executable bit is checked on POSIX even with core.filemode=false. Windows requires explicit core.filemode=false, approved/HEAD/INDEX Git modes and regular WORKTREE contents; this is the stated NTFS limitation, not a claimed native POSIX chmod test. The original in-memory POSIX negative probe and positive/negative platform controls execute. TAB/LF paths are verified through the actual NUL snapshot parser without creating unsupported Windows filenames.
4. Mutation evidence: master §74 score >=90% is assigned tasks 2.9/4.5 and a concrete test-local Node/TypeScript/Vitest runner command. Complete operator inventory, isolated mutations, module redirection controls, honest killed/survived/timeout denominator and failure handling are specified. The runner is prospective implementation work; no mutation suite is claimed executed now.

The nonblocking singleton recommendation is explicit: singleton selection is the FINAL override and does not lock an endpoint while constructing paired preference rows. Direct regression and the 900 reference pairs must distinguish an early-lock alternative.

## Regression-first evidence

Before the fix, the new regressions failed with ten inappropriate acceptances:
PENDING/missing approval, missing/failed evidence, FAIL report, stale report hash,
stale artifact hash, forbidden checkpoint, forbidden history later restored, and
POSIX WORKTREE executable mismatch. The original independent FAIL remains at
pre-implementation-gate-fail.md. The positive fixture initially exposed its own
trimmed baseline-file bytes; it now materializes the exact baseline blobs.
No test condition was relaxed.

## Actual checks

| Command                                                          | Result                                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| node --check scripts/routing-v2-architecture-gate.mjs            | PASS                                                                                     |
| node scripts/routing-v2-architecture-gate.mjs --self-test        | PASS — 445 assertions                                                                    |
| pnpm exec eslint scripts/routing-v2-architecture-gate.mjs        | PASS                                                                                     |
| openspec validate routing-v2-03-direction-resolver --strict      | PASS                                                                                     |
| pnpm run routing:v2:arch-gate                                    | PASS — PLANNING; HEAD/INDEX/WORKTREE source snapshots; 56 V2 source/test files inspected |
| planningReviewFingerprint() coverage                             | PASS — 14 artifacts                                                                      |
| openspec status --change routing-v2-03-direction-resolver --json | All four planning artifacts done                                                         |
| git diff --check                                                 | PASS                                                                                     |
| git status --short; tracked/untracked scope audit                | Only authorized planning/control paths                                                   |

The existing four-source discovery algorithm is unchanged:
BASELINE_TO_HEAD union STAGED union UNSTAGED union UNTRACKED.
All original R01/R02 self-tests remain. Production/test code, archived capabilities,
root/scoped AGENTS, master, playbook, legacy boundary and pinned vendor are unchanged.
Proposal and delta spec were not changed by this repair.

## Remaining checkpoint

Use GPT-6 Astra high in a fresh read-only context with pre-implementation-gate-prompt.md.
Do not turn this execution agent's machine PASS into independent approval.
Persist the actual independent report and reviewer-provided fingerprint only after
a real PASS, then create the approved planning checkpoint. No checkpoint commit,
baseline move, implementation or R04 advancement occurred in this repair.
