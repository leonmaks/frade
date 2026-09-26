# Routing Geometry Kernel Specification Delta

## Purpose

The Routing Geometry Kernel provides deterministic, framework-independent model-space geometry contracts used by all later Frade Draw Routing Engine V2 capabilities.

## ADDED Requirements

### Requirement: Finite geometry primitives

The Routing Geometry Kernel SHALL own the Routing Engine V2 domain definitions for `Point`, `Vector`, `Rect`, `Segment`, `Direction`, and `Orientation`. Coordinate-bearing primitives SHALL use finite model-space numbers, and every public construction or operation boundary SHALL reject `NaN`, positive infinity, negative infinity, and non-finite calculated geometry instead of clamping or replacing it.

#### Scenario: Accept finite point coordinates

- **GIVEN** a point whose X and Y coordinates are finite numbers
- **WHEN** the point is validated by the geometry kernel
- **THEN** the point SHALL be accepted as valid geometry

#### Scenario: Reject NaN coordinate

- **GIVEN** a point whose X or Y coordinate is `NaN`
- **WHEN** the point is validated by the geometry kernel
- **THEN** the geometry SHALL be rejected as invalid

#### Scenario: Reject positive infinite coordinate

- **GIVEN** a point whose X or Y coordinate is positive infinity
- **WHEN** the point is validated by the geometry kernel
- **THEN** the geometry SHALL be rejected as invalid

#### Scenario: Reject negative infinite coordinate

- **GIVEN** a point whose X or Y coordinate is negative infinity
- **WHEN** the point is validated by the geometry kernel
- **THEN** the geometry SHALL be rejected as invalid

#### Scenario: Expose the R01 primitive vocabulary

- **GIVEN** a Routing Engine V2 consumer
- **WHEN** it uses the R01 domain model
- **THEN** `Point`, `Vector`, `Rect`, `Segment`, the four cardinal `Direction` values, and horizontal and vertical `Orientation` values SHALL be available without terminal, router, rendering, persistence, or framework state

#### Scenario: Geometry operations do not mutate inputs

- **GIVEN** valid V2 geometry values
- **WHEN** any R01 geometry operation produces a result
- **THEN** the supplied input values SHALL remain unchanged
- **AND** public model fields SHALL be readonly in TypeScript and producing operations SHALL return new values

---

### Requirement: Rectangle primitive validity

The Routing Geometry Kernel SHALL consider a rectangle valid only when `x`, `y`, `width`, and `height` are finite, `width >= 0`, and `height >= 0`. Zero-width and zero-height rectangles SHALL remain valid geometry primitives; negative dimensions SHALL be rejected rather than implicitly flipped or normalized.

#### Scenario: Reject negative width

- **GIVEN** a rectangle with a negative width and otherwise finite fields
- **WHEN** the rectangle is constructed or validated
- **THEN** the rectangle SHALL be rejected as invalid

#### Scenario: Reject negative height

- **GIVEN** a rectangle with a negative height and otherwise finite fields
- **WHEN** the rectangle is constructed or validated
- **THEN** the rectangle SHALL be rejected as invalid

#### Scenario: Accept zero width

- **GIVEN** a rectangle with zero width and otherwise valid fields
- **WHEN** the rectangle is constructed or validated
- **THEN** the rectangle SHALL be accepted as valid geometry

#### Scenario: Accept zero height

- **GIVEN** a rectangle with zero height and otherwise valid fields
- **WHEN** the rectangle is constructed or validated
- **THEN** the rectangle SHALL be accepted as valid geometry

---

### Requirement: Central numerical tolerance

The Routing Geometry Kernel SHALL define `EPSILON = 1e-6` as the one canonical absolute tolerance for approximate coordinate comparisons used by Routing Engine V2. Coordinates SHALL compare approximately equal exactly when `abs(a - b) <= EPSILON`. Points SHALL compare approximately equal exactly when both `abs(a.x - b.x) <= EPSILON` and `abs(a.y - b.y) <= EPSILON`.

#### Scenario: Coordinates within tolerance compare equal

- **GIVEN** two coordinates whose absolute difference is within the canonical epsilon
- **WHEN** approximate equality is evaluated
- **THEN** the coordinates SHALL be considered equal

#### Scenario: Coordinates outside tolerance compare different

- **GIVEN** two coordinates whose absolute difference exceeds the canonical epsilon
- **WHEN** approximate equality is evaluated
- **THEN** the coordinates SHALL be considered different

#### Scenario: Equality is symmetric

- **GIVEN** coordinates A and B
- **WHEN** approximate equality is evaluated as `equal(A, B)` and `equal(B, A)`
- **THEN** both evaluations SHALL return the same result

