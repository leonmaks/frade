# Design

## Context

See proposal.md for motivation and specs/routing-orthogonal-router/spec.md for
the normative observable contract. Planning starts from R03 closing commit
`0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4`. R01-R03 and their archived evidence
are read-only. The user selected mandatory direction constraints with an
explicit too-short deviation from draw.io; this is a product-contract decision,
not independent PRE approval.

Planning repair on 2026-09-28 retains approved checkpoint
cf424e247490fdfae2c4efc9f7e7377b6d5b6e11 and the immutable repair-entry snapshot.
See evidence/ordinary-direction-spec-conflict.md: compatible decoding alone is
insufficient when inherited R03 constraints differ from native fixed-side choices.
The previous PRE is superseded for this revised contract. No production/test
change is part of this repair; renewed process controls and PRE are prerequisites.

The user subsequently approved B2's explicit parity-contract revision. The old
input predicate remains the full reference-comparison domain, but no longer proves
unconditional native validity. Section 6 defines independent native certification
before V2 execution and preserves all 77 existing strict fixtures. This decision
supersedes the earlier blanket ban on channels anywhere inside that input domain;
it does not weaken terminal constraints or provide independent PRE approval.

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
  -> strict too-short exterior fallback OR ordinary table/certificate/channel construction
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

The raw table executor executes forward moves only. Orientation changes provision a corner; a no-movement
instruction removes the unused corner just as the reference does. Preserve final
source/target orientation-parity handling before assembling endpoints. All state
is per-call; do not share the vendor's mutable scratch arrays. Table decoding and
every instruction class require direct tests before router orchestration.

### 3a. Ordinary terminal certificate and oriented channels

This is an explicit V2 algorithm adaptation. There are exactly two top-level
branches: `fallback` iff the strict fixed-endpoint predicate holds, otherwise
`ordinary`. Ordinary evidence has strategy `REFERENCE_PATTERN` or
`ORIENTED_CHANNEL`, never a fallback reason. No catch block, thrown invariant,
timeout or failed numeric operation selects a strategy. All such failures
propagate. No route is returned before final validation.

**Certificate.** Execute the selected table with checked finite intermediates.
For each floating endpoint provisionally obtain its actual perimeter point via
unchanged R02 `perimeterIntersection(..., orthogonal=true)`, using that endpoint's
adjacent intermediate (or the opposite pre-floating fixed/center reference when
empty). Fixed points are copied exactly. Canonicalize the provisional complete
plan with endpoint pinning. The certificate checks >=2 points, nonzero orthogonal
segments, exact fixed/perimeter attachments, and selected source/target outward
directions and masks, and BOTH resolved terminal jetty minima using central EPSILON.
Measure only after provisional R02 projection and endpoint-pinning canonicalization:
source uses P1-P0, target uses P[n-2]-P[n-1]. For each role compute checked finite
Manhattan length L of its adjacent segment; require L > EPSILON and
L + EPSILON >= that role's resolved minimum (js or jt). Validate differences,
absolute values and sums; invalid minima or nonfinite arithmetic remain fatal.
The resolved minima are not the positive construction buffers: a zero/sub-EPSILON
minimum does not itself require a table run of 10, but the nonzero rule still holds.
For an otherwise finite orthogonal plan, each under-minimum run is named geometric
incompatibility, not a thrown invariant error. Report each deficient role, segment
index, actual length and resolved minimum, including both failures when applicable.
It returns all named finite geometric
incompatibilities; it must not call/catch the final route validator, invent
coordinates or swallow numeric/perimeter/input exceptions.

This plan is a deterministic function of semantic input and the selected table.
It is not a generator rejection predicate or a retry after routeOrthogonal fails.
If certified, select REFERENCE_PATTERN and preserve its original intermediate
snapshot. Otherwise select ORIENTED_CHANNEL and retain the table, provisional
points and precise certificate reasons. This finite geometric incompatibility
result is the only ordinary strategy selector. Invalid opcodes, invalid context,
nonfinite arithmetic and unexpected executor errors abort. Both false-positive
and false-negative certificate decisions require mutation protection.

