# Orthogonal Router Spec Delta

## Purpose

Produce deterministic model-space automatic orthogonal routes from semantic terminal bindings, preserving direction constraints, fixed attachment, jetty minima and inspectable evidence independently of frameworks and manual routing.

## ADDED Requirements

### Requirement: Model space automatic routing boundary

The router SHALL accept R02 fixed/floating bindings with their terminal geometry or explicit anchors without geometry, jetty configuration and optional marker metadata. Every coordinate-bearing value SHALL be ModelSpace using existing R01 types. ViewSpace, ScreenSpace and widened-space values SHALL fail compiler fixtures. Anchor bounds for direction classification SHALL be zero-size rectangles at the anchor. Equal cell identities on two attached endpoints SHALL be rejected as requiring R08 self-loop routing; equal coordinates alone SHALL NOT imply equal cell identity. Manual hints, rotation, persisted route points and display state SHALL not be accepted as routing inputs. Output SHALL be a new deeply immutable derived point sequence including both endpoints, selected directions and copied execution evidence.

#### Scenario: Space and readonly compiler boundaries
- **WHEN** strict tsc checks view/screen/widened input or writes to a returned route/evidence
- **THEN** those cases SHALL fail compilation while valid model-space inputs compile

#### Scenario: Same cell and coincident distinct cells
- **WHEN** two endpoints name the same cell or two different cells have coincident geometry
- **THEN** the same-cell case SHALL be explicitly rejected before routing; the distinct-cell case SHALL follow the declared geometry policies

### Requirement: Finite input and derived arithmetic

Consumed numbers, edges, centers, offsets, jetty sums, distances, expanded bounds, instruction limits, point coordinates and path costs SHALL be finite. Negative extents or numeric jetty/marker sizes SHALL reject. Malformed bindings/options/masks SHALL reject with TypeError; invalid numeric values, overflow or unrepresentable required geometry SHALL reject with RangeError identifying operation and field. R02 perimeter degeneracy policy SHALL remain unchanged. EPSILON=1e-6 SHALL remain the sole geometric tolerance; routing SHALL neither quantize coordinates nor introduce pixel/grid tolerance. An internal invariant failure SHALL throw an actionable error, never return a successful invalid route or call a substitute router.

#### Scenario: Overflow from finite inputs
- **WHEN** finite input overflows a difference, jetty sum, expanded edge, midpoint or path cost
- **THEN** routing SHALL reject that result explicitly without emitting route geometry

#### Scenario: Tiny or collapsed perimeter
- **WHEN** floating/perimeter-enabled geometry is degenerate or numerically unrepresentable under R02
- **THEN** R02 rejection SHALL be preserved; direct anchors SHALL not invoke perimeter projection

### Requirement: Fixed resolution and direction authority

The pipeline SHALL validate input, obtain fixed endpoints and effective masks using R02, then obtain directions/quadrant from unmodified R03 before route construction. It SHALL retain R03 singleton precedence, constrained-fixed policy and deterministic ties. A selected source direction SHALL describe the first nonzero segment from source toward the route; a selected target direction SHALL describe the vector from target toward its previous point. Both selected directions SHALL belong to their effective masks on every successful route, including fallback, with no exception. Resolved fixed/anchor coordinates SHALL remain exact throughout later phases.

#### Scenario: Singleton constraints survive fixed evidence
- **WHEN** a singleton mask differs from fixed-side evidence
- **THEN** routing SHALL use the R03 selected direction without moving the fixed endpoint or overriding the mask

#### Scenario: Target outward direction
- **WHEN** target direction is NORTH
- **THEN** its preceding route point SHALL be north of the target, so route traversal arrives toward SOUTH

### Requirement: Jetty resolution and evidence

Base orthBuffer SHALL be 10 model units. Per-endpoint jetty SHALL override shared jetty; shared jetty SHALL override the default 10. Values SHALL be finite non-negative numbers or auto. Auto without a marker SHALL resolve to 20; with a marker of size m (default 6) it SHALL resolve to max(2,ceil((m+10)/10))*10 with finite intermediate arithmetic. Resolved jetty is a minimum, not an exact required segment length. Ordinary pattern construction SHALL use resolved jetty when greater than EPSILON and a positive construction buffer 10 otherwise, retaining the original resolved value for the too-short trigger. This zero/sub-EPSILON construction rule SHALL be an explicit V2 adaptation, not a tolerance change. Evidence SHALL distinguish requested settings, resolved minima and construction buffers. Fallback SHALL use its separately declared exterior clearance.

