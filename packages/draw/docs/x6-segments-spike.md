# X6 3.1.8 segments spike

Chromium evidence: `tests/spike/x6-segments.spec.ts` passed with a node-bound edge using `anchor: center`, `connectionPoint: boundary`, Manhattan, rounded, and native `segments`.

The inspected native tool derives controls from `edgeView.routePoints`, mutates `edge.vertices`, and may set/remove terminal anchors. It also only provides row/column cursors. It cannot provide floating attachments, hysteresis, canonical constraints, or shared validation.

Decision B: implement a Frade adapter/overlay for handles and constraints while keeping the same X6 edge, router, connector, and History transaction.
