# Frade Draw — Routing Engine V2 Agent Contract

## 0. Status

This directory implements Frade Routing Engine V2.

The routing system is correctness-critical.

Local visual patches are prohibited.

The implementation must converge toward deterministic draw.io-compatible routing behavior.

---

# 1. Authoritative Documents

For routing work, authoritative sources are:

```text
docs/routing-v2/drawio-routing-master-spec.md
docs/routing-v2/implementation-playbook.md
```

The currently active OpenSpec change provides the implementation scope.

Authority order within the project work:

```text
active OpenSpec requirements
        +
routing master architecture
        +
established regression behavior
        ↓
implementation
```

If these sources conflict:

```text
STOP
report SPEC_CONFLICT
```

Do not resolve conflicts silently in code.

---

# 2. Development Sequence

Routing Engine V2 is intentionally implemented sequentially:

```text
R01 Geometry Kernel
        ↓
R02 Terminal / Perimeter
        ↓
R03 Direction Resolver
        ↓
R04 Orthogonal Router
        ↓
R05 Segment Router
        ↓
R06 Segment Editor
        ↓
R07 Preview / Commit
        ↓
R08 Self-loop
        ↓
R09 Draw.io Differential Harness
        ↓
R10 X6 Integration
```

Never use code from a later phase to compensate for missing behavior in an earlier phase.

Example:

If R04 automatic routing is wrong:

```text
do NOT repair it in R10 X6 adapter
```

Fix R04.

---

# 3. Routing Architecture

Required dependency direction:

```text
X6 / UI Adapter
       ↓
Interaction / Gesture Layer
       ↓
Routing Commands
       ↓
Routing Strategy
 ┌─────┼─────────┐
 ↓     ↓         ↓
Orth  Segment   Loop
 Router Router  Router
       ↓
Terminal Resolution
       ↓
Geometry Kernel
```

Dependencies against this direction are architecture violations.

---

# 4. Core Independence

The routing domain/core must not depend on:

```text
React
React DOM
AntV X6
Electron
DOM APIs
SVG elements
Canvas elements
browser event types
application UI state
repository navigator
repository persistence
```

Adapters may depend on these systems.

Routing algorithms may not.

---

# 5. Source of Truth

Rendered polyline points are NOT the authoritative edge model.

Authoritative routing state consists of semantic information such as:

```text
source terminal binding
target terminal binding
routing mode
connection constraints
port constraints
manual route hints
jetty configuration
```

The route:

```text
Point[]
```

is derived.

Never persist automatic intermediate route points as the primary routing state.

---

# 6. Fundamental Pipeline

Automatic edge routing must conceptually preserve:

```text
semantic edge model
        ↓
terminal geometry
        ↓
fixed terminal resolution
        ↓
routing strategy
        ↓
intermediate points
        ↓
floating perimeter resolution
        ↓
canonicalization
        ↓
invariant validation
        ↓
immutable EdgeRoute
```

Do not merge these responsibilities merely to reduce code.

---

# 7. Fixed and Floating Terminals

Fixed terminal resolution occurs before intermediate routing.

Floating perimeter attachment is resolved after the route provides a meaningful approach direction.

A floating connection point MUST NOT be persisted as if it were an explicit fixed anchor.

Default Frade attachment is allowed to move to another perimeter side when geometry changes.

---

# 8. Perpendicular Terminal Contract

For axis-aligned rectangular terminals:

```text
WEST  -> terminal segment horizontal
EAST  -> terminal segment horizontal
NORTH -> terminal segment vertical
SOUTH -> terminal segment vertical
```

Both source departure and target arrival must obey the applicable direction constraint.

A terminal segment may never become diagonal as a repair mechanism.

---

# 9. Orthogonality Invariant

Every semantic routing segment must satisfy:

```text
x1 == x2
OR
y1 == y2
```

within the documented geometry epsilon.

Diagonal intermediate segments are forbidden.

Do not hide diagonals with renderer tricks.

