# DirectionResolver

Pure R03 API; imports only R01 geometry/model and R02 terminal vocabulary. No route,
jetty, perimeter projection, framework, or package-root integration is performed.

`resolveDirections(sourceBounds, targetBounds, options?)` infers one invariant input
space from sourceBounds. Target bounds and optional fixed points must share it.
Omitted masks permit all directions; explicit malformed masks/options throw TypeError.
Non-finite numeric inputs/results and negative extents throw RangeError with field context.
Zero extents are valid. All outputs and copied evidence are deeply frozen and owned.

`classifyRelativeGeometry(sourceBounds, targetBounds)` exposes pinned quadrant,
raw signed gaps, zero-banded policy gaps and R01 overlap/non-negative separation.
There is no quantization. Both chosen directions are outward terminal sides.

Example: model bounds (0,0,10,10) and (30,0,10,10) resolve EAST/WEST;
(30,30,10,10) instead selects EAST/NORTH under source-role preference priority.
Singleton masks override after paired rows; fixed candidates lock only allowed
multi-mask endpoints. Y-edge checks override X-edge checks at corners.

Common translation/reflection properties apply only to the conditioned bounded
integer domain in the delta, excluding reflection ties/ambiguous corners. Universal
IEEE-754 translation invariance and source/target-exchange symmetry are not promised.
