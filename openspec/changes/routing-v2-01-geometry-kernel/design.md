# Design

## Context

See `proposal.md` for motivation and `specs/routing-geometry-kernel/spec.md` for the behavioral contract. R01 starts a new Routing Engine V2 implementation; the existing top-level routing and `packages/draw/src/geometry/` modules are legacy, read-only reference boundaries and are not dependencies of this design.

The new production code is physically restricted to:

```text
packages/draw/src/routing/model/
packages/draw/src/routing/geometry/
```

New verification belongs under:

```text
packages/draw/tests/routing-v2/geometry/
```

The current Draw test configuration discovers only the legacy unit-test tree. R01 therefore needs a test-local Vitest configuration or an equivalent explicit invocation contained under the allowed V2 geometry test directory; changing the package-wide test configuration is not part of R01.

CURRENT_CHANGE distinguishes `R01_IMPLEMENTATION_SCOPE` from `R01_PROCESS_CONTROL_SCOPE`. Process repairs to change artifacts, CURRENT_CHANGE, master spec, implementation playbook, and the gate script do not expand the three implementation trees. Gate improvements are installed before implementation; product tasks only execute the installed gate, require PASS, and record evidence.

## Goals / Non-Goals

**Goals:**

- Establish small, readonly TypeScript value types for `Point`, `Vector`, `Rect`, `Segment`, `Direction`, and `Orientation`.
- Make finite-number validation, approximate equality, epsilon, and route precision single-source policies.
- Provide pure model-space geometry operations needed by later routing phases.
- Make model, view, and screen coordinate boundaries explicit without reading browser state.
- Provide deterministic point-sequence normalization primitives with idempotence and endpoint/order preservation contracts.
- Produce unit, property, and architecture evidence before implementation is considered complete.

**Non-Goals:**

- Terminal bindings, fixed or floating attachment, perimeter intersection, or shape-specific perimeter algorithms.
- Direction preference, quadrant-based route selection, jetty, orthogonal routing, route-pattern execution, or obstacle avoidance.
- Manual routing, segment handles or editing, preview/commit transactions, self-loops, rendering, persistence, or X6 integration.
- Replacing, wrapping, importing, or changing any legacy routing implementation.
- Exporting the V2 kernel from the package root; later integration changes will choose the public package boundary.

## Decisions

### 1. Layer the kernel as dependency-free model values plus pure geometry operations

`routing/model/` contains only value definitions, enums, coordinate-space markers, and their local factories. `routing/geometry/` contains validation, comparison, transformation, relation, classification, and normalization functions.

The dependency rule is:

```text
tests
  ↓
routing/geometry
  ↓
routing/model
```

`routing/model/` must not import `routing/geometry/`. Neither directory may import from higher Routing V2 layers, the package root, or legacy routing modules. Directory-local barrel files may expose stable R01 APIs without modifying `packages/draw/src/index.ts`.

Alternative considered: place all types and operations in one geometry module. Rejected because it encourages cycles when later terminal and router layers consume the model types and makes dependency evidence less precise.

### 2. Make V2 type ownership and migration isolation explicit

`packages/draw/src/routing/model/` owns the Routing Engine V2 domain geometry types. `Point`, `Vector`, `Rect`, `Segment`, `Direction`, and `Orientation` from that directory are canonical inside Routing Engine V2.

Existing legacy `Point`, `Rect`, vertex, persistence, and document types remain unchanged during R01-R09. V2 core must not import legacy routing or domain types merely to avoid temporary structural duplication. During R01-R09, unit and property tests construct V2 model types directly.

Cross-boundary conversion belongs to an adapter layer. X6/editor conversion belongs under `packages/draw/src/routing/adapters/x6/` during R10. Any persistence or document migration that proves necessary requires an explicitly scoped later change and is not part of R01. Legacy and V2 types must never become mutually dependent.