---

# 10. Core Route Invariants

Every final route must satisfy all applicable invariants.

```text
INV-001 all coordinates finite

INV-002 no adjacent duplicate points

INV-003 every semantic segment orthogonal

INV-004 no zero-length segments

INV-005 source endpoint valid

INV-006 target endpoint valid

INV-007 source direction constraint respected

INV-008 target direction constraint respected

INV-009 route independent of zoom

INV-010 normalization idempotent

INV-011 rerouting identical input is deterministic

INV-012 preview geometry equals committed geometry

INV-013 no renderer-only geometry repair

INV-014 no history-dependent automatic route
```

Invariant validation must fail loudly during development.

Do not silently repair invalid output after validation.

---

# 11. Numerical Policy

All geometry calculations use MODEL SPACE.

Do not route in:

```text
screen coordinates
DOM coordinates
CSS pixels after zoom transform
device pixels
```

The route must remain semantically identical at:

```text
50% zoom
100% zoom
200% zoom
```

Numerical tolerance must be defined centrally.

Do not increase tolerance in individual tests to hide incorrect geometry.

---

# 12. Deterministic Tie Breaking

Every ambiguous routing choice must use an explicit deterministic policy.

Never rely on:

```text
Map/Set insertion accident
object property enumeration accident
DOM ordering
current selection ordering
previous pointer movement
Math.random()
timestamp
```

If a tie-break rule is required, encode and test it explicitly.

---

# 13. Automatic and Manual Routing Are Different Modes

Required conceptual states include:

```text
AUTO_ORTHOGONAL
MANUAL_ORTHOGONAL
```

A manual edit is not simply a mutation of automatic route points.

First semantic segment edit:

```text
AUTO_ORTHOGONAL
        ↓
MANUAL_ORTHOGONAL
```

Reset Waypoints:

```text
MANUAL_ORTHOGONAL
        ↓
clear semantic hints
        ↓
AUTO_ORTHOGONAL
        ↓
fresh reroute
```

---

# 14. Route Hints

Manual route hints are semantic constraints.

They are NOT copies of all rendered vertices.

Store the minimum information required to reconstruct the intended manual topology.

Route hints use MODEL SPACE.

Route hints must survive rendering changes.

---

# 15. Segment Handles

Segment handles are transient UI state.

They:

```text
are derived from current EdgeRoute
exist while edge is editable
may change after topology changes
must never become persisted route state
```

Each editable straight segment exposes an appropriate virtual handle.

---

# 16. Segment Drag

Dragging a vertical segment changes its X channel.

Dragging a horizontal segment changes its Y channel.

Do not mutate arbitrary neighboring points until the route "looks right."

The operation is:

```text
user semantic edit
        ↓
update route constraint/hint
        ↓
SegmentRouter
        ↓
new route
```

---

# 17. Straight Edge Editing

A straight orthogonal edge must support a virtual segment edit.

Dragging the straight route perpendicular to itself may create a valid dogleg route.

This behavior must be represented through manual routing semantics, not renderer-local points.

---

# 18. Preview / Commit

This is a hard invariant.

Forbidden:

```text
previewRouter()
commitRouter()
```

Required:

```text
sameRouteEngine(
    semanticModel + transientEdit
)
```

Preview and commit differ only in persistence of semantic state.

For identical final pointer/model coordinates:

```text
previewRoute == committedRoute
```

within central geometry tolerance.

---

# 19. No Persisted Mutation During Pointer Move

During an active gesture:

```text
pointerMove
```

must not repeatedly mutate persisted edge state.

Use a routing draft/transient model.

Only commit at the transaction boundary.

Cancel/Escape restores original semantic state exactly.

---

# 20. Self-loop Isolation

If:

```text
source === target
```

select loop routing.

Do not push self-loops through normal two-terminal route pattern selection and then patch the result.

Loop routing may share geometry primitives and common normalization, but its topology decision is separate.

---

# 21. Renderer Rule

Renderer receives a valid route.

