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

### Requirement: Ordinary direction preserving construction

Outside the unchanged strict too-short branch, the router SHALL retain every geometrically certified table plan and SHALL construct an ordinary oriented-channel route when that finite plan fails the terminal certificate defined in design section 3a. The certificate SHALL cover exact fixed/perimeter attachment, nonzero orthogonality, both R03 directions/masks and BOTH resolved terminal jetty minima before route publication. After provisional R02 projection and endpoint-pinning canonicalization, source segment P1-P0 and target outward segment P[n-2]-P[n-1] SHALL each have checked finite Manhattan length L > EPSILON and L + EPSILON >= that role's resolved minimum. This comparison SHALL use resolved minima, not positive construction buffers; invalid numeric inputs or nonfinite derived arithmetic SHALL abort. Each finite under-minimum run SHALL be a named geometric incompatibility recording role, segment index, actual length and expected minimum; all deficient roles SHALL be reported. Geometric incompatibility SHALL be inspectable evidence, distinct from thrown numeric, input, executor or final invariant errors; those errors SHALL abort without selecting another strategy. Neither input conditioning nor strict-parity coverage SHALL be narrowed to exclude the incompatible input. Ordinary evidence SHALL identify REFERENCE_PATTERN or ORIENTED_CHANNEL, the original table plan and certificate reasons; ORIENTED_CHANNEL SHALL not claim FIXED_ENDPOINTS_TOO_SHORT or native geometry parity.

The oriented-channel strategy SHALL protect both outward terminal runs using the positive ordinary construction buffers and exact fixed points or unchanged R02 floating projection. It SHALL enumerate the finite alternating-axis templates defined in design section 3a, with at most five connector segments and eight raw route points; use no empty connector for coincident stubs; and validate every eligible candidate. Selection SHALL use exact complete Manhattan length, canonical bend count, WEST<NORTH<EAST<SOUTH direction sequence and the stable channel-index template key. An invalid eligible candidate SHALL abort, not be silently discarded. Both final adapted terminal runs SHALL meet their construction buffers within EPSILON, without reducing requested minima. No R05 hints, legacy router, vendor production call, global obstacles or unbounded search SHALL participate.

Preserving strict-parity coverage means retaining all 77 saved strict obligations
and all independently native-certified comparisons. The unchanged input domain
also admits finite native-invariant divergences under the explicit two-part
reference requirement below; channel construction there SHALL NOT be treated as
a parity blocker merely because the historical input predicate returned true.

#### Scenario: Accepted constrained fixed and anchor regression
- **WHEN** source bounds are (-8,-71166,692,1862), fixed source is (338,-71166), source mask is EAST-only, target is anchor (-15,-70862) with all directions, and jetties are 49 and 96
- **THEN** R03 EAST/NORTH and both fixed points SHALL be preserved, and ordinary ORIENTED_CHANNEL SHALL produce [(338,-71166),(733,-71166),(733,-70958),(-15,-70958),(-15,-70862)]; fixed distance exceeds 145 so fallback SHALL not be selected

#### Scenario: Compatible reference pattern is retained
- **WHEN** an ordinary table plan passes the terminal certificate
- **THEN** REFERENCE_PATTERN SHALL retain its original intermediate snapshot even if channel enumeration could produce a shorter route; all existing strict-parity fixtures SHALL continue to use and match the table strategy

#### Scenario: Finite short source jetty selects ordinary channels
- **WHEN** source bounds are (0,0,100,100), fixed source is (0,0) with perimeter=false and EAST-only mask, target is anchor (1,30) with all directions, and both resolved jetties are 10
- **THEN** R03 EAST/NORTH SHALL remain authoritative; native table [2114,2561] and provisional route [(0,0),(1,0),(1,30)] SHALL fail the certificate with source actual length 1 versus minimum 10, and ordinary ORIENTED_CHANNEL SHALL construct a valid route preserving exact endpoints and both minima; distance sqrt(901)>20 SHALL keep the too-short fallback disabled

#### Scenario: Independent terminal minimum checks
- **WHEN** otherwise valid provisional canonical table plans have only a deficient source run, only a deficient target run, or both deficient runs
- **THEN** the certificate SHALL report exactly the deficient roles using their own resolved minima and select ordinary channels, including asymmetric and auto-derived minima; final-validation rejection alone SHALL not satisfy the construction requirement

