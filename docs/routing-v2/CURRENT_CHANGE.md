# Routing Engine V2 — Current Change

PROGRAM: Routing Engine V2

ACTIVE_CHANGE: routing-v2-04-orthogonal-router
PREVIOUS_CHANGE: routing-v2-03-direction-resolver
SEQUENCE_POSITION: R04_OF_10
PHASE: PLANNING

APPROVED_PLANNING_COMMIT: da22452d7e9c35f28f4004d9826432b12bf6a521
BASE_COMMIT: cf424e247490fdfae2c4efc9f7e7377b6d5b6e11
IMPLEMENTATION_ORIGIN_COMMIT: cf424e247490fdfae2c4efc9f7e7377b6d5b6e11
PREVIOUS_CHANGE_STATUS: CLOSED
PREVIOUS_CHANGE_ARCHIVED: true
PREVIOUS_CHANGE_POST_IMPLEMENTATION_GATE: PASS

PLANNING_STATUS: READY_FOR_PRE_REVALIDATION
SPEC_CONFLICT: RESOLVED_BY_USER_APPROVED_B2_DECISION
FALLBACK_POLICY: CONSTRAINT_PRESERVING_LOCAL_EXTERIOR
ORDINARY_POLICY: CERTIFIED_TABLE_OR_ORIENTED_CHANNEL
FALLBACK_DECISION: openspec/changes/routing-v2-04-orthogonal-router/evidence/fallback-decision.md
ACTIVE_PLANNING_BLOCKER: fresh independent PRE revalidation and a control-only planning checkpoint are pending; implementation remains paused
READY_FOR_PRE_IMPLEMENTATION: false
PRE_IMPLEMENTATION_GATE: PASS
PRE_IMPLEMENTATION_GATE_EVIDENCE: openspec/changes/routing-v2-04-orthogonal-router/evidence/pre-implementation-runtime-revalidation-review.json
PRE_REVALIDATION_REPORT: openspec/changes/routing-v2-04-orthogonal-router/evidence/pre-implementation-revalidation-pass.md
PRE_REVALIDATION_BLOCKER_EVIDENCE: openspec/changes/routing-v2-04-orthogonal-router/evidence/pre-implementation-revalidation-fail-runtime-invalid-2026-09-29.md
B1_PLANNING_REPAIR_EVIDENCE: openspec/changes/routing-v2-04-orthogonal-router/evidence/planning-repair-decision.md
MACHINE_ARCHITECTURE_GATE: PASS
PROCESS_CONTROL_STATUS: COMPLETE
PROCESS_CONTROL_EVIDENCE: openspec/changes/routing-v2-04-orthogonal-router/evidence/process-control-repair-validation.md
IMPLEMENTATION_STATUS: IN_PROGRESS
IMPLEMENTATION_TESTS: FAIL
IMPLEMENTATION_PAUSED: true
ACTIVE_IMPLEMENTATION_BLOCKER: fresh independent PRE PASS and a control-only planning checkpoint are required before implementation resumes
IMPLEMENTATION_BLOCKER_EVIDENCE: openspec/changes/routing-v2-04-orthogonal-router/evidence/pre-implementation-revalidation-fail-runtime-invalid-2026-09-29.md
PLANNING_REPAIR: MUTATION_RUNTIME_INVALID_OUTCOME
PLANNING_REPAIR_EVIDENCE: openspec/changes/routing-v2-04-orthogonal-router/evidence/planning-repair-runtime-invalid-2026-09-29.md
PRE_REVALIDATION_FAIL_EVIDENCE: openspec/changes/routing-v2-04-orthogonal-router/evidence/pre-implementation-revalidation-fail-runtime-invalid-2026-09-29.md
PROCESS_CONTROL_BLOCKER_EVIDENCE: openspec/changes/routing-v2-04-orthogonal-router/evidence/pre-implementation-revalidation-fail-process-control-2026-09-29.md
REPAIR_ENTRY_SNAPSHOT: openspec/changes/routing-v2-04-orthogonal-router/evidence/runtime-invalid-repair-entry-proposed-2026-09-29.json
REPAIR_ENTRY_SNAPSHOT_SHA256: 9be484cc6589200d286d530c0ea8afe2fc0ab6c60e19dd55d4e364c1f8080da6
PREVIOUS_PRE_STATUS: HISTORICAL_PASS_SUPERSEDED_FOR_REVISED_CONTRACT
POST_IMPLEMENTATION_GATE: NOT_RUN
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

No production, test or dependency edits are authorized during PLANNING. Existing
R04 files are retained as an immutable repair-entry snapshot; their presence is
not new implementation authorization. The exact repair gate verifies this snapshot
independently in HEAD, INDEX and complete WORKTREE. Task 1.6's executable controls
are documented in PROCESS_CONTROL_EVIDENCE. Initial planning still forbids product
work; this retained-file exception applies only to the pinned repair entry.
Fresh independent PRE and a control-only repair checkpoint are prerequisites
for resuming BDD/production changes. Machine PASS is not independent approval.

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

The user authorized this planning repair after the ordinary-route counterexample.
See evidence/ordinary-direction-spec-conflict.md in the active change. Preserve
hard masks, R03 authority and the strict too-short trigger. Ordinary direction
protection and planning reconciliation are recorded by task 1.5; repair isolation
and approval binding are recorded by task 1.6. Task 1.7's fresh independent PRE
returned FAIL: the ordinary certificate omits terminal minima and can approve a
finite run of 1 with resolved minimum 10. Preserve that review and counterexample.
The independent PRE revalidation passed B1/B2 and the user-approved two-part
reference contract, but the later runtime-invalid revalidation failed. The
failed report is preserved in
`evidence/pre-implementation-revalidation-fail-runtime-invalid-2026-09-29.md`.
The live planning contract now binds the single observed candidate, mixed
test/domain evidence, fatal signal/timeout precedence and disjoint scoring;
task 1.9 is required before any control-only checkpoint or implementation.
Do not edit product, tests or dependencies, and do not begin implementation until
the renewed independent PRE is committed and says READY_FOR_IMPLEMENTATION: YES.
Production/tests/dependencies remain frozen during planning. The historical 1.8
checkpoint is superseded for this repair; task 1.9 must pass before any new
control-only checkpoint. No archive or R05 work is authorized. Readiness here
means readiness for independent PRE review, not implementation.

Planning/implementation model: Astra high/xhigh, per workflow-models.md.
BASE_COMMIT and APPROVED_PLANNING_COMMIT retain the original approved R04 SHA
cf424e247490fdfae2c4efc9f7e7377b6d5b6e11 until a separately approved repair
checkpoint. The replacement protocol must retain that origin for cumulative
implementation-diff review, not hide existing work by moving the baseline.
