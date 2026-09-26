# Proposal

## Why

Routing Engine V2 needs a deterministic, framework-independent geometry foundation before terminal resolution or routing algorithms can be specified and implemented safely. Establishing the numerical, coordinate-space, and normalization contracts in R01 prevents later phases from duplicating geometry policy or compensating for inconsistent primitives downstream.

## What Changes

- Introduce immutable or immutably treated domain primitives for `Point`, `Vector`, `Rect`, `Segment`, `Direction`, and `Orientation`.
- Establish central numerical contracts for finite inputs and outputs, `EPSILON = 1e-6`, `ROUTE_PRECISION = 0.1`, coordinate-wise approximate equality, exact Manhattan-distance calculation, opt-in `quantizeCoordinate(value)` with symmetric half-away-from-zero ties and negative-zero normalization, separately tested for idempotence.
- Define pure geometry operations for horizontal, vertical, diagonal, and zero-length segment classification; Manhattan distance; translation; and rectangle overlap and separation.
- Define explicit model, view, and screen coordinate-space transformations, including structural validity, finite-result rejection, point/vector affine semantics, and model-to-view-to-model recovery within `EPSILON` only for EPSILON-conditioned point/transform pairs. Ill-conditioned finite pairs permit one-way conversion without a strict round-trip guarantee.
- Define structural point-sequence normalization that only removes redundant duplicate/collinear points, preserves surviving coordinates exactly, never invokes scalar quantization, and preserves diagonal evidence such as `(0,0) -> (1,0.04)` without implementing a router or terminal behavior.
- Add deterministic unit and property-based verification for normalization idempotence, conditioned transform round trips (at least 5000 accepted conditioned pairs, seed `0xFAD001`), translation orientation/distance/normalization and rectangle invariance only for a safe integer-lattice generated domain with `SAFE_TRANSLATION_COORD_LIMIT = 1_000_000`, finite outputs, repeatability, and framework independence; distinguish conditioned, ill-conditioned, and structurally invalid transforms. Arbitrary finite translation inputs retain formula/finite-result semantics without universal invariance; document `0, 1e-8, delta=1e9` cancellation.
- Limit R01 implementation to `packages/draw/src/routing/model/` and `packages/draw/src/routing/geometry/`, with new V2 geometry tests under `packages/draw/tests/routing-v2/geometry/`.
- Make `routing/model/` the canonical owner of V2 geometry types while legacy/document types remain isolated and unchanged until explicitly scoped adapter or migration work.
- Explicitly exclude routing quadrant classification (R03), terminal attachment, perimeter algorithms, direction preference, jetty, orthogonal routing, segment editing, loops, X6 integration, and changes to or dependencies on legacy routing implementations.

## Capabilities

### New Capabilities

- `routing-geometry-kernel`: Defines the pure geometry types, central numerical policies, coordinate-space transformations, normalization primitives, deterministic behavior, and executable invariant contracts required by later Routing Engine V2 changes.

### Modified Capabilities

None. Existing `reusable-draw-package` and `foundation-quality-gates` requirements remain unchanged; R01 introduces an isolated V2 foundation and corresponding evidence without altering legacy Draw behavior.

## Impact

- Planned production scope: new framework-independent modules only under `packages/draw/src/routing/model/` and `packages/draw/src/routing/geometry/`.
- Planned verification scope: new deterministic unit and property tests only under `packages/draw/tests/routing-v2/geometry/`.
- Architectural boundary: the geometry kernel must not import `react`, `react-dom`, `@antv/x6`, `electron`, DOM/browser APIs, application UI state, repository services, or legacy routing modules.
- Legacy routing implementations and integration boundaries remain read-only and must not be used as hidden dependencies.
- Later R02-R10 changes will consume these contracts but are not part of this change.
- Planning/verification control files are separately governed by `R01_PROCESS_CONTROL_SCOPE` in CURRENT_CHANGE; changing them does not expand the three R01 implementation trees.
