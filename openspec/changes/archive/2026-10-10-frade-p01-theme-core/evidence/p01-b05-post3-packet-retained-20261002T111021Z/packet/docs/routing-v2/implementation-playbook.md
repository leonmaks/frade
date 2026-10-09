
# Frade Draw Routing Engine v2
## OpenSpec Execution Playbook

Версия: 1.0
Эталон поведения: draw.io / diagrams.net
Процесс: OpenSpec + SDD + BDD + TDD + Architecture Gates
Главное правило:

> Ни один следующий change не начинается, пока предыдущий change не прошёл implementation tests, regression tests, OpenSpec verify и Architecture Gate.

---

# 0. Общая схема

Вся реализация делится ровно на 10 последовательных changes:

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

Нельзя выполнять:

```text
R04 параллельно R03
R06 до завершения R05
R10 до завершения R09
```

Это intentional dependency chain.

---

# 1. Почему именно такой процесс

Каждый change проходит:

```text
PLAN
 ↓
IMPLEMENT
 ↓
UNIT TESTS
 ↓
PROPERTY / BDD / PARITY TESTS
 ↓
REGRESSION TESTS
 ↓
OPENSPEC VERIFY
 ↓
ARCHITECTURE GATE
 ↓
ARCHIVE
 ↓
NEXT CHANGE
```

Если любой этап красный:

```text
STOP
```

Следующий OpenSpec change создавать запрещено.

---

# 2. Модельная стратегия

Используем три класса модели.

| Роль | Модель | Effort | Назначение |
|---|---|---:|---|
| дешёвый test/fix worker | GPT-6 Luna | high | тестовые fixtures, тривиальные исправления, formatting |
| основной developer | GPT-6 Sol | high | основная реализация |
| сложная архитектура | GPT-6 Astra | high/xhigh | OrthogonalRouter, parity, критичные gates |

Принцип:

```text
не использовать Astra,
если задача надёжно решается Sol
```

и:

```text
не использовать Sol,
если задача сводится к локальному test/fix loop
```

---

# 3. Распределение моделей по этапам

| Change | Implementation | Test/Fix | Architecture Gate |
|---|---|---|---|
| R01 Geometry Kernel | Sol medium/high | Luna high | Sol high |
| R02 Terminal/Perimeter | Sol high | Luna high | Sol high |
| R03 Direction Resolver | Sol high | Luna high | Astra high |
| R04 Orthogonal Router | **Astra high/xhigh** | Sol high | **Astra xhigh** |
| R05 Segment Router | Sol high | Luna/Sol | Sol high |
| R06 Segment Editor | Sol high | Luna high | Sol high |
| R07 Preview/Commit | Sol high | Luna/Sol | Astra high |
| R08 Self-loop | Sol high | Luna high | Sol high |
| R09 Differential Harness | **Astra high** | Sol/Luna | **Astra xhigh** |
| R10 X6 Integration | Sol high | Sol high | **Astra high** |

Главные расходы приходятся на:

```text
R04
R09
R10
```

Именно там имеет смысл использовать максимальную модель.

---

# 4. Первичная настройка

Из корня проекта:

```bash
npm install -g @fission-ai/openspec@latest
npm install -g @openai/codex@latest
```

Проверить:

```bash
openspec --version
codex --version
node --version
```

OpenSpec требует современный Node.js.

Далее:

```bash
openspec config profile
```

Включить expanded workflow:

```text
new
continue
apply
verify
sync
archive
```

Затем:

```bash
openspec update
```

Проверить наличие:

```text
.agents/skills/
  openspec-new-change/
  openspec-continue-change/
  openspec-apply-change/
  openspec-verify-change/
  openspec-archive-change/
```

---

# 5. Master Spec должен находиться в репозитории

Создать:

```text
docs/
  routing-v2/
    drawio-routing-master-spec.md
    implementation-playbook.md
```

Первый файл — master-spec из предыдущего этапа.

Все OpenSpec changes обязаны ссылаться на него.

Это критично.

Не следует каждый раз вставлять master-spec целиком в prompt.

Модель должна читать:

```text
docs/routing-v2/drawio-routing-master-spec.md
```

---

# 6. Git strategy

Создать базовую ветку:

```bash
git switch -c feat/routing-engine-v2
```

Для каждого change желательно отдельный commit.

Например:

```text
routing-v2/r01-geometry
routing-v2/r02-terminal
...
```

Но не обязательно отдельная Git branch.

Главное:

```text
один OpenSpec change
=
один логический завершённый increment
```

---

# 7. Общий lifecycle каждого change

Для каждого R01–R10 повторять один процесс.

## Шаг A — открыть НОВУЮ Codex session

Не продолжать предыдущую огромную conversation.

Контекст должен быть чистым.

---

## Шаг B — запустить нужную модель

Пример Sol:

```bash
codex -m gpt-6-sol -c model_reasoning_effort='"high"'
```

Для Astra:

```bash
codex -m gpt-6-astra -c model_reasoning_effort='"high"'
```

Для дешёвого repair-loop:

```bash
codex -m gpt-6-luna -c model_reasoning_effort='"high"'
```

Если GPT-6 ещё недоступен в используемой версии Codex:

```text
основной fallback:
gpt-5.6-sol xhigh
```

Но сначала лучше обновить Codex.

---

# 8. OpenSpec lifecycle

В Codex:

```text
$openspec-new-change <change-name>
```

После этого:

```text
$openspec-continue-change <change-name>
```

последовательно создать:

```text
proposal
spec
design
tasks
```

После каждого planning artifact модель должна проверить его против:

```text
drawio-routing-master-spec.md
```

Когда planning завершён:

```bash
openspec validate <change-name> --strict
```

Только после зелёной validation:

```text
$openspec-apply-change <change-name>
```

После implementation:

