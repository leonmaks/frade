# Direction Resolver Spec Delta

## Purpose

Provides deterministic, framework-independent cardinal direction selection from routing bounds, optional fixed points and existing boolean masks, with inspectable geometric evidence for the later orthogonal router.

## ADDED Requirements

### Requirement: Space safe direction input and result

R03 SHALL consume source and target routing Rect values, optional same-space fixed source/target Points, and optional R02 DirectionMask values. Omitted masks SHALL mean all four directions. It SHALL reuse R01 Direction and R02 boolean mask vocabulary without public numeric bit masks or duplicate geometry types. Public coordinate-bearing input SHALL use one invariant CoordinateSpace; mixed spaces and widened-space aliases SHALL fail strict compiler fixtures without explicit type arguments. The result SHALL contain sourceDirection, targetDirection, quadrant, separation and preferenceEvidence, with no route points. Directions are outward terminal sides on BOTH endpoints; a target side is not the direction of traversal into that endpoint.

#### Scenario: Cardinal target semantics

- **WHEN** source (0,0,10,10) and target (30,0,10,10) resolve with default masks
- **THEN** sourceDirection SHALL be EAST and targetDirection WEST, with outward target semantics

#### Scenario: Compiler rejects mixed spaces

- **WHEN** strict tsc checks model source bounds with view target bounds or screen fixed points, including widened aliases and generic callers
- **THEN** incompatible calls SHALL fail; same-space model/view/screen calls SHALL compile

### Requirement: Finite validated geometry without quantization

Consumed rectangle/point fields, calculated edges, centers, center differences, signed gaps and evidence SHALL be finite. Width and height SHALL be non-negative, including zero. Non-finite input or calculated arithmetic SHALL throw RangeError identifying operation and field/result; malformed masks/options SHALL throw TypeError. Explicit fixed null SHALL be invalid; omission alone means no fixed point. All four mask flags SHALL be booleans and at least one true. No invalid input SHALL be clamped, ignored, replaced by legacy routing or silently defaulted. R01 EPSILON=1e-6 SHALL be the only approximate tolerance. No quantization, pixel rounding, perimeter projection or division by extent SHALL occur.

#### Scenario: Reject every numeric partition

- **WHEN** each consumed numeric field is individually NaN, positive infinity, negative infinity or a negative extent
- **THEN** the boundary SHALL reject with the operation and offending field

#### Scenario: Finite input with overflow

- **WHEN** finite rectangle inputs overflow a calculated right edge, center difference or directional gap
- **THEN** the boundary SHALL reject the non-finite result without emitting a direction result

#### Scenario: Degenerate bounds are valid direction geometry

- **WHEN** zero-width, zero-height or point bounds have finite derived arithmetic
- **THEN** direction classification SHALL execute without invoking R02 perimeter projection or dividing by zero

### Requirement: Relative quadrant and separation evidence

Centers SHALL be x+width/2 and y+height/2. Let dx=sourceCenterX-targetCenterX, dy=sourceCenterY-targetCenterY, snapping each to positive zero exactly when abs(value)<=EPSILON for quadrant classification only. Quadrant SHALL follow pinned draw.io numbering: if dx<0, return 2 when dy<0 else 1; otherwise return 3 when dy<=0 and dx!=0, 2 when dy<=0 and dx==0, else 0. Signed directional gaps from source SHALL be WEST=source.left-target.right, NORTH=source.top-target.bottom, EAST=target.left-source.right, SOUTH=target.top-source.bottom. Normalize abs(gap)<=EPSILON to positive zero for direction policy. Larger negative gaps remain negative. Horizontal/vertical non-negative separation and overlap SHALL agree with R01 projection relations; touching and positive gaps <=EPSILON count as overlap. Evidence SHALL distinguish signed gaps from non-negative separation. Jetty buffer subtraction is excluded.

#### Scenario: Four quadrant numbers

- **WHEN** target center is respectively northwest, northeast, southeast and southwest of source with both differences above EPSILON
- **THEN** quadrants SHALL respectively be 0,1,2,3

#### Scenario: Axes and center ties

- **WHEN** dx/dy after snapping are (0,1),(1,0),(-1,0),(0,-1),(0,0)
- **THEN** quadrants SHALL respectively be 0,3,1,2,2

#### Scenario: Separation epsilon boundary

- **WHEN** an axis gap is negative, zero, EPSILON or greater than EPSILON
- **THEN** overlap SHALL hold for the first three and positive separation SHALL occur only for the last, while negative signed overlap evidence remains observable outside the zero band

### Requirement: Complete constrained preference selection

The chosen direction SHALL always belong to that endpoint's effective mask. A singleton mask SHALL override geometric preference and optional fixed-side evidence. For other masks an allowed fixed-side candidate SHALL lock that endpoint; otherwise geometry SHALL select the first allowed candidate from the deterministic pinned-reference preference ordering. Filtering SHALL be complete for every one of the 15 non-empty masks on either endpoint. Disallowed fixed candidates SHALL be recorded as filtered and SHALL NOT escape the mask, mutate the fixed point or change R02 mask precedence. The caller supplies effective masks already obtained using R02 precedence.

