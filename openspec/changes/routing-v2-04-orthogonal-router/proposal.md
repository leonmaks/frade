# Proposal

## Why

R01-R03 provide geometry, terminal/perimeter resolution and direction decisions,
but cannot yet produce an automatic orthogonal route. R04 composes those closed
layers into a deterministic model-space router with executable parity and
invariant evidence before manual editing or integration work begins.

## What Changes

- Add jetty resolution, a readable decoded pattern table, pattern selection and
  execution, and a pure fixed/intermediate/floating/canonicalize/validate pipeline.
- Preserve R03 selected directions and R02 fixed/floating semantics; expose an
  immutable derived route with inspectable branch and jetty evidence.
- Implement the approved too-short adaptation: a bounded local exterior-rectangle
  fallback keeps masks, endpoints and jetty minima. It has no R05/legacy dependency.
- Reconcile master section 25, BDD-006 and the R04 playbook with the user's explicit
  choice to preserve direction constraints without exceptions.
- Require 64+ ordinary topology fixtures, separately labelled fallback fixtures,
  10,000 accepted cases per core property, mutation evidence and all R01-R03 regressions.
- Before implementation, require an exact R04 machine-gate profile with executable
  adversarial controls and independent PRE approval. Generic later-change checks
  do not satisfy this prerequisite.

## Capabilities

### New Capabilities

- `routing-orthogonal-router`: model-space automatic orthogonal routes with
  jetty, decoded route patterns, constrained too-short fallback, canonicalization
  and invariant validation.

### Modified Capabilities

None. R01-R03 public contracts and archived specifications remain read-only.

## Impact

Prospective production scope is `packages/draw/src/routing/orthogonal/router/**`,
`packages/draw/src/routing/normalization/**` and
`packages/draw/src/routing/validation/**`; tests belong to
`packages/draw/tests/routing-v2/orthogonal/**`. R03 direction remains read-only.
Route result ownership stays inside R04; no model-layer or package-root export change.

The property suite will use fast-check 4.10.2, already present in the workspace
lockfile, as a direct Draw devDependency. Only that dependency entry and its
necessary lockfile importer changes may be added during the approved BDD/TDD step.
There are no new runtime/framework dependencies.

Planning-only controls include CURRENT_CHANGE, the master/playbook clarification
and the future exact R04 architecture-gate extension. The gate extension remains
an explicit planning prerequisite, not implementation work.

Non-goals: R05 manual/control-hint routing, editing, interaction, self-loops,
rotation, global obstacles, renderer/X6, persistence, schemas and legacy repair.
R03 closing baseline is `0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4`.