```text
$openspec-verify-change <change-name>
```

После Architecture Gate:

```text
$openspec-archive-change <change-name>
```

---

# 9. Жёсткое правило Gate

OpenSpec `verify` сам по себе не является достаточным.

Добавляем собственный hard gate.

Для каждого change должно быть:

```text
GATE_STATUS=PASS
```

Если:

```text
FAIL
```

change остаётся активным.

Запрещено:

```text
archive
```

и запрещено создавать следующий change.

---

# CHANGE R01
# Geometry Kernel

Change name:

```text
routing-v2-01-geometry-kernel
```

## Модель

Implementation:

```text
GPT-6 Sol
effort: medium/high
```

Fix-loop:

```text
GPT-6 Luna high
```

Gate:

```text
GPT-6 Sol high
```

---

## Scope

Создать полностью независимое geometry ядро.

Реализовать:

```text
Point
Vector
Rect
Direction
Orientation
Segment
epsilon comparison
opt-in scalar quantizeCoordinate (separate from point-sequence normalization)
model/view/screen transforms
duplicate point detection
collinearity detection
orthogonality predicates
route normalization primitives
```

Запрещено:

```text
TerminalResolver
OrthogonalRouter
X6 dependency
React dependency
DOM dependency
```

---

## Executable prompt R01

```text
Implement OpenSpec change routing-v2-01-geometry-kernel.

AUTHORITATIVE SOURCES

1. Read:
   docs/routing-v2/drawio-routing-master-spec.md

2. Inspect the current Frade Draw codebase before making design decisions.

3. Inspect all existing routing-related code but do not preserve legacy
   architecture merely for compatibility if it conflicts with the master spec.

GOAL

Implement the pure geometry kernel required by Routing Engine v2.

The kernel must be deterministic, framework-independent, side-effect-free
TypeScript.

Implement at minimum:

- Point
- Vector
- Rect
- Segment
- Direction
- Orientation
- EPSILON utilities
- finite-number validation
- coordinate equality with tolerance
- horizontal/vertical segment classification
- Manhattan distance helpers
- rectangle relations
- horizontal/vertical overlap
- X/Y projections, horizontal/vertical separation, basic relative scalar/rectangle geometry
- point translation
- coordinate transforms required to distinguish model/view/screen spaces
- adjacent duplicate point removal
- collinear intermediate point detection/removal primitives
- canonical numeric precision helpers

ARCHITECTURE REQUIREMENTS

Routing geometry code MUST NOT import:

- React
- AntV X6
- DOM APIs
- browser globals
- application state
- repository objects

Geometry objects must either be immutable or treated as immutable.

Routing quadrant classification, source/target quadrant logic, direction preference,
and routing direction selection belong to R03 Direction Resolver, not R01.

Do not implement routing yet.

Do not implement terminal attachment yet.

Do not implement edge interaction yet.

TEST-FIRST REQUIREMENTS

Before completing implementation add tests covering:

- horizontal segment
- vertical segment
- diagonal classification and non-repairing normalization (never quantize diagonals)
- zero-length segment
- duplicate points
- collinear points
- epsilon boundary behavior
- NaN
- Infinity
- negative coordinates
- large coordinates
- transform round-trip
- normalization idempotence

Add property-based tests where useful.

Required property:

normalize(normalize(route)) === normalize(route)

Required property:

model -> view -> model

must reproduce original model coordinate within EPSILON only for EPSILON-conditioned
point/transform pairs using the active delta-spec error bound. Structurally valid,
finite ill-conditioned pairs have no strict round-trip guarantee; keep A/B/C
verification categories and at least 5000 accepted conditioned pairs.

Scalar quantization is opt-in through quantizeCoordinate(value), with precision 0.1,
half-step ties away from zero, positive-zero normalization, and separate idempotence.
Structural normalizePointSequence only removes redundant duplicates/collinear points:
never quantize, move survivors, invent points, or change diagonal/axis evidence.
Test [(0,0),(1,0.04)] unchanged; explicit quantizeCoordinate(0.04) yields +0.
Test exact coordinate preservation both without redundancies and after removal.

Translation uses point + delta with finite input/result rejection. Metamorphic
orientation, exact Manhattan distance, rectangle relations, and normalization modulo
translation use only integer-lattice coordinates/rectangle dimensions/deltas within
[-1_000_000,+1_000_000], SAFE_TRANSLATION_COORD_LIMIT = 1_000_000. Non-degenerate
segments have significant differences above EPSILON; rectangle gaps are overlapping/
zero or at least 4 * EPSILON away from the overlap threshold. Keep near-EPSILON
boundary tests separate. Production APIs still accept arbitrary finite floats with
finite outputs; test 0 and 1e-8 translated by 1e9 without a separation guarantee.
This translation domain does not replace the separate transform conditioning model.

Run:

- unit tests
- property tests
- typecheck
- lint

Do not mark OpenSpec tasks complete until all relevant tests pass.

Do not modify rendering or X6 code in this change.
```

---

## Tests R01

Минимум:

```text
geometry.spec.ts
normalization.spec.ts
transforms.spec.ts
geometry.property.spec.ts
```

Architecture assertions:

```text
packages/draw/src/routing/geometry/
```

не должен иметь imports из:

```text
@antv/x6
react
react-dom
window
document
```

---

## Gate R01

Открыть свежий Codex:

```bash
codex -m gpt-6-sol -c model_reasoning_effort='"high"' --sandbox read-only
```

Prompt:

```text
Perform Architecture Gate R01.

Read:
- docs/routing-v2/drawio-routing-master-spec.md
- OpenSpec change routing-v2-01-geometry-kernel
- implementation

Do NOT modify files.

Verify:

1. geometry kernel is framework-independent;
2. model/view/screen coordinate spaces are not mixed;
3. operations are deterministic;
4. normalization is idempotent;
5. no route algorithm leaked into geometry layer;
6. no X6/React/DOM dependency exists;
7. numerical edge cases are tested;
8. all OpenSpec requirements have evidence in tests.

Return exactly:

GATE_STATUS: PASS

or

GATE_STATUS: FAIL

If FAIL, enumerate blocking violations with file and symbol references.
Warnings that are non-blocking must be listed separately.
```

Only PASS → archive → R02.

---

# CHANGE R02
# Terminal / Perimeter

Change:

```text
routing-v2-02-terminal-perimeter
```

## Model

```text
implementation: GPT-6 Sol high
fix-loop: GPT-6 Luna high
gate: GPT-6 Sol high
```

---

## Scope

Реализовать:

```text
TerminalGeometry
TerminalBinding
ConnectionConstraint
PortConstraint
FixedTerminalResolver
FloatingTerminalResolver
Perimeter abstraction
RectanglePerimeter
EllipsePerimeter
```

Порядок должен быть:

```text
fixed terminal
→ router
→ floating terminal
```

Router пока не реализовывать.

---

## Prompt R02

```text
Implement OpenSpec change routing-v2-02-terminal-perimeter.

Read the routing master spec and the archived R01 change.

Treat R01 geometry APIs as stable public contracts.

GOAL

Implement draw.io-compatible terminal and perimeter abstraction.

Required domain objects:

- TerminalGeometry
- TerminalBinding
- ConnectionConstraint
- DirectionMask / PortConstraint
- FixedTerminalResolver
- FloatingTerminalResolver
- Perimeter interface
- RectanglePerimeter
- EllipsePerimeter

CORE BEHAVIOR

A terminal may be:

- floating
- fixed
- explicit anchor

Fixed terminal resolution happens BEFORE intermediate routing.

Floating terminal resolution happens AFTER intermediate route points exist.

For a floating terminal, calculate perimeter intersection using the next
meaningful route point.

Never assume that a terminal endpoint is its center.

For rectangles enforce perpendicular edge approach:

WEST/EAST -> horizontal terminal segment
NORTH/SOUTH -> vertical terminal segment.

ConnectionConstraint must support normalized x/y coordinates and perimeter mode.

Port constraints must support allowed direction masks.

Do not implement direction preference selection.

Do not implement route pattern selection.

Do not introduce X6-specific ports into domain model.

TESTS

Cover:

- each rectangle side
- rectangle corners
- ellipse perimeter equation
- fixed anchor
- floating anchor
- explicit constraint
- all four direction constraints
- shape movement
- zero-size / invalid geometry handling
- target point inside terminal
- target point exactly aligned with center
- deterministic tie-breaking

Property tests:

- resolved rectangle perimeter point lies on boundary
- ellipse result lies on analytical perimeter within tolerance
- fixed constraint remains invariant under unrelated target movement

Run full R01 tests as regression tests.
```

---

## Gate R02

Проверить:

```text
terminal ≠ router
perimeter ≠ renderer
fixed/floating correctly separated
connection point not permanently fixed by default
perpendicular approach contract expressible
```

PASS → archive → R03.

---

# CHANGE R03
# Direction Resolver

Change:

```text
routing-v2-03-direction-resolver
```

## Model

Implementation:

```text
GPT-6 Sol high
```

Architecture gate:

```text
GPT-6 Astra high
```

Это первый этап, где сильный независимый gate оправдан.

---

## Scope

Реализовать pure logic:

```text
quadrant classification
separation
overlap
direction masks
direction preferences
source direction
target direction
deterministic tie breaking
```

Не строить route.

---

## Prompt R03

```text
Implement routing-v2-03-direction-resolver.

This change implements ONLY selection of source and target routing directions.

Research the reference logic described in the master spec and inspect the
corresponding draw.io mxEdgeStyle OrthConnector behavior if reference fixtures
or source extracts exist in the repository.

INPUT

- source routing bounds
- target routing bounds
- source allowed direction mask
- target allowed direction mask
- optional fixed source point
- optional fixed target point

OUTPUT

DirectionResolution {
  sourceDirection,
  targetDirection,
  quadrant,
  separation,
  preferenceEvidence
}

Implement deterministic direction preference based on relative geometry.

Requirements:

- all four directions supported
- horizontal separation
- vertical separation
- horizontal overlap
- vertical overlap
- diagonal arrangements
- single-direction constraints override preference
- multi-direction masks filter preference
- chosen direction MUST always belong to allowed mask
- ties MUST resolve deterministically

No route points may be generated by this module.

No jetty implementation.

No UI dependencies.

TEST MATRIX

Exhaustively test:

4 quadrants
×
all non-empty source masks
×
all non-empty target masks

At least 4 × 15 × 15 logical combinations.

Add mirrored-geometry metamorphic tests.

Example property:

mirror horizontally:
WEST <-> EAST

mirror vertically:
NORTH <-> SOUTH

Identical input must always produce identical output.

Run all R01 + R02 regression tests.
```

---

## Gate R03 — Astra

Prompt:

```text
Architecture Gate R03. Read-only review.

Concentrate on hidden branch errors.

Validate:

- constraint filtering is logically complete;
- no direction outside mask is possible;
- tie-breaking is deterministic;
- mirrored geometry behaves symmetrically;
- overlapping geometry is covered;
- source and target reasoning are not accidentally asymmetric;
- no route-construction responsibility leaked into DirectionResolver;
- exhaustive mask test matrix exists.

Actively try to construct counterexamples.

GATE_STATUS must be PASS or FAIL.
```

---

# CHANGE R04
# Orthogonal Router

Change:

```text
routing-v2-04-orthogonal-router
```

## Модель

Это **самый сложный implementation change**.

Использовать:

```text
GPT-6 Astra high
```