#### Scenario: Minimum comparison preserves the existing tolerance
- **WHEN** positive orthogonal canonical terminal runs are exactly at their minima, shorter within EPSILON, or shorter by more than EPSILON
- **THEN** certificate acceptance SHALL follow the existing L + EPSILON >= minimum predicate independently at each end, with L > EPSILON still mandatory; deterministic boundary fixtures SHALL cover both sides and the exact comparison boundary

#### Scenario: Resolved minimum is distinct from construction buffer
- **WHEN** an otherwise certified ordinary table plan has a positive run greater than EPSILON but less than 10 and that endpoint's resolved minimum is zero or sub-EPSILON
- **THEN** the certificate SHALL not reject that plan solely because its positive construction buffer is 10; ORIENTED_CHANNEL candidates SHALL still meet their stronger construction-buffer requirement whenever channels are selected

#### Scenario: Coincident stubs and all direction pairs
- **WHEN** ordinary construction needs channels, including equal stubs and all 16 R03 direction pairs
- **THEN** an eligible finite connector SHALL preserve both outward rays and minima; empty connectors and terminal reversal shortcuts SHALL not be accepted, and complete candidate costs and stable tie keys SHALL be auditable

#### Scenario: A thrown error cannot activate channels
- **WHEN** raw execution, input arithmetic, perimeter projection, eligible candidate validation or final route validation throws
- **THEN** the error SHALL propagate without switching to channels, exterior fallback or another router

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

Every successful route SHALL satisfy INV-001 through INV-011 as applicable: finite coordinates, no adjacent EPSILON duplicates, orthogonal nonzero segments, valid fixed/perimeter attachment, required source/target direction membership, model-only authority, canonical idempotence and determinism. The route validator SHALL check local geometric/attachment invariants with named IDs and offending point/segment evidence; zoom independence and determinism SHALL additionally have executable metamorphic tests. Both resolved jetty minima SHALL be supplied to the independent validation context and checked after final R02 resolution and canonicalization for REFERENCE_PATTERN, ORIENTED_CHANNEL and fallback, using the certificate's checked L > EPSILON and L + EPSILON >= minimum predicate. Channels SHALL additionally satisfy their positive construction buffers. Source/target failures SHALL report INV-007/008 respectively, segment index, actual length and expected minimum. Zero/one-point routes SHALL not vacuously pass. Validation SHALL not alter its input or switch strategy.

#### Scenario: Invalid route diagnostics
- **WHEN** independent malformed-route fixtures violate finiteness, attachment, orthogonality, endpoint direction, duplication or either terminal jetty minimum on ordinary or fallback routes
- **THEN** validation SHALL identify the violated invariant and relevant evidence without repairing the route

### Requirement: Reference parity and adaptation evidence remain separate

Reference expectations SHALL come from hash-pinned vendor logic independently of R04 production. The existing strictParityInput predicate SHALL remain unchanged as the full reference-comparison input-domain selector; admission SHALL NOT itself assert that native geometry satisfies hard constraints. This explicitly replaces the former unconditional parity promise over that domain. No admitted input SHALL be removed. Before V2 execution, a test-local checker independent of every R04 production certificate/validator/normalizer/router SHALL certify the complete independently normalized native route using expected endpoints, singleton directions/masks and resolved minima derived independently from reference input and pinned reference semantics. It SHALL check endpoint preservation/attachment, at least two points, finite nonzero orthogonality, both outward directions/masks and both checked L > EPSILON and L + EPSILON >= own minimum predicates, as specified in design section 6.

The immutable pre-V2 verdict SHALL be NATIVE_CERTIFIED or NATIVE_INVARIANT_DIVERGENCE. For NATIVE_CERTIFIED, V2 SHALL select REFERENCE_PATTERN and match complete ordered semantic points, endpoint sides, signed segment directions and bend counts under the existing structural normalization and EPSILON coordinate comparison. For a proven finite native geometric violation, NATIVE_INVARIANT_DIVERGENCE SHALL retain unchanged raw/canonical native geometry and every violated invariant with role/segment/expected/actual evidence, and V2 SHALL construct ORIENTED_CHANNEL satisfying every hard constraint. Divergence SHALL never be labelled final geometry parity. Numeric, oracle, checker, instrumentation and unknown errors SHALL abort rather than authorize divergence. V2 output, strategy, certificate, exception or mismatch SHALL NOT influence or revise the reference verdict; failures SHALL remain failures in either class. Direct table/instruction reference comparisons SHALL continue for both classes.