Renderer may:

```text
draw the path
draw rounded corners
draw line jumps
draw markers
draw selection decoration
```

Renderer must NOT:

```text
repair topology
add semantic bends
remove routing bends
change terminal direction
change attachment side
persist routing corrections
```

Rounded corners and line jumps are visualization.

They are not semantic route geometry.

---

# 22. X6 Quarantine

Until R10, routing code must not depend on AntV X6.

At R10, X6 exists behind adapters.

Expected architecture:

```text
X6
 ↓
X6RoutingAdapter
 ↓
Routing Engine V2
```

Forbidden:

```text
Routing Engine V2
 ↓
X6 internals
```

---

# 23. Legacy Router Quarantine

Routing V2 must not silently invoke legacy routing when an input is difficult.

Forbidden:

```text
try V2
catch
use legacy
```

unless an explicit approved compatibility boundary exists.

Unsupported V2 conditions must be observable.

Do not hide them behind transparent legacy fallback.

---

# 24. No Visual Patch Rule

Forbidden patterns include conceptual equivalents of:

```text
if edge looks wrong:
    move point 5px

if source overlaps:
    insert temporary bend

after render:
    correct terminal point

useEffect:
    repair edge geometry

pointerMove:
    mutate vertices until orthogonal
```

Any such change requires architecture review.

---

# 25. Normalization

Canonicalization must be deterministic and idempotent:

```text
normalize(normalize(route))
===
normalize(route)
```

Typical canonicalization responsibilities:

```text
remove adjacent duplicates
remove redundant collinear intermediates
normalize numerical precision where specified
preserve semantically required bends
```

Do not use normalization to conceal an incorrect routing algorithm.

---

# 26. Invariant Validator

Routing code must provide explicit invariant validation.

During implementation and tests, invalid route output must produce actionable evidence.

Validation errors should identify:

```text
edge / fixture
failed invariant
segment index
points involved
routing mode
relevant terminal direction
```

Do not return merely:

```text
invalid route
```

---

# 27. Test Pyramid

Routing correctness is tested primarily through geometry, not screenshots.

Required conceptual hierarchy:

```text
           visual tests
        integration tests
      interaction / BDD
      differential parity
       property tests
      deterministic unit
```

Visual tests are important but are not the authoritative proof of routing correctness.

---

# 28. Property-Based Tests

Use property testing for invariants where appropriate.

Important properties include:

```text
orthogonality
determinism
normalization idempotence
translation invariance
direction mask compliance
zoom independence
finite coordinate output
```

A property failure must be reproducible by seed.

A discovered failure should become a deterministic regression fixture.

---

# 29. Differential Testing

After the Draw.io Differential Harness exists:

```text
draw.io reference
        vs
Frade Routing V2
```

is the primary compatibility oracle for supported behavior.

Do not manipulate canonicalization to hide a genuine topology mismatch.

Comparison must retain meaningful information such as:

```text
source side
target side
segment direction sequence
bend count
coordinates within explicit tolerance
```

---

# 30. Regression Fixtures Are Append-Oriented

A historical routing regression fixture should normally remain forever.

Do not delete fixtures merely because:

```text
"this scenario is unusual"
```

Unusual geometry is precisely where routing regressions occur.

---

# 31. Bug Protocol

When any routing defect is reported:

```text
1. reproduce

2. determine semantic input

3. create deterministic failing fixture/test

4. identify failed invariant

5. identify responsible layer

6. fix responsible layer only

7. run targeted test

8. run complete routing regression suite

9. run parity suite when available

10. run architecture gate if boundaries changed
```

Do not start by changing point coordinates.

---

# 32. Responsible Layer Classification

When diagnosing a defect, classify it first:

```text
GEOMETRY
TERMINAL
PERIMETER
DIRECTION_RESOLUTION
JETTY
ROUTE_PATTERN
ORTHOGONAL_ROUTER
SEGMENT_ROUTER
LOOP_ROUTER
NORMALIZATION
INTERACTION
PREVIEW_TRANSACTION
ADAPTER
RENDERER
SERIALIZATION
REFERENCE_HARNESS
```

