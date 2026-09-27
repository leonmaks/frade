# Routing Terminal Perimeter Specification Delta

## Purpose

Provides pure, coordinate-space-safe terminal bindings, rectangle/ellipse perimeter geometry, and separate fixed/floating endpoint resolution for the Routing Engine V2 pipeline.

## ADDED Requirements

### Requirement: Semantic terminal binding vocabulary

R02 SHALL distinguish floating bindings (cell identity and optional port constraint), fixed bindings (cell identity and connection constraint), and explicit anchors (a coordinate-space-owned point without a required cell). Cell identities SHALL be non-empty opaque strings with no graph lookup. The default binding for an attached cell SHALL be floating. Terminal geometry SHALL describe axis-aligned routing bounds and an actual rectangle or ellipse perimeter using the same bounds in R02; mismatched bounds SHALL be rejected. Connection constraints SHALL contain finite normalized affine x/y fractions in [0,1], an explicit perimeter boolean, and optional allowed-direction data. Fractions SHALL NOT be model-space Points. Names, dx/dy offsets, catalogs, rotation, flips, routing-center offsets, spacing, snap-to-anchor, and framework port objects SHALL NOT be introduced in R02.

#### Scenario: Default floating binding

- **GIVEN** cell A with no explicit connection constraint
- **WHEN** its default binding is constructed
- **THEN** mode SHALL be floating and no resolved point SHALL be persisted

#### Scenario: Fixed constraint vocabulary

- **GIVEN** cell A and constraint x=0.25, y=1, perimeter=true
- **WHEN** a fixed binding is constructed
- **THEN** identity and constraint SHALL remain semantic data independent of any route

#### Scenario: Explicit detached anchor

- **GIVEN** same-space point (3,4) and no cell
- **WHEN** an anchor binding is constructed
- **THEN** the supplied point SHALL identify the fixed endpoint without a graph object

#### Scenario: Axis-aligned geometry ownership

- **GIVEN** bounds (0,0,10,20) and ellipse shape
- **WHEN** terminal geometry is constructed
- **THEN** routing bounds and actual perimeter bounds SHALL equal those supplied bounds and the shape SHALL remain ellipse

#### Scenario: Reject invalid semantic input

- **GIVEN** an empty cell identity, fraction below 0 or above 1, non-boolean perimeter, or mismatched perimeter/routing bounds
- **WHEN** the corresponding public boundary validates that input
- **THEN** it SHALL deterministically reject it rather than clamp or reinterpret it

### Requirement: Cardinal port constraint data

R02 SHALL represent allowed WEST, NORTH, EAST, SOUTH using the existing R01 Direction vocabulary and four readonly boolean flags. DirectionMask SHALL be an alias of this PortConstraint representation, not a second bit encoding. Omission SHALL mean all four allowed; an explicit mask SHALL contain at least one allowed direction. A connection constraint allowedDirections SHALL override binding portConstraint when present; otherwise binding data, then ALL, SHALL determine the effective mask. R02 SHALL expose this data without selecting, preferring, or enforcing a side through geometry.

#### Scenario: Default all directions

- **GIVEN** a floating binding without a mask
- **WHEN** effective port data is read
- **THEN** all four cardinal flags SHALL be true

#### Scenario: Single and multiple direction masks

- **GIVEN** each singleton cardinal mask and each of the 15 non-empty boolean combinations
- **WHEN** constraint data is constructed
- **THEN** exactly the supplied allowed flags SHALL survive without a preferred direction

#### Scenario: Connection mask precedence

- **GIVEN** binding allows WEST and its fixed constraint allows NORTH
- **WHEN** effective data is read
- **THEN** NORTH-only SHALL be returned and the endpoint SHALL still follow the fixed coordinate constraint

#### Scenario: Reject empty or malformed mask

- **GIVEN** all flags false or any non-boolean flag
- **WHEN** port data is validated
- **THEN** it SHALL be rejected with the offending mask field identified

### Requirement: Coordinate space preserving public boundaries

