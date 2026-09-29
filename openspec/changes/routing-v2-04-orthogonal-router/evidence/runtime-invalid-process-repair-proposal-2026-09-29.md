# R04 second process-control repair proposal

Status: PROCESS_CONTROL IMPLEMENTED AND VALIDATED; fresh independent PRE pending.
The original authorized proposal below is historical. Fresh executor results are
recorded in process-control-repair-validation.md. No real schema-3 approval,
implementation checkpoint or implementation resumption has been created.
Classification: STATE_TRANSITION / ARCHITECTURE_CONFLICT.
Production, tests and mutation harness remain frozen.

## Root cause

The frozen gate implements the first R04 repair epoch only. Its authority is
ORDINARY_DIRECTION_CONSTRUCTION and its immutable entry is at cf424e247490fdfae2c4efc9f7e7377b6d5b6e11.
After independent approval da22452d7e9c35f28f4004d9826432b12bf6a521,
4ff5c4deea4f5f6804bb01f92f955813c617d765 recorded the authorized implementation
transition. The production/test work now differs from that first entry.

Replacing PLANNING_REPAIR with MUTATION_RUNTIME_INVALID_OUTCOME is rejected
by the existing exact profile. Reusing the old entry for the second return to
PLANNING incorrectly requires restoration of historical product bytes.
Restoring those bytes in a diagnostic worktree does not establish approval of
the current candidate: channel.ts and candidate 82 are absent from that entry.

The reviewed package.json and pnpm-lock.yaml additions already appear in the
first entry snapshot; their current bytes equal the retained historical bytes.
They are not new changes made during this process repair. All cumulative paths
must nevertheless remain discoverable and subject to the metadata checks.

## Proposed authority for a second repair epoch

- Keep the original snapshot, fixture bundle and independent approvals unchanged.
- Keep cumulative BASE_COMMIT and IMPLEMENTATION_ORIGIN_COMMIT at cf424e247490fdfae2c4efc9f7e7377b6d5b6e11.
- Record the last approved planning checkpoint da22452d7e9c35f28f4004d9826432b12bf6a521 separately.
- Pin the second repair-entry HEAD to 4ff5c4deea4f5f6804bb01f92f955813c617d765.
- Use the proposed manifest runtime-invalid-repair-entry-proposed-2026-09-29.json
  as review evidence only until its exact bytes/schema/hash are approved.
- Independently verify both historical approvals, their reviewed control state,
  ancestry and the control-only history between cumulative origin and entry HEAD.
- Pin exact HEAD, INDEX and complete WORKTREE states for the same four R04 roots
  and the two metadata files. The manifest captures 66 files, including the current
  channel.ts hash and actual candidate-82 source. Do not widen the permitted roots.
- Capture and bind the actual repaired mutation-contract evidence for independent
  review. No synthetic historical fixture may substitute for the current implementation.
- Extend only the process-control gate/profile and its executable self-tests;
  do not modify master/playbook/AGENTS, production, R04 tests, mutation harness,
  package.json or lockfile.
- No manifest replacement from CURRENT_CHANGE claims, path glob escape, ignored
  file, junction/symlink, stage cancellation or hash-only cross-layer comparison.

## Required controls

Preserve every first-epoch regression. Add second-epoch fixtures with immutable
bytes separate from live worktree files and prove:

1. Exact second-entry HEAD/INDEX/WORKTREE passes planning isolation.
2. Any product/test/tooling edit, addition, deletion, rename, copy, mode change,
   symlink/junction or ignored file after entry fails in its actual Git layer.
3. Staged/worktree and committed/worktree cancellation cannot hide changes.
4. Swapped epoch, stale manifest, altered CURRENT hash, rewritten ancestry,
   first-epoch approval offered for second-epoch wording and duplicate schema
   fields fail.
5. Historical approvals are validated at their historical checkpoints; changes
   required by this process-control repair are independently re-reviewed, never
   treated as already approved.
6. New planning wording and exact proposed entry are in the fresh fingerprint set;
   checkbox/process normalization cannot hide altered task requirements.
7. New control-only checkpoint preserves cumulative origin; every commit in its
   planning interval is inspected. Approval baseline cannot hide product changes.
8. No second-epoch IMPLEMENTATION transition without a fresh independent PRE PASS,
   bound manifest/report/fingerprints and separately recorded checkpoint.

Run full gate self-tests, installed gate, --review-fingerprint, strict OpenSpec
validation and diff checks in a worktree holding the CURRENT implementation entry.
Unknown failures or interrupted commands are not PASS evidence.

## Workspace isolation evidence

A copy of the current 737 authorized files was made at HEAD 4ff5c4d, verified by
raw SHA-256 and saved in the recoverable r04-process-repair worktree archive.
The original checkout and unrelated files were retained. A separate r04-pre-review
worktree restores 58 old retained files and is diagnostic only; it must not be
used to approve the current runtime-invalid implementation entry.

The diagnostic installed gate inspected 730 cumulative paths and reported
GATE_STATUS: FAIL. Its shell exit code was zero; verdict text is authoritative
for this recorded run. --review-fingerprint and strict OpenSpec validation passed.
The focused filesystem self-test was interrupted before a result; it has no PASS.

## Remaining independent checkpoint

The user authorized the second R04 process-control gate profile and its self-tests
under the constraints above. A fresh independent PRE review is still required.
This proposal does not authorize mutation-harness implementation, production
changes, commit/archive, R05 or weakening any gate.

READY_FOR_IMPLEMENTATION: NO
