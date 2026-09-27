# Design

## Context

See proposal.md — Why. R01 is closed and archived at d6579321d13e5c423eb1f1523b1d4ce35bcae583. This design was checked against actual R01 source/tests, the archived routing-geometry-kernel delta, both AGENTS contracts, CURRENT_CHANGE, legacy-boundary, the complete master specification and execution playbook. R02 is PLANNING; no production implementation or apply occurs here. The delta is specs/routing-terminal-perimeter/spec.md. Requirement names below are exact traceability keys.

## Actual R01 API inventory — before R02 API design

All production imports use directory-local ../model or ../geometry, never package-root exports. S below means S extends CoordinateSpace. No inventory item needs modification.

| Actual owner | Actual API/signature and semantics | R02 use |
| --- | --- | --- |
| model/spaces.ts | CoordinateSpace<Tag extends string=string>, ModelSpace, ViewSpace, ScreenSpace; unique-symbol space tags | Reuse S and model-space authority |
| model/primitives.ts | Point<S=ModelSpace>, Vector<S=ModelSpace>, Rect<S=ModelSpace>: readonly x/y, Rect adds width/height; invariant optional phantom (S)=>S. Segment<S> has readonly start/end: Point<S> | Never redeclare coordinate primitives; reject implicit union widening |
| model/primitives.ts | point<S>(x,y):Point<S>; vector<S>(x,y):Vector<S>; rect<S>(x,y,width,height):Rect<S>; segment<S>(start:Point<S>,end:Point<S>):Segment<S> | Construct new output points and immutable bounds; zero Rect dimensions remain R01-valid |
| model/vocabulary.ts | Direction.WEST/NORTH/EAST/SOUTH = west/north/east/south; Orientation.HORIZONTAL/VERTICAL; SegmentClassification.ZERO_LENGTH/HORIZONTAL/VERTICAL/DIAGONAL | Cardinal mask keys only; no direction resolver |
| model/validation.ts | assertFiniteNumber(operation,field,value):void; assertNonNegativeNumber(...):void; RangeError includes operation/field | Reuse numeric rejection; boolean/tag errors stay R02 TypeError |
| geometry/validation.ts | assertValidPoint<S>, assertValidVector<S>, assertValidRect<S>, assertValidSegment<S>(operation,field,value):void; assertFiniteResult(operation,field,value):number | Validate consumed values and every necessary arithmetic result |
| geometry/numbers.ts | EPSILON=1e-6; ROUTE_PRECISION=0.1; approximatelyEqual(left,right):boolean uses inclusive absolute EPSILON; pointsApproximatelyEqual<S>(left:Point<S>,right:Point<S>):boolean | Center coincidence requires both coordinates within EPSILON; no second tolerance |
| geometry/numbers.ts | quantizeCoordinate(value):number; half ties away from zero, positive-zero result | Explicit opt-in helper, NEVER invoked by R02 projections |
| geometry/segments.ts | classifySegment<S>(Segment<S>):SegmentClassification; isOrthogonalSegment<S>(Segment<S>):boolean; manhattanDistance<S>(left:Point<S>,right:Point<S>):number | Tests may verify aligned rectangle approach; no segment construction policy |
| geometry/segments.ts | translatePoint<S>(value:Point<S>,delta:Vector<NoInfer<S>>):Point<S>; translateSegment<S>(value:Segment<S>,delta:Vector<NoInfer<S>>):Segment<S> | Same-space displacement in safe-domain properties |
| geometry/rectangles.ts | rectEdges<S>(Rect<S>):RectEdges {left,top,right,bottom}; finite calculated edges | Perimeter boundaries; centers are R02 derived scalars, not new R01 APIs |
| geometry/rectangles.ts | horizontalSeparation<S>, verticalSeparation<S>(first:Rect<S>,second:Rect<S>):number; horizontalOverlap<S>, verticalOverlap<S>:boolean; relativeHorizontalPlacement<S>, relativeVerticalPlacement<S>:RelativePlacement BEFORE/OVERLAPPING/AFTER | Read-only available geometry; no quadrants; gaps <=EPSILON overlap |
| geometry/rectangles.ts | translateRect<S>(value:Rect<S>,delta:Vector<NoInfer<S>>):Rect<S> | Translation properties without R01 extension |
| geometry/normalization.ts | removeAdjacentDuplicatePoints<S>, removeCollinearPoints<S>, normalizePointSequence<S>(readonly Point<S>[]):Point<S>[] | Structural reduction only; preserves survivor coordinates; R02 does not normalize route points to choose adjacency |
| geometry/transforms.ts | createViewTransform(scale,translation:Readonly<{x:number;y:number}>):ViewTransform; finite scale>0; readonly positional translation | Explicit affine model/view conversion only |
| geometry/transforms.ts | modelPointToView(ModelPoint,ViewTransform):ViewPoint; viewPointToModel(ViewPoint,ViewTransform):ModelPoint; modelVectorToView(ModelVector,...):ViewVector; viewVectorToModel(ViewVector,...):ModelVector | No transform implementation in R02 |
| geometry/transforms.ts | viewPointToScreen(ViewPoint,offset):ScreenPoint; screenPointToView(ScreenPoint,offset):ViewPoint; supplied finite offsets | No browser reads in core |
| geometry/transforms.ts | evaluatePointTransformConditioning(ModelPoint,ViewTransform), evaluateVectorTransformConditioning(ModelVector,...):TransformConditioning; isPointTransformConditioned/isVectorTransformConditioned:boolean | EPSILON round trips only for conditioned pairs; vector conditioning omits translation |