**B1 minimum regression.** Source bounds (0,0,100,100), exact fixed source (0,0)
with perimeter=false and EAST-only mask, target anchor (1,30) with all directions,
and js=jt=10 are accepted inputs. R03 selects EAST/NORTH; distance sqrt(901)>20
keeps the branch ordinary. Native table [2114,2561] yields [(0,0),(1,0),(1,30)]:
directions pass but source length 1 fails minimum 10. The certificate must select
ORIENTED_CHANNEL and construct a valid route, not merely reject final validation.
For example, protected stubs A=(110,0), B=(1,20) admit the eligible connector
[(110,0),(110,20),(1,20)], yielding a finite full route with terminal runs 110 and
10. Actual selection still follows the complete existing candidate ranking.
This is a feasibility witness, not a substitute for enumerating/ranking candidates.
The case is already outside strict parity by the existing constrained-fixed and
anchor input predicates; no fixture or parity predicate is reclassified.

**Protected stubs.** For each endpoint take base point e: its exact resolved fixed
point, or its routing-bounds center for floating. Let b be its positive ordinary
construction buffer. Its stub A/B keeps e's transverse coordinate. Along WEST or
NORTH use min(e.coordinate, corresponding bound)-b; along EAST or SOUTH use
max(e.coordinate, corresponding bound)+b. Check every operation and a represented
outward run >EPSILON. Floating stubs lie beyond the selected side on its center
axis; unchanged R02 rectangle/ellipse projection yields its cardinal perimeter
point. Never force a bounding-box attachment or duplicate perimeter formulas.

**Finite channel set.** Enclose both bounds, both base points and both stubs,
expand by C=max(10,bs,bt), and obtain finite L,T,R,Btm with each stub strictly
inside by >EPSILON. X is the sorted exact unique set [L,A.x,B.x,R], and Y is
[T,A.y,B.y,Btm]. No quantization or approximate merging of channels.

Enumerate alternating-axis coordinate templates of 1..5 segments between A and
B, starting on either axis. Each interior step picks a different coordinate from
X or Y on its movement axis; the final step must reach B without changing its
transverse coordinate. Reject zero/EPSILON-length steps. Do not revisit a grid
vertex, except closing B=A on the final step. The first connector segment must
not oppose the source outward direction; B toward its previous point must not
oppose the target outward direction. These are template eligibility predicates,
not disposal of candidates that fail final invariants. An empty A=B connector
is never eligible. There are at most 2*(1+3+9+27+81)=242 complete template attempts,
six connector vertices and <=8 raw points after adding semantic endpoints.
No unbounded search, obstacles, previous route or R05 hints are used.

**Completeness.** Both stubs are strictly inside the channel rectangle. For two
horizontal terminal rays and A.x != B.x, a V-H-V connector through T is eligible.
When A.x=B.x (including A=B), use
A -> (A.x,T) -> (R,T) -> (R,Btm) -> (B.x,Btm) -> B.
Vertical/vertical uses the transposed construction. Horizontal/vertical uses
A -> (A.x,T) -> (R,T) -> (R,B.y) -> B; transpose for vertical/horizontal.
All are among the <=5 templates and enter/leave transversely. Near-equal A.x/B.x
within EPSILON use the five-segment witness too; exact equality is not required
for that witness. Frame clearance keeps its legs represented and >EPSILON.
This proves existence, not unrestricted shortest-path or obstacle avoidance.

**Candidate selection.** Add exact fixed points or provisional R02 perimeter
points on stub center axes. Canonicalize EVERY eligible template and validate its
hard attachment/direction invariants plus adapted terminal minima. Both final
terminal runs must be >= their construction buffer using the existing EPSILON
comparison. A failed eligible candidate aborts as a construction defect; it is
never filtered after validation. Check finite complete Manhattan costs. Rank by
exact (length, canonical bend count, cardinal sequence WEST<NORTH<EAST<SOUTH,
channel-index template key). The final key is (segment count, initial axis H<V,
successive X/Y coordinate indices), resolving ties without IDs, absolute origin
or iteration order. Retain every eligible candidate's key, canonical points and
cost, plus eligibility counts/reasons. Identical canonical paths can have different
keys; the smallest wins. This bounded enumeration is translation-stable only in
the conditioned domain and is not claimed globally shortest.

For the retained counterexample the selected route is
[(338,-71166),(733,-71166),(733,-70958),(-15,-70958),(-15,-70862)].
It has EAST/NORTH rays and length 1447. Fixed distance 465.85942085569116 > 145
keeps evidence ordinary/ORIENTED_CHANNEL. It is not a too-short fallback.

**Floating handoff.** For either strategy, call each required R02
resolveFloatingTerminal exactly once against the same selected immutable
intermediate array, with unchanged opposite pre-floating fixed/center references.
Pure perimeter evaluations during certification/candidate planning do not replace
or mutate this handoff. Assert agreement with the selected plan's provisional
endpoints; an unexpected difference aborts. Fixed points bypass projection. Final
canonical validation cannot activate another strategy.

