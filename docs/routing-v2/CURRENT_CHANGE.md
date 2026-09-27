# Routing Engine V2 — Current Change

PROGRAM: Routing Engine V2
ACTIVE_CHANGE: routing-v2-03-direction-resolver
PREVIOUS_CHANGE: routing-v2-02-terminal-perimeter
SEQUENCE_POSITION: R03_OF_10
PHASE: PLANNING

BASE_COMMIT: 2b6619627e3e744007b06251a05dad86e7bce634
PREVIOUS_CHANGE_STATUS: CLOSED
PREVIOUS_CHANGE_ARCHIVED: true
PREVIOUS_CHANGE_POST_IMPLEMENTATION_GATE: PASS

PRE_IMPLEMENTATION_GATE: PASS
PRE_IMPLEMENTATION_GATE_EVIDENCE: openspec/changes/routing-v2-03-direction-resolver/evidence/pre-implementation-review.json
PRE_REVALIDATION_REQUIRED: false
PROCESS_CONTROL_REPAIR: reviewer-report fingerprint binding
IMPLEMENTATION_STATUS: NOT_STARTED
VERIFICATION_STATUS: NOT_STARTED
POST_IMPLEMENTATION_GATE: NOT_STARTED
ARCHIVE_ALLOWED: false
NEXT_CHANGE: routing-v2-04-orthogonal-router
NEXT_CHANGE_ALLOWED: false

OBJECTIVE:
Specify deterministic framework-independent quadrant and relative-geometry
classification, mask-filtered direction preferences, and source/target
direction selection for the Routing V2 pipeline without constructing routes.

## IMPLEMENTATION_SCOPE

```text
packages/draw/src/routing/orthogonal/direction/**
packages/draw/tests/routing-v2/direction/**
```

These are prospective implementation paths, not permission to write product
code or tests during PLANNING.

## PROCESS_CONTROL_SCOPE

```text
openspec/changes/routing-v2-03-direction-resolver/**
docs/routing-v2/CURRENT_CHANGE.md
scripts/routing-v2-architecture-gate.mjs
docs/routing-v2/workflow-models.md
```

The workflow reference was separately requested before R03 and will be included
in the approved planning checkpoint. Gate and workflow edits are PLANNING-only;
after approval they must match the approved planning commit in every Git layer.

## READ_ONLY_DEPENDENCIES

```text
packages/draw/src/routing/model/**
packages/draw/src/routing/geometry/**
packages/draw/src/routing/terminal/**
packages/draw/src/routing/perimeter/**
packages/draw/tests/routing-v2/geometry/**
packages/draw/tests/routing-v2/terminal/**
packages/draw/tests/routing-v2/perimeter/**
openspec/specs/routing-geometry-kernel/**
openspec/specs/routing-terminal-perimeter/**
```

R03 builds on R01/R02. An extension need is a planning blocker, not permission
to opportunistically change an earlier layer.

## Frozen during implementation

- docs/routing-v2/drawio-routing-master-spec.md
- docs/routing-v2/implementation-playbook.md
- docs/routing-v2/legacy-boundary.md
- scripts/routing-v2-architecture-gate.mjs
- docs/routing-v2/workflow-models.md
- AGENTS.md
- packages/draw/src/routing/AGENTS.md

If implementation requires a frozen-file edit, STOP IMPLEMENTATION, classify
SPEC_CONFLICT or ARCHITECTURE_CONFLICT (or PROCESS_CONTROL_DEFECT for a gate
defect), return to PLANNING, and rerun independent PRE revalidation. Never move
BASE_COMMIT to hide a failing diff.

## Next checkpoint

Complete planning and strict validation; inspect the installed gate and its
self-tests; then request independent PRE_IMPLEMENTATION review in a fresh
read-only GPT-6 Astra high context. Do not self-certify PRE PASS or write R03
product files. After independent PASS, commit explicit planning/control paths
and pin that SHA as APPROVED_PLANNING_COMMIT and implementation BASE_COMMIT.