This coexistence is deliberate migration isolation: V2 establishes a clean canonical model while protected legacy behavior remains operational and read-only. It is not an invitation to create shared imports across the boundary.

Alternative considered: reuse `Point` and `Rect` from `routing/floatingAttachment.ts` or `document/schema.ts`. Rejected because those are protected legacy/integration types with responsibilities and migration timing outside R01.

### 3. Use readonly structural values and non-mutating operations

The model types use readonly fields. Factories and operations return new values and never mutate inputs. Runtime freezing is not required because it adds allocation/runtime cost without preventing untyped external mutation; readonly types, isolated construction, and immutability tests provide the R01 contract.

`Direction` contains the four cardinal values `WEST`, `NORTH`, `EAST`, and `SOUTH`. `Orientation` contains `HORIZONTAL` and `VERTICAL`. Segment classification is a separate result with `ZERO_LENGTH`, `HORIZONTAL`, `VERTICAL`, and `DIAGONAL`, so zero-length geometry is never accidentally accepted as orthogonal.

Alternative considered: mutable classes with methods. Rejected because method-owned state provides no benefit for these values and increases history-dependence risk.

### 4. Reject non-finite geometry at every public construction and operation boundary

The finite-number policy uses `Number.isFinite`. Public factories validate scalar fields, and public operations validate supplied geometry before calculating. `NaN`, positive infinity, negative infinity, non-finite transform parameters, and arithmetic overflow in a produced coordinate fail loudly with an error that identifies the operation and field. Values are never clamped or silently replaced.

Rectangles require finite `x`, `y`, `width`, and `height`, with non-negative width and height. Zero-size rectangles remain representable geometry; negative dimensions are rejected rather than implicitly normalized because implicit flipping would obscure caller errors.

Alternative considered: allow invalid plain objects and validate only final routes. Rejected because later layers would then receive corrupt intermediate values and produce misleading failures far from the source.

### 5. Centralize epsilon and route precision as different policies

The kernel defines:

```text
EPSILON = 1e-6
ROUTE_PRECISION = 0.1
```

`EPSILON` is the absolute tolerance for equality and classification. Approximate scalar equality is symmetric and evaluates `abs(a - b) <= EPSILON` after finite validation. Point equality applies the same policy independently to X and Y.

`ROUTE_PRECISION` is an explicit canonicalization grid, not a comparison tolerance. Canonicalization divides by `0.1`, selects the nearest integer magnitude, rounds an exact half-step away from zero, multiplies back by `0.1`, normalizes negative zero to positive zero, and validates the output. It must not delegate the tie decision to JavaScript `Math.round`, whose negative half-ties are asymmetric.

Required examples are:

```text
 0.04 ->  0.0    0.05 ->  0.1    0.14 ->  0.1    0.15 ->  0.2
-0.04 ->  0.0   -0.05 -> -0.1   -0.14 -> -0.1   -0.15 -> -0.2
```

Arithmetic helpers do not automatically quantize intermediate results; quantization occurs only through the separately invoked scalar API `quantizeCoordinate(value)`. No point-sequence normalization operation calls it. Scalar quantization idempotence is verified independently of structural normalization idempotence.

Alternative considered: use route precision as epsilon. Rejected because `0.1` is too coarse for invariant comparisons and would hide meaningful geometry differences. Per-call epsilon overrides are also rejected because they would fragment the numerical contract.

### 6. Represent coordinate spaces in types and transform them using supplied numeric state

`Point` and `Vector` carry a compile-time coordinate-space parameter or equivalent branded alias for model, view, and screen space. The brand has no rendering dependency and prevents accidental mixing in TypeScript. Routing primitives default to model space.

Pure transform data contains only finite scale and translation values:

```text
model → view:  view = model × scale + translation
view → model:  model = (view - translation) / scale
view → screen: screen = view + supplied screen offset
screen → view: view = screen - supplied screen offset
```

View scale must be finite and strictly positive, and both translation coordinates must be finite. An operation executes only when its computed outputs remain finite and rejects non-finite results. Structural validity and finite execution alone do not imply EPSILON round-trip accuracy.