A defect must be fixed in the lowest correct layer.

Example:

Incorrect EAST/WEST selection is not an X6 adapter defect.

---

# 33. Two-Fix Escalation Rule

For the same deterministic failure:

```text
attempt 1 fails
attempt 2 fails
```

Then:

```text
STOP PATCHING
```

Before attempt 3 produce:

```text
Root Cause Analysis
Failed invariant
Responsible layer
Why previous attempts failed
Whether design/spec must change
```

If the explanation cannot be produced, do not modify production routing code again.

---

# 34. Test Protection

Routing tests must not be weakened without specification evidence.

Forbidden repair strategies:

```text
increase epsilon
increase screenshot threshold
remove endpoint assertion
ignore one segment
ignore first/last point
compare only bounding boxes
accept either direction
accept arbitrary bend count
update fixture to current Frade output
```

Reference fixtures must change only when the reference behavior or supported specification explicitly changes.

---

# 35. Test Anti-patterns

Do not introduce:

```text
expect(result).toBeDefined()
```

as the primary correctness assertion for geometry.

Do not test orthogonal routing only with:

```text
snapshot matches
```

Prefer explicit semantic assertions.

Example:

```text
sourceDirection === EAST
targetDirection === WEST
segments.every(isOrthogonal)
bendCount === expected
route === expectedWithinTolerance
```

---

# 36. Golden Fixture Integrity

Golden fixtures must include enough input to reconstruct the scenario.

A fixture must not depend on:

```text
current test execution order
mutable global router config
previous fixture
browser zoom
random seed not recorded
```

---

# 37. R04 Orthogonal Router Special Gate

R04 cannot pass if any supported source/target direction pair lacks tested behavior.

Minimum canonical topology coverage:

```text
4 source directions
×
4 target directions
×
4 normalized quadrants
```

plus overlap/close-terminal scenarios.

No "mostly working" state is acceptable for R04 completion.

---

# 38. R07 Preview Special Gate

R07 cannot pass unless automated tests demonstrate:

```text
preview(P) == commit(P)
```

for:

```text
segment drag
source endpoint drag
target endpoint drag
```

and cancellation does not mutate persisted state.

---

# 39. R09 Differential Harness Special Gate

The differential harness is itself correctness-critical.

A false-positive harness is considered a critical architecture defect.

The harness must not:

```text
normalize Frade differently from reference
use excessive tolerance
drop bends before comparison
ignore terminal sides
rewrite Frade output into reference form
```

Reference and Frade results must remain independently observable.

---

# 40. R10 X6 Integration Special Gate

R10 must not alter core routing behavior to satisfy X6.

If X6 integration reveals a core routing bug:

```text
write regression test at core level
fix core
rerun core suite
then continue integration
```

Do not patch it inside the X6 adapter.

---

# 41. Forbidden Imports — Core

Pure routing/core modules must not import framework code.

Examples of forbidden imports in core layers:

```text
react
react-dom
@antv/x6
electron
```

Framework imports are permitted only in explicitly designated adapter/UI modules.

---

# 42. Forbidden Global Dependencies — Core

Core routing must not read:

```text
window
document
devicePixelRatio
performance.now()
requestAnimationFrame()
```

for routing decisions.

---

# 43. Forbidden Routing Randomness

Production route selection must never use:

```text
Math.random()
```

Random generation is allowed in property/differential tests when reproducibly seeded.

---

# 44. Serialization Contract

Persist semantic state.

Do not serialize:

```text
selection handles
hover handles
preview route
screen coordinates
rounded renderer path
line-jump geometry
temporary pointer positions
automatic route cache
```

Serialization round-trip must preserve semantic route behavior.

---

# 45. Undo / Redo

Undo/redo should restore semantic routing state.

Do not make undo depend on restoring arbitrary SVG/polyline artifacts.