При неустойчивой реализации:

```text
xhigh
```

Не начинать сразу с `max`.

Test/fix:

```text
GPT-6 Sol high
```

Gate:

```text
GPT-6 Astra xhigh
```

---

## Scope

Реализовать сердце системы:

```text
OrthogonalRouter
JettyResolver
RoutePatternTable
RoutePatternExecutor
quadrant normalization
midpoint routing
fallback handling
route canonicalization
RouteInvariantValidator
```

---

## Prompt R04

```text
Implement routing-v2-04-orthogonal-router.

This is the core routing change.

Before editing code:

1. Read the complete master spec.
2. Read archived changes R01-R03.
3. Inspect their public APIs.
4. Inspect current legacy router only to identify integration constraints;
   do not copy its patch-based architecture.
5. Inspect draw.io reference routing logic as needed.

ARCHITECTURE

Build:

OrthogonalRoutingInput
        ↓
DirectionResolver
        ↓
JettyResolver
        ↓
RoutePatternSelector
        ↓
RoutePatternExecutor
        ↓
intermediate orthogonal points
        ↓
FloatingTerminalResolver
        ↓
RouteCanonicalizer
        ↓
RouteInvariantValidator

Do not implement route editing.

Do not implement segment handles.

ROUTER REQUIREMENTS

- deterministic
- model-space only
- automatic orthogonal routing
- source/target jetty
- configurable source/target jetty
- auto jetty
- direction constraints
- fixed endpoint support
- floating endpoint support
- quadrant normalization
- horizontal/vertical separation
- overlaps
- all source/target direction pairs
- route pattern table
- midpoint instructions
- no diagonal segment
- duplicate-point elimination
- redundant-collinear-point elimination
- stable tie-breaking

Create explicit readable RouteInstruction types.

Do NOT reproduce opaque draw.io magic-number tables directly unless wrapped by
a decoding layer with documented semantics and parity tests.

Implement RouteInvariantValidator.

Required invariants:

INV-001 finite coordinates
INV-002 no adjacent duplicates
INV-003 every segment orthogonal
INV-004 no zero-length segments
INV-005 valid source attachment
INV-006 valid target attachment
INV-007 source direction respected
INV-008 target direction respected
INV-009 zoom independence
INV-010 canonicalization idempotence
INV-011 routing determinism

ORDINARY DIRECTION PROTECTION

Follow master section 23a, BDD-006a/006b/006c and R04 design sections 3a/6. Preserve certified
table plans only after checking BOTH resolved terminal minima on the provisionally
projected, canonical route: checked finite L > EPSILON and L + EPSILON >= the
role's resolved minimum. Use source P1-P0 and target P[n-2]-P[n-1]. Report finite
under-minimum runs as geometric incompatibility with role/index/actual/minimum;
invalid numeric input/arithmetic remains fatal. For a finite table plan whose terminal certificate is negative,
construct ordinary ORIENTED_CHANNEL with protected stubs and the bounded
one-to-five-segment alternating-axis template set. Validate every eligible
candidate and rank exact length, canonical bends, cardinal sequence and stable
channel-index key. Retain incompatibility/candidate evidence. Both adapted
terminal runs must meet their positive construction buffers. Do not change
R03 directions, fixed points, earlier layers or the existing comparison input predicate.
Numeric/input/executor exceptions and failed eligible/final validation must
propagate; never catch them to choose another strategy. Normalization cannot
repair geometry by inserting bends. This ordinary policy is an explicit V2
adaptation, not an additional too-short fallback trigger or native parity claim.
Test all direction pairs, coincident/near-equal stubs, deterministic ties,
rectangle/ellipse floating handoff and the original accepted EAST/NORTH failure
before production repair. Add BDD-006b's short-source regression, source-only,
target-only and both-minima failures, asymmetric/auto settings, exact/within/beyond
EPSILON boundaries, zero/sub-EPSILON resolved minima versus positive construction
buffers, and post-projection/canonicalization checks. Independently validate both
resolved minima on ALL final branches; channels also meet construction buffers.
A final rejection does not satisfy the requirement to construct the accepted
representable case. Protect certificate omissions, swapped minima and incorrect
strategy/error classification with mutation controls. Keep property quotas,
conditioning and mutation rules; add all-branch minimum assertions without
rejecting a generated input because its output failed.

Apply the user-approved B2 reference contract: the historical strictParityInput
function remains the unchanged comparison-domain selector, not a proof of native
validity. Before V2 execution an independent reference-only checker certifies the
native canonical route against input-derived attachment/direction/minimum context.
It must import no R04 production certificate, validator, normalizer or router.
NATIVE_CERTIFIED requires exact semantic parity and REFERENCE_PATTERN; V2 failures
cannot change that verdict. NATIVE_INVARIANT_DIVERGENCE requires a concrete finite
native violation and preserved raw/canonical native evidence, then valid V2 channels.
Oracle/numeric/unknown errors abort. Keep all admitted inputs and direct raw-executor
comparisons, with separate strict/divergence/failure accounting. A divergence is
not a rejected property case or a parity success. All 77 existing strict fixtures
must remain byte-identical and independently certified; stop if one fails.

Before production repair, task 2.8 must add BDD-006c, independent checker controls
for each invariant and both endpoints, pre-V2 ordering/immutable-verdict controls,
wrong V2 output/strategy/exception controls, oracle-error aborts and complete
accounting checks. Keep B2 inside the input domain. Update only R04 reference
documentation/harness after renewed PRE and checkpoint to explain the changed
meaning; do not narrow the predicate or regenerate/relabel saved expectations.
The planning phase itself must preserve the frozen test/reference files.

TOO-SHORT CASE

Implement explicit fallback contract for fixed endpoints whose available
distance cannot satisfy sourceJetty + targetJetty.

Follow master-spec section 25 and BDD-006: retain the strict Euclidean
too-short trigger, but use the R04 local exterior-rectangle fallback after
R02 fixed resolution and R03 direction selection. Direction constraints have
no exceptions. Preserve both fixed points and both resolved jetty minima;
extend terminal runs when needed rather than shrinking jetty. Compare the
clockwise and counterclockwise exterior paths by length, bends and explicit
direction order. Coincident exits require a full circuit. Reject non-finite
or unrepresentable geometry explicitly.

This is an approved intentional difference from draw.io SegmentConnector,
which bypasses port constraints in the too-short branch. Retain independent
reference evidence and separate adaptation fixtures; do not claim exact
draw.io geometry parity for fallback. Do not import, call or implement R05
manual/hint routing, and never delegate to legacy or production vendor code.

Do not silently create diagonal geometry.

TESTS

At least:

4 source directions
×
4 target directions
×
4 normalized quadrants

= 64 canonical routing topology fixtures.

Additionally:

- horizontal separation
- vertical separation
- diagonal NE/NW/SE/SW
- X overlap
- Y overlap
- both overlaps
- very close terminals
- fixed-fixed
- fixed-floating
- floating-fixed
- constrained terminals
- marker/jetty variations
- negative coordinates
- translated diagrams

Property tests:

- every segment orthogonal
- route deterministic
- normalization idempotent
- translating both terminals by Δ translates route by same Δ
- zoom has zero influence on model route

Run ALL previous tests.

Do not integrate X6.
```