All coordinate-bearing terminal/perimeter public types and APIs SHALL explicitly parameterize R01 CoordinateSpace and preserve it in results. Bounds, geometry, anchors, adjacent points, opposite references, and any Vector or Segment input SHALL share one space. Invariant R01 types and inference control SHALL reject mixed model/view/screen operands and widened-space aliases without explicit type arguments. Explicit R01 transforms SHALL be the only cross-space conversion; production routing consumers use ModelSpace. Compiler fixtures SHALL actually execute under strict tsc, with @ts-expect-error for negative cases and no @ts-ignore or @ts-nocheck.

#### Scenario: Same-space generic calls

- **GIVEN** model, view, and screen bounds with their matching points and bindings
- **WHEN** perimeter and terminal APIs are called, including through generic callers
- **THEN** each result SHALL retain precisely the input space

#### Scenario: Reject mixed spaces

- **GIVEN** model geometry and view adjacent point, or view geometry and screen anchor/opposite reference
- **WHEN** strict tsc compiles direct calls without explicit type arguments
- **THEN** each mixed call SHALL be a compile error

#### Scenario: Reject widening and result reassignment

- **GIVEN** model geometry plus a ModelSpace-or-ViewSpace point alias, or a view result assigned to ModelPoint
- **WHEN** strict tsc checks the fixtures
- **THEN** the incompatible assignment or call SHALL fail

#### Scenario: Explicit conversion remains available

- **GIVEN** a model point and R01 modelPointToView transform
- **WHEN** it is explicitly converted and used with view geometry
- **THEN** the view-space operation SHALL compile without a cast erasing its space

### Requirement: Pure perimeter input and numerical validity

A perimeter operation SHALL consume only shape bounds, a same-space toward point, and an explicit boolean orthogonal hint. The hint SHALL default to false at floating resolution and SHALL NOT be chosen from direction policy by R02. All consumed numeric inputs and required calculated edges, centers, differences, normalized values, and output coordinates SHALL be finite; dimensions SHALL be non-negative before the stricter perimeter degeneracy check. Invalid numeric geometry and unrepresentable arithmetic SHALL throw RangeError naming operation and field/result; malformed semantic tags/booleans SHALL throw TypeError. An explicit invalid input SHALL NOT fall back to center, clamp invalid data, or select a legacy algorithm. R01 EPSILON=1e-6 SHALL be the only tolerance. No perimeter calculation SHALL quantize or truncate coordinates. Rectangle membership uses inclusive edge spans expanded by EPSILON and distance to at least one edge <=EPSILON. Non-degenerate ellipse membership uses abs(((px-cx)/a)^2+((py-cy)/b)^2-1)<=EPSILON with a=w/2,b=h/2. Results failing their finite/membership postcondition SHALL reject as unrepresentable geometry, not return an invalid point.

#### Scenario: Reject every non-finite input partition

- **GIVEN** NaN, positive infinity, or negative infinity in each bounds/toward numeric field
- **WHEN** rectangle, ellipse, fixed, or floating operation consumes that field
- **THEN** RangeError SHALL identify the operation and field

#### Scenario: Reject overflow and collapsed representability

- **GIVEN** finite bounds whose right edge overflows or positive extent has no representable interior center, or toward subtraction overflows
- **WHEN** perimeter projection executes
- **THEN** it SHALL throw an actionable RangeError

#### Scenario: Preserve sub-grid precision

- **GIVEN** rectangle (0,0,10,10), toward (20,5.04), orthogonal=true
- **WHEN** perimeter projection executes
- **THEN** the result SHALL be (10,5.04), without 0.1-grid quantization

#### Scenario: Membership tolerance is explicit

- **GIVEN** a rectangle boundary point displaced by EPSILON and by more than EPSILON, and ellipse residuals at and above EPSILON
- **WHEN** membership assertions are evaluated
- **THEN** the inclusive EPSILON cases SHALL pass and the outside cases SHALL fail

#### Scenario: Reject invalid hint

- **GIVEN** an orthogonal hint supplied as a non-boolean through an invalid-data fixture
- **WHEN** projection validates its inputs
- **THEN** TypeError SHALL identify orthogonal

### Requirement: Rectangle radial perimeter