After semantic state restoration, route is recomputed deterministically.

---

# 46. Moving Terminals

Automatic route:

```text
terminal moves
→ full semantic reroute
```

Manual route:

```text
terminal moves
→ preserve semantic route hints
→ re-resolve terminal portions
```

When source and target move together as one selection, explicit translation semantics may apply according to the active specification.

---

# 47. Read Before Edit

Before changing a routing layer:

read only the relevant implementation and corresponding tests.

Examples:

Changing perimeter logic:

```text
read perimeter implementation
read perimeter tests
read terminal contracts
```

Do not consume the entire repository context without need.

For architectural changes, read the applicable section of the routing master spec.

---

# 48. Required Implementation Report

At the end of an implementation phase report:

```text
CHANGE:
...

IMPLEMENTED:
...

FILES CHANGED:
...

INVARIANTS AFFECTED:
...

TESTS ADDED:
...

COMMANDS EXECUTED:
...

TEST RESULTS:
...

KNOWN BLOCKERS:
none | details

READY_FOR_VERIFY:
YES | NO
```

Do not declare Gate PASS from an implementation phase.

---

# 49. Required Architecture Gate Report

Architecture gate review uses:

```text
CHANGE:
...

GATE_STATUS: PASS | FAIL

BLOCKERS:
...

INVARIANTS CHECKED:
...

ARCHITECTURE BOUNDARIES CHECKED:
...

TEST EVIDENCE:
...

PARITY EVIDENCE:
...

NON-BLOCKING WARNINGS:
...
```

Only a real blocker-free result may use:

```text
GATE_STATUS: PASS
```

---

# 50. No Automatic Next Change

After a change reaches PASS:

```text
STOP
```

Report readiness for archive / next change.

Do not implement the next R0X automatically.

---

# 51. Definition of Correct Routing Work

A routing task is not complete because the diagram visually appears correct once.

It is complete when:

```text
semantic model is correct
+
responsibility is in the correct layer
+
algorithm is deterministic
+
invariants hold
+
targeted test exists
+
regression suite passes
+
reference parity passes where applicable
+
architecture boundaries remain intact
```

---

# 52. Prime Directive

Never solve a routing problem by hiding it downstream.

Fix the first incorrect semantic decision in the routing pipeline.

<!-- ROUTING-V2-ENFORCEMENT:BEGIN -->

# Routing Engine V2 — Mandatory Engineering Contract

These rules apply to all Routing Engine V2 work under this directory.

They are stricter than general repository guidance.

## Authoritative sources

Before Routing V2 work read:

- `docs/routing-v2/drawio-routing-master-spec.md`
- `docs/routing-v2/implementation-playbook.md`
- `docs/routing-v2/CURRENT_CHANGE.md`
- `docs/routing-v2/legacy-boundary.md`

The currently active OpenSpec change defines the allowed implementation scope.

If these sources conflict:

```text
STOP
REPORT: SPEC_CONFLICT
```

Do not resolve the conflict silently in code.

## V2 physical architecture

Framework-independent V2 domain code belongs only under these directories:

```text
packages/draw/src/routing/model/
packages/draw/src/routing/geometry/
packages/draw/src/routing/terminal/
packages/draw/src/routing/orthogonal/
packages/draw/src/routing/segment/
packages/draw/src/routing/loop/
packages/draw/src/routing/normalization/
packages/draw/src/routing/validation/
packages/draw/src/routing/interaction/
```

Future X6 integration belongs under:

```text
packages/draw/src/routing/adapters/x6/
```

Do not create:

```text
packages/frade-draw/
apps/frade-draw/
```

The actual Frade Draw package is:

```text
packages/draw
```

## Legacy quarantine

Existing top-level routing implementations and the files listed in:

```text
docs/routing-v2/legacy-boundary.md
```

are legacy behavior.

For R01–R09 they are READ-ONLY unless an active OpenSpec change explicitly
authorizes otherwise.