---

## Architecture Gate R04

Fresh Astra xhigh.

Проверка должна быть hostile.

Prompt:

```text
Perform hostile architecture and algorithm review of
routing-v2-04-orthogonal-router.

Do not modify files.

Try to disprove correctness.

Inspect every branch of:

- DirectionResolver integration
- JettyResolver
- route-pattern selection
- route-pattern execution
- terminal resolution
- canonicalization
- invariant validation

Generate adversarial cases mentally or using read-only test execution.

Look specifically for:

- diagonal segments
- reversed source/target direction
- illegal port constraint
- missing quadrant
- asymmetric mirrored behavior
- zero-length segments
- duplicate bends
- non-idempotent normalization
- history dependence
- screen/zoom dependency
- accidental legacy-router fallback

A PASS is allowed only if no correctness blocker remains.

Return GATE_STATUS: PASS/FAIL.
```

R04 нельзя закрывать «почти зелёным».

---

# CHANGE R05
# Segment Router

Change:

```text
routing-v2-05-segment-router
```

## Models

```text
implementation: Sol high
fix: Luna high, escalate Sol after 2 failed repair attempts
gate: Sol high
```

---

## Scope

Реализовать:

```text
RouteHint
SegmentRouter
AUTO → MANUAL conversion
manual route reconstruction
ResetWaypoints
hint normalization
```

Не UI handles.

---

## Prompt R05

```text
Implement routing-v2-05-segment-router.

Goal:

Introduce manual orthogonal routing as a SEPARATE routing mode.

Required modes:

AUTO_ORTHOGONAL
MANUAL_ORTHOGONAL

A manual route is NOT a persisted rendered polyline.

Persist semantic RouteHints sufficient to reconstruct route.

Implement:

- RouteHint domain model
- SegmentRouter
- materializeManualRoute(autoRoute)
- reconstruct route through hints
- normalize route hints
- ResetWaypoints command semantics

Requirements:

AUTO + first manual segment modification
→ MANUAL_ORTHOGONAL

Reset Waypoints
→ clear hints
→ AUTO_ORTHOGONAL
→ complete reroute

RouteHint coordinates use MODEL SPACE.

Moving a target must not mutate stored hints merely because rendered endpoints
changed.

SegmentRouter must preserve orthogonality.

Terminal connection remains responsibility of existing terminal resolver.

TESTS

- one hint
- multiple hints
- vertical channel
- horizontal channel
- redundant hint
- repeated hint
- hint inside terminal
- hint aligned with terminal
- target movement
- source movement
- translate entire selection
- AUTO → MANUAL
- MANUAL → AUTO reset
- serialization round-trip

Regression: R01-R04.
```

---

## Gate R05

Главный вопрос:

```text
Persisted polyline появилась?
```

Если да:

```text
FAIL
```

Source of truth должен остаться semantic.

---

# CHANGE R06
# Segment Editor

Change:

```text
routing-v2-06-segment-editor
```

## Models

```text
implementation: Sol high
test/fix: Luna high
gate: Sol high
```

---

## Scope

Теперь появляется UX behavior:

```text
SegmentHandle
handle generation
drag vertical
drag horizontal
straight-edge special case
terminal adjacent segment editing
```

Но X6 integration ещё нет.

Interaction layer должен быть framework-neutral.

---

## Prompt R06

```text
Implement routing-v2-06-segment-editor.

Build framework-independent edge segment editing semantics corresponding to
draw.io segment editing.

Implement:

SegmentHandleFactory
SegmentEditor
MoveSegment command/domain operation

Every editable segment must expose one virtual midpoint handle.

Handles are TRANSIENT.

They must never be serialized.

For a vertical segment:

- handle uses col-resize semantics metadata
- drag changes X only

For a horizontal segment:

- handle uses row-resize semantics metadata
- drag changes Y only

Drag of a segment modifies semantic manual routing constraints and causes
SegmentRouter to rebuild the route.

Do not directly mutate rendered route point arrays.

SPECIAL CASE

A straight edge must expose a virtual midpoint editing affordance.

Dragging it perpendicular to the edge converts it into a valid multi-segment
manual orthogonal route.

TERMINAL ADJACENT SEGMENT

Dragging the first or last segment may cause introduction/removal of doglegs,
but:

- source attachment must stay valid
- target attachment must stay valid
- terminal segment must remain perpendicular

TESTS

BDD tests for:

- handle on every segment
- vertical segment drag
- horizontal segment drag
- straight route conversion
- first segment edit
- last segment edit
- handle regeneration after route topology change
- no handle persistence
- drag across neighboring bend
- normalization after drag
- reset manual route

Run R01-R05 regressions.
```

