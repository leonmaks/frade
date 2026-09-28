# Design

## Context

See proposal.md for motivation and specs/routing-orthogonal-router/spec.md for
the normative observable contract. Planning starts from R03 closing commit
`0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4`. R01-R03 and their archived evidence
are read-only. The user selected mandatory direction constraints with an
explicit too-short deviation from draw.io; this is a product-contract decision,
not independent PRE approval.

Observed APIs: R02 resolveFixedTerminal returns a point or null; effectivePortConstraint
owns mask precedence; resolveFloatingTerminal takes one common intermediate
snapshot and an explicit opposite reference. R03 resolveDirections accepts
existing bounds/masks/fixed points and returns copied direction/quadrant evidence.
R01 structural normalization does not quantize. R02 perimeter code rejects
collapsed geometry and supplies rectangle/ellipse membership predicates.
The legacy router mixes route construction with older attachment and normalization
types; none of those imports or fallback paths are used here.

At initial discovery the installed gate had exact R01-R03 profiles only. Task
1.2 supplies the exact R04 profile and approval binding as planning controls;
see evidence/gate-profile.md and evidence/process-control-validation.md. No
generic R04 PASS can establish readiness. Existing package Vitest discovery requires an
R04-local configuration. Draw lacks a direct fast-check dependency although
version 4.10.2 is already pinned in other workspace importers.

## Goals / Non-Goals

Goals: bounded deterministic automatic construction; inspectable pattern and
fallback decisions; hard direction/attachment invariants; meaningful independent
reference, property, mutation and compiler evidence before later integration.

Non-goals: hint processing, automatic/manual conversion, path persistence,
editing, loops for the same cell, global obstacle avoidance, rotation, view-space
routing, X6 adapters or compensating for defects in earlier layers. Fixed interior
points are legitimate R02 inputs; side evidence does not override their masks.

## Decisions

### 1. Physical ownership and dependency graph

Prospective product files:

```text
packages/draw/src/routing/orthogonal/router/**
packages/draw/src/routing/normalization/**
packages/draw/src/routing/validation/**
packages/draw/tests/routing-v2/orthogonal/**
```

Router-local contracts own OrthogonalRoutingInput, the immutable route result,
jetty options, readable instruction vocabulary and execution evidence. R01 model
is not extended. Attached inputs pair a fixed/floating ModelSpace binding with
R02 geometry; anchors carry a ModelSpace anchor binding only and obtain zero-size
bounds at the point for R03. There is no generic-space public routing overload.

The router orchestrates R03 direction, R02 terminal/perimeter, normalization and
validation. Normalization imports only R01 geometry/model. Validation owns its
own readonly context (expected endpoints, masks, selected directions, optional
perimeters and jetty minima) and imports normalization/R02/R01 as needed; it never
imports router result types. This prevents router -> validator -> router cycles.
Earlier layers cannot import any R04 module. Directory-local exports only.

Reject null/malformed/unsupported semantic fields explicitly. Equal attached
cell IDs require R08; two distinct cells with equal bounds are still valid R04
geometry. No DOM, graph lookup or runtime dependency is introduced.

### 2. Pipeline and jetty policy

```text
validate/copied model input
  -> R02 fixed resolution + effective masks
  -> R03 directions/quadrant
  -> jetty resolution + checked strict too-short predicate
  -> ordinary patterns OR local exterior fallback
  -> R02 floating resolution from one pre-floating snapshot (ordinary only)
  -> endpoint-aware structural canonicalization
  -> invariant validation + deeply frozen route/evidence
```

Jetty precedence is endpoint override, shared value, numeric default 10.
auto has no marker = 20; auto with marker size m (default 6) is
max(2,ceil((m+10)/10))*10. Validate every supplied numeric option even if an
override means it is not selected. Booleans and numeric strings are not sizes.
Resolved minima are never silently clamped or reduced. Ordinary construction
uses the minimum directly when > EPSILON; zero/sub-EPSILON minima require the
positive base buffer 10 so canonicalization cannot erase the required direction.
This adaptation is explicit in evidence/parity classification. The original
resolved minima, not those construction buffers, determine the fallback trigger.