**Parity.** Never replace a certified table plan with a shorter channel route.
Retain all 77 existing strict fixtures, input-domain predicates and expected vendor
data without narrowing, relabelling or regeneration. Inside the unchanged comparison
domain, section 6's independent native certificate determines the strict-parity
obligation before V2 executes. A native-certified case selecting channels or
mismatching remains a failure, never grounds for reclassification. A proven finite
native invariant violation instead requires recorded divergence and valid channels.
The original constrained-fixed/anchor counterexample remains outside that input
domain and receives its existing separate V2 adaptation evidence.
Independently test all 16 direction pairs, shared stubs, fixed/floating/ellipse
cases, eligibility, cost ties, positive minima and numeric failures. Accepted
property inputs/quotas remain unchanged; certificate-negative inputs are not
excluded.

### 4. Too-short trigger and local exterior construction

Trigger requires both R02 fixed results. Compute finite dx, dy, d=Math.hypot(dx,dy)
and J=js+jt; choose fallback exactly when d<J. Equality goes to ordinary routing.
No squared-distance overflow and no EPSILON adjustment are allowed. Known invalid
input and thrown pattern/final invariant failures are errors, not extra fallback triggers.

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
and mask membership. Source uses P1-P0; target uses P[n-2]-P[n-1]. For EVERY route
(REFERENCE_PATTERN, ORIENTED_CHANNEL and fallback), measure both final canonical
terminal runs against js/jt with the same checked L > EPSILON and L + EPSILON >=
minimum predicate as the certificate. INV-007/008 diagnostics identify source/target
respectively, with segment index, actual length and expected minimum. R04 must
supply both resolved minima in the independent validation context on every branch;
no optional fallback-only enforcement may permit an ordinary route to bypass them.
Channels additionally meet their positive construction buffers. Final validation
cannot select another strategy; certificate-driven construction must already have
provided valid geometry for accepted representable inputs. It receives a readonly
context independent of the router type. Diagnostics include invariant ID, segment
index and expected/actual geometry. Successful result and evidence are copied and
deeply frozen, including arrays and masks. No caller-owned object is frozen in place.

### 6. Verification domains and reference independence

The reference-comparison input domain uses axis-aligned nondegenerate rectangles, distinct cell
IDs, finite well-conditioned arithmetic, construction buffers equal to resolved
minima, no hints/rotation/spacing, and coordinates/intermediates representable on
the reference 0.1 grid. Preserve the exact existing `strictParityInput` predicate
from the retained reference/generate.mjs as the comparison-domain selector, despite
its historical name. Its truth value admits comparison, not automatic strict parity.
Keep declared R01-R03 adaptation cases outside this domain by the existing INPUT
predicates; never add exclusions after seeing a mismatch. Pin independent reference
direction decisions as well as points. The 64 canonical fixtures use singleton
masks to exercise every direction pair/quadrant with enough separation to avoid
the too-short branch. Add aligned, overlap, mixed attachment and marker partitions.

**Two-part reference contract (user-approved B2 decision).** For EVERY admitted
input, evaluate the hash-pinned native oracle and its independently normalized
complete route before calling V2. Use an R04 test-local reference checker that
imports no R04 production certificate, validator, normalizer or router. It derives
expected endpoints, singleton directions/masks and resolved minima independently
from the reference input and pinned reference projection/jetty semantics in this
domain. It checks >=2 points, exact fixed attachments or actual floating rectangle
perimeter membership, canonical endpoint preservation, finite nonzero orthogonality,
source P1-P0 and target P[n-2]-P[n-1] outward directions/masks, and BOTH minima with
checked L > EPSILON and L + EPSILON >= the own resolved minimum. Use the existing
independently specified structural normalization and central EPSILON; no new
quantization, tolerance or geometry correction. Preserve raw and canonical native
points, vendor/extraction hashes, expected context, verdict and all named finite
violations with role/segment/expected/actual evidence.

Freeze this reference verdict before V2 execution. It defines two obligations:

- NATIVE_CERTIFIED: require REFERENCE_PATTERN and the existing complete semantic
  parity comparison, plus every V2 invariant. Any V2 exception, mismatch, channel
  choice or certificate disagreement fails. Do not recategorize from V2 output.