R01 evidence inspected: seven unit suites (primitives, numbers, segments, rectangles, normalization, transforms, architecture), geometry.property.test.ts, support/generated.ts and regressions.ts, both real compiler fixtures, isolated tsconfig and Vitest configuration, and README. Latest R01 evidence is 85 unit + 7 property tests; six core generated properties execute 5000 accepted cases. Real compiler fixtures reject mixed spaces, union aliases and incorrect transform results. R02 will rerun these unchanged during implementation; this planning session does not claim newly executed R01 tests.

## Goals / Non-Goals

Goals are separate fixed/floating resolution, exact rectangle/ellipse geometry and explicit input hints, stable branded-space APIs, traceable TDD, and an installed R02 machine boundary. Non-goals include quadrant classification, direction preference/resolution, jetty, pattern selection, route construction/obstacle avoidance, manual routing/editing, preview/commit, self-loops, X6/React/Electron adapters, persistence/schema work, renderer changes and full R09 differential testing. Rotation is outside the first axis-aligned milestone; actualPerimeter remains distinct from routingBounds to preserve the future extension boundary.

## Decisions

### 1. Domain ownership and minimum semantic data

Traces: Semantic terminal binding vocabulary; Cardinal port constraint data; Coordinate space preserving public boundaries.

Own vocabulary in terminal/contracts.ts, perimeter geometry in perimeter/contracts.ts, and local index.ts exports only. Master section 7 is a recommended conceptual tree; its TerminalBinding-in-model sketch does not authorize edits to the archived R01 directory. The explicit current R02 terminal/perimeter scope controls physical ownership, including perimeter/ even though older directory examples omit it.

Proposed public shapes (readonly throughout; S explicitly parameterized, with no coordinate-space-erasing public types):

```typescript
type PortConstraint = Readonly<Record<Direction, boolean>>
type DirectionMask = PortConstraint
interface ConnectionConstraint {
  readonly x: number // dimensionless normalized fraction [0,1]
  readonly y: number // dimensionless normalized fraction [0,1]
  readonly perimeter: boolean
  readonly allowedDirections?: PortConstraint
}
interface PerimeterGeometry<S extends CoordinateSpace> {
  readonly kind: "rectangle" | "ellipse"
  readonly bounds: Rect<S>
}
interface TerminalGeometry<S extends CoordinateSpace> {
  readonly routingBounds: Rect<S>
  readonly actualPerimeter: PerimeterGeometry<S>
}
declare const terminalSpace: unique symbol
type SpaceOwned<S extends CoordinateSpace> = {
  readonly [terminalSpace]?: (space: S) => S
}
type TerminalBinding<S extends CoordinateSpace> = SpaceOwned<S> & (
  | { readonly mode: "floating"; readonly cellId: string; readonly portConstraint?: PortConstraint }
  | { readonly mode: "fixed"; readonly cellId: string; readonly constraint: ConnectionConstraint; readonly portConstraint?: PortConstraint }
  | { readonly mode: "anchor"; readonly point: Point<S> }
)
```