For fallback, C=max(10,js,jt) expands all four sides. Actual terminal segments
can exceed js/jt. The specification does not promise shortest unrestricted routes
or exact jetty-length segments. This keeps mandatory masks meaningful at every
scale without a new geometry tolerance or hidden manual mode.

### 3. Ordinary pattern selection/execution

Pin the source observed during planning:

| Reference | SHA-256 |
|---|---|
| mxEdgeStyle.js | 8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d |
| mxPerimeter.js | 1298716ca3e30f891aa73cccdff00b14fe33483dbfc26ae82a520f785d45bab1 |
| mxGraphView.js | b963180483ff9b01ffd1b5301225dbae6c36c8d02b00d6edfd67c7649d1b1ad2 |

Hashes are compared case-insensitively as hex; bytes of vendor files are never
modified. Tests extract actual reference functions/tables with checked markers
or AST boundaries. The test oracle must not call R04 helpers for expected output.

The deployed OrthConnector calls routePatterns directly. Do not substitute its
separate getRoutePattern/inlineRoutePatterns helper. Normalize direction indices
in the reference cycle WEST,NORTH,EAST,SOUTH: index=1+((ordinal-quadrant+4)%4).
Rotate instruction directions and side selectors back with the same quadrant.

Decode each instruction into a direction and one limit kind: terminal side limit,
terminal attachment coordinate on the movement axis, or half the non-negative
buffer-adjusted directional separation. Preserve combined terminal+center flags
as terminal attachment coordinates; they are not generic geometric centers.
Use fixed-point coordinates directly for attachment-coordinate limits and center
coordinates for floating endpoints, avoiding division by width/height for anchors.
Side limits are terminal edges plus/minus the applicable construction buffer.

Execute forward moves only. Orientation changes provision a corner; a no-movement
instruction removes the unused corner just as the reference does. Preserve final
source/target orientation-parity handling before assembling endpoints. All state
is per-call; do not share the vendor's mutable scratch arrays. Table decoding and
every instruction class require direct tests before router orchestration.

### 4. Too-short trigger and local exterior construction

Trigger requires both R02 fixed results. Compute finite dx, dy, d=Math.hypot(dx,dy)
and J=js+jt; choose fallback exactly when d<J. Equality goes to ordinary routing.
No squared-distance overflow and no EPSILON adjustment are allowed. Known invalid
input and pattern invariant failures are errors, not extra fallback triggers.

Let p/q be fixed endpoints and B enclose p/q and both routing rectangles. Expand
B by C=max(10,js,jt) to L,T,R,Btm. For each selected direction take its outward
exit: WEST=(L,y), NORTH=(x,T), EAST=(R,y), SOUTH=(x,Btm).
Both endpoints must lie strictly inside the represented expanded rectangle.
Coordinate expansion, every length/cost and each required terminal run must
remain finite and representable. Failure is RangeError with offending field.

Enumerate clockwise and counterclockwise perimeter connectors. Clockwise in
model coordinates with Y increasing down follows top-left -> top-right ->
bottom-right -> bottom-left -> top-left. Include only the corners encountered
between exits. Distinct exits traverse less than one circuit; equal exits traverse
one full circuit. Append p before source exit and q after target exit. Each
candidate has at most eight raw points including endpoints and repeated exit.

Canonicalize and validate BOTH candidates, including hard directions and their
jetty minima. Any unexpected invalid candidate is a construction defect; do not
drop it and claim the other candidate establishes correctness. Rank by finite
exact total Manhattan length, canonical bend count, then cardinal direction
sequence with WEST<NORTH<EAST<SOUTH; a fully equal tuple selects clockwise.
Do not rank on absolute origin, endpoint IDs or iteration order.