#### Scenario: Point equality requires both coordinates within epsilon

- **GIVEN** two points whose X and Y coordinate differences are each less than or equal to `EPSILON`
- **WHEN** approximate point equality is evaluated
- **THEN** the points SHALL be considered approximately equal

#### Scenario: Point equality rejects either coordinate outside epsilon

- **GIVEN** two points whose X or Y coordinate difference exceeds `EPSILON`
- **WHEN** approximate point equality is evaluated
- **THEN** the points SHALL be considered different

---

### Requirement: Canonical routing precision

The Routing Geometry Kernel SHALL define `ROUTE_PRECISION = 0.1` and SHALL expose the opt-in scalar helper `quantizeCoordinate(value)` to quantize a coordinate to the nearest integer multiple of `ROUTE_PRECISION`. Exact half-step ties SHALL round away from zero, and negative zero SHALL be normalized to positive zero. This policy SHALL NOT depend on display zoom, device pixel ratio, screen-space rounding, or JavaScript `Math.round` behavior for negative half-ties.

#### Scenario: Values inside the same quantization bucket quantize identically

- **GIVEN** coordinate values `0.01` and `0.04`
- **WHEN** both values are explicitly quantized
- **THEN** both SHALL produce `0.0`

#### Scenario: Values on opposite sides of a bucket boundary remain distinct

- **GIVEN** coordinate values `0.04` and `0.06`
- **WHEN** both values are explicitly quantized
- **THEN** the first SHALL produce `0.0`
- **AND** the second SHALL produce `0.1`

#### Scenario: Positive exact half-step rounds away from zero

- **GIVEN** coordinate values `0.05` and `0.15`
- **WHEN** both values are explicitly quantized
- **THEN** they SHALL produce `0.1` and `0.2`, respectively

#### Scenario: Negative exact half-step rounds away from zero

- **GIVEN** coordinate values `-0.05` and `-0.15`
- **WHEN** both values are explicitly quantized
- **THEN** they SHALL produce `-0.1` and `-0.2`, respectively

#### Scenario: Non-tie values quantize to the nearest multiple

- **GIVEN** coordinate values `0.14`, `-0.04`, and `-0.14`
- **WHEN** the values are explicitly quantized
- **THEN** they SHALL produce `0.1`, `0.0`, and `-0.1`, respectively

#### Scenario: Negative zero is normalized

- **GIVEN** a negative coordinate whose canonical value would otherwise be negative zero
- **WHEN** the value is canonicalized
- **THEN** the result SHALL be positive zero

#### Scenario: Precision is independent of zoom

- **GIVEN** identical model-space geometry viewed at two different zoom levels
- **WHEN** coordinate canonicalization is performed
- **THEN** the canonical model-space values SHALL be identical

#### Scenario: Scalar quantization is separately idempotent

- **GIVEN** a valid finite scalar accepted by `quantizeCoordinate`
- **WHEN** scalar quantization is applied twice
- **THEN** the second scalar result SHALL be exactly identical to the first

#### Scenario: Explicit scalar quantization is opt-in

- **GIVEN** coordinate `0.04`
- **WHEN** `quantizeCoordinate(0.04)` is explicitly invoked
- **THEN** the result SHALL be positive `0.0`
- **AND** point-sequence normalization SHALL be a separate API that never invokes this helper

#### Scenario: Ordinary arithmetic is not implicitly quantized

- **GIVEN** valid finite geometry supplied to distance, translation, relation, transform, or point-sequence normalization operations
- **WHEN** the operation executes without invoking a named canonicalization API
- **THEN** its result SHALL NOT be implicitly quantized to `ROUTE_PRECISION`

---

### Requirement: Segment orientation classification

The Routing Geometry Kernel SHALL classify non-zero-length segments as horizontal, vertical, or diagonal using the canonical numerical tolerance.

#### Scenario: Classify horizontal segment

- **GIVEN** a segment whose endpoint Y coordinates are equal within tolerance
- **AND** whose endpoint X coordinates differ
- **WHEN** its orientation is classified
- **THEN** the segment SHALL be classified as horizontal

#### Scenario: Classify vertical segment

- **GIVEN** a segment whose endpoint X coordinates are equal within tolerance
- **AND** whose endpoint Y coordinates differ
- **WHEN** its orientation is classified
- **THEN** the segment SHALL be classified as vertical

#### Scenario: Classify diagonal segment

- **GIVEN** a segment whose endpoint X coordinates differ beyond tolerance
- **AND** whose endpoint Y coordinates differ beyond tolerance
- **WHEN** its orientation is classified
- **THEN** the segment SHALL be classified as diagonal