#### Scenario: Jetty precedence and auto
- **WHEN** shared jetty is 30, source override is 12, target is auto with marker size 25
- **THEN** resolved source/target minima SHALL be 12 and 40 respectively

#### Scenario: Zero jetty does not erase direction
- **WHEN** an endpoint resolves to zero jetty
- **THEN** zero SHALL remain the recorded minimum and trigger operand, while construction SHALL still produce a positive segment respecting its selected direction

### Requirement: Decoded reference pattern behavior

Ordinary routing SHALL select from the pinned draw.io 4-by-4 route pattern table using the R03 quadrant and directions. Instruction direction, terminal role, side/coordinate limit and half-separation movement SHALL be explicit inspectable semantics; opaque numeric tables without decoding/parity checks are forbidden. All 16 direction pairs in all four quadrants SHALL have defined execution. Terminal limits SHALL include construction buffers; free separation SHALL be max(signed gap minus both construction buffers,0). Half-separation movement SHALL not snap to a grid. Orientation changes, non-forward limit no-ops, no-movement corner removal and final target-approach parity SHALL match the pinned executor on the declared parity domain. The unused inlineRoutePatterns helper SHALL not be substituted for the table actually called by pinned OrthConnector.

#### Scenario: Complete ordinary matrix
- **WHEN** each of 4 source directions, 4 target directions and 4 quadrants executes on non-too-short canonical geometry
- **THEN** all 64 routes SHALL match independently derived reference fixtures and satisfy endpoint/direction invariants

#### Scenario: Midpoint and no movement
- **WHEN** an instruction uses half-separation or its limit is behind the current movement direction
- **THEN** the former SHALL retain its fractional coordinate and the latter SHALL not move backwards or leave a duplicate corner

### Requirement: Floating attachment after intermediates

The router SHALL compute intermediates before resolving floating endpoints through R02 with orthogonal=true. Both endpoints SHALL use the same pre-floating snapshot, selecting the adjacent intermediate or the opposite fixed point/center exactly as R02 specifies. Fixed results SHALL bypass floating projection. Rectangle and ellipse endpoints SHALL lie on their actual perimeter; successful terminal segments SHALL remain orthogonal and preserve selected directions after projection. A radial/out-of-band result that breaks orthogonality SHALL be detected as a routing defect, not repaired by changing R02 or relocating an endpoint after validation.

#### Scenario: Independent floating resolution
- **WHEN** a floating/floating route is resolved in either endpoint call order
- **THEN** endpoints SHALL be identical from the common snapshot, not dependent on the newly resolved opposite endpoint

#### Scenario: Ellipse perimeter is authoritative
- **WHEN** a floating ellipse endpoint resolves
- **THEN** it SHALL belong to the actual ellipse and have a valid orthogonal adjacent segment, not a bounding-box substitute

### Requirement: Strict too short branch selection

After fixed resolution, direction selection and jetty resolution, fallback SHALL be selected if and only if both fixed results exist and hypot(target.x-source.x,target.y-source.y) < sourceJetty+targetJetty. Differences, distance and sum SHALL be finite; the comparison SHALL use resolved minima, not construction buffers, Manhattan distance or a squared expression that can overflow. Equality SHALL remain in the ordinary pattern branch. Neither an ordinary pattern failure nor invalid input SHALL activate fallback. Its observable reason SHALL be FIXED_ENDPOINTS_TOO_SHORT.

#### Scenario: Threshold partitions
- **WHEN** two resolved fixed points have distance below, equal to or above the resolved jetty sum
- **THEN** only the below case SHALL select fallback; the others SHALL execute ordinary routing

#### Scenario: Floating is not a fixed endpoint
- **WHEN** either fixed resolver returned null, however close its geometry is
- **THEN** the too-short fixed-endpoint trigger SHALL remain false

### Requirement: Local exterior fallback topology