An **EPSILON-CONDITIONED POINT/TRANSFORM PAIR** is evaluated independently for X and Y:

```text
scaled = coordinate * scale
view = scaled + translation
estimatedRoundTripErrorBound =
    8 * Number.EPSILON
    * max(1, abs(translation), abs(scaled), abs(view))
    / abs(scale)
```

Both calculated bounds must be finite and `<= EPSILON`. Only then does model → view → model guarantee `abs(recovered.x - original.x) <= EPSILON` AND `abs(recovered.y - original.y) <= EPSILON`. Structurally valid ill-conditioned pairs permit one-way conversion if its outputs are finite, without a strict round-trip guarantee. With `x = 1`, `scale = 1e-6`, `translation.x = 1e9`, the bound exceeds EPSILON; lost floating-point information need not be recovered.

View/screen addition and subtraction follow the formulas and finite-result policy without unconditional EPSILON recovery. Strict vector round-trip properties use the same conditioning bound with translation zero.

Point transforms apply scale and positional translation. Vector transforms apply scale only, never positional translation; inverse vector transforms divide by scale. R01 does not introduce rotation or general matrix transforms. The future UI adapter is responsible for supplying zoom, translation, and screen offset; the kernel must not read the DOM, `window`, pointer events, device pixel ratio, or application state.

Alternative considered: accept X6 matrices or DOM points. Rejected because either would invert the required dependency direction and make model geometry framework-dependent.

### 7. Keep geometry classification explicit and non-repairing

Segment classification first checks whether both endpoints are equal within `EPSILON`. `ZERO_LENGTH` is a separate category and `isOrthogonalSegment(ZERO_LENGTH)` returns false. Non-zero horizontal and vertical segments return true; diagonal returns false. A finite zero-length segment is representable geometry, not a construction error.

Manhattan distance is exactly `abs(dx) + abs(dy)` in model space and is not forced through coordinate approximate-equality semantics. Exactly identical points have distance `0`. Coordinate-wise approximately equal points may have Manhattan distance greater than `EPSILON`, up to `2 * EPSILON`. Translation computes `translated.x = point.x + delta.x` and `translated.y = point.y + delta.y` and returns new values. These operations validate finite inputs and outputs and have no hidden precision normalization.

Alternative considered: snap near-diagonal segments into orthogonal geometry during classification. Rejected because classification must expose invalid geometry rather than repair it.

### 8. Define rectangle relations without route preference semantics

Rectangle helpers expose finite edges, horizontal and vertical projection overlap, non-negative axis separation, relative side predicates, and translation. Exact touching and positive mathematical gaps less than or equal to `EPSILON` count as overlap and report zero separation. A gap greater than `EPSILON` is non-overlapping and reports its finite positive mathematical gap without implicit `ROUTE_PRECISION` quantization. Relations are symmetric where mathematically applicable. Common-translation relation invariance applies only to the TRANSLATION-STABLE domain defined below; arbitrary finite floating-point cancellation can change EPSILON-sensitive relations.

These helpers report geometry only. They do not select a source/target direction, quadrant route pattern, terminal side, or jetty; those decisions belong to R03 and later.

Alternative considered: return a routing quadrant from the rectangle helper. Rejected because that would leak direction-resolution policy into R01.

### 8a. Qualify translation properties without restricting production inputs

TRANSLATION-STABLE generated geometry uses SAFE_TRANSLATION_COORD_LIMIT = 1_000_000: integer-valued point coordinates, rectangle origins/dimensions (non-negative dimensions), and delta coordinates within [-1_000_000, +1_000_000]. Rectangle edges and translated coordinates remain exact integers far below 2^53. Non-degenerate segment axis differences are zero or comfortably above EPSILON; rectangle axis gaps are exactly zero/overlapping or at least 4 * EPSILON away from the overlap threshold. This domain is only for translation metamorphic properties; production APIs accept arbitrary finite floating-point inputs with finite-result validation.