---

# CHANGE R07
# Preview / Commit

Change:

```text
routing-v2-07-preview-commit
```

## Models

```text
implementation: Sol high
fix: Luna/Sol
gate: Astra high
```

---

## Scope

Это change, который устраняет класс багов:

```text
во время drag одно,
после mouse-up другое.
```

---

## Prompt R07

```text
Implement routing-v2-07-preview-commit.

Introduce explicit routing gesture transaction model.

Required concepts:

RoutingDraft
original model
transient model
preview route
commit
cancel

Required states:

IDLE
SELECTED_EDGE
HOVER_SEGMENT
DRAG_SEGMENT
DRAG_SOURCE_ENDPOINT
DRAG_TARGET_ENDPOINT
PREVIEW
COMMITTING
CANCELLED

Persisted state MUST NOT mutate during pointer-move.

Preview must use the SAME routing pipeline as commit.

Forbidden architecture:

previewRouter()
commitRouter()

Required architecture:

route(model + transient edit)

The only difference between preview and commit is whether the edited semantic
state has been persisted.

ESCAPE:

must discard RoutingDraft completely.

POINTER UP:

commit semantic state exactly once.

TESTS

- preview segment drag
- commit same pointer position
- preview geometry equals committed geometry
- endpoint preview
- endpoint commit
- Escape segment drag
- Escape endpoint drag
- multiple pointer moves
- repeated commit prevention
- undo-ready transaction boundary
- zoom changes during gesture
- rerender during gesture

Critical invariant:

preview(P) == commit(P)

within geometry epsilon.

Regression R01-R06.
```

---

## Gate R07

Astra должен специально искать:

```text
double state
preview-specific geometry
React transient mutation
persisted writes on pointerMove
```

Любой такой случай = FAIL.

---

# CHANGE R08
# Self-loop

Change:

```text
routing-v2-08-self-loop
```

## Models

```text
implementation: Sol high
fix: Luna
gate: Sol high
```

---

## Scope

Реализовать отдельный LoopRouter.

Self-loop нельзя протаскивать через обычный source-target OrthogonalRouter.

---

## Prompt R08

```text
Implement routing-v2-08-self-loop.

Source == target must select LoopRouter.

Implement:

LOOP_AUTO
LOOP_MANUAL

Requirements:

- valid source perimeter departure
- valid target perimeter arrival
- orthogonal loop geometry
- configurable loop side
- deterministic default side
- jetty compatibility
- virtual handles on editable loop segments
- loop segment drag
- AUTO → MANUAL loop transition
- Reset Waypoints
- node movement
- resize
- serialization round-trip

Do not special-case self-loop inside renderer.

Do not pass self-loop through normal two-terminal route pattern selection.

TESTS

- loop on each side
- default loop
- constrained side
- edit each segment
- resize node
- move node
- reset
- preview/commit
- undo semantic state
```

---

# CHANGE R09
# Draw.io Differential Harness

Change:

```text
routing-v2-09-drawio-differential-harness
```

## Models

Implementation:

```text
Astra high
```

Bulk fixture generation/fixes:

```text
Luna/Sol
```

Gate:

```text
Astra xhigh
```

---

# Это второй критический change после R04.

До него Frade может быть «хорошим router».

После него мы можем доказать:

```text
Frade behaves like reference draw.io
```

---

## Scope

Создать reference test system.

Структура:

```text
routing/
  fixtures/
    drawio/
      automatic/
      manual/
      constraints/
      loops/
      regressions/
```

Fixture:

```ts
interface DrawioParityFixture {
  input: RoutingInput;
  reference: Point[];
  expectedMode: RoutingMode;
}
```

---

## Prompt R09

```text
Implement routing-v2-09-drawio-differential-harness.

GOAL

Create an executable parity framework comparing Frade Routing Engine v2 against
draw.io reference behavior.

This change must NOT modify production routing behavior merely to make tests
green unless a proven parity discrepancy exists.

REFERENCE

Use draw.io routing implementation as the behavioral oracle for the subset
defined in the master spec.

Create deterministic reference fixtures capturing:

- source bounds
- target bounds
- relevant style/routing parameters
- connection constraints
- control hints
- resulting route points

Create canonical comparison that accounts only for explicitly documented
numerical tolerances, not topology differences.

REQUIRED FIXTURE CLASSES

Automatic:

- horizontal
- vertical
- four diagonal quadrants
- horizontal overlap
- vertical overlap
- both overlap
- close nodes
- translated diagrams

Constraints:

- fixed/fixed
- fixed/floating
- floating/fixed
- single-direction source
- single-direction target
- source+target direction constraints

Jetty:

- default
- explicit source
- explicit target
- auto

Manual:

- one hint
- multiple hints
- straight → manual
- terminal segment edit

Loop:

- default loop
- each side
- manual loop

Create differential runner:

referenceRoute(input)
fradeRoute(input)

canonicalize both independently

compare:
- endpoint topology
- direction sequence
- bend count
- point coordinates within documented tolerance

Do NOT hide mismatches by sorting points or over-normalizing.

PROPERTY DIFFERENTIAL TESTING

Generate large sets of deterministic seeded geometries.

For every mismatch:

1. record seed;
2. minimize failing input if possible;
3. write deterministic regression fixture;
4. classify discrepancy;
5. only then modify production code.

Target initial suite:

>= 1,000 deterministic generated cases.

Over time increase to >= 10,000 in extended CI.

Add test reporting showing exact first diverging segment.

Run complete existing routing suite.
```

