# Proposal

## Why

R01 supplies stable typed geometry but cannot resolve semantic edge endpoints against a shape. R02 closes that gap with pure terminal bindings and rectangle/ellipse perimeters, so future routers can consume fixed points before routing and resolve floating endpoints from adjacent route points afterward.

## What Changes

- Define fixed, floating, and explicit-anchor bindings; normalized connection constraints and cardinal port-constraint data without direction selection.
- Specify full-precision rectangle and ellipse boundary projection, explicit orthogonal geometric hints, numerical rejection, center ties, and degenerate-size policy.
- Resolve fixed constraints before intermediate routing and floating endpoints afterward, with explicit source/target adjacency and opposite-reference fallback.
- Preserve the existing R01 coordinate-space brands, immutability, finite-value checks, and EPSILON; add deterministic, generated, and real compiler evidence during implementation.
- Install R02 scope/dependency checks and self-tests in the architecture gate as PLANNING process-control work; freeze the gate before implementation.
- Defer quadrant/direction resolution, jetty, routing, editing, interaction, loops, framework integration, persistence, rendering, and the full R09 differential harness.

## Capabilities

### New Capabilities

- `routing-terminal-perimeter`: Framework-independent terminal vocabulary, perimeter geometry, fixed resolution, floating resolution, and verification contracts.

### Modified Capabilities

None. The archived `routing-geometry-kernel` capability is a read-only dependency.

## Impact

Production ownership is limited to `packages/draw/src/routing/terminal/**` and `packages/draw/src/routing/perimeter/**`. Tests belong only to the corresponding `packages/draw/tests/routing-v2/terminal/**` and `perimeter/**` trees. No package-root exports or runtime dependencies on legacy, draw.io, browser, React, X6, or Electron are introduced.

Authoritative context: both AGENTS contracts, Routing V2 master specification, implementation playbook, CURRENT_CHANGE, legacy boundary, and actual archived R01 APIs/tests. Approved R01 closing baseline: `d6579321d13e5c423eb1f1523b1d4ce35bcae583`. Reference code is read-only. This session produces planning/process artifacts only; implementation awaits an independent Pre-Implementation Gate PASS.