#### Scenario: Detect zero-length segment

- **GIVEN** a segment whose two endpoints are equal within tolerance
- **WHEN** its geometry is classified
- **THEN** the segment SHALL be identified as zero-length rather than horizontal or vertical routing geometry

---

### Requirement: Orthogonality predicate

The Routing Geometry Kernel SHALL classify `ZERO_LENGTH` separately and SHALL return false from `isOrthogonalSegment` for that category. Non-zero-length horizontal and vertical segments SHALL return true; diagonal segments SHALL return false.

#### Scenario: Horizontal segment is orthogonal

- **GIVEN** a valid horizontal segment
- **WHEN** orthogonality is evaluated
- **THEN** the segment SHALL be considered orthogonal

#### Scenario: Vertical segment is orthogonal

- **GIVEN** a valid vertical segment
- **WHEN** orthogonality is evaluated
- **THEN** the segment SHALL be considered orthogonal

#### Scenario: Diagonal segment is not orthogonal

- **GIVEN** a diagonal segment
- **WHEN** orthogonality is evaluated
- **THEN** the segment SHALL NOT be considered orthogonal

#### Scenario: Zero-length segment is not orthogonal

- **GIVEN** a finite segment classified as `ZERO_LENGTH`
- **WHEN** `isOrthogonalSegment` is evaluated
- **THEN** it SHALL return false
- **AND** zero-length geometry SHALL remain a separate representable classification rather than being treated as horizontal or vertical

---

### Requirement: Manhattan distance

The Routing Geometry Kernel SHALL compute Manhattan distance deterministically in model space.

#### Scenario: Compute Manhattan distance

- **GIVEN** points A and B
- **WHEN** Manhattan distance is calculated
- **THEN** the result SHALL equal the absolute X separation plus the absolute Y separation

#### Scenario: Manhattan distance is symmetric

- **GIVEN** points A and B
- **WHEN** distance is calculated from A to B and from B to A
- **THEN** both results SHALL be equal

#### Scenario: Manhattan distance of identical points is zero

- **GIVEN** two points whose X coordinates are exactly identical and whose Y coordinates are exactly identical
- **WHEN** Manhattan distance is calculated
- **THEN** the result SHALL be exactly `0`

#### Scenario: Approximately equal points may exceed one epsilon of Manhattan distance

- **GIVEN** two points whose X-coordinate difference is at most `EPSILON`
- **AND** whose Y-coordinate difference is at most `EPSILON`
- **WHEN** Manhattan distance is calculated
- **THEN** the result SHALL equal the sum of the two absolute coordinate differences
- **AND** the result MAY be greater than `EPSILON`
- **AND** the result SHALL be at most `2 * EPSILON`

---

### Requirement: Geometry translation

The Routing Geometry Kernel SHALL translate points using `translated.x = point.x + delta.x` and `translated.y = point.y + delta.y`. Inputs and displacement coordinates SHALL be finite and calculated outputs SHALL be finite; otherwise the operation SHALL reject the offending field/result according to the R01 error contract. Production translation SHALL accept arbitrary finite floating-point geometry when outputs remain finite, but SHALL NOT promise universal topology, distance, or EPSILON-sensitive relation invariance.

TRANSLATION-STABLE generated geometry uses SAFE_TRANSLATION_COORD_LIMIT = 1_000_000: integer-valued point coordinates, rectangle origins/dimensions (non-negative dimensions), and delta coordinates within [-1_000_000, +1_000_000]. Rectangle edges and translated coordinates remain exact integers far below 2^53. Non-degenerate segment axis differences are zero or comfortably above EPSILON; rectangle axis gaps are exactly zero/overlapping or at least 4 * EPSILON away from the overlap threshold. This domain is only for translation metamorphic properties; production APIs accept arbitrary finite floating-point inputs with finite-result validation.

For TRANSLATION-STABLE geometry, common translation SHALL preserve segment orientation, exact Manhattan distance, rectangle overlap/separation classification, and structural normalization semantics modulo the common translation. Arbitrary finite ill-conditioned inputs MAY execute when outputs are finite without classification or separation preservation guarantees. Translation stability is separate from point/view-transform conditioning.

#### Scenario: Translate point

- **GIVEN** a model-space point P
- **AND** a displacement delta
- **WHEN** P is translated by delta
- **THEN** the resulting X SHALL equal `P.x + delta.x`
- **AND** the resulting Y SHALL equal `P.y + delta.y`

#### Scenario: Translation preserves segment orientation

- **GIVEN** a TRANSLATION-STABLE non-degenerate segment classified as horizontal, vertical, or diagonal
- **WHEN** both endpoints are translated by the same safe integer displacement
- **THEN** the translated segment SHALL retain its original orientation