---

# Regression rule starting with R09

С этого момента любой найденный routing bug обязан пройти:

```text
bug observed
 ↓
reproduce
 ↓
new deterministic fixture
 ↓
test MUST fail
 ↓
fix production code
 ↓
fixture passes
 ↓
entire parity suite passes
```

Запрещено:

```text
сначала исправить,
потом написать тест.
```

---

## Gate R09

Astra xhigh.

Он должен проверить не просто наличие harness.

Нужно доказать, что harness не может выдавать ложный PASS.

Проверить:

```text
reference independence
canonicalization symmetry
tolerance
seed reproducibility
fixture immutability
mismatch reporting
```

Особенно искать:

```text
Frade route normalized до reference заранее
```

или:

```text
слишком большой tolerance
```

Это catastrophic test-harness defect.

---

# CHANGE R10
# X6 Integration

Change:

```text
routing-v2-10-x6-integration
```

## Models

Implementation:

```text
Sol high
```

При сложной repo-wide integration:

```text
Astra high
```

Fix-loop:

```text
Sol high
```

Final gate:

```text
Astra high
```

---

## Главный architectural contract

После R10:

```text
X6 =
rendering
+
pointer/event adapter
```

X6 НЕ является владельцем routing semantics.

---

## Prompt R10

```text
Implement routing-v2-10-x6-integration.

Integrate the completed Routing Engine v2 with Frade Draw / AntV X6.

Do not redesign routing algorithms in this change.

Production routing behavior is already established by R01-R09.

RESPONSIBILITIES

X6 adapter MAY:

- read terminal geometry from graph
- translate pointer coordinates into model coordinates
- invoke routing commands
- render immutable EdgeRoute
- render transient segment handles
- display preview
- forward commit/cancel events

X6 adapter MUST NOT:

- choose source/target direction
- repair routes
- add/remove bends independently
- normalize route
- move terminal attachment directly
- persist rendered points as source of truth
- implement preview-specific routing
- bypass RouteInvariantValidator

Implement adapters such as:

X6TerminalGeometryAdapter
X6RouteRenderer
X6SegmentHandleAdapter
X6RoutingGestureAdapter

Use names consistent with current project architecture.

FEATURE FLAG

Introduce:

routingEngine:
  legacy | v2

Initially allow controlled comparison.

V2 must be individually switchable.

TESTS

Integration:

- create edge
- automatic route
- select edge
- handles visible
- drag middle segment
- drag first segment
- drag last segment
- straight → dogleg
- source endpoint drag
- target endpoint drag
- move source
- move target
- move both
- resize terminal
- self-loop
- undo
- redo
- save
- reload
- zoom 50%
- zoom 100%
- zoom 200%

Model-space route must remain identical across zoom levels.

VISUAL REGRESSION

Add screenshot tests for canonical scenarios.

But geometry assertions remain authoritative.

LEGACY ISOLATION

Do not let v2 silently fall back into legacy routing code.

If unsupported V2 condition occurs, surface explicit diagnostic or documented
fallback boundary.

Run:

- all unit tests
- all property tests
- all parity tests
- all interaction tests
- all integration tests
- visual regression
- lint
- typecheck
```

---

# Final Architecture Gate R10

Запустить новую Astra session read-only.

Prompt:

```text
Perform FINAL Routing Engine v2 Architecture Gate.

Review the implementation produced by OpenSpec changes R01-R10.

This is not a style review.

Determine whether the architecture actually implements the invariants of
docs/routing-v2/drawio-routing-master-spec.md.

Verify dependency direction.

Expected dependency graph:

X6 Adapter
    ↓
Interaction
    ↓
Routing Commands
    ↓
Orthogonal / Segment / Loop Router
    ↓
Terminal Resolver
    ↓
Geometry Kernel

Dependencies in the opposite direction are blockers.

Specifically search for:

1. X6 imports inside routing core.
2. React imports inside routing core.
3. DOM-dependent geometry.
4. direct mutation of rendered edge points.
5. routing repair code in renderer.
6. routing repair code in React effects.
7. separate preview topology implementation.
8. persisted handles.
9. persisted automatic intermediate route points.
10. route decisions dependent on zoom.
11. legacy router invocation from V2.
12. mutation of semantic state during pointerMove.
13. missing invariant validation.
14. parity tests capable of false positives.
15. previously fixed regression fixtures removed or weakened.

Run or inspect evidence from the complete routing test suite.

Return:

GATE_STATUS: PASS

or

GATE_STATUS: FAIL

A PASS means Routing Engine v2 is safe to become the primary routing engine.
```

---

# 10. После каждого apply: обязательная последовательность

Не просить модель:

```text
"реализуй и если всё нормально переходи дальше"
```

Вместо этого выполнять вручную по фазам.

## Phase 1 — Implementation

```text
$openspec-apply-change routing-v2-XX-...
```

---

## Phase 2 — Tests

Codex prompt:

```text
Do not add new functionality.

Run all tests required by the active OpenSpec change plus the complete routing
regression suite from all previous changes.

For every failure:

1. classify as:
   - implementation defect
   - test defect
   - specification conflict
   - environment defect

2. do not weaken an existing assertion merely to make it pass;

3. fix the root cause;

4. rerun the smallest affected test;

5. rerun the complete routing regression suite.

Stop only when all required tests are green.

Report exact commands executed and final results.
```

Для этой фазы можно использовать Luna.

---

# 11. Escalation rule

Luna делает максимум:

```text
2 repair attempts
```

на один и тот же failing test.

Если не исправила:

```text
STOP Luna
→ Sol high
```

Если Sol делает 2 безуспешные conceptual fixes:

```text
STOP implementation
→ Astra diagnosis
```

Не позволять одной модели делать:

```text
fix #1
fix #2
fix #3
...
fix #12
```

Это снова приводит к patch-loop, от которого мы пытаемся уйти.

---

# 12. Specification conflict rule

Если во время implementation обнаружено, что spec неверна:

```text
НЕ менять код вокруг проблемы.
```

Нужно:

```text
$openspec-update-change <change>
```

Исправить:

```text
spec
design
tasks
```

Повторно:

```bash
openspec validate <change> --strict
```

И только затем продолжить implementation.

---

# 13. OpenSpec Verify

После зелёных tests:

```text
$openspec-verify-change <change>
```

Verify должен дать:

```text
no CRITICAL
```

Для Routing Engine я бы также требовал:

```text
no WARNING
```

если warning относится к:

```text
correctness
architecture
missing tests
incomplete requirements
```

Cosmetic warnings допустимы.

---

# 14. Architecture Gate выполняется другой session

Не запускать gate той же session, которая только что написала код.

Почему:

```text
implementation context
может bias-ить review
```

Новая session читает:

```text
spec
design
tasks
diff
tests
code
```

с нуля.

---

# 15. Git checkpoint

После PASS:

```bash
git status
git diff
```

Затем:

```bash
git add .
git commit -m "feat(routing-v2): R0X <name>"
```

---

# 16. Archive

После commit и PASS:

```text
$openspec-archive-change routing-v2-XX-...
```

И затем:

```bash
openspec validate --all --strict
```

Только после этого RXX считается завершённым.

---

# 17. Следующий change

Начинать новую Codex conversation.

Не продолжать предыдущую.

Это очень важная практика.

Каждая новая модель получает:

```text
master spec
+
архив предыдущих OpenSpec changes
+
текущий код
+
тесты
```

Это значительно надёжнее, чем 200 сообщений истории.

---

# 18. CI gates

К моменту R04 рекомендую иметь scripts:

```text
test:routing:unit
test:routing:property
test:routing:integration
test:routing:parity
test:routing:visual
test:routing:all
```

Финальный:

```text
test:routing:all
```

должен включать всё кроме, возможно, медленного extended differential suite.

---

# 19. PR / commit gate

CI должен блокировать merge если падает:

```text
lint
typecheck
routing unit
routing properties
routing regression
routing parity
interaction
OpenSpec validation
```

Visual tests можно подключить отдельно, но после R10 желательно также blocking.

---

# 20. Нельзя удалять regression tests

Ввести правило:

```text
tests/routing/regressions/*
```

append-only по смыслу.

Удаление regression fixture требует отдельного объяснения в OpenSpec change.

Модель не должна автоматически «чистить устаревшие тесты», если они фиксируют историческую ошибку.

---

# 21. Bug fixing после завершения R10

После перехода на V2 каждый новый routing defect проходит mini-cycle:

```text
1 reproduce
2 fixture
3 failing test
4 root-cause classification
5 new OpenSpec change
6 implementation
7 full routing tests
8 architecture gate при архитектурном изменении
9 archive
```

Не возвращаться к:

```text
увидели артефакт
→ поправили пару координат
```

---

# 22. Как распределить вычислительный бюджет

Практически я бы распределил reasoning budget примерно так:

```text
R01   5%
R02   7%
R03  10%
R04  22%
R05   8%
R06   8%
R07  10%
R08   5%
R09  15%
R10  10%
```

То есть почти половина интеллектуального бюджета:

```text
R03 + R04 + R09
```

Это логично.

Именно там определяется математическое поведение router.

---

# 23. Где Luna экономит больше всего

Luna использовать для:

```text
создания fixtures
добавления однотипных unit tests
исправления typing
lint
обновления snapshots
простых failing tests
serialization tests
test-data generation
```

Не использовать Luna как окончательного архитектора для:

```text
OrthogonalRouter
DirectionResolver
Differential Harness correctness
final X6 architecture
```

---

# 24. Где Astra действительно нужна

Astra оправдана:

### R04

Потому что здесь одновременно:

```text
quadrants
directions
constraints
jetty
patterns
normalization
terminal semantics
```

### R09

Потому что ошибка test oracle хуже обычного бага:

```text
она заставит неправильный router выглядеть правильным.
```

### Final Gate R10

Потому что нужно анализировать архитектуру repo-wide.

---

# 25. Когда прекращать phase

Никогда не переходить дальше с формулировкой:

```text
"остались только небольшие edge cases"
```

В routing system:

```text
edge cases
=
основная сложность.
```

Change завершён только если gate зелёный.

---

# 26. Финальный Definition of Done

Routing Engine V2 разрешается сделать default только если:

```text
R01 PASS
R02 PASS
R03 PASS
R04 PASS
R05 PASS
R06 PASS
R07 PASS
R08 PASS
R09 PASS
R10 PASS
```

И одновременно:

```text
OpenSpec validate --all --strict     PASS
unit tests                           PASS
property tests                       PASS
routing regression                   PASS
draw.io parity                       PASS
interaction                          PASS
integration                          PASS
visual regression                    PASS
typecheck                            PASS
lint                                 PASS
```

После этого:

```text
routingEngine = "v2"
```

может стать default.

Legacy router следует удалить **отдельным OpenSpec change**, а не внутри R10.

Это оставляет простой rollback до момента окончательной стабилизации.

---

# 27. Самое важное правило всей программы

Цель этих десяти changes — не просто написать новый router.

Цель — изменить сам способ разработки Routing Engine:

```text
SPEC
 ↓
INVARIANTS
 ↓
PURE ALGORITHM
 ↓
EXECUTABLE TESTS
 ↓
REFERENCE PARITY
 ↓
UI ADAPTER
```

вместо:

```text
UI defect
 ↓
local patch
 ↓
new defect
 ↓
another patch
```

Если это правило сохраняется, разработка начинает сходиться.