For strictly positive representable width and height with orthogonal=false, rectangle projection SHALL extend the ray from center c toward t to the boundary. If both coordinate differences are within EPSILON, it SHALL return the EAST midpoint (right,cy). Otherwise let dx=t.x-cx,dy=t.y-cy,a=w/2,b=h/2,q=max(abs(dx)/a,abs(dy)/b); return (cx+dx/q,cy+dy/q), with the selected boundary coordinate set exactly to its corresponding rectangle edge. When normalized magnitudes tie exactly, the horizontal edge calculation SHALL take precedence and the result SHALL be the common corner. It SHALL NOT return an interior toward point merely because the point is inside.

#### Scenario: Rectangle cardinal approaches

- **GIVEN** bounds (0,0,10,20) and toward (-5,10),(15,10),(5,-10),(5,30)
- **WHEN** radial projection executes
- **THEN** results SHALL respectively be (0,10),(10,10),(5,0),(5,20)

#### Scenario: Arbitrary diagonal ray

- **GIVEN** bounds (0,0,10,20) and toward (15,15)
- **WHEN** radial projection executes
- **THEN** result SHALL be (10,12.5)

#### Scenario: Exact four corner ties

- **GIVEN** bounds (0,0,10,20) and toward (-5,-10),(15,-10),(15,30),(-5,30)
- **WHEN** radial projection executes
- **THEN** results SHALL be the four corresponding corners, with horizontal tie precedence

#### Scenario: Inside and boundary coincidence

- **GIVEN** bounds (0,0,10,20) and toward (6,12) or (10,20)
- **WHEN** radial projection executes
- **THEN** the inside point SHALL extend to (10,20) and the boundary point SHALL remain equal within EPSILON

#### Scenario: Center and epsilon coincidence

- **GIVEN** bounds (0,0,10,20) and toward (5,10), or differences independently <=EPSILON
- **WHEN** radial projection executes
- **THEN** result SHALL be (10,10); a difference exceeding EPSILON SHALL use the ray formula

### Requirement: Rectangle orthogonal geometric hint

For orthogonal=true and non-center input, rectangle projection SHALL choose a horizontal projection when toward.y lies in [top,bottom], returning (left,toward.y) if toward.x<cx, otherwise (right,toward.y). Otherwise, if toward.x lies in [left,right], it SHALL choose vertical projection, returning (toward.x,top) if toward.y<cy, otherwise (toward.x,bottom). If neither span contains the corresponding coordinate, it SHALL return the corner formed by the nearest X and Y bounds toward that point. Comparisons determining these bands SHALL be exact inclusive comparisons, without snapping by EPSILON. Center-within-EPSILON precedence SHALL return EAST midpoint. This is geometric projection only: perpendicular approach is guaranteed for horizontally/vertically aligned exterior-band inputs; outside-both-band corners do not by themselves guarantee an orthogonal route. R03/R04 SHALL supply appropriate adjacent geometry and choose routing directions; R02 SHALL neither add bends nor choose that policy.

#### Scenario: Perpendicular side approaches

- **GIVEN** bounds (0,0,10,20) and toward (-5,7),(15,7),(3,-5),(3,25)
- **WHEN** orthogonal projection executes
- **THEN** results SHALL be (0,7),(10,7),(3,0),(3,20), making the corresponding terminal segment perpendicular

#### Scenario: Outside both bands

- **GIVEN** bounds (0,0,10,20) and toward (20,30)
- **WHEN** orthogonal projection executes
- **THEN** result SHALL be (10,20) and no route points SHALL be invented

#### Scenario: Inside tie priority

- **GIVEN** bounds (0,0,10,20) and toward (4,8)
- **WHEN** orthogonal projection executes
- **THEN** horizontal-band precedence SHALL return (0,8) on the boundary

#### Scenario: Inclusive band boundary

- **GIVEN** bounds (0,0,10,20) and toward (20,20)
- **WHEN** orthogonal projection executes
- **THEN** result SHALL be (10,20) without an epsilon-based band expansion

### Requirement: Ellipse radial perimeter