#### Scenario: Translation preserves Manhattan distance

- **GIVEN** TRANSLATION-STABLE points A and B
- **WHEN** both points are translated by the same safe integer displacement
- **THEN** their Manhattan distances before and after translation SHALL be exactly equal

#### Scenario: Reject non-finite translation output

- **GIVEN** finite point and delta coordinates whose addition overflows
- **WHEN** translation executes
- **THEN** it SHALL reject the non-finite result with operation and offending field/result identified

#### Scenario: Cancellation outside the translation-stable domain

- **GIVEN** A.x = `0`, B.x = `1e-8`, equal finite Y coordinates, and delta.x = `1e9`
- **WHEN** both points are translated with finite outputs
- **THEN** each output SHALL follow IEEE-754 addition
- **AND** the resulting X coordinates MAY coincide without preserving the original tiny separation
- **AND** this loss SHALL NOT be treated as a kernel defect or require an artificial recovery fix

#### Scenario: Normalization commutes with safe translation

- **GIVEN** a TRANSLATION-STABLE point sequence and safe common displacement D
- **WHEN** structural normalization and translation are executed in either order
- **THEN** `normalizePointSequence(translate(sequence, D))` SHALL equal `translate(normalizePointSequence(sequence), D)` with identical surviving order and coordinates

---

### Requirement: Rectangle relation primitives

The Routing Geometry Kernel SHALL provide deterministic rectangle relation primitives required by later routing stages, including X/Y projections, horizontal overlap, vertical overlap, non-negative horizontal/vertical separation, and basic relative scalar/rectangle placement. Routing quadrant classification, source/target quadrant logic, direction preference, and routing direction selection SHALL remain outside R01 and belong to R03 Direction Resolver. Two axis projections SHALL count as overlapping when their mathematical separation is less than or equal to `EPSILON`. An overlapping pair SHALL report zero separation; a non-overlapping pair SHALL report its finite positive mathematical gap without implicit `ROUTE_PRECISION` quantization.

#### Scenario: Detect horizontal overlap

- **GIVEN** two rectangles whose projections on the X axis overlap
- **WHEN** horizontal overlap is evaluated
- **THEN** the kernel SHALL report horizontal overlap

#### Scenario: Detect no horizontal overlap

- **GIVEN** two rectangles separated on the X axis
- **WHEN** horizontal overlap is evaluated
- **THEN** the kernel SHALL report no horizontal overlap
- **AND** SHALL provide their horizontal separation consistently with the geometry contract

#### Scenario: Detect vertical overlap

- **GIVEN** two rectangles whose projections on the Y axis overlap
- **WHEN** vertical overlap is evaluated
- **THEN** the kernel SHALL report vertical overlap

#### Scenario: Detect no vertical overlap

- **GIVEN** two rectangles separated on the Y axis
- **WHEN** vertical overlap is evaluated
- **THEN** the kernel SHALL report no vertical overlap
- **AND** SHALL provide their vertical separation consistently with the geometry contract

#### Scenario: Exact touching counts as overlap

- **GIVEN** two axis projections whose boundaries touch exactly
- **WHEN** overlap and separation are evaluated
- **THEN** the projections SHALL be reported as overlapping
- **AND** their separation SHALL be exactly `0`

#### Scenario: Within-epsilon separation counts as overlap

- **GIVEN** two axis projections whose positive mathematical gap is greater than `0` and less than or equal to `EPSILON`
- **WHEN** overlap and separation are evaluated
- **THEN** the projections SHALL be reported as overlapping
- **AND** their reported separation SHALL be `0`

#### Scenario: Separation beyond epsilon remains positive

- **GIVEN** two axis projections whose mathematical gap exceeds `EPSILON`
- **WHEN** overlap and separation are evaluated
- **THEN** the projections SHALL be reported as non-overlapping
- **AND** their reported separation SHALL equal the finite positive mathematical gap
- **AND** the reported separation SHALL never be negative

#### Scenario: Report relative placement from rectangle edges

- **GIVEN** two valid rectangles separated beyond `EPSILON` on an axis
- **WHEN** relative placement is evaluated on that axis
- **THEN** the kernel SHALL deterministically identify which rectangle is before or after the other from their finite edges

#### Scenario: Rectangle relation is translation invariant

- **GIVEN** two TRANSLATION-STABLE integer-lattice rectangles with a known overlap and separation relationship
- **AND** each axis gap is exactly zero/overlapping or at least `4 * EPSILON` away from the overlap threshold
- **WHEN** both rectangles are translated by the same safe integer displacement
- **THEN** their overlap and separation relationship SHALL remain unchanged