- NATIVE_INVARIANT_DIVERGENCE: a finite native geometric violation is independently
  proved; preserve its native route unchanged and require V2 ORIENTED_CHANNEL with
  exact attachments, both selected directions and both minima. Never claim final
  geometry parity. V2 exceptions, invalid routes or missing/wrong certificate
  reasons fail; native failure is not permission for arbitrary V2 output.

Invalid reference input, nonfinite arithmetic, oracle/checker exceptions,
instrumentation inconsistency or unknown failures ABORT the comparison run; they
cannot become divergence cases. Both classes run V2 and all invariant assertions.
Report total admitted inputs = certified + finite-divergence cases for completed
runs, with separate failed/aborted counts when incomplete. Report strict comparisons
only over certified cases and explicit divergences separately, never as parity
successes or rejected inputs. Property generators/quotas remain wholly unchanged.

Preserve all 77 saved ordinary fixtures (including the 64 matrix cases) byte-for-byte
as permanent STRICT obligations. Independently assert that each is native-certified;
if this assertion fails, stop for oracle/contract investigation, do not relabel it.
Add B2 separately without replacing any existing fixture or native expectation.
For both classes retain direct raw table/instruction comparisons independently
of the final strategy: channels must not conceal a broken decoder/executor.

**B2 deterministic regression.** Source rectangle (0,0,20,20), exact fixed (20,10),
EAST-only; target rectangle (11,30,20,20), exact fixed (21,30), NORTH-only; distinct
cells and js=jt=10. The unchanged domain selector is true; d=sqrt(401)>20 keeps the
branch ordinary. Native EAST/NORTH, quadrant 2, table
[513,2308,2561,1090,514,2568,2308] gives
[(20,10),(30,10),(30,30),(21,30)]. Target-outward EAST and length 9 independently
violate NORTH and minimum 10. Record both violations before V2 runs. Protected
stubs A=(30,10), B=(21,20) and frame [-10,-10,41,60] admit the witness
[(20,10),(30,10),(30,20),(21,20),(21,30)], cost 39, terminal runs 10/10.
Full existing candidate validation/ranking still determines the returned route.

Before production repair, task 2.8 adds independent checker positive/negative
controls for every invariant, both roles/minimum boundaries and fatal errors;
ordering controls prove classification completes before any V2 callback. Replacing
that callback with a throw, bad route, wrong strategy or false certificate must
fail without changing the frozen native verdict. A certified native fixture cannot
be diverted to channels even if shorter. Retain unknown/nonfinite oracle errors as
abort controls and all-input accounting assertions. This checker is test-only and
must not become a production dependency or reuse the production certificate.

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
The core geometry/direction property assertions also check both resolved minima
on every successful route, including both ordinary strategies. Keep the existing
generators, accepted-domain predicates, quotas and tolerance unchanged.

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
Explicitly protect certificate source/target minimum omissions, role/minimum swaps,
EPSILON comparison boundaries, confusing resolved minima with construction buffers,
and under-minimum classification as fatal/fallback/native success instead of channels.
Carry the repaired R03 fatal-evidence precedence into an R04-local harness plus
its executable adversarial controls; do not import R03 run.mjs as a library because
it executes main(). Do not edit R03. Unknown structured failures at any audit level,
including embedded timeout wording, must abort before timeout/survival/kill.
Any permitted domain-error kill needs an exact structured whitelist and first-frame
binding to the runner-owned isolated R04 root; absent that proof, abort. A numeric
score cannot override unclassified failures. Threshold >=90%, denominator includes
all compiler-valid survivors/timeouts; neither counts as a kill.

### 7. Process control before implementation

The paragraphs below describe the initial checkpoint protocol. For the authorized
repair, evidence/planning-repair-process-protocol.md adds mandatory isolation and
renewed approval semantics; tasks 1.6-1.8 must implement and verify them before
resumption. No generic PLANNING exemption for existing product files is allowed.
The original approval is retained historically and cannot certify revised wording.

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
behavior. The strict fallback policy is unchanged. The revised ordinary policy
is specified for review. Task 1.6's repair-specific gate/isolation controls are
implemented, with 225 focused and 989 full self-test assertions recorded in
evidence/process-control-repair-validation.md. The subsequent independent PRE
found B1 (missing certificate minima); the next PRE accepted that repair but found
B2 (overbroad parity promise). The user-approved two-part reference contract above
addresses B2 and still requires fresh independent PRE and task 1.8 before implementation.
Machine PASS and this author's planning checks do not constitute PRE approval.