For positive representable radii and orthogonal=false, ellipse projection SHALL use the center-to-toward ray at full precision. Center-within-EPSILON SHALL return EAST midpoint (cx+a,cy). Otherwise u=dx/a,v=dy/b,h=hypot(u,v), and the result SHALL be (cx+a*(u/h),cy+b*(v/h)). Axis-aligned rays SHALL set the cardinal boundary coordinate exactly. Intermediate underflow to a zero h for a non-center input or a non-finite normalized value SHALL reject. The point SHALL satisfy the numerical membership contract. Inside points extend to the boundary, not to the bounding-box perimeter; no parseInt or coordinate rounding is permitted.

#### Scenario: Ellipse cardinal approaches

- **GIVEN** ellipse bounds (0,0,10,20) and toward (-5,10),(15,10),(5,-10),(5,30)
- **WHEN** radial projection executes
- **THEN** results SHALL respectively be (0,10),(10,10),(5,0),(5,20)

#### Scenario: Ellipse diagonal approach

- **GIVEN** ellipse bounds (0,0,10,20) and toward (10,20)
- **WHEN** radial projection executes
- **THEN** result SHALL equal (5+5/sqrt(2),10+10/sqrt(2)) within EPSILON and satisfy the ellipse equation

#### Scenario: Ellipse inside and boundary point

- **GIVEN** ellipse bounds (0,0,10,20) and toward (6,12), or (10,10)
- **WHEN** radial projection executes
- **THEN** the inside result SHALL be (5+5/sqrt(2),10+10/sqrt(2)) within EPSILON and the boundary result SHALL be (10,10)

#### Scenario: Ellipse center and sub-unit direction

- **GIVEN** ellipse bounds (0,0,10,20) and toward (5,10) or (5.2,10.2)
- **WHEN** radial projection executes
- **THEN** center SHALL produce (10,10) and sub-unit differences SHALL retain their ray direction rather than return an interior point

### Requirement: Ellipse orthogonal geometric hint

For orthogonal=true, after center precedence, ellipse projection SHALL first use the horizontal band if toward.y is in [top,bottom]: let v=(toward.y-cy)/b and return (cx+signX*a*sqrt(max(0,1-v*v)),toward.y), where signX=-1 if toward.x<cx and +1 otherwise. Otherwise, if toward.x is in [left,right], use u=(toward.x-cx)/a and return (toward.x,cy+signY*b*sqrt(max(0,1-u*u))), signY=-1 if toward.y<cy and +1 otherwise. Outside both bands SHALL use the radial formula. The max(0,...) SHALL only protect roundoff for a validated in-band value, never rescue invalid geometry. A hint is caller-supplied geometric data and SHALL NOT cause direction selection.

#### Scenario: Ellipse horizontal-band projection

- **GIVEN** ellipse (0,0,10,20) and toward (20,16) or (-10,16)
- **WHEN** orthogonal projection executes
- **THEN** results SHALL be (9,16) and (1,16) within EPSILON

#### Scenario: Ellipse vertical-band projection

- **GIVEN** ellipse (0,0,10,20) and toward (8,30) or (8,-10)
- **WHEN** orthogonal projection executes
- **THEN** results SHALL be (8,18) and (8,2) within EPSILON

#### Scenario: Ellipse outside both bands

- **GIVEN** ellipse (0,0,10,20) and toward (20,30)
- **WHEN** orthogonal projection executes
- **THEN** it SHALL use radial projection and satisfy the ellipse equation

#### Scenario: Ellipse inside and exact band ends

- **GIVEN** ellipse (0,0,10,20) and toward (4,8),(20,0),(20,20)
- **WHEN** orthogonal projection executes
- **THEN** the first SHALL use the west horizontal intersection; the latter two SHALL equal (5,0),(5,20)

### Requirement: Explicit degenerate perimeter rejection

R01 zero-size Rect values SHALL remain valid read-only primitives, but rectangle and ellipse perimeter projection SHALL reject width=0, height=0, and both zero using RangeError identifying the collapsed extent. Negative dimensions SHALL also reject. Positive dimensions with zero half-radius or a center not strictly representable between both edges SHALL reject as unrepresentable perimeter. This local perimeter precondition SHALL NOT change R01. Direct anchors and perimeter-disabled fixed constraints SHALL remain resolvable for zero-size bounds when their consumed arithmetic is finite. Floating and perimeter-enabled fixed resolution SHALL use the perimeter rejection policy without accidental division-by-zero fallbacks.