Within this domain, translating all relevant geometry by a common delta preserves segment orientation, exact Manhattan distance, rectangle overlap/separation, and normalization semantics modulo translation: `normalizePointSequence(translate(S,D)) = translate(normalizePointSequence(S),D)`. Segment translation properties use non-degenerate integer-lattice segments; near-EPSILON classification is verified separately. Rectangle translation properties use integer origins and dimensions with gaps exactly zero/overlapping or at least `4 * EPSILON` away from the overlap threshold; deterministic touching, within-EPSILON, just-beyond-EPSILON, and clear-separation tests remain separate.

Arbitrary finite production inputs still execute according to IEEE-754 addition when output is finite; overflow is rejected with operation and offending field/result. With `A.x=0, B.x=1e-8, delta.x=1e9`, outputs can coincide; no universal separation or EPSILON-sensitive classification preservation is promised and no artificial recovery fix is required. This test domain does not replace the separate transform conditioning bound or its A/B/C categories.

### 9. Build normalization from independently testable primitives

The point-sequence primitives are composed in a documented order:

1. validate every input point;
2. remove adjacent geometrically duplicate points using EPSILON semantics;
3. remove redundant intermediate points that are horizontally or vertically collinear and lie between their neighbors;
4. revalidate finite output and preserve surviving order and coordinates exactly.

Adjacent duplicate removal never removes non-adjacent repeated points. Collinear reduction never removes a true orthogonal bend and does not treat a diagonal triple as valid orthogonal collinearity. The first and last geometric positions are retained whenever the sequence contains distinct endpoints. Structural normalization never calls `quantizeCoordinate`, quantizes, moves surviving points, invents points, projects diagonals, changes diagonal geometry to an axis, interchanges horizontal/vertical geometry, or performs terminal-aware preservation. Every surviving numeric coordinate is exactly its original value. For `[(0,0),(1,0.04)]` the output is unchanged and DIAGONAL; separately invoked `quantizeCoordinate(0.04)` returns positive zero. Tests also preserve every coordinate when no point is redundant and preserve neighboring survivor coordinates after removal. Normalization and scalar quantization are separate APIs with separate idempotence tests; later route-aware canonicalization is outside R01.

Alternative considered: reuse `packages/draw/src/geometry/normalizeRoute.ts`. Rejected because that file is inside the protected legacy boundary and would create a hidden dependency from V2 to legacy behavior.

### 10. Make deterministic tests and architecture evidence first-class outputs

Tests are grouped by contract rather than production filename:

- primitive construction; rectangle validity; and explicit rejection of `NaN`, positive infinity, and negative infinity;
- epsilon and route-precision bucket boundaries, positive and negative exact half-steps, negative coordinates, negative-zero normalization, and large finite values;
- segment classification, zero-length detection, orthogonality, Manhattan distance, and translation;
- rectangle exact touching, within-`EPSILON` overlap, beyond-`EPSILON` separation, relative placement, and TRANSLATION-STABLE common-translation invariance;
- model/view/screen point formulas, vector scaling without translation, invalid transforms, overflow rejection, conditioning evaluation, the explicit ill-conditioned example, and conditioned round trips;
- duplicate reduction, collinear reduction, and composed normalization;
- generated properties for normalization idempotence, EPSILON-conditioned model/view/model round trips, TRANSLATION-STABLE orientation/distance/normalization invariance, repeated-input determinism, Manhattan-distance symmetry, and TRANSLATION-STABLE rectangle-relation invariance;
- architecture checks for dependency direction and forbidden imports/globals.

