# Routing Engine V2 — Current Change

PROGRAM: Routing Engine V2

ACTIVE_CHANGE: routing-v2-01-geometry-kernel

SEQUENCE_POSITION: R01_OF_10

PHASE: PLANNING

BASE_COMMIT: 260e0de6b0e4121bf125f75a458b76387e48c2f9

PREVIOUS_GATE: BOOTSTRAP PASS

NEXT_CHANGE_ALLOWED: false

## Current objective

Achieve PRE_IMPLEMENTATION GATE PASS for R01 before any production code is written.

## IMPLEMENTATION_SCOPE — R01_IMPLEMENTATION_SCOPE

```text
packages/draw/src/routing/model/**
packages/draw/src/routing/geometry/**
packages/draw/tests/routing-v2/geometry/**
```

Only these three trees are valid R01 production/test implementation targets. During `PHASE: PLANNING`, no product production/test implementation may be written; implementation starts only after the independent PRE_IMPLEMENTATION gate passes.

## PROCESS_CONTROL_SCOPE — R01_PROCESS_CONTROL_SCOPE

```text
openspec/changes/routing-v2-01-geometry-kernel/**
docs/routing-v2/CURRENT_CHANGE.md
docs/routing-v2/drawio-routing-master-spec.md
docs/routing-v2/implementation-playbook.md
scripts/routing-v2-architecture-gate.mjs
```

These are process/specification artifacts, not Geometry Kernel implementation. Editing them does not expand the R01 product implementation scope. Change artifacts and CURRENT_CHANGE may be maintained during planning and verification. Master-spec, playbook, and gate-script repair is process/control work during PLANNING before product implementation. Product tasks execute the installed gate, require PASS, and record evidence; they do not modify it.

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

## Exit criteria

R01 planning is complete only when:

```text
delta spec parses successfully
openspec validate routing-v2-01-geometry-kernel --strict passes
process architecture gate passes for the planning state
PRE_IMPLEMENTATION gate passes
```

Only after all four criteria pass may `PHASE` change from `PLANNING` to `IMPLEMENTATION`. This repair does not itself grant an independent PRE_IMPLEMENTATION gate PASS or allow R02.