The optional invariant terminal phantom preserves space even in fixed/floating union branches without coordinates. It creates no runtime coordinate primitive. Factory terminalGeometry<S>(bounds:Rect<S>,kind:PerimeterKind):TerminalGeometry<S> copies one semantic bounds value into the two descriptors; direct operation validation rejects coordinate mismatches. For R02 these bounds coincide exactly; rotation would require a later approved extension. A generic routingBoundsCenter<S>(geometry:TerminalGeometry<S>):Point<S> belongs to terminal/, not R01.

Binding factories floatingBinding<S>, fixedBinding<S>, anchorBinding<S> produce fresh validated readonly descriptors; floating/fixed constructors require explicit S or a typed context because they contain dimensionless data only. anchorBinding infers S from its Point<S>. Port construction validates all four boolean flags, rejects empty masks, and exposes effectivePortConstraint<S>(binding):PortConstraint with constraint.allowedDirections > binding.portConstraint > ALL precedence. It selects no direction.

cellId serves semantic terminal identity without graph lookup. x/y resolve relative position; perimeter controls whether that position projects; optional direction flags are R03 input. No named-constraint catalog/lookup responsibility exists in R02, so name is deferred instead of copying draw.io fields. dx/dy, style rotation/flips, perimeter spacing and routing-center offsets are likewise absent. [0,1] describes normalized in-bounds constraints; an outside explicit coordinate uses anchor instead. This is an intentional validation boundary relative to draw.io unchecked affine fractions, not silent clamping.

### 2. Dependency graph and public API boundary

Traces: R02 ownership dependency and gate boundary; Coordinate space preserving public boundaries.

```text
tests -> terminal -> perimeter -> geometry -> model
          |            |            |
          +------------+------------+-> model
          +-------------------------> geometry
```

No inward layer imports its consumers. Perimeter has no cell, binding, route, side, or DirectionMask knowledge. Terminal may import geometry/model directly to derive centers and validate affine coordinates. R01 remains read-only. Proposed generic boundaries:

```typescript
interface Perimeter {
  intersection<S extends CoordinateSpace>(
    bounds: Rect<S>, toward: Point<NoInfer<S>>, orthogonal: boolean
  ): Point<S>
}
function rectanglePerimeter<S extends CoordinateSpace>(
  bounds: Rect<S>, toward: Point<NoInfer<S>>, orthogonal: boolean
): Point<S>
function ellipsePerimeter<S extends CoordinateSpace>(
  bounds: Rect<S>, toward: Point<NoInfer<S>>, orthogonal: boolean
): Point<S>
function perimeterIntersection<S extends CoordinateSpace>(
  geometry: PerimeterGeometry<S>, toward: Point<NoInfer<S>>, orthogonal: boolean
): Point<S>
function resolveFixedTerminal<S extends CoordinateSpace>(
  binding: TerminalBinding<S>, geometry?: TerminalGeometry<NoInfer<S>>
): Point<S> | null
function resolveFloatingTerminal<S extends CoordinateSpace>(
  geometry: TerminalGeometry<S>, side: "source" | "target",
  intermediatePoints: readonly Point<NoInfer<S>>[],
  oppositeReference: Point<NoInfer<S>>, orthogonal?: boolean
): Point<S>
```

