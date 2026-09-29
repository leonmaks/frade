# R04 PRE revalidation failure: process-control and workspace state

Change: `routing-v2-04-orthogonal-router`
Gate type: `PRE_IMPLEMENTATION_REVALIDATION`
Gate status: `FAIL`
Date: 2026-09-29

The runtime-invalid contract, candidate binding, mixed-evidence policy, fatal
precedence, scoring and regression controls were independently accepted. The
process gate remains blocked.

## Blockers

- The live architecture-gate profile accepts `PRE_IMPLEMENTATION_GATE` values
  `NOT_RUN`, `PENDING`, `PASS` and `FAIL`; the invalid historical value
  `SUPERSEDED_PENDING_REVALIDATION` has been replaced by `FAIL`.
- `CURRENT_CHANGE.md` remains planning/paused with task 1.9 incomplete and
  `READY_FOR_PRE_IMPLEMENTATION: false`.
- The repair-entry snapshot hash is correct, but HEAD/worktree no longer match
  the retained snapshot. R04 production files and R04 test/mutation files are
  present in the planning workspace.
- `packages/draw/package.json` and `pnpm-lock.yaml` contain the fast-check
  tooling change before a renewed PRE/checkpoint.
- The current HEAD is `4ff5c4d`, not the repair origin
  `cf424e247490fdfae2c4efc9f7e7377b6d5b6e11`.
- The workspace contains hundreds of unrelated untracked paths, including a
  junction and temporary root/shadow files. They must be separated through
  authorized workspace handling; do not delete, clean or hide them.
- The retained mutation inventory aborted at candidate 82 and has no score.
  Historical PASS evidence remains superseded and cannot approve this state.

`openspec validate --all --strict` passes, but that does not establish machine
gate integrity or implementation readiness.

## Required next step

Preserve the files and create an authorized isolated review workspace or other
approved scope separation. Restore or renew the planning checkpoint so the
live HEAD/INDEX/WORKTREE and fingerprints are coherent, then rerun the full
machine gate and obtain a fresh independent PRE revalidation. Do not modify
production, tests, frozen controls, commit, archive or begin implementation
while these blockers remain.

PRODUCTION_FILES_MODIFIED: PRESENT_IN_WORKSPACE_UNAPPROVED
MACHINE_ARCHITECTURE_GATE: FAIL
READY_FOR_IMPLEMENTATION: NO
