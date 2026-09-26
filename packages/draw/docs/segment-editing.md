# Segment editing

Selected edges receive the X6 native `segments` tool through `installSegmentAdapter`. Pure helpers derive normalized segments, midpoint handles, cursors, and drag-start-relative coordinates. The adapter preserves the real edge and rounded connector. The segment drag controller supplies drag-start-relative projection, one-axis snap, RAF coalescing, candidate validation, atomic history callbacks, commit normalization and cancel rollback.

The visual harness proves the real SVG path remains present during pointer hold and that the semantic line is not replaced by a dashed substitute. Canonical constraint conversion is applied at document export, and legacy manual vertices load through the same adapter.

## Routing and handle policy (26 September 2026)

Unrelated figures never enter the route, preview or drag constraints. Adding, moving and resizing them leaves authored routes unchanged. Only the two endpoint contours constrain floating attachments. Obstacle-compatible API parameters are deprecated and ignored. Legacy Manhattan metadata maps to the independent orth router; computed floating paths use normal. Manual vertices survive loading and re-adding.

A single adapter supplies pinned Draw.io classic circular segment points (5 px radius, 18 px hit region), floating endpoint rings (6/7 px radius, blue center and inner white ring), #29b6f2 fill, white outlines and #00a8ff dashed selection. Cursors derive directly from segment orientation, independent of reflections or rotations. Live floating segment dragging uses continuous graph coordinates and the initial grab offset, without grid or obstacle magnet snapping. Constraints join the native gesture batch, and focus returns to the graph for keyboard Undo/Redo.

Встроенный rounded-коннектор X6 округлял координаты изгибов до целых пикселей: при дробных координатах контура линия отклонялась от мыши на 0,5 px. Коннектор frade-rounded сохраняет дробные координаты, оставляя прежние скругления. Реальный Electron-сценарий проверяет положение SVG на каждом перемещении и один шаг Undo/Redo.