Do not repair V2 behavior by modifying legacy routing.

R10 may modify explicitly designated integration-boundary files only.

Legacy routing algorithms remain protected.

## Dependency direction

Required:

```text
UI / Workspace
      ↓
Editor / X6 Integration
      ↓
routing/adapters/x6
      ↓
routing/interaction
      ↓
routing/{orthogonal,segment,loop}
      ↓
routing/terminal
      ↓
routing/geometry
```

Reverse dependencies are blockers.

## Framework isolation

The following V2 directories MUST NOT import React, React DOM, AntV X6,
Electron, DOM/browser APIs, or UI state:

```text
model
geometry
terminal
orthogonal
segment
loop
normalization
validation
interaction
```

Only `routing/adapters/x6/` may depend on AntV X6.

## Source of truth

Rendered vertices are derived state.

Do not use persisted rendered polyline points as the authoritative V2 model.

Authoritative state is semantic:

```text
terminal bindings
routing mode
connection constraints
port constraints
route hints
jetty configuration
```

## Routing pipeline

Preserve:

```text
semantic model
→ fixed terminal resolution
→ routing strategy
→ intermediate route
→ floating perimeter resolution
→ canonicalization
→ invariant validation
→ immutable route
```

Do not collapse these responsibilities into UI or renderer code.

## Hard route invariants

All applicable output must satisfy:

```text
finite coordinates
no adjacent duplicates
no zero-length segments
all semantic segments orthogonal
valid source perimeter/constraint
valid target perimeter/constraint
source direction respected
target direction respected
zoom independence
determinism
normalization idempotence
preview == commit
```

## No visual patches

Forbidden:

```text
repair route in renderer
repair route in React effect
move points by arbitrary pixels
mutate vertices until route looks correct
use preview-specific topology
fallback silently to legacy router
```

Fix the first incorrect semantic decision.

## Automatic vs manual routing

These are separate modes:

```text
AUTO_ORTHOGONAL
MANUAL_ORTHOGONAL
```

A manual edit changes semantic routing constraints.

It does not persist the current rendered polyline as source of truth.

## Segment handles

Segment handles are transient UI state.

They must never be serialized.

## Preview transaction

Persisted semantic routing state must not change during pointer move.

Preview and commit must call the same routing pipeline.

For the same final model-space pointer position:

```text
previewRoute == committedRoute
```

within the central geometry tolerance.

## Self-loop

`source === target` uses LoopRouter.

Do not force self-loops through normal two-terminal routing and patch the
result afterward.

## Draw.io reference

Files below are behavioral reference material and are READ-ONLY:

```text
apps/desktop/vendor/drawio/
```

Never modify vendored draw.io to make differential tests pass.

## Test integrity

Never make routing tests pass by:

```text
increasing epsilon
ignoring terminal points
ignoring bend count
accepting arbitrary side selection
removing assertions
updating golden fixtures to current Frade output
skipping tests
using .only
```

A new reproduced bug requires a deterministic failing regression before the fix.

## Two-fix escalation

After two unsuccessful fixes of the same deterministic failure:

```text
STOP PATCHING
```

Produce:

```text
FAILED_INVARIANT:
RESPONSIBLE_LAYER:
ROOT_CAUSE:
WHY_PREVIOUS_FIXES_FAILED:
SPEC_CHANGE_REQUIRED: YES | NO
```

Do not perform attempt #3 until root cause is explicit.

## Current change boundary

Before modifying code, read:

```text
docs/routing-v2/CURRENT_CHANGE.md
```

Do not modify code outside its allowed scope.

Do not start the next R0X change automatically.

## Architecture Gate

During an architecture gate:

```text
DO NOT MODIFY PRODUCTION CODE
```

Output must be exactly one status:

```text
GATE_STATUS: PASS
```

or:

```text
GATE_STATUS: FAIL
```

Any correctness or architecture blocker means FAIL.

<!-- ROUTING-V2-ENFORCEMENT:END -->
