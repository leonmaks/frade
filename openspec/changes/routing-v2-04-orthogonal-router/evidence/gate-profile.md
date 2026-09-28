# Exact R04 machine-gate and approval protocol

REPAIR STATUS (2026-09-28): initial profile rules below remain applicable to
initial planning. Task 1.6 adds the exact authorized repair profile described in
planning-repair-process-protocol.md and the repair section below. Its validation
evidence is separate from independent PRE. The initial PLANNING/NOT_STARTED and
BASE==APPROVED assumptions do not authorize retained implementation or a renewed
checkpoint. Keep the original report/manifest unchanged; fresh repair review
uses separate schema-2 evidence and cannot reuse historical approval.

This is process-control implementation for task 1.2, not a PRE review or approval.
The active program remains PLANNING until fresh independent PRE passes and its
approved planning checkpoint is committed.

## Scope and snapshots

The exact R04 profile pins the R03 closing SHA
0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4 during initial planning. It rejects
production, tests and package metadata changes in that phase. Implementation
requires PRE PASS and BASE_COMMIT equal to APPROVED_PLANNING_COMMIT.

Allowed product roots are orthogonal/router, normalization and validation under
packages/draw/src/routing, and tests/routing-v2/orthogonal under packages/draw.
Planning controls are this change, CURRENT_CHANGE, master, playbook and the gate
script. R01-R03, legacy/vendor, exports and R05+ remain read-only. Changes naming
an unimplemented machine profile fail closed rather than using generic handling.

Discovery unions independently NUL-delimited baseline-to-HEAD, staged, unstaged
and untracked paths, with renames disabled so both old/new names are retained.
Core source inspection and cycles are checked independently in HEAD, INDEX and
WORKTREE. orthogonal/direction and orthogonal/router are distinct layers:

- model -> model
- geometry -> model/geometry
- perimeter -> model/geometry/perimeter
- terminal -> model/geometry/perimeter/terminal
- direction -> model/geometry/perimeter/terminal/direction
- normalization -> model/geometry/normalization
- validation -> model/geometry/perimeter/terminal/normalization/validation
- router -> all of the above and router

No validation-to-router, direction-to-router or earlier-layer reverse dependency
is allowed. Existing purity/test-integrity checks remain active.

## Narrow package exception

Only a direct Draw devDependencies.fast-check value of exactly 4.10.2 and its
lock importer entry (specifier/version both 4.10.2) may be added after approval.
The unchanged package/lock pair is also valid before test setup. Each live Git
snapshot must contain a consistent pair. Other package fields, lock importers,
packages, snapshots and package-manager metadata must remain semantically equal.
The pnpm 12 lockfile contains multiple YAML documents; all are compared, with
exactly one Draw importer owner. Invalid/ambiguous mappings fail closed.

The parser is the already installed, locked js-yaml dependency of root ESLint;
the gate installs nothing and adds no package dependency. Metadata file modes
and regular-file identity are checked in each snapshot as well as contents.

## Independent PRE fingerprint binding

The reviewer must read the full prompt and run:

```powershell
node scripts/routing-v2-architecture-gate.mjs --review-fingerprint
```

Include its exact canonical two-space JSON output once in the saved independent
report between standalone lines:

```text
REVIEWED_ARTIFACTS_JSON_BEGIN
<the emitted JSON object, without Markdown fences>
REVIEWED_ARTIFACTS_JSON_END
```

For a successful review the report must include exactly one of each:

```text
CHANGE: routing-v2-04-orthogonal-router
GATE_TYPE: PRE_IMPLEMENTATION
GATE_STATUS: PASS
BLOCKERS: NONE
MACHINE_GATE_INTEGRITY: PASS
READY_FOR_IMPLEMENTATION: YES
```

Save the actual report as evidence/pre-implementation-gate-pass.md only after
the reviewer returns PASS. The calling workflow then creates
evidence/pre-implementation-review.json with schemaVersion 1, change, gateType,
gateStatus, baseline (R03 closure), reviewerContext "fresh-read-only", reportPath
(repository-relative), reportSha256 and artifacts. artifacts must equal the exact
object embedded in the report. reportSha256 hashes UTF-8 text with CRLF converted
to LF. Serialize this manifest with JSON.stringify(value, null, 2) and a final LF.