---

### Requirement: Explicit coordinate spaces

The Routing Geometry Kernel SHALL distinguish model, view, and screen coordinate transformations and use model space as authoritative. A view transform SHALL be structurally valid only with finite `scale > 0` and finite translation X/Y. A point operation SHALL execute only with finite computed outputs and reject non-finite results. Forward and inverse formulas SHALL be `view = model * scale + translation` and `model = (view - translation) / scale`. Finite structural validity and finite execution SHALL NOT alone imply EPSILON round-trip accuracy.

`Point` and `Vector` SHALL distinguish model/view/screen space through compile-time space parameters or equivalent branded aliases; model space SHALL be the default for routing primitives. An **EPSILON-CONDITIONED POINT/TRANSFORM PAIR** SHALL have finite error bounds `<= EPSILON` independently for X and Y, calculated from the corresponding coordinate and translation:

```text
scaled = coordinate * scale
view = scaled + translation
estimatedRoundTripErrorBound =
    8 * Number.EPSILON
    * max(1, abs(translation), abs(scaled), abs(view))
    / abs(scale)
```

Only such pairs SHALL carry the model → view → model guarantee `abs(recovered.x - original.x) <= EPSILON` AND `abs(recovered.y - original.y) <= EPSILON`. Structurally valid ill-conditioned pairs SHALL remain valid for one-way conversion when its output is finite and SHALL NOT carry a strict EPSILON round-trip guarantee.

For each coordinate the kernel SHALL calculate `scaled = coordinate * scale`, `view = scaled + translation`, and `estimatedRoundTripErrorBound = 8 * Number.EPSILON * max(1, abs(translation), abs(scaled), abs(view)) / abs(scale)`; both coordinate bounds SHALL be finite and `<= EPSILON` to classify the pair as conditioned.

#### Scenario: Model to view transformation

- **GIVEN** a model-space point
- **AND** a view scale and translation
- **WHEN** the point is transformed into view space
- **THEN** the resulting point SHALL reflect the supplied scale and translation

#### Scenario: Reject zero scale

- **GIVEN** a view transform whose scale is `0`
- **WHEN** the transform is validated
- **THEN** the transform SHALL be rejected as invalid

#### Scenario: Reject negative scale

- **GIVEN** a view transform whose scale is negative
- **WHEN** the transform is validated
- **THEN** the transform SHALL be rejected as invalid

#### Scenario: Reject NaN scale

- **GIVEN** a view transform whose scale is `NaN`
- **WHEN** the transform is validated
- **THEN** the transform SHALL be rejected as invalid

#### Scenario: Reject infinite scale

- **GIVEN** a view transform whose scale is positive or negative infinity
- **WHEN** the transform is validated
- **THEN** the transform SHALL be rejected as invalid

#### Scenario: Reject non-finite translation

- **GIVEN** a view transform whose X or Y translation is `NaN`, positive infinity, or negative infinity
- **WHEN** the transform is validated
- **THEN** the transform SHALL be rejected as invalid

#### Scenario: Reject non-finite forward result

- **GIVEN** a structurally valid transform and finite input point whose multiplication or addition would produce a non-finite output coordinate
- **WHEN** the forward transform is applied
- **THEN** the operation SHALL reject the input/result
- **AND** SHALL NOT return `NaN` or infinity

#### Scenario: View to model inverse transformation

- **GIVEN** an EPSILON-conditioned model-space point/transform pair transformed into view space
- **WHEN** the inverse transform is applied
- **THEN** the recovered model-space point SHALL equal the original point within `EPSILON`

#### Scenario: Round trip remains stable across zoom values

- **GIVEN** the same model-space point
- **AND** point/transform pairs that are EPSILON-conditioned for each tested zoom
- **WHEN** it is transformed model-to-view-to-model using those zoom values
- **THEN** every recovered point SHALL equal the original model-space point within `EPSILON`

#### Scenario: Identify the explicit ill-conditioned pair

- **GIVEN** `x = 1`, `scale = 1e-6`, and `translation.x = 1e9`, with finite Y data
- **WHEN** numerical conditioning is evaluated with the specified bound
- **THEN** the pair SHALL NOT be classified as EPSILON-conditioned
- **AND** the kernel SHALL NOT promise an EPSILON round-trip guarantee for that pair
- **AND** it SHALL NOT be required to recover mathematically lost floating-point information

#### Scenario: Execute finite one-way conversion for an ill-conditioned pair

- **GIVEN** a structurally valid but ill-conditioned point/transform pair
- **AND** a forward or inverse operation whose computed outputs are finite
- **WHEN** that one-way operation executes
- **THEN** it SHALL return the stated affine formula result without rejecting solely for ill-conditioning
- **AND** no strict EPSILON round-trip guarantee SHALL be asserted