Names are design choices; semantics and inferred source/result space are normative. No generic API stores Point<CoordinateSpace> internally as an erasure. Input-driven implementations must retain S, including arrays and result paths; no casts to the broad space. Compiler fixtures test all model/view/screen mixed pairs, inferred calls, union widening, generic consumers, binding/geometry combinations, readonly fields, result types, and explicit-transform positives. A strict types/tsconfig under terminal includes both terminal and perimeter compiler fixtures, with ES2022 and no DOM libs. Actual tsc, not Vitest expectTypeOf alone, is required.

### 3. Fixed-versus-floating sequence

Traces: Fixed terminal resolution before routing; Floating adjacency and source target symmetry.

```text
semantic binding + terminal geometry
 -> fixed source/target points (floating => null)
 -> future R03/R04 intermediate routing [NOT IN R02]
 -> source first / target last intermediate point
    or opposite fixed point / opposite bounds center
 -> floating perimeter points using an explicit geometric hint
 -> future canonicalization/validation/rendering [NOT IN R02]
```

The caller supplies intermediate points without endpoints. Do not normalize, skip, or search them: the first/last is authoritative even if center-coincident. For no intermediates, caller takes a snapshot of both fixed results and both centers. Use the opposite fixed point when non-null, otherwise opposite center. Do not use the already-resolved opposite floating result: that would produce order-dependent endpoints. Source/target use one function; reversing roles and list order exchanges endpoints. Fixed and anchor results bypass floating resolution entirely. Missing fixed geometry is TypeError; a floating binding returns null without manufacturing a center endpoint.

### 4. Perimeter algorithms and orthogonal hint

Traces: Pure perimeter input and numerical validity; Rectangle radial perimeter; Rectangle orthogonal geometric hint; Ellipse radial perimeter; Ellipse orthogonal geometric hint.

perimeter/validation.ts derives finite edges and centers with R01 validators. Shape dispatch accepts exactly rectangle or ellipse. RectanglePerimeter and EllipsePerimeter are stateless Perimeter implementations (objects or functions are equivalent); no framework vertex argument, registry, zoom or history is needed.

The delta fixes formulas and test vectors. Rectangle radial uses max normalized displacement, horizontal exact ties and exact selected edge coordinates, avoiding atan/tan corner noise. Ellipse radial uses Math.hypot on normalized offsets and radii-scaled unit components rather than reference quadratic coefficients; this avoids the reference parseInt truncation and much avoidable overflow. Checked finite normalized calculations still reject genuinely unrepresentable inputs.

For both shapes, pointsApproximatelyEqual(toward,center) gives EAST midpoint, deliberately on the perimeter. Inside non-center points use ray extension or the explicit orthogonal formula. No EPSILON snapping of individual dx/dy, ray slopes, or orthogonal bands is allowed.

Orthogonal=true is a pure input: horizontal-band projection has precedence, then vertical band, then rectangle corner or ellipse radial fallback outside both bands. East/west sign is relative to center with east at an exact sign tie; north/south sign similarly defaults south. Inside rectangles/ellipses still return a boundary point. This differs from reference interior/clipped cases and is stated explicitly below. Perpendicular rectangle approach is expressible for exterior aligned band inputs, as required by the playbook; arbitrary diagonal ray inputs or outside-both-band corner inputs do not imply a constructed Manhattan terminal segment. R03/R04 must supply aligned adjacent points/hints and enforce route-level perpendicularity. Returning a point alone cannot enforce that route invariant without taking direction-selection/bend ownership.

### 5. Degenerate geometry, numerical and error/result model

Traces: Pure perimeter input and numerical validity; Explicit degenerate perimeter rejection; Fixed terminal resolution before routing.

Reject a perimeter with width or height zero. This includes collapsed ellipse axes and both-zero geometry, independent of hint or approach. R01 permits zero Rects as general geometry; R02 perimeter is a stricter operation without extending R01. Direct anchor and perimeter=false affine constraints remain valid on finite zero-size bounds. This explicit rejection avoids ambiguous collapsed-shape sides and division by zero. draw.io guards both-zero bounds in getPerimeterPoint but individual perimeter functions contain accidental degenerate arithmetic; no stable oracle requires reproducing it.