Why this construction: both initial/final rays preserve the R03 selections by
construction; enclosing endpoints/bounds and inflating by C supplies at least
both jetty minima. Perimeter travel is cardinal and finite. Coincident-exit full
circuits avoid reversing directly over the same terminal run. There are only two
bounded candidates, so no search, obstacle service or R05 implementation is needed.

The original counterexample produces outer bounds (-10,-10,45,30), exits (5,-10)
and (20,-10), and the selected route [(5,0),(5,-10),(20,-10),(20,0)]. The long
counterclockwise candidate is retained as auditable selection evidence. For
coincident coordinates belonging to distinct cells, a nonempty closed polyline
is possible; this does not implement same-cell loop routing.

Rejected alternatives: copying SegmentConnector loses masks; shrinking jetties
weakens requested minima; delegating to R05 reverses milestone dependencies;
using the legacy router violates quarantine; catching all failures and detouring
would conceal ordinary pattern defects.

### 5. Canonicalization, floating points and validation

For ordinary routes both floating calls see the same intermediates and opposite
fixed-or-center references. Use R02 orthogonal=true and verify the resulting
first/last segment geometry. Do not modify R02's ellipse radial fallback or force
a bounding-box endpoint. Expected fixed results bypass projection and are copied.

Canonicalization pins both semantic endpoints. An adjacent duplicate run involving
an endpoint keeps that endpoint's exact coordinates instead of a merely close
interior representative. Two pinned adjacent EPSILON-equal endpoints with no
valid separating geometry are invalid, not a one-point successful route. Use R01
approximate predicates and between-aware collinear reduction, iterating only
while the number of interior points decreases. No coordinate edits, invented
bends or quantization are allowed. Direct endpoint-pin and idempotence tests
cover the wrapper; R01 primitive behavior stays untouched.

The validator checks finite points, >=2 points, duplicate/zero/diagonal segments,
canonicality, fixed equality or actual perimeter membership, selected direction
and mask membership. Source uses P1-P0; target uses P[n-2]-P[n-1]. For fallback
also measure the final terminal runs against js/jt. It receives a readonly
context independent of the router type. Diagnostics include invariant ID, segment
index and expected/actual geometry. Successful result and evidence are copied and
deeply frozen, including arrays and masks. No caller-owned object is frozen in place.

### 6. Verification domains and reference independence

Strict ordinary parity uses axis-aligned nondegenerate rectangles, distinct cell
IDs, finite well-conditioned arithmetic, construction buffers equal to resolved
minima, no hints/rotation/spacing, and coordinates/intermediates representable on
the reference 0.1 grid. Exclude declared R01-R03 adaptation cases by INPUT predicates
specified in fixtures, never after seeing a mismatch. Pin independent reference
direction decisions as well as points. The 64 canonical fixtures use singleton
masks to exercise every direction pair/quadrant with enough separation to avoid
the too-short branch. Add aligned, overlap, mixed attachment and marker partitions.

Compare complete ordered paths after the same independently specified structural
normalization, endpoint side, signed direction sequence and bend count. EPSILON
coordinate comparison is not permission to drop meaningful bends. Fallback,
sub-grid numeric cases, EPSILON side matching, constrained-fixed overrides,
zero/sub-EPSILON buffers and corrected R02 ellipse cases are labelled V2 contract
fixtures with retained unmodified reference output when applicable. Do not claim
the ordinary parity domain proves those adaptations.

Core properties use fast-check 4.10.2, seed 0xFAD004, with 10000 accepted cases EACH
and explicit raw/rejected counters. Count accepted cases outside shrinking; retain
the original and minimized counterexample plus replay path. The dedicated fallback
generator constructs d<J before execution and covers all 16 selected pairs;
asserts directions, masks, exact fixed points, finite orthogonality and BOTH minima.