#### Scenario: Reject non-finite inverse output

- **GIVEN** a structurally valid transform and finite view point whose inverse subtraction or division produces a non-finite result
- **WHEN** the inverse transform executes
- **THEN** the operation SHALL deterministically reject the result

#### Scenario: Routing geometry remains model-space authoritative

- **GIVEN** identical semantic model geometry rendered with different view transforms
- **WHEN** the underlying geometry primitives are evaluated
- **THEN** their model-space values SHALL remain unchanged

#### Scenario: Coordinate-space types prevent accidental mixing

- **GIVEN** model, view, and screen point/vector types
- **WHEN** a TypeScript consumer passes one space to an operation requiring another
- **THEN** the type contract SHALL reject the mismatch unless an explicit transform is used

#### Scenario: Transform view point into screen space

- **GIVEN** a valid view-space point and a finite supplied screen offset
- **WHEN** the point is transformed into screen space
- **THEN** the screen point SHALL equal the view point plus the supplied offset

#### Scenario: Transform screen point into view space

- **GIVEN** a valid screen-space point produced using a finite supplied screen offset
- **WHEN** the inverse screen transform is applied
- **THEN** each resulting view coordinate SHALL equal the supplied screen coordinate minus the supplied screen offset
- **AND** non-finite outputs SHALL be rejected
- **AND** finite screen/view execution alone SHALL NOT promise EPSILON recovery of an earlier point

#### Scenario: Reject non-finite screen offset

- **GIVEN** a screen offset containing `NaN`, positive infinity, or negative infinity
- **WHEN** a view/screen transformation is requested
- **THEN** the operation SHALL reject the offset

---

### Requirement: Vector coordinate transformations

The Routing Geometry Kernel SHALL transform vectors between model and view spaces using only scale. The forward transform SHALL use `viewVector = modelVector * scale`, the inverse transform SHALL divide by scale, and positional translation SHALL never be applied to a vector. R01 SHALL NOT introduce rotation or general matrix transforms.

#### Scenario: Transform model vector into view space

- **GIVEN** a valid model-space vector and structurally valid view transform
- **WHEN** the vector is transformed into view space
- **THEN** each vector coordinate SHALL be multiplied by the transform scale
- **AND** the transform translation SHALL NOT affect the result

#### Scenario: Inverse-transform view vector into model space

- **GIVEN** a valid model-space vector transformed into view space with a valid transform
- **WHEN** the inverse vector transform is applied
- **THEN** each view-vector coordinate SHALL be divided by the transform scale
- **AND** a strict EPSILON recovery guarantee SHALL apply only when the per-coordinate conditioning bound from Explicit coordinate spaces, using translation zero, is `<= EPSILON` for both coordinates

#### Scenario: Reject non-finite vector transform result

- **GIVEN** a valid transform and finite vector whose scaling would produce a non-finite coordinate
- **WHEN** the vector transform is applied
- **THEN** the operation SHALL reject the input/result instead of returning `NaN` or infinity

---

### Requirement: Adjacent duplicate point reduction

The Routing Geometry Kernel SHALL provide a deterministic primitive for removing adjacent geometrically duplicate points while preserving point order and route endpoints.

#### Scenario: Remove one adjacent duplicate

- **GIVEN** an ordered sequence `A, B, B, C`
- **WHEN** adjacent duplicate reduction is applied
- **THEN** the resulting sequence SHALL be `A, B, C`

#### Scenario: Remove repeated duplicate run

- **GIVEN** an ordered sequence containing multiple adjacent copies of the same geometric point
- **WHEN** adjacent duplicate reduction is applied
- **THEN** exactly one representative of that adjacent run SHALL remain

#### Scenario: Preserve non-adjacent equal points

- **GIVEN** an ordered sequence `A, B, A`
- **WHEN** adjacent duplicate reduction is applied
- **THEN** the sequence SHALL remain `A, B, A`

#### Scenario: Duplicate reduction is idempotent

- **GIVEN** any valid point sequence
- **WHEN** adjacent duplicate reduction is applied twice
- **THEN** the second result SHALL equal the first result

---

### Requirement: Collinear point reduction

The Routing Geometry Kernel SHALL provide a deterministic primitive for removing redundant intermediate points from collinear orthogonal point sequences while preserving endpoints.

#### Scenario: Remove redundant horizontal intermediate point

- **GIVEN** three consecutive points A, B, and C that are horizontally collinear
- **AND** B lies between A and C
- **WHEN** collinear reduction is applied
- **THEN** B SHALL be removed