#### Scenario: Each rectangle degeneracy

- **GIVEN** rectangle widths/heights (0,10),(10,0),(0,0)
- **WHEN** rectangle perimeter or floating resolution executes with either hint
- **THEN** each case SHALL deterministically throw RangeError

#### Scenario: Each ellipse degeneracy

- **GIVEN** ellipse widths/heights (0,10),(10,0),(0,0)
- **WHEN** ellipse perimeter or projected fixed resolution executes with either hint
- **THEN** each case SHALL deterministically throw RangeError

#### Scenario: Zero bounds without perimeter projection

- **GIVEN** bounds (3,4,0,0) and fixed fractions (0.25,0.75) perimeter=false
- **WHEN** fixed resolution executes
- **THEN** result SHALL be (3,4); an explicit anchor (7,8) SHALL also remain (7,8)

#### Scenario: Tiny positive geometry is not arbitrarily snapped

- **GIVEN** bounds have positive representable extents less than EPSILON
- **WHEN** projection executes
- **THEN** it SHALL not reject solely because the extent is below EPSILON; representability and membership checks SHALL determine acceptance

### Requirement: Fixed terminal resolution before routing

Fixed resolution SHALL return a new same-space point for an explicit anchor, the affine point (x+fractionX*w,y+fractionY*h) for a fixed constraint with perimeter=false, and radial projection of that affine point onto the actual shape for perimeter=true. The connection constraint SHALL require terminal geometry and use no floating adjacent point or orthogonal hint. A floating binding SHALL return null from fixed resolution, not center. Fixed resolution SHALL not depend on the opposite terminal, intermediate points, direction masks, or route history; named constraint selection and offset policy are deferred. The fixed result SHALL not be relocated by later floating resolution.

#### Scenario: Explicit anchor is authoritative

- **GIVEN** anchor (3,4) and unrelated terminal/route movement
- **WHEN** fixed resolution executes repeatedly
- **THEN** it SHALL return (3,4) without projection or mutation

#### Scenario: Affine non-perimeter constraint

- **GIVEN** rectangle bounds (10,20,100,80), fractions (0.25,0.75), perimeter=false
- **WHEN** fixed resolution executes
- **THEN** it SHALL return (35,80), retaining an interior endpoint

#### Scenario: Projected fixed constraint

- **GIVEN** rectangle bounds (0,0,10,20), fractions (0.75,0.75), perimeter=true
- **WHEN** fixed resolution executes
- **THEN** it SHALL return radial boundary (10,20) before any routing

#### Scenario: Projected ellipse constraint

- **GIVEN** ellipse bounds (0,0,10,20), fractions (0.75,0.75), perimeter=true
- **WHEN** fixed resolution executes
- **THEN** it SHALL return (5+5/sqrt(2),10+10/sqrt(2)) within EPSILON

#### Scenario: Floating binding has no fixed point

- **GIVEN** floating cell A with valid geometry
- **WHEN** fixed resolution executes
- **THEN** it SHALL return null instead of center

#### Scenario: Missing fixed geometry

- **GIVEN** a fixed relative constraint without terminal geometry
- **WHEN** fixed resolution executes
- **THEN** TypeError SHALL identify missing geometry

#### Scenario: Unrelated target movement cannot move a fixed point

- **GIVEN** unchanged fixed binding/geometry and two distinct opposite targets
- **WHEN** fixed resolution is evaluated before routing
- **THEN** its results SHALL be exactly equal

### Requirement: Floating adjacency and source target symmetry

Floating resolution SHALL take terminal geometry, side source/target, readonly intermediate points excluding both endpoints, and an explicit same-space oppositeReference. Source SHALL use the first intermediate point; target SHALL use the last. An empty list SHALL use oppositeReference, which the caller SHALL obtain from the opposite fixed result when available, otherwise the center of opposite routingBounds. Neither resolver SHALL consume the newly computed opposite floating result; both sides SHALL use the same pre-floating snapshot, avoiding call-order dependence. A center-coincident adjacent point SHALL follow the perimeter center tie, not silently skip points. Floating resolution SHALL always invoke the actual perimeter with the explicit hint and SHALL not build a route. Fixed/anchor bindings SHALL remain authoritative when the caller assembles endpoints.