All 77 existing ordinary strict fixtures, including the 64-case direction/quadrant matrix and aligned/overlap/fixed/floating/marker cases, SHALL retain their exact expected routes and strict obligations. Each SHALL independently pass native certification; a failure SHALL stop investigation rather than relabel that fixture. New B2 coverage SHALL be additive. Completed-run accounting SHALL include every admitted comparison input as certified or finite-divergence, with separate strict results, divergence results and failed/aborted counts; divergences SHALL NOT inflate a parity-success percentage or become rejected property inputs. Property generators, conditioning, quotas and tolerances SHALL remain unchanged.

Only identical structural normalization and EPSILON coordinate comparison are allowed; meaningful bends/directions SHALL not be erased. Too-short fallback, inherited R01-R03 numerical/fixed-mask adaptations and zero/sub-EPSILON construction buffers SHALL keep their named V2-contract fixtures outside strict parity. The original counterexample's reference output [(5,0),(20,0)] SHALL be retained unchanged and explicitly shown to violate NORTH-only constraints; its Frade route SHALL never be labelled matching reference output.

#### Scenario: Admitted native route violates target direction and minimum
- **WHEN** source rectangle (0,0,20,20) has fixed (20,10), EAST-only, target rectangle (11,30,20,20) has fixed (21,30), NORTH-only, distinct cells and minima 10/10
- **THEN** the unchanged input-domain selector SHALL remain true; native table [513,2308,2561,1090,514,2568,2308] and canonical [(20,10),(30,10),(30,30),(21,30)] SHALL be retained, with target outward EAST versus NORTH and length 9 versus minimum 10 recorded before V2 execution; V2 SHALL construct ordinary ORIENTED_CHANNEL with exact endpoints, EAST/NORTH and both minima, while sqrt(401)>20 keeps fallback disabled

#### Scenario: Certified native route cannot be reclassified by V2 failure
- **WHEN** native certification passes before V2 runs but V2 throws, mismatches, selects channels or returns a contradictory certificate
- **THEN** the comparison SHALL fail under its unchanged NATIVE_CERTIFIED verdict, even if channels could be shorter; no fixture or expected native result SHALL be rewritten

#### Scenario: Divergence still requires valid V2 construction
- **WHEN** native certification independently records a finite geometric violation before V2 runs
- **THEN** the original native result and defect evidence SHALL remain immutable, and any V2 exception, missing required channel strategy or failed invariant SHALL fail the test rather than count as a successful adaptation

#### Scenario: Reference failure is not geometric divergence
- **WHEN** the reference oracle or independent checker encounters nonfinite arithmetic, an exception, instrumentation inconsistency or unknown failure
- **THEN** the run SHALL abort and retain the error evidence without assigning a divergence verdict or skipping the input

#### Scenario: Existing strict fixtures and comparison accounting remain intact
- **WHEN** the revised comparison suite runs the 77 saved strict fixtures and new B2 coverage
- **THEN** all 77 SHALL remain independently certified strict comparisons with unchanged expectations, B2 SHALL be a separately reported native-invariant divergence, and all 78 inputs SHALL be accounted for without rejection or V2-driven classification

#### Scenario: Honest fallback comparison
- **WHEN** the north-only too-short case is reported
- **THEN** evidence SHALL contain both differing routes and the adaptation reason while invariant checks require the Frade route to honor both masks

### Requirement: Reproducible core property coverage

Each core property SHALL execute at least 10000 accepted cases using seed 0xFAD004: finiteness/orthogonality, direction membership and fixed/actual-perimeter attachment with both resolved jetty minima on all branches, determinism across unrelated calls, non-mutation, canonical idempotence, safe common translation, and independence from external zoom metadata. Raw, accepted and rejected counts, seed, replay path and concrete failing input SHALL be reported separately. Fallback SHALL also have at least 10000 accepted cases spanning all 16 selected-direction pairs with jetty minima checked. Translation generators SHALL use bounded integers, even extents, representable fixed coordinates and all relevant values/results within [-1000000,1000000], remaining 4*EPSILON away from non-exact decision thresholds; output coordinates compare within EPSILON with unchanged topology. Arbitrary finite translation invariance or universal reflection/source-target symmetry SHALL not be claimed. Rejection SHALL occur on input conditioning only, never because a produced route fails.

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
