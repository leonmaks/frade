# Routing Engine V2 — Legacy Boundary

## Purpose

This document defines the existing routing implementation that must not be
silently evolved while Routing Engine V2 is being built.

The objective is to prevent V2 defects from being repaired by changing legacy
routing behavior.

---

## 1. Protected legacy routing algorithms

These files are READ-ONLY during R01–R09.

They also remain protected during R10 unless an explicit migration change
authorizes replacement/removal.

```text
packages/draw/src/routing/floatingAttachment.ts
packages/draw/src/routing/terminalPolicy.ts
packages/draw/src/routing/manhattanRoute.ts
packages/draw/src/routing/floatingRoute.ts
packages/draw/src/routing/movingRectangleRoute.ts

packages/draw/src/geometry/normalizeRoute.ts
packages/draw/src/geometry/validateManhattanRoute.ts
packages/draw/src/geometry/routeSnapshot.ts

packages/draw/src/segment-editing/segments.ts
packages/draw/src/segment-editing/dragSession.ts
packages/draw/src/segment-editing/segmentDragController.ts
packages/draw/src/segment-editing/resolveSegmentDrag.ts
packages/draw/src/segment-editing/floatingSegments.ts

packages/draw/src/connections/connectionStateMachine.ts
packages/draw/src/connections/connectionTool.ts
packages/draw/src/connections/previewRoute.ts
```

---

## 2. Existing integration boundary

These files are READ-ONLY during R01–R09.

R10 may modify them only to connect the completed V2 engine through explicit
adapters and feature flags.

```text
packages/draw/src/routing/x6RoutingAdapter.ts
packages/draw/src/routing/roundedConnector.ts

packages/draw/src/segment-editing/x6Adapter.ts

packages/draw/src/editor/createGraph.ts
packages/draw/src/editor/DiagramEditor.tsx

packages/draw/src/document/graphAdapter.ts
packages/draw/src/document/schema.ts
packages/draw/src/document/serialize.ts
packages/draw/src/document/fileAdapter.ts

packages/draw/src/visual/api.ts

packages/ui-workspace/src/FradeDiagramView.tsx
packages/ui-workspace/src/repositoryBundles.ts
packages/ui-workspace/src/DiagramView.tsx
```

R10 integration must not move routing semantics into these files.

---

## 3. Desktop bridge boundary

These files are outside the V2 routing domain.

```text
apps/desktop/src/main/drawio-bridge.ts
apps/desktop/src/main/drawio-flow-bridge.ts
```

Do not modify them as a substitute for routing implementation.

---

## 4. Draw.io behavioral oracle

The following tree is reference material only:

```text
apps/desktop/vendor/drawio/
```

Relevant reference files include:

```text
mxgraph/src/view/mxEdgeStyle.js
mxgraph/src/view/mxGraphView.js
mxgraph/src/view/mxPerimeter.js

mxgraph/src/handler/mxConnectionHandler.js
mxgraph/src/handler/mxEdgeHandler.js
mxgraph/src/handler/mxEdgeSegmentHandler.js
mxgraph/src/handler/mxElbowEdgeHandler.js

js/libavoid-js/libavoid-routing.js
```

These files must never be modified by Routing V2 changes.

---

## 5. Existing tests are regression evidence

The current routing, connection, segment-editing, document and visual tests
must be treated as historical regression evidence.

Do not rewrite expected results simply to accommodate V2.

V2 may add its own test hierarchy, preferably under:

```text
packages/draw/tests/routing-v2/
```

Existing tests remain active unless an explicit OpenSpec change documents why
legacy behavior is intentionally retired.

---

## 6. Known architectural conflicts

The current implementation contains behavior that intentionally remains
untouched until the appropriate V2 phase:

```text
legacy routing and X6 responsibilities are mixed
rendered vertices are persisted
resolved anchor offsets are persisted
segment dragging mutates terminal attachment / vertices
free-target preview follows a separate route construction path
interactive X6 ports are disabled
self-loops are currently disabled
```

Do not repair these issues prematurely in R01–R09.

They are migration inputs for later phases.

---

## 7. V2 target

New V2 implementation belongs beneath:

```text
packages/draw/src/routing/
```

using isolated directories:

```text
model/
geometry/
terminal/
orthogonal/
segment/
loop/
normalization/
validation/
interaction/
adapters/x6/
```

Existing legacy top-level routing files must not be reused as hidden
dependencies of the new V2 domain.

---

## 8. Prime rule

A V2 test failure must be fixed in V2.

Do not make V2 green by altering legacy behavior.