#### Scenario: Source uses first intermediate

- **GIVEN** source rectangle (0,0,10,20), intermediate [(20,10),(5,-20)], oppositeReference (-100,10)
- **WHEN** source floating resolution executes
- **THEN** result SHALL be (10,10) using (20,10) only

#### Scenario: Target uses last intermediate

- **GIVEN** the same rectangle/list/reference
- **WHEN** target floating resolution executes
- **THEN** result SHALL be (5,0) using (5,-20) only

#### Scenario: No intermediate opposite fixed reference

- **GIVEN** a floating rectangle (0,0,10,20), empty list, opposite fixed point (20,10)
- **WHEN** floating resolution executes
- **THEN** it SHALL use that reference and return (10,10)

#### Scenario: Two floating terminals use opposite centers

- **GIVEN** rectangles A=(0,0,10,20), B=(30,0,10,20), no intermediate points
- **WHEN** both endpoints resolve in either call order with the opposite centers as references
- **THEN** A SHALL return (10,10) and B SHALL return (30,10) with identical results in both orders

#### Scenario: Reverse source and target

- **GIVEN** a pair of terminal geometries and intermediate list
- **WHEN** terminal roles are exchanged, the intermediate list is reversed, and opposite references exchanged
- **THEN** resolved endpoints SHALL exchange positions without changing their coordinates

#### Scenario: Do not skip a coincident adjacent point

- **GIVEN** source rectangle (0,0,10,20), intermediates [(5,10),(0,-100)]
- **WHEN** floating source resolves
- **THEN** it SHALL return EAST midpoint (10,10) from the first point and not search route history

#### Scenario: Reject invalid side or missing reference

- **GIVEN** an invalid side tag or no oppositeReference in an invalid-data fixture
- **WHEN** floating input validates
- **THEN** TypeError SHALL identify the invalid contract; no invented route SHALL appear

### Requirement: Determinism immutability and semantic authority

Every R02 operation SHALL be deterministic and side-effect-free. It SHALL not mutate bounds, geometry, masks, bindings, constraint objects, anchor/adjacent/opposite points, or intermediate arrays. Returned coordinate values SHALL be newly produced readonly R01 values. Results SHALL not depend on call history, previous edge routes, framework state, zoom, devicePixelRatio, browser globals, timing, or randomness. Resolved points and centers SHALL remain derived values, not a new persistence source of truth.

#### Scenario: Repeated execution and unrelated calls

- **GIVEN** identical valid terminal/perimeter input
- **WHEN** it resolves before and after unrelated calls and repeatedly
- **THEN** results SHALL be structurally equal

#### Scenario: Frozen inputs remain unchanged

- **GIVEN** deep-frozen geometry/binding/constraint/points/list/mask and a saved structural copy
- **WHEN** fixed, floating, and perimeter operations execute
- **THEN** no input SHALL change or throw because of attempted mutation and coordinate results SHALL be new values

#### Scenario: No display state

- **GIVEN** identical model input in callers with zoom metadata 0.5 and 2
- **WHEN** R02 executes without accepting that metadata
- **THEN** model results SHALL be identical without creating any framework or browser object

### Requirement: Conditioned reproducible property evidence

Implementation SHALL execute at least 5000 accepted cases per declared core R02 property using seed 0xFAD002 and report raw/accepted/rejected counts, property name, replay path, and concrete counterexamples. Rectangle membership and ellipse residual properties SHALL cover both hints over positive conditioned bounds. Source/target reversal SHALL reverse intermediate order and exchange references. Safe common translation SHALL compare output coordinates within R01 EPSILON, not exact equality: generate integer origins/references/deltas within [-100000,100000], even dimensions in [2,2000], with all translated values within [-1000000,1000000]; constrain non-center offsets to abs(dx)>4*EPSILON or abs(dy)>4*EPSILON and avoid band/tie decision thresholds except exact representable ties. This domain supports stable differences and bounded ellipse residuals; arbitrary finite IEEE-754 translation invariance SHALL NOT be promised. Determinism and non-mutation SHALL exercise fixed, floating, and perimeter APIs. Spatial-reflection properties SHALL exclude center/fallback and zero-component sign ties and use radial projection or exterior orthogonal-band inputs where reflection is mathematically true. Degenerate, invalid, epsilon, tie, and cancellation cases SHALL have separate deterministic tests, not discarded evidence.