#### Scenario: Remove redundant vertical intermediate point

- **GIVEN** three consecutive points A, B, and C that are vertically collinear
- **AND** B lies between A and C
- **WHEN** collinear reduction is applied
- **THEN** B SHALL be removed

#### Scenario: Preserve orthogonal bend

- **GIVEN** three consecutive points that form a horizontal-to-vertical or vertical-to-horizontal turn
- **WHEN** collinear reduction is applied
- **THEN** the bend point SHALL be preserved

#### Scenario: Preserve diagonal evidence and non-between points

- **GIVEN** a diagonal triple or an axis-collinear middle point that does not lie between its neighbors
- **WHEN** collinear reduction executes
- **THEN** it SHALL retain that middle point rather than repair diagonal geometry or remove a reversal

#### Scenario: Preserve sequence endpoints

- **GIVEN** any valid point sequence containing at least two distinct points
- **WHEN** collinear reduction is applied
- **THEN** the first and last points SHALL remain present

---

### Requirement: Geometry normalization idempotence

The Routing Geometry Kernel SHALL provide structural point-sequence normalization, such as `normalizePointSequence(...)`, whose output is idempotent. QUANTIZATION and POINT-SEQUENCE NORMALIZATION SHALL be separate operations. Normalization SHALL only remove adjacent duplicates under EPSILON semantics and redundant between-aware orthogonal collinear intermediate points, preserving surviving order and every surviving original numeric coordinate exactly. It SHALL NOT invoke `quantizeCoordinate`, quantize, move surviving points, invent points, project diagonals onto an axis, turn diagonal geometry into horizontal/vertical geometry, or interchange horizontal and vertical geometry. Scalar quantization idempotence SHALL be tested separately from normalization idempotence.

#### Scenario: Normalize twice

- **GIVEN** any valid geometry sequence accepted by the normalization primitive
- **WHEN** normalization is applied to the sequence
- **AND** normalization is applied again to the normalized result
- **THEN** the second result SHALL be geometrically identical to the first result

#### Scenario: Normalization preserves point ordering

- **GIVEN** an ordered geometry sequence
- **WHEN** normalization removes only redundant geometry
- **THEN** all surviving points SHALL retain their original relative ordering

#### Scenario: Preserve topology-changing quantization counterexample

- **GIVEN** point sequence `[(0,0), (1,0.04)]`
- **WHEN** point-sequence normalization executes
- **THEN** it SHALL return those coordinates exactly unchanged and retain DIAGONAL evidence
- **AND** it SHALL NOT turn the segment into `[(0,0), (1,0)]`

#### Scenario: Preserve coordinates when no point is redundant

- **GIVEN** a finite sequence with no adjacent duplicate or redundant collinear point
- **WHEN** normalization executes
- **THEN** every point coordinate SHALL remain exactly identical to its input coordinate

#### Scenario: Preserve coordinates of survivors after reduction

- **GIVEN** a sequence containing adjacent duplicates or redundant collinear intermediate points
- **WHEN** structural normalization removes a redundant point
- **THEN** all surviving neighboring points SHALL retain their original numeric coordinates exactly

#### Scenario: Normalization does not introduce new geometry

- **GIVEN** a valid point sequence
- **WHEN** normalization is performed
- **THEN** normalization SHALL NOT introduce new bend points

---

### Requirement: Deterministic geometry operations

The Routing Geometry Kernel SHALL return identical semantic results for identical semantic inputs and SHALL not depend on rendering state or execution history.

#### Scenario: Repeated operation produces identical result

- **GIVEN** identical valid geometry input
- **WHEN** the same geometry operation is executed repeatedly
- **THEN** every execution SHALL produce the same result

#### Scenario: Previous operations do not affect result

- **GIVEN** a valid geometry operation and input
- **WHEN** unrelated geometry operations execute before it
- **THEN** its result SHALL remain unchanged

#### Scenario: View zoom does not affect model result

- **GIVEN** identical model-space input evaluated under different view zoom configurations
- **WHEN** a model-space geometry operation executes
- **THEN** its semantic result SHALL be identical

---

### Requirement: Geometry kernel scope boundary

The Routing Geometry Kernel SHALL expose geometry behavior without requiring terminal attachment, routing strategy, segment editing, rendering, persistence, document schemas, React, AntV X6, Electron, browser DOM state, or legacy routing/domain types. V2 model types SHALL remain canonical inside Routing Engine V2 and SHALL NOT become mutually dependent with legacy types.

