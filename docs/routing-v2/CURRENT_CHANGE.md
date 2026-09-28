# Routing Engine V2 — Current Change

PROGRAM: Routing Engine V2

ACTIVE_CHANGE: routing-v2-04-orthogonal-router
PREVIOUS_CHANGE: routing-v2-03-direction-resolver
SEQUENCE_POSITION: R04_OF_10
PHASE: PLANNING

BASE_COMMIT: 0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4
PREVIOUS_CHANGE_STATUS: CLOSED
PREVIOUS_CHANGE_ARCHIVED: true
PREVIOUS_CHANGE_POST_IMPLEMENTATION_GATE: PASS

PLANNING_STATUS: READY_FOR_PRE_IMPLEMENTATION_REVIEW
SPEC_CONFLICT: RESOLVED_BY_USER_DECISION
FALLBACK_POLICY: CONSTRAINT_PRESERVING_LOCAL_EXTERIOR
FALLBACK_DECISION: openspec/changes/routing-v2-04-orthogonal-router/evidence/fallback-decision.md
ACTIVE_PLANNING_BLOCKER: NONE
READY_FOR_PRE_IMPLEMENTATION: true
PRE_IMPLEMENTATION_GATE: PASS
PRE_IMPLEMENTATION_GATE_EVIDENCE: openspec/changes/routing-v2-04-orthogonal-router/evidence/pre-implementation-review.json
MACHINE_ARCHITECTURE_GATE: PASS
PROCESS_CONTROL_STATUS: R04 exact gate profile, self-tests and approval binding complete
PROCESS_CONTROL_EVIDENCE: openspec/changes/routing-v2-04-orthogonal-router/evidence/process-control-validation.md
IMPLEMENTATION_STATUS: NOT_STARTED
ARCHIVE_ALLOWED: false

NEXT_CHANGE: routing-v2-05-segment-router
NEXT_CHANGE_ALLOWED: false

OBJECTIVE:
Specify the model-space automatic orthogonal routing pipeline using R01-R03,
jetty resolution, readable route patterns, fixed/floating terminal resolution,
canonicalization, invariant validation and an explicit too-short fallback.

## PROCESS_CONTROL_SCOPE

```text
openspec/changes/routing-v2-04-orthogonal-router/**
docs/routing-v2/CURRENT_CHANGE.md
docs/routing-v2/drawio-routing-master-spec.md
docs/routing-v2/implementation-playbook.md
scripts/routing-v2-architecture-gate.mjs
```

## Implementation boundary

No production, test or dependency edits are authorized during PLANNING. The gate
script path above contains the exact R04 process-control profile and its
self-tests completed in task 1.2.
Do not treat generic later-change handling as a reviewed R04 gate profile.

## IMPLEMENTATION_SCOPE (only after PRE and checkpoint)

```text
packages/draw/src/routing/orthogonal/router/**
packages/draw/src/routing/normalization/**
packages/draw/src/routing/validation/**
packages/draw/tests/routing-v2/orthogonal/**
```

## TEST_TOOLING_SCOPE

```text
packages/draw/package.json
pnpm-lock.yaml
```

Only packages/draw/package.json devDependencies.fast-check=4.10.2 and the required
pnpm-lock.yaml Draw importer entries may change after PRE during BDD/TDD. No
runtime dependencies, package exports, scripts or unrelated lock entries may
change. The exact gate must enforce this parsed-content exception.

## Frozen after approved planning checkpoint

```text
docs/routing-v2/drawio-routing-master-spec.md
docs/routing-v2/implementation-playbook.md
docs/routing-v2/legacy-boundary.md
scripts/routing-v2-architecture-gate.mjs
docs/routing-v2/workflow-models.md
AGENTS.md
packages/draw/src/routing/AGENTS.md
```

Planning contract wording and approval fingerprints are frozen as well. If a
frozen file must change, stop implementation, classify SPEC_CONFLICT or
ARCHITECTURE_CONFLICT and return to PLANNING before changing it.

## READ_ONLY_DEPENDENCIES

```text
packages/draw/src/routing/model/**
packages/draw/src/routing/geometry/**
packages/draw/src/routing/terminal/**
packages/draw/src/routing/perimeter/**
packages/draw/src/routing/orthogonal/direction/**
packages/draw/tests/routing-v2/geometry/**
packages/draw/tests/routing-v2/terminal/**
packages/draw/tests/routing-v2/perimeter/**
packages/draw/tests/routing-v2/direction/**
openspec/specs/routing-geometry-kernel/**
openspec/specs/routing-terminal-perimeter/**
openspec/specs/routing-direction-resolver/**
openspec/changes/archive/**
```

## Next checkpoint

The user resolved the fallback conflict in favor of hard direction constraints;
proposal/spec/design/tasks now state the local fallback and reference divergence.
Task 1.2 is complete: full machine self-tests passed 764 assertions.
Request fresh independent PRE review using
Astra xhigh. Do not mark PRE PASS, create an approved planning checkpoint or
start BDD/TDD/implementation before that review passes.

Planning/implementation model: Astra high/xhigh, per workflow-models.md.
The R03 approved baseline remains preserved in its closing commit and archive;
BASE_COMMIT here deliberately selects the R03 closing commit for new R04 planning.