Generated testing uses seed `0xFAD001` and at least 5000 executed cases per core property. Non-translation finite domains use coordinates/vectors and translations in `[-1e9, +1e9]`, scales in `[1e-6, 1e6]`, and exclude overflow. Translation metamorphic properties instead use the integer-lattice TRANSLATION-STABLE domain from decision 8a, including exact Manhattan equality and separate numerical boundary fixtures. Transform testing separates A: structurally valid conditioned pairs, B: structurally valid ill-conditioned pairs, and C: structurally invalid transforms. A actually exercises at least **5000 accepted conditioned pairs**, efficiently constructed rather than 5000 raw candidates mostly discarded, and asserts strict EPSILON round trips. Record accepted/rejected counts. B tests finite one-way formulas without a strict round-trip assertion. C requires deterministic rejection. Every category reports reproducible seed/path/counterexample; include the explicit ill-conditioned example.

Every generated failure reports the reproducible seed, generator path, and concrete counterexample provided by the test-local property harness. Because R01 may not modify `packages/draw/package.json` and `@frade/draw` does not declare `fast-check`, the initial harness is a deterministic generated-testing helper inside the allowed test tree using Vitest. Introducing a third-party property library requires a separately authorized manifest change; the required mathematical properties do not depend on that library choice.

The installed process architecture gate parses TypeScript imports and identifiers, resolves local dependencies by architectural category, and checks tracked/staged/untracked changes against CURRENT_CHANGE scopes. It rejects framework, legacy, higher-layer and adapter dependencies, browser/timing/display state, nondeterminism, protected legacy/reference modifications, focused/skipped tests, and TypeScript suppressions. Product-local fixtures exercise the installed checker without modifying the gate script.

Alternative considered: rely only on code review for framework independence. Rejected because the boundary is a hard invariant and needs repeatable executable evidence.

## Risks / Trade-offs

- [Approximate equality is not mathematically transitive] → Use it only for local geometric predicates, use explicit canonicalization when stable identity is required, and cover chained near-boundary values in tests.
- [Route precision can discard meaningful sub-decimal data if applied too early] → Keep quantization opt-in through the scalar helper and never quantize structural normalization or ordinary arithmetic implicitly.
- [Compile-time coordinate-space brands are erased at runtime] → Route all construction and conversion through validated factories/functions and verify round trips with runtime tests.
- [Finite transforms can lose information through cancellation or tiny scales] → Evaluate the per-coordinate conditioning bound; promise strict EPSILON round trips only for conditioned pairs while retaining finite one-way conversion for ill-conditioned pairs.
- [Rectangle touching semantics may affect later direction resolution] → Fix touching-as-overlap and zero-separation in R01 tests so R03 consumes an explicit contract rather than redefining it.
- [A custom deterministic property harness has less shrinking support than `fast-check`] → Use bounded generators, persist every failure seed and concrete counterexample, and authorize a package-manifest change before adopting a third-party library.
- [A test-local Vitest configuration can be omitted from broader commands] → Document and execute the explicit R01 test command, and require architecture-gate evidence that the suite actually ran.
- [Normalization may be misused later as a route repair mechanism] → Keep R01 primitives non-repairing, preserve diagonal evidence, and defer route invariant validation and semantic-bend preservation to their designated changes.

## Migration Plan

1. Obtain an independent `PRE_IMPLEMENTATION` gate PASS while `PHASE` remains `PLANNING`; only then may R01 enter implementation.
2. Add failing R01 unit, generated-property, transform, normalization, and architecture tests under the V2 geometry test directory.
3. Add model definitions and validated factories under `routing/model/` without changing package-root exports or legacy types.
4. Add numerical, geometric, transform, relation, and normalization operations under `routing/geometry/` until the targeted R01 tests pass.
5. Run the explicit unit and generated-property suites, affected Draw typecheck and applicable lint checks, and `routing:v2:arch-gate`; do not mark implementation tasks complete without executed results.
6. Run OpenSpec verification and a separate independent post-implementation Architecture Gate before archive.

The change is additive and not wired into legacy behavior, so rollback consists of removing the new V2 model/geometry modules and their new tests. No document migration, runtime feature flag, or persisted-data rollback is required in R01.
