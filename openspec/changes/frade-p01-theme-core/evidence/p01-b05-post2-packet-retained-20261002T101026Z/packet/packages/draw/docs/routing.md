# Routing

Floating rectangular attachments are resolved from the contour toward the opposite endpoint with deterministic side selection and hysteresis. Source terminal direction follows outward normal; target follows inward normal. Routes are normalized before segment extraction and validated for Manhattan geometry, reversals, intersections, overlap, and obstacle crossing.

`routeManhattan` evaluates direct/L candidates plus padded top/bottom/left/right corridors and chooses the shortest candidate that does not cross obstacle bodies. Free-target previews use an outward source escape before routing, so a pointer behind the source cannot produce a source re-entry loop. The production X6 graph uses `anchor: center`, `connectionPoint: boundary`, Manhattan routing and rounded connector; the pure planner/validator is the deterministic test oracle.