Use integer origins/fixed anchors/deltas in [-100000,100000], even extents in
[2,2000], integer jets in [0,100], and bound all generated/transformed geometry and
costs within the documented safe range. Translation on affine fixed constraints
uses dyadic fractions producing representable coordinates; perimeter cases use
R02 conditioning and EPSILON output comparison. Exclude non-exact branch/edge/tie
threshold neighborhoods within 4*EPSILON from INPUT conditions, count exclusions,
and cover them directly. Failing output is never a generator rejection. Zoom tests
vary external caller metadata (0.5,1,2) while routing the identical model input;
the API does not acquire a zoom parameter. No universal reflection/exchange claim.

Mutation inventory includes comparison/logical/boolean operators, cardinal/role
swaps, quadrant rotations, instruction flags/midpoint arithmetic, fallback branch,
tie order and invariant removal. Retain compiler diagnostics and every child audit.
Carry the repaired R03 fatal-evidence precedence into an R04-local harness plus
its executable adversarial controls; do not import R03 run.mjs as a library because
it executes main(). Do not edit R03. Unknown structured failures at any audit level,
including embedded timeout wording, must abort before timeout/survival/kill.
Any permitted domain-error kill needs an exact structured whitelist and first-frame
binding to the runner-owned isolated R04 root; absent that proof, abort. A numeric
score cannot override unclassified failures. Threshold >=90%, denominator includes
all compiler-valid survivors/timeouts; neither counts as a kill.

### 7. Process control before implementation

The exact machine profile must cover product roots, earlier-layer read-only roots,
new inward dependencies, full NUL-safe four-source discovery, independent Git-layer
source checks, scope additions/deletions/renames/copies and mode/symlink handling.
The package metadata exception must compare parsed content against the baseline:
only Draw devDependencies.fast-check=4.10.2 and necessary Draw lock importer entries;
no export/runtime/script/version changes or unrelated lock changes.

Planning controls: CURRENT_CHANGE, this change, master, playbook and architecture
gate script. Approved review fingerprints must bind proposal/spec/design/task
WORDING, fallback decision, review prompt, master/playbook/gate/workflow/AGENTS
and declared scopes to the saved independent PRE report. Checkbox/process-state
normalization must not hide contract edits. The initial baseline is R03 closure;
only the later approved planning commit may become implementation BASE_COMMIT.
After that commit, frozen controls must match it in HEAD/INDEX/WORKTREE. Package
dependency allowance applies only after PRE during BDD/TDD, not during planning.

The profile extension and self-tests are PLANNING process-control task 1.2;
its completed execution evidence is separate from independent PRE approval.
Independent PRE uses Astra xhigh;
then approved planning checkpoint, regression-first BDD/TDD (Sol high), implementation
(Astra high/xhigh), complete tests, formal Verify and fresh independent POST follow.

## Risks / Trade-offs

- Longer too-short routes -> explicit hard-mask/jetty guarantee and two-candidate
  deterministic policy; report the intentional reference difference.
- Floating projection changes adjacent geometry -> check actual perimeter and
  selected direction after the shared-snapshot projection; stop on a defect.
- Finite IEEE-754 values can lose expansion or translation information -> checked
  arithmetic/representability and conditioned generated domains with direct boundary tests.
- A copied oracle/harness can certify itself -> independently extracted reference,
  explicit mutation inventory and hostile classifier controls with auditable children.
- Generic gate handling could over-approve R04 -> exact profile and approval binding
  are mandatory planning work before independent PRE.

## Migration Plan

No application switch occurs in R04. Tests import directory-local APIs; package
exports and runtime consumers remain unchanged. After all gates, commit implementation,
sync/archive the new capability, commit archive and CLOSED state separately, then
stop before R05. A future integration change owns adoption and rollback of runtime
behavior. There are no unresolved fallback-policy questions; the exact gate
profile is an explicit validated deliverable, not an unspecified algorithm decision.
