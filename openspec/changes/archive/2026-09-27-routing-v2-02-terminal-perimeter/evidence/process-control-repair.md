# R02 process-control repair

CHANGE: routing-v2-02-terminal-perimeter
REPAIR_TYPE: PROCESS_CONTROL
PHASE: PLANNING
STATUS: PASS
REVIEWED_HEAD: 913ea59b7d9486edaef451c005ecf5451854e4f5
GATE_SCRIPT_SHA256: f83e51186be2a8f3c555dcbca8a8ac91168fd8f23b35d3e8a9ab3cad2f12e93e

## Regression-first evidence

The frozen-script regression failed before fixing worktree-only comparison:
"frozen staged cancellation must fail". HEAD, stage-zero index and worktree
are now compared independently with the approved planning script; missing
or unmerged snapshots fail closed. Mutation of temporary script copies to
remove any of the three comparisons was detected by executable assertions.

A fresh independent PRE reviewer then reproduced false PASS for staged and
committed React imports in an allowed terminal path with a pure worktree.
The full installed-gate regression failed before the source-snapshot fix.
Source AST and dependency checks now inspect HEAD and INDEX independently
in addition to worktree, with snapshot-specific resolution and cycle graphs.

Changed-path discovery still unions BASELINE_TO_HEAD, STAGED, UNSTAGED,
UNTRACKED using --no-renames --name-only -z.

## Executed checks

- Gate self-tests: PASS, 339 assertions.
- Installed routing:v2:arch-gate: PASS; HEAD/INDEX/WORKTREE inspected;
  7 changed paths, 25 unique V2 source/test files (before this evidence).
- OpenSpec R02 strict validation: PASS.
- git diff --check: PASS.
- git status: CURRENT_CHANGE and gate script modified before evidence creation.

Full-gate fixtures cover staged/committed forbidden imports, staged additions
absent from worktree, snapshot dependency cycles and allowed positive controls.
Discovery fixtures retain cancellation, deletion/recreation, rename sides,
copy destinations, spaces/Unicode and allowed/forbidden source controls.

## Handoff and limits

R02 production/tests, R01, proposal, design and delta are unchanged.
Implementation has not been restored.
STASH_OID: 150af0254bd68cdb9f8c6d93f5b29d5d039b7215
BACKUP_BRANCH: backup/r02-terminal-perimeter-implementation
UNTRACKED_PARENT: 71c29eedc2fe3ed11aeb66e41c863ec5604ef745

Independent PRE revalidation completed PASS after all repairs.
POST remains FAIL; archive and next-change advancement remain prohibited.
A new approved planning checkpoint is required after PRE PASS before restore.

## Git mode and stage integrity repair

A subsequent independent PRE reviewer reproduced false PASS for an INDEX
symlink in an allowed terminal path pointing outside core to a React module.
The full-gate symlink regression failed before the metadata fix.
Another regression failed for a staged mode-only frozen script edit with
identical contents. Inventories now retain Git mode and stage metadata.
HEAD/index V2 snapshots reject symlinks, unsupported modes and unmerged entries.
Frozen gate validation also checks approved regular-file mode against HEAD
and index, rejects worktree symlinks and fails closed for missing snapshots.

Full-gate regressions now include INDEX/HEAD symlinks with a pure regular
worktree, unmerged index with pure worktree, and filenames with spaces.
Direct frozen tests reject staged and committed mode-only changes and accept
restored approved modes. The installed-main fixtures use their own PLANNING
state, so fixture correctness does not depend on the real program phase.