Fallback SHALL enclose both routing rectangles and both exact fixed points in an axis-aligned bounding rectangle, expanded on all four sides by C=max(10,sourceJetty,targetJetty). An anchor without geometry SHALL contribute zero-size bounds at its point. Each fixed point SHALL be extended along its R03 selected outward direction to the corresponding outer side. Exactly two connectors SHALL traverse that rectangle clockwise and counterclockwise between the exits. Coincident exits SHALL use full circuits, not an empty connector. After assembling endpoints and canonicalizing both candidates, selection SHALL minimize the exact finite tuple of complete Manhattan length, bend count and lexicographic segment-direction sequence ordered WEST,NORTH,EAST,SOUTH; complete equality SHALL choose clockwise. No global obstacles, path search, previous route, R05 hints, vendor calls or legacy calls SHALL participate. Invalid candidate construction SHALL fail loudly, not silently discard a candidate.

#### Scenario: North-only reference counterexample
- **WHEN** bounds are (0,0,10,10) and (15,0,10,10), fixed points are (5,0) and (20,0), both masks are NORTH-only and jetties are 10 each
- **THEN** fallback SHALL return exactly [(5,0),(5,-10),(20,-10),(20,0)] with unchanged fixed points

#### Scenario: Coincident exits and deterministic tie
- **WHEN** both endpoint rays meet the same outer exit or both perimeter candidates have equal length
- **THEN** coincident exits SHALL produce full-circuit candidates and ties SHALL follow the declared bend/direction/clockwise order

### Requirement: Fallback constraints and jetty minima have no exceptions

Each fallback candidate and its final canonical route SHALL preserve exact fixed endpoints, both selected directions and their masks. First/last nonzero segment lengths SHALL exceed EPSILON and SHALL be at least the corresponding resolved jetty within EPSILON. Fallback SHALL never shrink jetty, relax a mask, relocate an endpoint, use a diagonal shortcut or change automatic routing into manual mode. Clearance may lengthen terminal runs, including when one resolved jetty is zero. The expanded rectangle and terminal runs SHALL be representable; failure SHALL be a numeric error. Explicit fixed-point side evidence SHALL not override R03 mask precedence; no extra obstacle/physical-normal restriction is inferred for interior or direction-conflicting fixed points.

#### Scenario: Asymmetric or auto jetty
- **WHEN** the two endpoints have different resolved jetty minima, including an auto-derived value
- **THEN** both SHALL retain their own minimum independently after canonicalization, even if the route must extend farther

#### Scenario: Unrepresentable exterior geometry
- **WHEN** expansion overflows or rounding prevents a required positive outward terminal run
- **THEN** fallback SHALL reject numerically without shrinking clearance or returning a constraint-violating route

### Requirement: Endpoint preserving canonicalization

Canonicalization SHALL be structural and idempotent, reusing R01 duplicate and between-aware collinear semantics without quantization, diagonal projection or endpoint relocation. Semantic endpoints SHALL be retained exactly; a reduction that violates a required terminal direction or jetty minimum SHALL not be accepted. Inputs SHALL not be mutated or retained as mutable result aliases. Candidate construction is responsible for required positive terminal runs; normalization SHALL not insert repair bends or conceal an invalid algorithm.

#### Scenario: Canonical result is stable
- **WHEN** a route with true adjacent duplicates and removable between-collinear points is reduced twice
- **THEN** the first result SHALL match the expected sequence and the second SHALL be structurally identical, with original semantic endpoints preserved

### Requirement: Actionable invariant validation

Every successful route SHALL satisfy INV-001 through INV-011 as applicable: finite coordinates, no adjacent EPSILON duplicates, orthogonal nonzero segments, valid fixed/perimeter attachment, required source/target direction membership, model-only authority, canonical idempotence and determinism. The route validator SHALL check local geometric/attachment invariants with named IDs and offending point/segment evidence; zoom independence and determinism SHALL additionally have executable metamorphic tests. Fallback jetty minima SHALL be checked after canonicalization. Zero/one-point routes SHALL not vacuously pass. Validation SHALL not alter its input.

#### Scenario: Invalid route diagnostics
- **WHEN** independent malformed-route fixtures violate finiteness, attachment, orthogonality, endpoint direction, duplication or fallback jetty minima
- **THEN** validation SHALL identify the violated invariant and relevant evidence without repairing the route

### Requirement: Reference parity and adaptation evidence remain separate

