# Routing Engine V2 — Current Change

PROGRAM: Routing Engine V2

ACTIVE_CHANGE: routing-v2-01-geometry-kernel

SEQUENCE_POSITION: R01_OF_10

PHASE: VERIFICATION

BASE_COMMIT: 5ddcc512e343ba9855c5b9b65fc54f48a9fd695b

PREVIOUS_GATE: BOOTSTRAP PASS

PRE_IMPLEMENTATION_GATE: PASS

IMPLEMENTATION_STATUS: COMPLETE

IMPLEMENTATION_TESTS: PASS

MACHINE_ARCHITECTURE_GATE: PASS

POST_IMPLEMENTATION_GATE: PASS

ARCHIVE_ALLOWED: true

VERIFICATION_STATUS: PASS

NEXT_CHANGE_ALLOWED: false

## Current objective

Implement the approved R01 Geometry Kernel planning contract from BASE_COMMIT using BDD/TDD inside the strict implementation scope. PRE_IMPLEMENTATION gate is PASS; R02 remains disallowed.

## IMPLEMENTATION_SCOPE — R01_IMPLEMENTATION_SCOPE

```text
packages/draw/src/routing/model/**
packages/draw/src/routing/geometry/**
packages/draw/tests/routing-v2/geometry/**
```

Only these three trees are valid R01 production/test implementation targets. Do not expand this scope during implementation.

## PROCESS_CONTROL_SCOPE — R01_PROCESS_CONTROL_SCOPE

```text
openspec/changes/routing-v2-01-geometry-kernel/**
docs/routing-v2/CURRENT_CHANGE.md
docs/routing-v2/drawio-routing-master-spec.md
docs/routing-v2/implementation-playbook.md
scripts/routing-v2-architecture-gate.mjs
```

This is the complete process/control registry required by the installed architecture gate, not permission to edit every registered file during IMPLEMENTATION. Master spec, playbook, and gate script may be repaired only after returning to PLANNING. During IMPLEMENTATION, only the process-evidence scope below is writable. Product tasks execute the frozen installed gate, require PASS, and record evidence.

## PROCESS_EVIDENCE_SCOPE — Writable during implementation

```text
openspec/changes/routing-v2-01-geometry-kernel/**
docs/routing-v2/CURRENT_CHANGE.md
```

Updates here record implementation progress and verification evidence; they do not authorize changes to approved requirements or expansion of implementation scope. A specification or architecture conflict requires STOP IMPLEMENTATION and a return to PLANNING.

## Forbidden implementation work

Do not implement or modify:

```text
legacy routing files
packages/draw/src/routing/terminal/**
packages/draw/src/routing/orthogonal/**
packages/draw/src/routing/segment/**
packages/draw/src/routing/loop/**
packages/draw/src/routing/interaction/**
packages/draw/src/routing/adapters/x6/**
renderer code
persistence code
document-schema code
```

## Frozen during implementation

The following files are frozen during R01 implementation:

- docs/routing-v2/drawio-routing-master-spec.md
- docs/routing-v2/implementation-playbook.md
- docs/routing-v2/legacy-boundary.md
- scripts/routing-v2-architecture-gate.mjs
- AGENTS.md
- packages/draw/src/routing/AGENTS.md

If implementation reveals that one of these files must change:

STOP IMPLEMENTATION.

Classify the condition as SPEC_CONFLICT or ARCHITECTURE_CONFLICT and return to
PLANNING before modifying the frozen file.

## Exit criteria

R01 implementation is complete only when the approved tasks are complete, required unit/property tests, affected typecheck and lint pass, OpenSpec verification has no blockers, and an independent post-implementation Architecture Gate passes.

Do not archive or start R02 automatically. NEXT_CHANGE_ALLOWED remains false.