For positive dimensions require finite edges, positive half extents, and a center strictly between both pairs of represented edges. Validate every required subtraction/normalization/output; underflow that produces a zero norm for a non-center direction rejects. Do not reject an extent merely for being <=EPSILON. Validate returned rectangle membership / normalized ellipse residual as stated in the delta; failure is RangeError for unrepresentable output, not weakened tolerance. This yields finite boundary results or actionable deterministic rejection, without promising successful projection for every finite IEEE-754 input.

RangeError identifies operation and numeric field/result (including normalized arithmetic, dimensions and postcondition). TypeError identifies missing geometry, invalid kind/mode/side, identity, boolean, or malformed mask. null means only not-fixed, not failure. No Result union with silent fallback. Full coordinate precision is retained; quantizeCoordinate is never called. EPSILON is imported once from R01, including the dimensionless analytical ellipse residual. Membership tolerance is an assertion/postcondition, not a license to move inputs.

### 6. Draw.io reference matrix and deliberate differences

Traces: all terminal/perimeter behavior requirements; Determinism immutability and semantic authority; R02 ownership dependency and gate boundary.

Read-only reference prefix: apps/desktop/vendor/drawio/mxgraph/src/view/. No runtime import, evaluated reference dependency, or vendored modification is planned.

| R02 contract | Reference function/file | Adopted observable behavior | Deferred / deliberate difference |
| --- | --- | --- | --- |
| fixed then intermediate then floating | mxGraphView.js updateFixedTerminalPoints/getFixedTerminalPoint/updateFloatingTerminalPoints | fixed resolution precedes route; floating uses adjacent points afterward | no mxCellState mutation; fixed points kept authoritative by caller |
| normalized constraint and perimeter flag | mxConnectionConstraint.js; mxGraph.js getConnectionConstraint/getConnectionPoint | affine bounds-relative point; optional radial projection; getFixedTerminalPoint disables rounding | name catalogs, dx/dy, style parsing, flips, rotation, view scale deferred; explicit [0,1] validation, outside anchors separate |
| cardinal allowed-direction data | master sections 9/20 and playbook R02/R03; reference graph constraint/style vocabulary | cardinal mask input to later policy | no direction selection or X6 ports in R02 |
| rectangle radial | mxPerimeter.js RectanglePerimeter | center-ray boundary, cardinal approaches and common corner | algebraic ratios with exact edge/tie rule; center gets east boundary deterministically |
| rectangle orthogonal | mxPerimeter.js RectanglePerimeter orthogonal branch | outside single-band alignment; outside-both-band corner | inside/both-band result must be boundary; horizontal-band priority and center-relative sign, instead of possibly interior reference override |
| ellipse radial | mxPerimeter.js EllipsePerimeter | analytical ellipse ray intersection | no parseInt(dx/dy), no unstable quadratic; center east boundary instead of reference interior return |
| ellipse orthogonal | mxPerimeter.js EllipsePerimeter orthogonal branch | horizontal-band then vertical-band intersection, radial outside bands | sign chosen relative to center also for inside points; reference px<=left/py<=top heuristic diverges inside; no truncation |
| floating adjacency / empty fallback | mxGraphView.js getFloatingTerminalPoint/getNextPoint | source first, target last, opposite fixed point when available or opposite center | snapshot both references first; no newly computed opposite floating point or call-order dependence |
| actual perimeter independent of routing | mxGraphView.js getPerimeterPoint/getTerminalPort | independent shape function | graph/port lookup, style registry, rotation, stencil, perimeter spacing deferred |
| degenerate rejection | mxGraphView.js getPerimeterPoint size guard; mxPerimeter.js per-shape arithmetic | finite shape boundary objective | deterministic rejection of either collapsed extent instead of reference accidental arithmetic/fallback center |