Reference expectations SHALL come from hash-pinned vendor logic independently of R04 production. At least 64 ordinary topology fixtures plus aligned/overlap/fixed/floating/marker cases SHALL compare ordered semantic points, endpoint sides and bend counts on a predeclared parity domain. Only identical structural normalization and EPSILON coordinate comparison are allowed; meaningful bends/directions SHALL not be erased. Too-short fallback, inherited R01-R03 numerical/fixed-mask adaptations and zero/sub-EPSILON construction buffers SHALL have named V2-contract fixtures outside strict parity. The original counterexample's reference output [(5,0),(20,0)] SHALL be retained unchanged and explicitly shown to violate NORTH-only constraints; its Frade route SHALL never be labelled matching reference output.

#### Scenario: Honest fallback comparison
- **WHEN** the north-only too-short case is reported
- **THEN** evidence SHALL contain both differing routes and the adaptation reason while invariant checks require the Frade route to honor both masks

### Requirement: Reproducible core property coverage

Each core property SHALL execute at least 10000 accepted cases using seed 0xFAD004: finiteness/orthogonality, direction membership and fixed/actual-perimeter attachment, determinism across unrelated calls, non-mutation, canonical idempotence, safe common translation, and independence from external zoom metadata. Raw, accepted and rejected counts, seed, replay path and concrete failing input SHALL be reported separately. Fallback SHALL also have at least 10000 accepted cases spanning all 16 selected-direction pairs with jetty minima checked. Translation generators SHALL use bounded integers, even extents, representable fixed coordinates and all relevant values/results within [-1000000,1000000], remaining 4*EPSILON away from non-exact decision thresholds; output coordinates compare within EPSILON with unchanged topology. Arbitrary finite translation invariance or universal reflection/source-target symmetry SHALL not be claimed. Rejection SHALL occur on input conditioning only, never because a produced route fails.

#### Scenario: Accepted quotas and failures
- **WHEN** property execution completes or finds an invalid produced route
- **THEN** accepted quotas SHALL be met, or the invalid route SHALL fail with reproducible evidence rather than becoming a rejected generator case

### Requirement: Trustworthy mutation and regression evidence

Mutation testing SHALL cover new R04 branch operators, direction/role/quadrant mapping, pattern instruction semantics, fallback threshold/ties, jetty checks and canonicalization. An independently enumerable inventory SHALL report every candidate; score SHALL be at least 90 percent of compiler-valid candidates. Compiler-invalid diagnostics SHALL be retained, timeouts SHALL not count as kills, and infrastructure/unknown failures SHALL abort before every outcome, including spawn timeouts and partial audits. Affirmative assertion-failure evidence or a precisely approved structured domain failure bound to the isolated mutant source SHALL be required for a kill. Every child result SHALL retain exit/error information, stdout/stderr, structured test evidence and SHA-256 linkage. All R01-R03 suites and compiler fixtures, Draw typecheck and scoped lint SHALL pass without earlier-layer changes.

#### Scenario: Unknown error with embedded timeout text
- **WHEN** an unknown structured TypeError contains Test/Hook timeout text, with or without spawn ETIMEDOUT and partial/complete reporter data
- **THEN** the run SHALL abort rather than classify a timeout or a kill; ordinary known-only timeouts SHALL remain timeouts

### Requirement: R04 scope and approval boundary

Production SHALL remain under orthogonal/router, normalization and validation beneath packages/draw/src/routing; tests SHALL remain under packages/draw/tests/routing-v2/orthogonal. Earlier layers, legacy/vendor, package exports, runtime dependencies and R05+ code SHALL remain read-only. The only package metadata exception SHALL be a direct fast-check 4.10.2 Draw devDependency and its required lockfile importer update. Before BDD/TDD or implementation, an exact R04 machine profile, executable self-tests, independent PRE PASS and committed approved planning baseline SHALL exist. The gate SHALL union baseline-to-HEAD/staged/unstaged/untracked NUL-safe paths and inspect source/frozen controls independently in HEAD/INDEX/WORKTREE. Control-file edits SHALL be planning-only; after approval master/playbook/gate/AGENTS/workflow SHALL be frozen. OpenSpec Verify SHALL precede independent POST, then implementation commit, archive and CLOSED checkpoints; R05 SHALL not start automatically.

#### Scenario: Planning cannot authorize product changes
- **WHEN** R04 is still in PLANNING or its PRE approval/frozen baseline is missing
- **THEN** a product source/test/dependency installation change SHALL be rejected, even if a generic machine check would otherwise pass