No placeholder approval manifest or synthetic PASS report is created in the
real repository by self-tests. Synthetic reports exist only in disposable Git
fixtures. The machine verifies content binding; the human workflow must still
ensure the report actually came from an independent read-only reviewer.

Before the planning commit, set PRE_IMPLEMENTATION_GATE to PASS and
PRE_IMPLEMENTATION_GATE_EVIDENCE to the manifest path. The approved commit must
still contain PHASE: PLANNING, the R03 closing BASE_COMMIT and IMPLEMENTATION_STATUS:
NOT_STARTED. Its history from R03 closure must be linear and control-only at
every commit, so a forbidden edit followed by a revert does not qualify.

Only after that commit, change the live phase/baseline to IMPLEMENTATION and
the actual approved SHA. Approval report, manifest and reviewed contract contents
must match the approved commit in HEAD, INDEX and WORKTREE. Missing/unmerged
files, symbolic links, mode changes and stale report fingerprints fail closed.
On Windows the worktree executable-bit check uses Git's core.filemode=false;
HEAD and INDEX still retain exact approved Git modes.

Task checkbox normalization does not ignore task wording. CURRENT_CHANGE permits
only the explicitly enumerated phase/baseline/approval/implementation/verification
result fields to change; scopes, other fields and prose remain fingerprinted.
Do not rewrite its checkpoint prose during implementation. Frozen-file changes
require a planning repair and new independent approval.

## Authorized repair profile (task 1.6)

For PLANNING_REPAIR: ORDINARY_DIRECTION_CONSTRUCTION, follow
planning-repair-process-protocol.md. This exact profile permits retained R04
files only when HEAD, INDEX and complete WORKTREE match the pinned entry
snapshot independently. Additions (including ignored files), omissions, modes,
symlinks/junctions, unmerged stages and cancellation fail closed. The initial
planning profile still prohibits product work.

Original approved commit O remains cf424e247490fdfae2c4efc9f7e7377b6d5b6e11.
The original schema-1 manifest/report stay frozen at O as historical evidence.
Fresh independent PRE uses pre-implementation-revalidation-pass.md and
pre-implementation-revalidation-review.json, schemaVersion 2, with baseline O,
originalApprovedPlanningCommit O and repairEntrySnapshot {path, sha256}.
All original reviewed paths plus the protocol's eleven repair artifacts are
fingerprinted. Metadata paths fingerprint committed O blobs; retained worktree
metadata is pinned separately by the immutable entry. The snapshot and fixture
bundle preserve raw bytes through evidence/.gitattributes.

Before P: BASE_COMMIT=APPROVED_PLANNING_COMMIT=O, PLANNING, IN_PROGRESS,
IMPLEMENTATION_PAUSED=true, archive/next false. P is a real control-only repair
checkpoint with actual schema-2 approval, no product/test/dependency staging and
no product edit/revert anywhere O..P. After P, keep BASE_COMMIT and
IMPLEMENTATION_ORIGIN_COMMIT at O, set APPROVED_PLANNING_COMMIT=P and
IMPLEMENTATION_PAUSED=false only on authorized resumption. Freeze reviewed
controls/report/manifest at P in HEAD/INDEX/WORKTREE. Discovery still starts at O,
so committed implementation remains visible; P cannot hide cumulative work.

The fixture bundle contains immutable entry bytes solely for disposable self-tests,
not authorization for live edits. No synthetic approval is saved in the real change.

## Validation commands

```powershell
node scripts/routing-v2-architecture-gate.mjs --self-test-r04
node scripts/routing-v2-architecture-gate.mjs --self-test-r04-repair
node scripts/routing-v2-architecture-gate.mjs --self-test
pnpm run routing:v2:arch-gate
openspec validate routing-v2-04-orthogonal-router --strict
git diff --check
```

The focused repair command exercises isolation and schema-2 controls; the initial
R04 command preserves its original controls. The full command retains both and
all R01-R03 controls. Tests create isolated temporary repositories and delete
only their verified temporary roots. A machine PASS is necessary process
evidence, not formal OpenSpec Verify or an independent PRE/POST decision.