Legacy reference files: packages/draw/src/routing/floatingAttachment.ts and terminalPolicy.ts. Legacy chooses a rectangle side from normalized dx/width vs dy/height, applies previous-side hysteresis=8, clamps toward to a chosen edge, returns side/outwardNormal, and uses side+absolute offset for fixed attachment. terminalPolicy checks complete-route first/last normals. R02 removes history/hysteresis, supports analytic ellipses, separates affine constraints from explicit anchors and projection, returns points without chosen direction policy, uses branded geometry and validates finite/degenerate cases. Route-normal verification and side selection belong to R03/R04+, not this layer. No copying, importing, or editing of legacy algorithms is allowed.

### 7. Test architecture and mathematically valid properties

Traces: Conditioned reproducible property evidence; all scenario-bearing requirements.

Use terminal/unit for binding/contracts, fixed, floating, invalid-input, architecture tests; perimeter/unit for rectangle, ellipse and degenerate/numerical tests. Fixtures/support/property/types stay within those two approved trees. Place an isolated Node Vitest config under terminal/ covering both terminal/** and perimeter/**, since package Vitest currently discovers tests/unit/**. Do not modify R01 test discovery. Real strict compiler configuration under terminal/types includes terminal/perimeter *.type-test.ts.

Every unit has its scenarios written first, failing on missing behavior, then implementation, then focused rerun. Unit tables must enumerate all delta vectors, positive/negative cardinal signs, all four corners, fractional precision, both hints, inside/boundary/center inputs, each collapsed dimension, EPSILON center thresholds, finite overflow/underflow and invalid numeric partitions; no snapshots replace analytical assertions.

Core generated properties: rectangle boundary membership; ellipse equation; source/target reversal; safe common translation; repeated-input determinism; non-mutation; fixed-resolution independence of unrelated target movement. Each executes >=5000 accepted cases with seed 0xFAD002. Origins/references/deltas integer [-100000,100000], widths/heights even [2,2000], translated positional values bounded by 1e6, no cancellation-prone dimensions. This bounds center/subtraction error and analytical residual. Translation compares each coordinate within EPSILON (projection/sqrt is not exact binary integer arithmetic). Exclude near decision thresholds except exact representable ties; count exclusions separately. Boundary membership does not apply to perimeter=false interior anchors and ellipse equations do not apply to rejected degenerate shapes.

Optional spatial reflections apply only away from center fallback and zero-component sign ties, using radial or exterior single-band projections. Reflection of a center tie would map east to west while the deterministic fallback remains east, so claiming universal mirror invariance would be false. Source/target reversal is valid without this spatial-reflection caveat because it exchanges roles/list order, not geometric axes.

Deterministic boundary fixtures are never filtered from unit evidence. Include reference truncation example, center result, topology-independent fractional projection, and R01-style cancellation 0/1e-8 plus 1e9 as a limitation fixture. Report seed/path/concrete counterexample and raw/accepted/rejected totals; save every reproduced failure before fixing production. Inputs are deep-frozen and compared to saved structural copies.

### 8. Process-control gate and freezing

Traces: R02 ownership dependency and gate boundary.

The installed gate checks exact four-tree scope, previous R01 CLOSED/ARCHIVED/PASS fields, R01 closing BASE_COMMIT during PLANNING and approved R02 planning BASE_COMMIT during IMPLEMENTATION/VERIFICATION, all baseline-diff and untracked paths, framework/browser/legacy imports, layer direction, and circular dependencies among actual core modules. R01 source/tests, archived changes/main geometry spec, both AGENTS, master/playbook/legacy boundary and package exports remain protected. perimeter/ joins the scanned pure core; geometry cannot depend on terminal/perimeter even while R02 is active. Self-tests contain positive inward imports and negative reverse/framework/global/legacy/scope/freeze cases. No R01 test file is edited to house R02 process fixtures.

R02 gate repair is authorized only in PLANNING. After the planning checkpoint commit, BASE_COMMIT and APPROVED_PLANNING_COMMIT SHALL both identify that approved R02 planning commit. Implementation diff is measured from that checkpoint; the committed PLANNING snapshot itself retains the R01 closing baseline. Freeze via the APPROVED_PLANNING_COMMIT pin: the machine gate verifies the commit is an ancestor of HEAD, its CURRENT_CHANGE is R02 PLANNING at the same R01 baseline, and the on-disk gate content equals that snapshot after Git CRLF/LF normalization only. PRE_IMPLEMENTATION_GATE must be PASS. Missing approval pin or changed content fails; this isolates the implementation diff and rejects implementation-time script repairs. Gate itself is a review/control artifact, never product scope.

The request names pnpm run routing:v2, but package.json currently provides only routing:v2:arch-gate. Use the installed pnpm run routing:v2:arch-gate as the actual gate command; no package-root manifest alias is introduced during R02. Record the unavailable requested alias separately from the gate result.

## Requirement-to-implementation/test task traceability

| Delta requirement | Evidence before implementation | Implementation / verification |
| --- | --- | --- |
| Semantic terminal binding vocabulary | 2.1 contracts/geometry/invalid vocabulary tests | 2.2 |
| Cardinal port constraint data | 2.1 masks/defaults/precedence/all 15 combinations | 2.2 |
| Coordinate space preserving public boundaries | 2.3 strict compiler negative/positive fixtures | 2.4, 7.2 |
| Pure perimeter input and numerical validity | 3.1 finite/error/membership/numerical fixtures | 3.2, 4.1, 5.1 |
| Rectangle radial perimeter | 4.1 analytical table | 4.2 |
| Rectangle orthogonal geometric hint | 4.1 band/tie/inside table | 4.2 |
| Ellipse radial perimeter | 5.1 analytical table | 5.2 |
| Ellipse orthogonal geometric hint | 5.1 band/inside table | 5.2 |
| Explicit degenerate perimeter rejection | 3.1, 4.1, 5.1, 6.1 zero-size direct/projected tests | 3.2, 4.2, 5.2, 6.2 |
| Fixed terminal resolution before routing | 6.1 fixed/anchor/floating-null/target-independence tests | 6.2 |
| Floating adjacency and source target symmetry | 6.3 source/target/reversal/fallback/call-order tests | 6.4 |
| Determinism immutability and semantic authority | 2.1, 4.1, 5.1, 6.1, 6.3, 7.1 frozen/repeated inputs | 2.2, 4.2, 5.2, 6.2, 6.4, 7.3 |
| Conditioned reproducible property evidence | 3.1 generator/replay/domain support; 4.1, 5.1, 6.1, 6.3 preceding properties | 7.1, 7.3 |
| R02 ownership dependency and gate boundary | installed process self-tests, 1.1, 7.2 import fixtures | 7.4, 8.1–8.4 |

## Risks / Trade-offs

- Reference quirks conflict with boundary/full-precision authority → retain explicit divergence matrix and deterministic fixtures; full oracle comparison remains R09.
- Arbitrary finite numbers can overflow/cancel → finite intermediate checks, representability/membership rejection and conditioned properties; do not widen EPSILON.
- Phantom brands are compile-time only → validate runtime fields and execute strict negative compiler fixtures; do not pretend to detect spaces at runtime.
- Rectangles with collapsed axes are valid R01 primitives but not perimeters → deterministic local rejection, with non-projected fixed cases separately allowed.
- Direction policy could leak through a convenience API → no side selection, preferred direction or route output; orthogonal hint remains explicit geometry.
- Incorrect implementation baseline could include planning changes or bypass the frozen gate → require BASE_COMMIT = APPROVED_PLANNING_COMMIT and verify the immutable planning snapshot.

## Migration Plan

No runtime integration, feature flag, serialization change, export migration or production activation occurs in R02. Add isolated modules/tests only after Pre-Implementation PASS. R01, legacy implementations and package behavior remain unchanged. If a required R01 API is genuinely absent, STOP with R01_EXTENSION_REQUIRED; if a frozen master/control invariant must change, STOP with SPEC_CONFLICT or ARCHITECTURE_CONFLICT and return to PLANNING. Current inventory requires no R01 extension. Archive and R03 initiation remain separate checkpoints after independent verification/gates.
