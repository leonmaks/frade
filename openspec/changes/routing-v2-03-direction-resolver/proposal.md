# Proposal

## Why

R01 and R02 are closed, verified dependencies. The next pipeline responsibility is deterministic, constraint-aware selection of source/target cardinal directions; R04 must consume those decisions rather than invent side policy while constructing routes.

## What Changes

- Add pure quadrant classification, signed directional gaps, overlap/separation evidence, constraint-filtered preferences, and source/target direction resolution.
- Reuse R01 Direction and space-owned geometry plus R02 boolean DirectionMask; retain mask membership even when a fixed-point side is disallowed.
- Specify pinned draw.io preference order and explicit V2 numerical/tie adaptations, including conditioned reflection/translation properties.
- Require the exhaustive 4 x 15 x 15 mask matrix, direct deterministic fixtures, strict compiler fixtures, and complete R01/R02 regressions.
- Extend the installed architecture gate in PLANNING with exact R03 scope, inward dependencies, frozen-baseline checks and adversarial self-tests. Keep all existing discovery/snapshot regressions.

## Capabilities

### New Capabilities

- `routing-direction-resolver`: framework-independent selection of constrained cardinal directions and inspectable preference evidence without producing route points.

### Modified Capabilities

None. Archived `routing-geometry-kernel` and `routing-terminal-perimeter` remain unchanged and read-only.

## Impact

Planned production scope: `packages/draw/src/routing/orthogonal/direction/**`. Planned tests: `packages/draw/tests/routing-v2/direction/**`. Process scope: this change, CURRENT_CHANGE.md, the architecture-gate script and the separately requested workflow-models.md reference. No package-root export, R01/R02 edit, framework/legacy/vendor import, jetty, route pattern, route construction, editing, loop, persistence or R04+ production change is included.

The planning baseline is the R02 closing commit `2b6619627e3e744007b06251a05dad86e7bce634`. Independent PRE review must pass before any product source or tests are written; its approved planning commit will become the implementation baseline. Independent POST review follows OpenSpec Verify before archive.