#### Scenario: Singleton overrides geometry

- **WHEN** an endpoint permits only SOUTH while geometry prefers EAST and its fixed point lies on WEST
- **THEN** selected direction SHALL be SOUTH and the fixed point SHALL remain unchanged

#### Scenario: Filter a fixed side

- **WHEN** source fixed point is WEST midpoint and source permits only NORTH and EAST
- **THEN** WEST SHALL be recorded as disallowed, and the selected direction SHALL be the first allowed geometric candidate

#### Scenario: All mask pairs are total

- **WHEN** the resolver evaluates all 15 source masks against all 15 target masks in each non-axis quadrant
- **THEN** all 900 cases SHALL produce one allowed direction per endpoint and no empty or multi-direction result

### Requirement: Fixed side evidence without relocating endpoints

Optional fixed points SHALL supply side evidence only when within the EPSILON-expanded span of the respective routing bounds and within EPSILON of an edge. X edge checks SHALL use WEST before EAST; Y checks NORTH before SOUTH; a matched Y edge SHALL override a matched X edge, retaining pinned vertical corner priority. A point away from every edge, including an ellipse diagonal endpoint or a detached anchor outside bounds, SHALL provide no fixed-side candidate and SHALL use geometric preferences. Degenerate coincident edges SHALL obey the same priority without fractional normalization. The fixed point SHALL never be moved or reprojected.

#### Scenario: Cardinal and corner fixed evidence

- **WHEN** fixed points are the four edge midpoints or four corners of positive bounds
- **THEN** midpoint candidates SHALL be WEST,NORTH,EAST,SOUTH respectively; north corners SHALL choose NORTH and south corners SOUTH before mask filtering

#### Scenario: Interior and out of span fixed points

- **WHEN** a fixed point is interior or on an edge's infinite supporting line outside its expanded span
- **THEN** no fixed candidate SHALL be inferred and the supplied point SHALL survive unchanged

### Requirement: Pinned preference branch order and explicit ties

Signed zero-banded gaps SHALL determine raw source horizontal preference as WEST when westGap>=eastGap, otherwise EAST, and vertical preference as NORTH when northGap>=southGap, otherwise SOUTH; target raw preferences SHALL be their opposites. For each unlocked endpoint, an unavailable axis preference SHALL flip to its opposite before ordering. Start unlocked order as vertical then horizontal; locked order is empty. If both preferred axis gaps are positive, first try source-horizontal/target-vertical if those candidates are allowed, then source-vertical/target-horizontal. Otherwise prefer vertical on both when its preferred gap is positive, then horizontal on both when its preferred gap is positive; retain the default vertical-first order when both overlap. This source-role priority SHALL be explicit, not presented as universal source/target exchange symmetry. For unlocked endpoint i, candidates SHALL be own order[0], own order[1], opposite endpoint order[i], opposite endpoint order[1-i], ignoring missing entries and duplicates; if none allowed, append WEST,NORTH,EAST,SOUTH as a totality fallback. Select the first allowed. Singleton override and allowed fixed locks SHALL take precedence. Repeated inputs SHALL use exactly this deterministic tie policy.

#### Scenario: Both axes separated

- **WHEN** source (0,0,10,10) and target (30,30,10,10) resolve without fixed points with all directions
- **THEN** source SHALL select EAST and target NORTH via source-horizontal/target-vertical priority

#### Scenario: Overlapping coincident bounds

- **WHEN** both bounds are (0,0,10,10) with all directions and no fixed points
- **THEN** source SHALL select NORTH and target SOUTH; quadrant SHALL be 2

#### Scenario: Horizontal and vertical arrangements

- **WHEN** equal-sized bounds are separated only to the right or only below with the other axis overlapping
- **THEN** direction pairs SHALL be EAST/WEST and SOUTH/NORTH respectively

### Requirement: Inspectable preference evidence and immutability

Results SHALL expose validated copied masks, signed gaps and overlaps, raw and constraint-adjusted axis preferences, each endpoint's ordered allowed candidates, fixed candidate disposition, selected reason and ordering branch. Result data SHALL be readonly and independently owned; inputs and shared constants SHALL not be mutated or aliased as mutable output state. Identical input before/after unrelated calls SHALL give structurally equal results. No display, framework, history, timing or random state SHALL participate.

#### Scenario: Deep frozen input

- **WHEN** deep-frozen bounds, masks and fixed points are resolved
- **THEN** inputs SHALL remain structurally unchanged and result objects/arrays SHALL not mutate or share mutable input objects

#### Scenario: Explain selected side

- **WHEN** a multi-direction mask filters the preferred side
- **THEN** evidence SHALL identify the actual ordering branch and allowed list whose first entry equals the selected direction, unless singleton/fixed lock explains that selection

### Requirement: Conditioned metamorphic and reproducible properties

