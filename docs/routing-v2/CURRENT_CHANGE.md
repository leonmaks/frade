# Routing Engine V2 — Current Change

PROGRAM: Routing Engine V2

ACTIVE_CHANGE: routing-v2-02-terminal-perimeter

PREVIOUS_CHANGE: routing-v2-01-geometry-kernel

SEQUENCE_POSITION: R02_OF_10

PHASE: VERIFICATION

PROCESS_CONTROL_REPAIR:
architecture-gate changed-path discovery, frozen controls and source snapshot integrity

PROCESS_CONTROL_REPAIR_STATUS: COMPLETE

BASE_COMMIT: 8f349483720247fdc2c319d8228237910a48e67c

APPROVED_PLANNING_COMMIT: 8f349483720247fdc2c319d8228237910a48e67c

PRE_IMPLEMENTATION_REVALIDATION: PASS

PRE_IMPLEMENTATION_GATE: PASS

ACTIVE_PROCESS_CONTROL_BLOCKER: NONE

IMPLEMENTATION_STATUS: COMPLETE

IMPLEMENTATION_TASKS: 25/25

IMPLEMENTATION_TESTS: PASS

MACHINE_ARCHITECTURE_GATE: PASS

VERIFICATION_STATUS: PASS

ACTIVE_VERIFICATION_BLOCKER: NONE

R02_IMPLEMENTATION_STORAGE: WORKTREE

R02_IMPLEMENTATION_STASH_OID: 150af0254bd68cdb9f8c6d93f5b29d5d039b7215

IMPLEMENTATION_BACKUP_BRANCH: backup/r02-terminal-perimeter-implementation

RESTORE_ALLOWED: true

PREVIOUS_CHANGE_STATUS: CLOSED

PREVIOUS_CHANGE_ARCHIVED: true

PREVIOUS_CHANGE_POST_IMPLEMENTATION_GATE: PASS

OBJECTIVE:
Specify and implement framework-independent terminal bindings,
connection/port constraint vocabulary, perimeter geometry, fixed terminal
resolution, and floating terminal resolution required by the Routing V2
pipeline.

POST_IMPLEMENTATION_GATE: PASS

POST_IMPLEMENTATION_BLOCKER: NONE

POST_IMPLEMENTATION_GATE_EVIDENCE: openspec/changes/routing-v2-02-terminal-perimeter/evidence/post-implementation-gate-after-cardinal-repair.md

ARCHIVE_ALLOWED: true

NEXT_CHANGE: routing-v2-03-direction-resolver

NEXT_CHANGE_ALLOWED: false

## IMPLEMENTATION_SCOPE — R02_IMPLEMENTATION_SCOPE

```text
packages/draw/src/routing/terminal/**
packages/draw/src/routing/perimeter/**
packages/draw/tests/routing-v2/terminal/**
packages/draw/tests/routing-v2/perimeter/**
```

This is the planned R02 production/test scope. During PHASE: PLANNING, specify the
change before writing production implementation. Do not expand the scope silently.

## READ_ONLY_DEPENDENCIES — R01 Geometry Kernel

```text
packages/draw/src/routing/model/**
packages/draw/src/routing/geometry/**
```

R02 builds on the approved R01 model and geometry contracts. These trees are
read-only dependencies, not R02 implementation targets. Any necessary R01 change
must first be justified explicitly in R02 planning and reflected in an approved
scope revision before modification. Do not opportunistically improve Geometry Kernel.

## PROCESS_CONTROL_SCOPE

```text
openspec/changes/routing-v2-02-terminal-perimeter/**
docs/routing-v2/CURRENT_CHANGE.md
scripts/routing-v2-architecture-gate.mjs
```

Architecture-gate repairs are PLANNING process-control work. Before IMPLEMENTATION,
commit the approved planning package and record its SHA separately as
APPROVED_PLANNING_COMMIT. At the IMPLEMENTATION transition, BASE_COMMIT must equal
APPROVED_PLANNING_COMMIT; the planning snapshot retains the R01 closing baseline.
The installed gate must exactly match that approved commit during implementation.
Master spec, playbook, legacy boundary, both AGENTS contracts, and archived R01
source/tests/specs are frozen. If R01 needs an extension, STOP and report
R01_EXTENSION_REQUIRED; do not modify it under R02 scope.

## FROZEN_DURING_IMPLEMENTATION

The following controls and prior capability are frozen. If a frozen file
must change, STOP implementation, classify SPEC_CONFLICT or
ARCHITECTURE_CONFLICT, and return to PLANNING before modifying it.

```text
docs/routing-v2/drawio-routing-master-spec.md
docs/routing-v2/implementation-playbook.md
docs/routing-v2/legacy-boundary.md
scripts/routing-v2-architecture-gate.mjs
AGENTS.md
packages/draw/src/routing/AGENTS.md
packages/draw/src/routing/model/**
packages/draw/src/routing/geometry/**
packages/draw/tests/routing-v2/geometry/**
openspec/specs/routing-geometry-kernel/**
openspec/changes/archive/**
```