R01 product code and tests SHALL remain inside the three R01_IMPLEMENTATION_SCOPE trees from CURRENT_CHANGE. Geometry SHALL depend only inward on model; model SHALL NOT import geometry or higher layers. Directory-local exports SHALL NOT expose R01 through the package root. Process/control artifacts are separate from product implementation, and R01 product tasks SHALL only execute the already-installed architecture gate, require PASS, and record evidence.

Core operations SHALL NOT depend on browser globals, timing/display state, `Math.random`, or legacy algorithms. Invalid geometry errors SHALL identify the operation and offending field/result so failures remain actionable without clamping or silent recovery.

#### Scenario: Use geometry kernel without diagram framework

- **GIVEN** a consumer that provides only valid model-space geometry values
- **WHEN** the consumer invokes Geometry Kernel operations
- **THEN** those operations SHALL be usable without constructing a React component, X6 graph, Electron object, or DOM element

#### Scenario: Geometry operation requires no routing state

- **GIVEN** valid geometry primitives
- **WHEN** a Geometry Kernel operation is executed
- **THEN** it SHALL NOT require source terminals, target terminals, routing modes, route hints, jetty configuration, or edge-editor state

#### Scenario: Construct V2 geometry without legacy types

- **GIVEN** a Routing Engine V2 unit or property test
- **WHEN** the test constructs geometry-kernel input
- **THEN** it SHALL construct V2 model types directly
- **AND** SHALL NOT import legacy `Point`, `Rect`, vertex, routing, persistence, or document-schema types

#### Scenario: Defer cross-boundary conversion to adapters

- **GIVEN** legacy, editor, X6, persistence, or document data that must later cross into Routing Engine V2
- **WHEN** a future explicitly scoped integration or migration change performs that conversion
- **THEN** the conversion SHALL occur at an adapter or migration boundary
- **AND** R01 SHALL NOT add that integration or migration behavior

---

### Requirement: Reproducible generated geometry verification

R01 SHALL verify normalization idempotence, conditioned transform round trips, TRANSLATION-STABLE orientation/distance/normalization invariance, repeated-input determinism, Manhattan-distance symmetry, and TRANSLATION-STABLE rectangle-relation translation invariance with seed `0xFAD001` and at least 5000 executed cases per core property. Transform verification SHALL distinguish structurally valid conditioned pairs (A), structurally valid ill-conditioned pairs (B), and structurally invalid transforms (C). A SHALL actually exercise at least 5000 accepted conditioned point/transform pairs, with per-coordinate EPSILON recovery assertions and recorded accepted/rejected counts; discarded raw candidates SHALL NOT count. The generator SHALL construct enough conditioned pairs efficiently instead of satisfying a raw count with mostly discarded inputs. B SHALL verify finite one-way formulas without a strict round-trip assertion. C SHALL require deterministic rejection. Non-translation finite generation SHALL use coordinates/vectors/translations within `[-1e9, +1e9]` and scales in `[1e-6, 1e6]`, excluding overflow. Translation metamorphic properties SHALL instead use the TRANSLATION-STABLE integer-lattice domain defined in Geometry translation, with `SAFE_TRANSLATION_COORD_LIMIT = 1_000_000`, non-degenerate significant segment differences above EPSILON, and rectangle gaps zero/overlapping or at least `4 * EPSILON` away from the overlap threshold. Safe-domain Manhattan translation assertions SHALL use exact equality. Near-EPSILON segment/rectangle boundary tests SHALL remain separate deterministic tests and SHALL NOT be weakened or mixed into translation metamorphic generation. Scalar quantization idempotence SHALL be checked separately. Deterministic fixtures SHALL include the normalization `(0,0) -> (1,0.04)` and translation `0, 1e-8, delta=1e9` counterexamples. Failures SHALL report reproducible seed, generator path, and concrete counterexample.

#### Scenario: Exercise accepted conditioned round trips

- **GIVEN** seed `0xFAD001` and structurally valid EPSILON-conditioned point/transform pairs
- **WHEN** the generated model → view → model property suite completes
- **THEN** at least 5000 accepted pairs SHALL have exercised recovery within EPSILON independently for X and Y
- **AND** rejected candidates SHALL be reported separately and SHALL NOT count toward the accepted total

#### Scenario: Keep ill-conditioned and invalid categories separate

- **GIVEN** generated or deterministic category B and C inputs
- **WHEN** transform verification runs
- **THEN** B SHALL exercise finite one-way conversion without strict EPSILON round-trip assertions
- **AND** C SHALL deterministically reject invalid transforms

#### Scenario: Reproduce a generated property failure

- **GIVEN** a failing generated geometry property
- **WHEN** the harness reports the failure
- **THEN** it SHALL include seed, generator path, and concrete counterexample sufficient to replay it
- **AND** the counterexample SHALL be retained as a deterministic regression fixture