Core generated properties SHALL execute at least 5000 accepted cases each with seed 0xFAD003, reporting name, seed, replay path, concrete counterexamples and raw/accepted/rejected counts. Required properties SHALL cover mask membership, determinism, non-mutation, safe common translation, horizontal reflection and vertical reflection. Safe generation SHALL use integer origins/fixed points/deltas in [-100000,100000], even non-negative extents in [0,2000], with all edges and translated values within [-1000000,1000000]. Non-tie values SHALL stay at least 4*EPSILON from classification/edge thresholds. Reflection generators SHALL further exclude equal opposing signed gaps on the reflected axis, zero-band center differences on that axis, and fixed-point dual-edge/corner ambiguity on that axis. Reflect bounds by x'=-x-width or y'=-y-height, points by sign reversal and masks by WEST/EAST or NORTH/SOUTH exchange; preserve source/target roles. Selected directions SHALL reflect and separation SHALL remain equal on this domain. The other quadrant coordinate can be zero; a fully non-axis generated subset SHALL also verify quadrant mappings H:0<->1,3<->2 and V:0<->3,1<->2. Ties excluded from this property domain SHALL have direct deterministic tests. Arbitrary finite IEEE-754 translation invariance and reflection-equivariant selection at fully symmetric ties SHALL NOT be promised.

#### Scenario: Safe translation preserves decisions

- **WHEN** every positional input in the declared safe domain is commonly translated
- **THEN** directions, quadrant, separation and semantic preference decisions SHALL be exactly equal

#### Scenario: Horizontal and vertical mirrors

- **WHEN** a conditioned non-tie input and masks are reflected horizontally or vertically
- **THEN** the selected directions SHALL exchange the corresponding cardinal signs and obey the declared quadrant mapping on the non-axis subset

#### Scenario: Tie and cancellation evidence is direct

- **WHEN** identical bounds are reflected or positions 0 and 1e-8 are translated by 1e9
- **THEN** direct fixtures SHALL demonstrate deterministic tie policy and IEEE-754 cancellation without asserting an impossible universal symmetry/invariance

### Requirement: Direct exhaustive and reference verification

R03 SHALL execute at least the 900 quadrant/mask-pair logical cases with explicit per-case mask membership and a reference-derived expected direction pair, not only a count assertion. Additional deterministic cases SHALL cover axis-aligned, touching, overlapping, containing, equal-center, differing-size and zero-extent bounds, fixed points on both sides independently and together, singleton/multi-mask filtering, all tie/epsilon partitions and invalid numeric/mask inputs. Pinned reference comparison SHALL be independent of production logic and restricted to its declared valid domain; differences for EPSILON vs one-pixel side matching, constrained fixed candidates and overlap zero bands SHALL be documented and tested as intentional V2 contracts. Source/target role exchange SHALL have direct fixtures; no universal exchange property SHALL overwrite pinned source-role priority.

#### Scenario: Independent expected values

- **WHEN** the 900-case matrix runs
- **THEN** each actual pair SHALL be compared with pinned-reference-derived fixture expectations generated independently of production helpers

#### Scenario: Compare reference and V2 adaptation

- **WHEN** a cardinal fixed point conflicts with its mask or differs from a boundary by 0.5 model units
- **THEN** V2 SHALL honor mask membership and EPSILON matching, while fixture evidence SHALL identify the reference difference

### Requirement: R03 isolation and frozen machine gate

R03 production SHALL remain in packages/draw/src/routing/orthogonal/direction/** and tests in packages/draw/tests/routing-v2/direction/**. Dependencies SHALL point direction -> terminal/perimeter/geometry/model, with inward shortcuts and no reverse imports or cycles. Earlier layer source/tests/specs and legacy/vendor/integration boundaries SHALL remain read-only. No public package-root export, route generation, jetty, pattern execution, perimeter implementation, editor, preview, loop, persistence, schema or R04+ behavior SHALL be introduced. Before implementation an independent PRE PASS SHALL approve planning and gate self-tests; the committed approved planning SHA SHALL become BASE_COMMIT. During implementation the installed gate and workflow reference SHALL match that approved commit in HEAD, INDEX and WORKTREE. Discovery SHALL independently union baseline-to-HEAD, staged, unstaged and untracked paths using NUL-safe parsing; source checks SHALL inspect HEAD/INDEX/WORKTREE independently. Independent POST PASS SHALL follow OpenSpec Verify before archive.

#### Scenario: Reject planning product changes

- **WHEN** a proposed R03 source/test or R01/R02 dependency path is changed during PLANNING
- **THEN** machine scope checks SHALL fail while exact authorized planning/control paths pass

#### Scenario: Reject cancellation and forbidden direction dependencies

- **WHEN** a staged forbidden path/import is hidden by an inverse worktree edit, or a lower layer imports direction or direction imports a later module
- **THEN** discovery/snapshot/dependency checks and executable self-tests SHALL fail

#### Scenario: Frozen approved controls

- **WHEN** implementation uses a drifting baseline, missing PRE PASS or modified approved gate/workflow in any Git layer
- **THEN** the machine gate SHALL fail rather than approve implementation