#### Scenario: Accepted case accounting

- **GIVEN** the deterministic property seed and conditioned generators
- **WHEN** each property finishes
- **THEN** at least 5000 accepted cases SHALL execute and rejected candidates SHALL be separately reported

#### Scenario: Safe common translation

- **GIVEN** a generated accepted geometry/reference/delta tuple in the declared bounded integer domain
- **WHEN** all positional inputs are translated by the same delta and resolved again
- **THEN** the result SHALL match the original result plus delta independently within EPSILON for X and Y

#### Scenario: Unsafe translation is not an invariance claim

- **GIVEN** positions 0 and 1e-8 translated by 1e9
- **WHEN** the numerical limitation fixture is evaluated
- **THEN** it SHALL record cancellation without asserting that distinctions survive

#### Scenario: Counterexample replay

- **GIVEN** a failing property input
- **WHEN** the harness reports failure
- **THEN** seed, path, concrete input, and accepted/rejected counts SHALL permit replay and the defect SHALL be retained as a deterministic regression

### Requirement: R02 ownership dependency and gate boundary

R02 production changes SHALL remain under packages/draw/src/routing/terminal/** and packages/draw/src/routing/perimeter/**; tests SHALL remain under packages/draw/tests/routing-v2/terminal/** and packages/draw/tests/routing-v2/perimeter/**. Dependency direction SHALL be tests -> terminal -> perimeter -> geometry -> model, allowing inward shortcuts. Model/geometry SHALL remain read-only and SHALL not import R02. Perimeter SHALL not import terminal; no cycles, package-root exports, legacy/vendor/framework/browser/persistence/document/editor/workspace imports, or R03+ logic are permitted. Architecture-gate changes SHALL be PLANNING process-control work with executable positive/negative self-tests. Before implementation the gate SHALL be committed and frozen via APPROVED_PLANNING_COMMIT and implementation BASE_COMMIT SHALL equal that approved R02 planning SHA; implementation tasks SHALL execute it, not repair it. R01 extension requirements or frozen-control conflicts SHALL STOP implementation and return to planning; no opportunistic R01 edits. Archive and next-change advancement SHALL require independent gates and separate authorization.

#### Scenario: Allowed inward imports

- **GIVEN** terminal imports perimeter and R01 geometry/model, and perimeter imports geometry/model
- **WHEN** the installed machine gate checks sources
- **THEN** these dependencies SHALL pass without production vendor imports

#### Scenario: Reject reversed and forbidden dependencies

- **GIVEN** geometry imports terminal/perimeter, perimeter imports terminal, or R02 imports React/X6/DOM/legacy/higher layers
- **WHEN** machine gate and its self-tests execute
- **THEN** each violation SHALL fail

#### Scenario: Reject archived R01 modifications

- **GIVEN** a staged, unstaged, deleted, committed-since-baseline, or untracked path in R01 source/tests or archived specification
- **WHEN** gate checks the full change set
- **THEN** it SHALL fail with read-only/R01_EXTENSION_REQUIRED evidence

#### Scenario: Planning is not implementation

- **GIVEN** CURRENT_CHANGE phase PLANNING and a proposed R02 source/test path change
- **WHEN** gate evaluates scope
- **THEN** product changes SHALL fail while authorized process artifacts SHALL pass

#### Scenario: Freeze installed gate

- **GIVEN** implementation phase with PRE_IMPLEMENTATION_GATE PASS and the approved planning SHA
- **WHEN** the gate verifies its own file against that committed planning version
- **THEN** BASE_COMMIT SHALL equal APPROVED_PLANNING_COMMIT, the unchanged gate SHALL pass, and any subsequent gate edit SHALL fail
