# Frade Draw — Draw.io-Compatible Routing Engine

## Master Specification

**Статус:** Target Architecture / Implementation Specification
**Эталон поведения:** draw.io / diagrams.net `dev`, исследованная версия 31.5.2
**Область:** маршрутизация, подключение, редактирование и стабилизация связей Frade Draw
**Методология:** SDD + BDD + TDD + Golden Regression Testing

---

# 1. Цель

Необходимо заменить набор локальных исправлений маршрутизации Frade Draw единым детерминированным Routing Engine, который воспроизводит архитектурные принципы и пользовательское поведение draw.io.

Система должна обеспечивать:

1. автоматическую ортогональную маршрутизацию;
2. подключение к произвольной точке perimeter фигуры;
3. перпендикулярный выход/вход связи относительно стороны подключения;
4. автоматический выбор стороны подключения;
5. поддержку фиксированных connection points;
6. поддержку directional/port constraints;
7. поддержку ручного изменения маршрута;
8. редактирование **сегментов**, а не произвольного набора точек;
9. автоматическое появление segment handles;
10. корректное добавление и удаление сегментов;
11. сохранение ортогональности при любой операции;
12. стабильность маршрута при перемещении фигур;
13. стабильность preview → commit;
14. корректную обработку self-loop;
15. корректную обработку близко расположенных фигур;
16. canonical normalization маршрута;
17. отсутствие накопления лишних waypoint;
18. детерминированный результат;
19. независимость алгоритма от zoom;
20. полный regression-suite.

Критический критерий:

> одинаковое состояние диаграммы должно всегда приводить к одинаковому маршруту независимо от истории пользовательских операций.

---

# 2. Главный архитектурный вывод исследования draw.io

В draw.io маршрут связи **не является одним объектом polyline, который постоянно мутируется UI-кодом**.

Маршрутизация представляет собой pipeline:

```text
Model Geometry
     ↓
Terminal Resolution
     ↓
Fixed Connection Point Resolution
     ↓
Routing Algorithm
     ↓
Intermediate Orthogonal Points
     ↓
Floating Perimeter Intersection
     ↓
Normalization
     ↓
Rendered Edge State
```

`mxGraphView` сначала вычисляет фиксированные terminal points, потом вызывает edge-style/router, затем отдельно вычисляет floating terminal points на perimeter фигуры.

Это означает:

**terminal attachment ≠ routing ≠ rendering ≠ interaction state.**

Во Frade эти понятия должны быть так же разделены.

---

# 3. Почему текущий patch-based подход не сходится

Типичная ошибочная архитектура:

```text
drag →
изменить polyline →
поправить ближайшие точки →
починить attachment →
починить preview →
починить corner →
починить новый regression
```

Проблема заключается в отсутствии глобальных инвариантов.

Например:

- исправление endpoint меняет первый segment;
- исправление первого segment ломает waypoint;
- waypoint меняет topology;
- topology меняет handle indexes;
- handle indexes ломают последующий drag;
- повторный normalization возвращает старый defect.

В draw.io такой cascade уменьшается благодаря тому, что route **пересчитывается из семантического состояния**, а не считается источником истины.

---

# 4. Главный принцип Frade

## 4.1 Source of Truth

Нельзя считать rendered polyline источником истины.

Источником истины являются:

```ts
interface EdgeRoutingModel {
  source: TerminalBinding | null;
  target: TerminalBinding | null;

  routingMode: RoutingMode;

  controlHints: RouteHint[];

  sourceConstraint?: PortConstraint;
  targetConstraint?: PortConstraint;

  sourceJetty?: number | 'auto';
  targetJetty?: number | 'auto';

  manualRouteMode: boolean;
}
```

А:

```ts
Point[]
```

является **derived state**.

---

# 5. Два принципиально разных режима draw.io

Необходимо явно разделить:

## 5.1 Automatic Orthogonal Routing

Аналог:

```text
mxEdgeStyle.OrthConnector
```

Это локальный ортогональный router между source и target.

Он:

- определяет стороны source/target;
- использует port constraints;
- учитывает относительное положение фигур;
- выбирает route pattern;
- создаёт промежуточные ортогональные точки;
- обеспечивает jetty возле фигур.

Сам `OrthConnector` в draw.io называется local orthogonal router.

Он **не является глобальным obstacle router**.

---

## 5.2 Segment / Manual Orthogonal Routing

После появления control hints draw.io переключается на `SegmentConnector`.

Это чрезвычайно важное поведение.

В исходнике:

```text
orthPointsFallback = true
```

и если у orthogonal edge появляются control hints, `OrthConnector` делегирует построение `SegmentConnector`.

То есть:

```text
AUTO
 ↓ пользователь двинул segment
MANUAL_ORTHOGONAL
```

Это не просто изменение нескольких вершин того же automatic route.

Это **смена режима маршрутизации**.

Именно это должно быть реализовано во Frade.

---

# 6. Optional Global Obstacle Routing

Современный draw.io также содержит опциональную интеграцию `libavoid`, предназначенную для obstacle-avoiding routing.

В текущем draw.io эта логика является дополнительным routing/layout layer, а не базовой логикой `OrthConnector`. В changelog отдельно фиксируются исправления libavoid preview, dangling edges, containers и self-loop handling.

Поэтому архитектура Frade должна предусматривать:

```ts
enum RoutingMode {
  AUTO_ORTHOGONAL,
  MANUAL_ORTHOGONAL,
  STRAIGHT,
  ELBOW,
  LOOP,
  OBSTACLE_ORTHOGONAL
}
```

Но первая реализация должна добиться parity именно для:

```text
AUTO_ORTHOGONAL
MANUAL_ORTHOGONAL
LOOP
```

Obstacle routing — отдельный milestone.

---

# 7. Архитектура подсистемы

Рекомендуемая структура:

```text
packages/draw/src/routing/

  model/
    Point.ts
    Rect.ts
    Direction.ts
    TerminalBinding.ts
    ConnectionConstraint.ts
    RouteHint.ts
    EdgeRoute.ts

  terminal/
    TerminalResolver.ts
    ConnectionPointResolver.ts
    FloatingTerminalResolver.ts
    PerimeterIntersection.ts

  orthogonal/
    OrthogonalRouter.ts
    DirectionResolver.ts
    RoutePatternTable.ts
    JettyResolver.ts
    GeometryNormalizer.ts

  segment/
    SegmentRouter.ts
    SegmentEditor.ts
    SegmentHandleFactory.ts
    ManualRouteNormalizer.ts

  loop/
    LoopRouter.ts
    LoopEditor.ts

  interaction/
    RoutingGestureMachine.ts
    EndpointDragController.ts
    SegmentDragController.ts
    PreviewRouteController.ts

  normalization/
    RouteCanonicalizer.ts
    CollinearPointReducer.ts
    DuplicatePointReducer.ts

  validation/
    RouteInvariantValidator.ts

  adapters/
    x6/                         # R10 only
      X6RoutingAdapter.ts
      RepositoryEdgeAdapter.ts

  tests/
    fixtures/
    golden/
```

---

# 8. Coordinate spaces

Это одна из самых частых причин визуальных регрессий.

Необходимо строго разделить:

```text
MODEL_SPACE
VIEW_SPACE
SCREEN_SPACE
```

## MODEL_SPACE

Единицы диаграммы.

Хранится в persisted document.

## VIEW_SPACE

```text
model × zoom + translation
```

## SCREEN_SPACE

координаты pointer events.

---

Ни один routing algorithm не должен зависеть от screen coordinates.

Правило:

```text
screen events
   ↓ transform
model coordinates
   ↓ routing
model route
   ↓ transform
render
```

draw.io специально преобразует control point между view/model spaces; аналогичная ответственность находится в `transformControlPoint` и `convertPoint`.

---

# 9. Базовые типы

```ts
type Scalar = number;

interface Point {
  x: Scalar;
  y: Scalar;
}

interface Rect {
  x: Scalar;
  y: Scalar;
  width: Scalar;
  height: Scalar;
}

enum Direction {
  WEST = 'west',
  NORTH = 'north',
  EAST = 'east',
  SOUTH = 'south',
}

type DirectionMask = ReadonlySet<Direction>;

interface TerminalBinding {
  cellId: string;

  mode:
    | 'floating'
    | 'fixed'
    | 'anchor';

  constraint?: ConnectionConstraint;
}

interface ConnectionConstraint {
  x: number;
  y: number;

  perimeter: boolean;

  allowedDirections?: DirectionMask;
}

interface RouteHint {
  x: number;
  y: number;
}

interface EdgeRoute {
  sourcePoint: Point;
  points: Point[];
  targetPoint: Point;
}
```

---

# 10. Routing pipeline

Обязательный pipeline:

```text
routeEdge(edgeId)
```

должен выполнять:

```text
1 resolve source terminal
2 resolve target terminal

3 resolve source fixed constraint
4 resolve target fixed constraint

5 select routing algorithm

6 calculate intermediate points

7 resolve source floating perimeter point
8 resolve target floating perimeter point

9 canonicalize route

10 validate invariants

11 return immutable RouteResult
```

Pseudo-code:

```ts
function routeEdge(input: RoutingInput): RouteResult {
  const terminals = resolveTerminals(input);

  const fixed = resolveFixedTerminalPoints(
    input.edge,
    terminals
  );

  const intermediates = routerFor(input.edge.routingMode).route({
    ...input,
    terminals,
    fixed,
  });

  const source = fixed.source ??
    resolveFloatingTerminal(
      terminals.source,
      intermediates[0] ?? fixed.target
    );

  const target = fixed.target ??
    resolveFloatingTerminal(
      terminals.target,
      intermediates.at(-1) ?? source
    );

  const canonical = canonicalize([
    source,
    ...intermediates,
    target,
  ]);

  validateRoute(canonical);

  return {
    points: canonical,
  };
}
```

---

# 11. Fixed terminal point

Порядок должен соответствовать draw.io:

```text
fixed terminal
     BEFORE
edge routing
```

draw.io сначала вызывает `updateFixedTerminalPoints`, используя `getConnectionConstraint`, а уже затем `updatePoints`.

Следствие:

router должен знать:

```text
endpoint fixed?
endpoint floating?
```

ещё до выбора первого направления.

---

# 12. Floating terminal point

Если fixed connection point отсутствует:

```text
endpoint = intersection(
    perimeter(shape),
    direction to next route point
)
```

Это **не центр фигуры**.

Routing выполняется относительно geometry/routing center, но фактический endpoint впоследствии переносится на perimeter. В draw.io это делает `getFloatingTerminalPoint`; также учитываются rotation и perimeter spacing.

---

# 13. Perpendicular attachment

Требование Frade:

> связь при подключении к фигуре входит или выходит перпендикулярно её контуру.

Для axis-aligned rectangle:

```text
WEST  → первый segment horizontal
EAST  → первый segment horizontal
NORTH → первый segment vertical
SOUTH → первый segment vertical
```

Аналогично target.

Invariant:

```ts
if sourceSide === WEST || EAST:
    p0.y === p1.y

if sourceSide === NORTH || SOUTH:
    p0.x === p1.x
```

---

# 14. Нефиксированная точка подключения

Это соответствует ранее сформулированному требованию Frade.

Terminal по умолчанию:

```text
floating
```

а не фиксированный port.

Следовательно:

при перемещении второй фигуры точка подключения первой может автоматически перейти:

```text
EAST → NORTH
```

если новый geometry делает NORTH лучшим routing side.

И это не ошибка.

---

# 15. Jetty

Draw.io вводит специальный отступ возле terminal — `jetty`.

Базовый `orthBuffer` равен 10.

Jetty может быть:

```text
sourceJettySize
targetJettySize
jettySize
auto
```

При `auto` размер зависит в том числе от marker size; без arrow используется `2 × orthBuffer`.

Frade contract:

```ts
interface JettyConfig {
  baseBuffer: 10;
  source: number | 'auto';
  target: number | 'auto';
}
```

Jetty должен быть отдельной сущностью и не смешиваться с perimeter spacing.

---

# 16. Automatic Orthogonal Router

## 16.1 Inputs

```ts
interface OrthogonalRoutingInput {
  source: TerminalGeometry;
  target: TerminalGeometry;

  sourceConstraint: DirectionMask;
  targetConstraint: DirectionMask;

  sourceFixedPoint?: Point;
  targetFixedPoint?: Point;

  sourceJetty: number;
  targetJetty: number;
}
```

---

# 17. Нормализация geometry

Draw.io масштабирует геометрию в routing coordinate space и округляет до десятых.

Во Frade:

```ts
const EPSILON = 1e-6;
const ROUTE_PRECISION = 0.1;
```

Нельзя делать routing непосредственно в пикселях React/SVG.

## R01 numerical and transform contract

Coordinate approximate equality is `abs(a - b) <= EPSILON`, independently for X and Y. Manhattan distance is `abs(dx) + abs(dy)`; approximately equal points can have distance up to `2 * EPSILON`. `ROUTE_PRECISION = 0.1` uses half-step ties away from zero and negative zero becomes positive zero. Ordinary arithmetic and structural point-sequence normalization are not implicitly quantized. `quantizeCoordinate(value)` is a separate opt-in scalar API with its own idempotence contract. Structural `normalizePointSequence(...)` only removes adjacent EPSILON duplicates and redundant between-aware orthogonal collinear points, preserving order and every surviving original coordinate exactly; it never moves/invents points, projects diagonals, or interchanges horizontal/vertical geometry. `[(0,0),(1,0.04)]` remains DIAGONAL and unchanged; separately `quantizeCoordinate(0.04)` returns positive zero. Test coordinate preservation with no redundancy and after removal.

TRANSLATION-STABLE generated geometry uses SAFE_TRANSLATION_COORD_LIMIT = 1_000_000: integer-valued point coordinates, rectangle origins/dimensions (non-negative dimensions), and delta coordinates within [-1_000_000, +1_000_000]. Rectangle edges and translated coordinates remain exact integers far below 2^53. Non-degenerate segment axis differences are zero or comfortably above EPSILON; rectangle axis gaps are exactly zero/overlapping or at least 4 * EPSILON away from the overlap threshold. This domain is only for translation metamorphic properties; production APIs accept arbitrary finite floating-point inputs with finite-result validation.

Common translation follows `point + delta` and rejects non-finite inputs/results. Only TRANSLATION-STABLE geometry carries orientation, exact Manhattan-distance, rectangle-relation, and structural-normalization-modulo-translation guarantees. Keep near-EPSILON deterministic segment/rectangle tests separate from these metamorphic properties. Arbitrary finite production geometry may execute finite translation without preserving EPSILON-sensitive classifications: `0, 1e-8, delta=1e9` can collapse the separation without a kernel defect. This safe domain does not alter transform conditioning.

A structurally valid view transform has finite `scale > 0` and finite translation X/Y. Operations execute only with finite computed outputs. Finite values alone do not imply EPSILON recovery.

An EPSILON-CONDITIONED POINT/TRANSFORM PAIR requires the following finite bound to be `<= EPSILON` independently for X and Y:

```text
scaled = coordinate * scale
view = scaled + translation
estimatedRoundTripErrorBound =
    8 * Number.EPSILON
    * max(1, abs(translation), abs(scaled), abs(view))
    / abs(scale)
```

Only conditioned pairs guarantee `abs(recovered.x - original.x) <= EPSILON` AND `abs(recovered.y - original.y) <= EPSILON` after model → view → model. Structurally valid ill-conditioned pairs permit finite one-way conversion without that strict guarantee. `x = 1`, `scale = 1e-6`, `translation.x = 1e9` is ill-conditioned; recovery of lost floating-point information is not required. Vector conditioning uses translation zero; screen conversions have no unconditional EPSILON recovery promise.

R01 properties use seed `0xFAD001` and at least 5000 **accepted conditioned pairs**, not raw candidates mostly discarded. Separate structurally valid conditioned pairs (strict round trip), valid ill-conditioned pairs (finite one-way formulas without strict round-trip assertions), and structurally invalid transforms (deterministic rejection). Report accepted/rejected counts and reproducible seed/path/counterexample.

For R01 this explicit contract qualifies the broad transform-round-trip example in the implementation playbook: its EPSILON property applies to conditioned pairs only. The active R01 delta spec defines the executable contract; the playbook example does not impose unconditional recovery for all finite inputs.

---

# 18. Rotated terminals

Draw.io при выборе маршрута для rotated cells использует bounding box повернутого rectangle.

Milestone 1 допускает:

```text
rotation = 0
```

но архитектура должна сразу иметь:

```ts
TerminalGeometry.routingBounds
TerminalGeometry.actualPerimeter
```

чтобы потом не переписывать router.

---

# 19. Relative geometry classification

Router должен определить:

```text
source above target
source below target
source left of target
source right of target

horizontal overlap
vertical overlap

diagonal quadrant
```

Draw.io нормализует относительное положение source/target через quadrant `0..3`.

Это позволяет использовать одну таблицу route patterns для симметричных случаев.

---

# 20. Port constraints

Allowed direction:

```ts
type PortConstraint = {
  west: boolean;
  north: boolean;
  east: boolean;
  south: boolean;
};
```

Default:

```text
ALL
```

Draw.io использует `getPortConstraints` для source и target до выбора маршрута.

Если constraint содержит ровно одну сторону:

```text
router MUST use that side
```

даже если геометрически другая сторона короче. В исходнике одиночный mask переопределяет выбранное направление.

---

# 21. Side preference

Если side не fixed:

router формирует приоритет.

Conceptually:

```text
horizontal preference
vertical preference
```

в зависимости от свободного пространства между source/target.

Draw.io сравнивает left/right и top/bottom separation и строит preference ordering, которое затем фильтруется port constraints.

Во Frade это должно быть отдельной pure function:

```ts
resolveDirectionPreferences(
    source,
    target,
    sourceConstraints,
    targetConstraints
): DirectionPair
```

---

# 22. Route Pattern Table

Draw.io не использует общий A* для обычного `OrthConnector`.

Он использует таблицу закодированных route patterns.

После выбора:

```text
source direction
target direction
quadrant
```

выбирается pattern:

```text
pattern[sourceSide][targetSide]
```

Это ключ к повторяемости поведения.

Frade должен использовать такой же принцип:

```ts
const ROUTE_PATTERNS:
  Record<Direction, Record<Direction, RouteInstruction[]>>
```

Не следует копировать magic numbers draw.io буквально.

Их необходимо декодировать в читаемую модель:

```ts
type RouteInstruction =
  | { type: 'MOVE'; direction: Direction }
  | { type: 'SOURCE_SIDE'; side: Direction }
  | { type: 'TARGET_SIDE'; side: Direction }
  | { type: 'CENTER' }
  | { type: 'SOURCE_CENTER' }
  | { type: 'TARGET_CENTER' };
```

Таким образом поведение останется эквивалентным, но код станет поддерживаемым.

---

# 23. Route Pattern Engine

Conceptual algorithm:

```ts
function executePattern(
  initialPoint,
  pattern,
  geometry
): Point[] {
  let current = initialPoint;
  let orientation = orientationOf(sourceDirection);

  for (const instruction of pattern) {
    const targetLimit = resolveInstructionLimit(
      instruction,
      geometry
    );

    current = moveInDirection(
      current,
      instruction.direction,
      targetLimit
    );

    if (orientationChanged) {
      emitCorner(current);
    }
  }

  return points;
}
```

Draw.io при смене ориентации создаёт следующую waypoint; если движения фактически не произошло, лишний corner не создаётся.

---

# 24. Midpoint behavior

Некоторые route instructions проводят segment через середину свободного интервала.

В draw.io используется половина separation между vertices.

Например:

```text
[A]       [B]

A ───┐
     │
     └──── B
```

middle segment располагается относительно геометрической separation, а не обязательно grid.

Это важно: draw.io сегодня не гарантирует automatic route snapping к grid; соответствующий feature request даже существует отдельно.

Следовательно, для draw.io parity:

**не добавлять grid snapping automatic route.**

Grid применяется к пользовательским control points, но не должен менять автоматический route.

---

# 25. Too-short fallback

Draw.io проверяет расстояние между fixed endpoints.

Если:

```text
distance < sourceJetty + targetJetty
```

`OrthConnector` переключается на `SegmentConnector`.

Frade обязан повторить этот contract.

---

# 26. Manual route mode

Как только пользователь двинул segment:

```text
AUTO_ORTHOGONAL
        ↓
MANUAL_ORTHOGONAL
```

и текущий результат превращается в semantic control hints.

Нельзя сохранять все rendered vertices буквально.

Нужно хранить **минимальное количество constraints**, достаточное для воспроизведения маршрута.

---

# 27. Что такое RouteHint

RouteHint не обязательно равен corner.

Пример:

```text
 ┌─────────────┐
 │             │
A              │
               B
```

Если пользователь двигает vertical segment по X:

хранить достаточно:

```ts
{x: newX, y: representativeY}
```

чтобы SegmentRouter восстановил оба neighbouring corners.

Это принципиально отличается от:

```text
persist every point in polyline
```

---

# 28. SegmentConnector

Draw.io `SegmentConnector`:

- получает terminal points;
- получает control hints;
- преобразует их в routing space;
- определяет horizontal/vertical channels;
- восстанавливает ортогональную topology;
- удаляет points внутри terminal;
- нормализует почти совпадающие points.

Во Frade это отдельный:

```ts
class SegmentRouter
```

---

# 29. Segment handles

Это один из важнейших UX-аспектов.

В draw.io segment handler создаёт virtual bend **на каждом segment**.

То есть пользователь не обязан предварительно создавать точки.

Для маршрута:

```text
P0 ───── P1
          │
          │
          P2 ───── P3
```

UI создаёт handles примерно:

```text
P0 ──●── P1
          │
          ●
          │
          P2 ──●── P3
```

---

# 30. Handle position

Handle:

```text
center(segment)
```

и существует только как transient UI entity.

Не сохраняется в model.

```ts
interface SegmentHandle {
  segmentIndex: number;
  axis: 'x' | 'y';
  point: Point;
}
```

---

# 31. Cursor semantics

Для:

```text
vertical segment
```

пользователь меняет X.

Cursor:

```text
col-resize
```

Для:

```text
horizontal segment
```

пользователь меняет Y.

Cursor:

```text
row-resize
```

Именно такое поведение реализовано в `mxEdgeSegmentHandler`.

---

# 32. Drag vertical segment

Initial:

```text
P0────P1
      │
      │
      P2────P3
```

Пользователь двигает middle vertical segment вправо.

Изменяются:

```text
P1.x
P2.x
```

но:

```text
P1.y unchanged
P2.y unchanged
```

---

# 33. Drag horizontal segment

Аналогично:

```text
P1.y
P2.y
```

изменяются одновременно.

---

# 34. Drag segment рядом с terminal

Если segment возле terminal вытягивается за фигуру, router должен автоматически добавить необходимые bends.

Нельзя позволять:

```text
diagonal terminal segment
```

или:

```text
segment through terminal body
```

---

# 35. Virtual handles для straight edge

Draw.io имеет специальный случай:

если связь состоит из двух точек или фактически является collinear route, handler создаёт виртуальную пару midpoint points для возможности двигать segment.

Frade обязан повторить этот UX.

Initial:

```text
A ───────── B
```

Selected:

```text
A ──── ● ──── B
```

Drag handle вверх:

```text
A ──┐
    │
    └────────┐
             B
```

То есть straight route превращается в 3-segment orthogonal route.

---

# 36. Preview = commit

Это отдельный системный invariant.

Во время drag:

```text
preview route
```

должен вычисляться тем же алгоритмом, что и final route.

Запрещена архитектура:

```text
previewAlgorithm()
commitAlgorithm()
```

с различной topology logic.

Допустимо:

```ts
route({
  ...input,
  transientEdit
})
```

для preview

и тот же:

```ts
route({
  ...input,
  committedEdit
})
```

для commit.

Современный draw.io отдельно содержит исправления для совпадения drag preview и committed libavoid route, что показывает важность такого контракта.

---

# 37. Route canonicalization

После каждого calculation:

```text
canonicalize(route)
```

---

## 37.1 Remove duplicate points

```text
A → B → B → C

becomes

A → B → C
```

Сам `OrthConnector` удаляет duplicate points в конце построения.

---

## 37.2 Remove redundant collinear corners

```text
A ─ P1 ─ P2 ─ B
```

где все имеют одинаковый Y:

```text
A ─ B
```

---

## 37.3 Preserve semantically necessary bend

Нельзя удалять point только потому, что он близок к соседнему, если удаление нарушит terminal direction constraint.

---

## 37.4 Snap near-alignment

Для floating/fixed terminal допускается tolerance примерно в один routing unit при проверке alignment.

Draw.io использует tolerance при segment editing и alignment hints.

---

# 38. Route invariants

Каждый RouteResult обязан пройти:

```ts
validateRoute(route)
```

## INV-001

Все coordinates finite.

```text
Number.isFinite(x)
Number.isFinite(y)
```

## INV-002

Нет adjacent duplicate points.

## INV-003

Каждый segment:

```text
x1 == x2
OR
y1 == y2
```

## INV-004

Нет zero-length segments.

## INV-005

Source endpoint лежит на perimeter source shape либо является explicit fixed point.

## INV-006

Target endpoint аналогично.

## INV-007

Первый segment соответствует source direction constraint.

## INV-008

Последний segment соответствует target constraint.

## INV-009

Route topology независима от zoom.

## INV-010

Canonicalization идемпотентна:

```text
normalize(normalize(route))
===
normalize(route)
```

## INV-011

Re-route без изменения inputs идемпотентен:

```text
route(input) === route(input)
```

## INV-012

Preview final geometry == committed final geometry.

---

# 39. Attachment side selection

Для floating attachment автоматически выбирается направление.

Базовые cases:

```text
A       B
```

обычно:

```text
A.EAST → B.WEST
```

---

```text
A
|
|
B
```

обычно:

```text
A.SOUTH → B.NORTH
```

Но при overlap router должен выбирать alternative side на основе separation и allowed directions.

---

# 40. Fixed anchor

При explicit anchor:

```ts
constraint = {
  x: 0.25,
  y: 1,
  perimeter: true
}
```

endpoint вычисляется относительно shape.

Route не должен самостоятельно переместить его в другое место.

---

# 41. Snap-to-point — отдельная возможность

Современный draw.io имеет дополнительный режим `snapToPoint`, при котором floating perimeter result может быть притянут к ближайшему anchor point.

Это должно быть отдельной feature flag:

```ts
snapToAnchor?: boolean
```

и не входить в базовую floating logic.

---

# 42. Shape perimeter abstraction

Нельзя зашивать rectangle intersection в router.

```ts
interface Perimeter {
  intersection(
    bounds: Rect,
    toward: Point,
    orthogonal: boolean
  ): Point;
}
```

Implementations:

```text
RectanglePerimeter
EllipsePerimeter
DiamondPerimeter
TrianglePerimeter
StencilPerimeter
CustomPerimeter
```

draw.io содержит отдельную `mxPerimeter` abstraction, поэтому routing и geometry фигуры разделены.

---

# 43. Self-loop

Source == Target — отдельный topology case.

Нельзя пропускать self-loop через обычный source-target router.

Минимальная topology:

```text
    ┌─────┐
    │     │
[A]─┘     │
 └────────┘
```

или соответствующая сторона.

---

# 44. Self-loop UX

Current draw.io использует segment handler для self-loops, чтобы каждый segment имел handle. При редактировании legacy loop может быть конвертирован в orthogonal route с inner waypoints.

Frade:

```text
LOOP_AUTO
   ↓ drag segment
LOOP_MANUAL
```

---

# 45. Routing Gesture State Machine

```text
IDLE

SELECTED_EDGE

HOVER_SEGMENT

DRAG_SEGMENT

DRAG_SOURCE_ENDPOINT

DRAG_TARGET_ENDPOINT

PREVIEW

COMMITTING

CANCELLED
```

Transitions:

```text
IDLE
  └─ selectEdge → SELECTED_EDGE

SELECTED_EDGE
  ├─ hoverSegment → HOVER_SEGMENT
  ├─ pointerDownSource → DRAG_SOURCE_ENDPOINT
  └─ pointerDownTarget → DRAG_TARGET_ENDPOINT

HOVER_SEGMENT
  └─ pointerDown → DRAG_SEGMENT

DRAG_SEGMENT
  ├─ pointerMove → PREVIEW → DRAG_SEGMENT
  ├─ pointerUp → COMMITTING → SELECTED_EDGE
  └─ Escape → CANCELLED → SELECTED_EDGE

DRAG_SOURCE_ENDPOINT
  ├─ pointerMove → PREVIEW
  ├─ pointerUp validTarget → COMMITTING
  ├─ pointerUp empty → dangling/restore policy
  └─ Escape → CANCELLED

DRAG_TARGET_ENDPOINT
  same
```

---

# 46. Hard rule: transient state

Во время drag нельзя изменять persisted edge geometry.

Использовать:

```ts
interface RoutingDraft {
  edgeId: string;
  original: EdgeRoutingModel;
  transient: EdgeRoutingModel;
  preview: EdgeRoute;
}
```

Только `pointerUp`:

```text
commit transaction
```

Escape:

```text
discard draft
```

---

# 47. Segment drag algorithm

```ts
function dragSegment(
  route: Point[],
  segmentIndex: number,
  pointer: Point,
): RouteHint[] {
```

1. Определить segment `[Pi, Pi+1]`.
2. Определить orientation.
3. Если vertical:
   - использовать pointer.x;
   - изменить constraint X для обоих ends segment.
4. Если horizontal:
   - использовать pointer.y.
5. Не менять orthogonal axis.
6. Rebuild manual route через SegmentRouter.
7. Normalize.
8. Validate.
9. Return control hints.

---

# 48. Endpoint drag algorithm

При drag endpoint:

```text
1 detach temporary endpoint
2 identify candidate terminal
3 identify candidate constraint / floating mode
4 compute new route
5 display preview
6 on drop:
    commit terminal binding
    recalculate route
```

Запрещено сохранять preview vertices как окончательный route state.

---

# 49. Automatic → Manual conversion

При первом segment drag:

```ts
function materializeManualRoute(autoRoute: EdgeRoute): RouteHint[]
```

Необходимо:

1. взять canonical route;
2. исключить source/target perimeter points;
3. определить axis constraints;
4. создать минимальные hints;
5. установить:

```text
routingMode = MANUAL_ORTHOGONAL
```

---

# 50. Manual → Automatic reset

Команда:

```text
Reset Waypoints
```

должна:

```ts
controlHints = []
routingMode = AUTO_ORTHOGONAL
```

и выполнить чистый reroute.

Она не должна пытаться «выпрямлять» текущую polyline.

---

# 51. Moving source/target shapes

## AUTO

Если перемещена фигура:

```text
full automatic reroute
```

## MANUAL

Control hints должны сохраняться в model coordinates.

SegmentRouter должен:

```text
re-resolve endpoints
+
rebuild path through existing hints
```

Hints не должны просто сдвигаться вместе с source, если не определена отдельная semantic ownership.

---

# 52. Moving both selected nodes and edge

Если source и target перемещаются одинаковым `(dx,dy)` как единая selection:

для manual route предпочтительно translate hints на тот же `(dx,dy)`.

Это позволяет визуально сохранить route.

Нужен explicit command:

```ts
translateRoutingHints(edge, delta)
```

---

# 53. Nested/container coordinate systems

Routing model должен храниться относительно edge parent coordinate system.

Нельзя смешивать:

```text
absolute canvas coordinates
group-relative coordinates
```

При reparent:

```text
old parent coordinates
 → world
 → new parent coordinates
```

---

# 54. Line jumps

Line-jump visualization:

```text
arc
gap
sharp
```

не является routing.

Это rendering post-process.

Никогда не добавлять jump geometry в routing points.

---

# 55. Rounded corners

Аналогично:

```text
rounded=1
```

не меняет semantic route.

Route остаётся:

```text
orthogonal polyline
```

renderer превращает corner в curve.

---

# 56. Arrow markers

Arrow marker влияет на jetty/spacing, но не должен менять topology за пределами endpoint approach.

---

# 57. Obstacle avoidance

Для parity обычного draw.io:

`OrthConnector` не обязан обходить все посторонние фигуры диаграммы.

Это локальный router source-target.

Отдельный:

```text
ObstacleRouter
```

должен использоваться только при включенном режиме.

Это предотвращает ошибочное усложнение базового router.

---

# 58. Determinism

Запрещено использовать:

```text
Math.random
object iteration dependent ordering
DOM element ordering
floating-point screen pixels
timestamp
```

для выбора route.

Tie-breaking должен быть формализован.

Например:

```text
WEST
NORTH
EAST
SOUTH
```

или parity-порядок draw.io.

---

# 59. BDD — Automatic Routing

## BDD-001 Horizontal separated nodes

```gherkin
Given source rectangle is left of target rectangle
And rectangles do not overlap vertically
And all terminal directions are allowed
When an automatic orthogonal edge is created
Then the source terminal shall use an outward orthogonal segment
And the target terminal shall use an inward orthogonal segment
And every route segment shall be horizontal or vertical
And the route shall contain no redundant points
```

## BDD-002 Vertical arrangement

```gherkin
Given source is above target
When an automatic orthogonal edge is created
Then preferred source direction shall be SOUTH
And preferred target direction shall be NORTH
Unless terminal constraints prohibit those directions
```

## BDD-003 Direction constraint overrides preferred route

```gherkin
Given source is left of target
And source allows NORTH only
When the route is calculated
Then the first segment shall leave source toward NORTH
```

## BDD-004 Floating endpoint

```gherkin
Given no explicit source connection constraint
When route is calculated
Then source endpoint shall lie on source perimeter
And shall be calculated from the next route point
```

## BDD-005 Fixed endpoint

```gherkin
Given source has a fixed perimeter constraint
When route is calculated
Then the source endpoint shall equal that resolved constraint
And automatic routing shall not relocate it
```

## BDD-006 Too-short route

```gherkin
Given both terminal points are fixed
And their distance is less than sourceJetty plus targetJetty
When routing is performed
Then SegmentRouter fallback shall be used
```

Это повторяет fallback draw.io.

---

# 60. BDD — Segment Editing

## BDD-010 Handle on every segment

```gherkin
Given an orthogonal edge is selected
When selection handles are shown
Then every editable route segment shall expose one midpoint handle
```

## BDD-011 Vertical segment drag

```gherkin
Given an edge contains a vertical segment
When its handle is dragged horizontally
Then both endpoints of the segment shall receive the same new X
And their Y coordinates shall remain unchanged
And all resulting segments shall remain orthogonal
```

## BDD-012 Horizontal segment drag

Аналогичный сценарий для Y.

## BDD-013 Straight route virtual handle

```gherkin
Given an edge is a single straight horizontal segment
When the edge is selected
Then a virtual midpoint segment handle shall exist
When the handle is dragged vertically
Then the route shall become a three-segment orthogonal route
```

Такой special-case имеется в draw.io.

## BDD-014 Drag creates new terminal dogleg

```gherkin
Given a segment adjacent to source terminal
When the segment is dragged past the source bounds
Then additional bend segments may be generated
And the first segment shall remain perpendicular to source perimeter
```

## BDD-015 Cancel drag

```gherkin
Given a segment drag is active
When Escape is pressed
Then edge persisted geometry shall remain unchanged
And edge routing mode shall remain unchanged
```

---

# 61. BDD — Normalization

## BDD-020 Duplicate elimination

```gherkin
Given candidate route contains adjacent equal points
When canonicalization runs
Then duplicate points shall be removed
```

## BDD-021 Collinear elimination

```gherkin
Given three consecutive points are horizontally collinear
When canonicalization runs
Then the middle point shall be removed
Unless required by a semantic constraint
```

## BDD-022 Idempotence

```gherkin
Given a canonical route
When canonicalization executes repeatedly
Then the route shall not change
```

---

# 62. BDD — Moving Shapes

## BDD-030 Auto route after source move

```gherkin
Given an automatic edge
When source node moves
Then the route shall be recomputed from the edge model
And no previous automatic intermediate points shall be reused as persisted constraints
```

## BDD-031 Side change

```gherkin
Given source originally connects EAST
When target moves above source
And NORTH becomes preferred
Then source attachment may move from EAST to NORTH
```

## BDD-032 Manual route survives terminal move

```gherkin
Given a manually routed edge
And route hints exist
When target moves
Then existing hints shall remain model-space constraints
And endpoint portions shall be reconstructed around those hints
```

---

# 63. BDD — Preview

## BDD-040 Preview equals final

```gherkin
Given an edge edit gesture
And pointer position P
When preview is rendered for P
And the gesture is committed at the same P
Then committed route geometry shall equal preview route geometry
Within numerical tolerance
```

## BDD-041 Zoom independence

```gherkin
Given an identical model
When an edge is routed at zoom 50%
And routed at zoom 200%
Then model-space route geometry shall be identical
```

---

# 64. BDD — Terminal Geometry

## BDD-050 Rectangle perimeter

```gherkin
Given a floating terminal on the east side of a rectangle
When the next route point is east of the rectangle
Then endpoint X shall equal rectangle right boundary
```

## BDD-051 Ellipse

```gherkin
Given an ellipse terminal
When a floating terminal point is calculated
Then the point shall lie on ellipse perimeter
Not on its rectangular bounding box
```

## BDD-052 Rotation

```gherkin
Given a rotated terminal
When routing direction is resolved
Then routing bounds shall account for rotation
And final endpoint shall be projected back to actual rotated perimeter
```

---

# 65. BDD — Self-loop

## BDD-060 Self-loop creation

```gherkin
Given source equals target
When an edge is created
Then LoopRouter shall be selected
And the route shall leave and re-enter the terminal through valid perimeter points
```

## BDD-061 Self-loop handles

```gherkin
Given a self-loop is selected
Then editable loop segments shall expose segment handles
```

## BDD-062 Self-loop segment edit

```gherkin
Given an automatic loop
When a loop segment is dragged
Then the loop may transition to manual orthogonal mode
And its loop topology shall remain valid
```

---

# 66. TDD contract — geometry primitives

### `isOrthogonalSegment`

Tests:

```text
horizontal → true
vertical → true
diagonal → false
ZERO_LENGTH → false (separate classification category; finite zero-length geometry is representable)
```

### `removeDuplicatePoints`

Properties:

```text
idempotent
order preserving
endpoint preserving
```

### `removeCollinearPoints`

Must preserve:

```text
first point
last point
constraint points
```

---

# 67. TDD contract — perimeter

For Rectangle:

```text
toward east → right edge
toward west → left edge
toward north → top
toward south → bottom
```

Corner ties must be deterministic.

Ellipse:

assert analytical ellipse equation within epsilon.

---

# 68. TDD contract — DirectionResolver

Build exhaustive matrix:

```text
relative quadrant
×
source constraint masks
×
target constraint masks
```

At minimum all:

```text
4 × 15 × 15
```

constraint combinations where masks are non-empty.

Property:

selected direction must belong to allowed mask.

---

# 69. TDD contract — RoutePatternEngine

Golden tests for every:

```text
sourceDirection × targetDirection × quadrant
```

= at least:

```text
4 × 4 × 4 = 64
```

canonical pattern cases.

Each verifies:

```text
orthogonality
correct first direction
correct final direction
minimum point canonicalization
```

---

# 70. TDD contract — automatic router

Fixture schema:

```ts
interface RoutingFixture {
  source: Rect;
  target: Rect;

  sourceConstraint?: Direction[];
  targetConstraint?: Direction[];

  sourcePoint?: Point;
  targetPoint?: Point;

  expected: Point[];
}
```

Golden fixtures should not test screenshots only.

They must test exact route topology.

---

# 71. Golden parity suite against draw.io

Это наиболее важный слой для остановки regressions.

Создать набор эталонных draw.io fixtures.

Например:

```text
drawio-parity/
  horizontal-separated.json
  vertical-separated.json
  diagonal-ne.json
  diagonal-nw.json
  overlapping-x.json
  overlapping-y.json
  nested.json
  near-source.json
  fixed-west-east.json
  constrained-north.json
  loop.json
  straight-to-manual.json
```

Для каждого fixture сохранить:

```text
source bounds
target bounds
styles
constraints
waypoints
draw.io resulting absolute points
```

Тест:

```ts
expect(
  fradeRoute(fixture)
).toEqualWithinTolerance(
  fixture.drawioExpectedRoute
);
```

---

# 72. Differential testing

Ещё сильнее:

создать небольшой test harness поверх draw.io router.

Для каждого generated input:

```text
1 run reference draw.io algorithm
2 run Frade router
3 canonicalize both
4 compare
```

Random generation допустим **в tests**, но каждый найденный failure обязан превращаться в deterministic fixture.

Это даст реальное convergence.

---

# 73. Property-based testing

Использовать `fast-check`.

Generate:

```text
source rectangle
target rectangle
direction constraints
jetty
fixed/floating endpoints
route hints
```

Properties:

```text
all finite
all orthogonal
allowed source direction
allowed target direction
canonical
deterministic
zoom independent
```

Минимум:

```text
10 000 generated cases
```

на CI для router core.

---

# 74. Mutation testing

Routing engine имеет слишком много branch logic для обычного coverage.

Использовать mutation testing для:

```text
DirectionResolver
RoutePatternEngine
Normalizer
SegmentRouter
```

Target:

```text
mutation score >= 90%
```

Особенно важно для comparisons типа:

```text
<
<=
>
>=
```

которые в geometry дают трудно заметные визуальные regressions.

---

# 75. Visual tests

Visual tests остаются, но становятся **последним**, а не первым уровнем.

Pyramid:

```text
          visual
        integration
      BDD interaction
    golden route parity
   property-based tests
 pure unit geometry tests
```

Не наоборот.

---

# 76. Screenshot scenarios

Обязательные:

```text
horizontal
vertical
4 diagonals
overlapping x
overlapping y
fixed anchors
floating anchors
manual middle segment
terminal segment drag
straight → dogleg
loop
move source
move target
move both
zoom 50/100/200
```

Visual diff threshold должен быть минимален.

Но screenshot не заменяет route geometry assertions.

---

# 77. Regression rule

Каждый найденный routing defect:

**до исправления** превращается минимум в:

```text
1 failing geometry test
1 BDD/integration scenario
```

Если баг визуальный:

```text
+ screenshot fixture
```

После чего исправляется код.

Без теста defect не считается исправленным.

---

# 78. Architectural rule: no routing fixes in renderer

Запрещено:

```text
if weirdRoute:
  SVGPath += ...
```

Renderer только отображает route.

---

# 79. Architectural rule: no routing fixes in React component

Запрещено:

```text
useEffect(() => fixEdgePoints(...))
```

React/X6 layer не должен знать topology algorithm.

---

# 80. Architectural rule: no direct mutation

Запрещено:

```ts
edge.points[i].x = ...
```

из UI.

UI создаёт command:

```ts
MoveSegmentCommand
```

Router возвращает новое состояние.

---

# 81. Command model

```ts
type RoutingCommand =
  | MoveSegment
  | MoveSourceEndpoint
  | MoveTargetEndpoint
  | ResetWaypoints
  | SetConnectionConstraint
  | MoveTerminal
  | TranslateSelection;
```

Все mutations должны проходить через одну transaction boundary.

---

# 82. Undo / Redo

Undo хранит semantic model state:

```text
before
after
```

не rendered points.

Например:

```text
before.controlHints
after.controlHints
```

При undo route пересчитывается.

---

# 83. Serialization

Persisted edge:

```json
{
  "routing": {
    "mode": "manual-orthogonal",
    "source": {
      "cellId": "A",
      "mode": "floating"
    },
    "target": {
      "cellId": "B",
      "mode": "floating"
    },
    "hints": [
      { "x": 340, "y": 180 }
    ],
    "jetty": {
      "source": "auto",
      "target": "auto"
    }
  }
}
```

Не хранить:

```text
screen handles
preview route
zoom-normalized route
rounded SVG path
```

---

# 84. Compatibility with draw.io XML

Если Frade должен импортировать/экспортировать draw.io:

Mapping:

```text
edgeStyle=orthogonalEdgeStyle
    ↔ AUTO_ORTHOGONAL

geometry.points[]
    ↔ controlHints[]

exitX/exitY
    ↔ source constraint

entryX/entryY
    ↔ target constraint

jettySize
sourceJettySize
targetJettySize
    ↔ JettyConfig
```

Типичный draw.io edge действительно хранит `edgeStyle=orthogonalEdgeStyle`, `orthogonalLoop=1`, `jettySize=auto` и connection coordinates в style.

---

# 85. Performance

Target:

```text
single edge automatic route < 0.25 ms median
single edge route < 1 ms p99
```

при обычном topology.

Pointer preview:

```text
60 fps
```

Нельзя запускать React rerender всего graph при каждом mousemove.

---

# 86. Caching

Допустим:

```ts
RouteCacheKey = hash(
  source bounds,
  target bounds,
  constraints,
  hints,
  routing config
)
```

Но cache не должен участвовать в semantics.

Cache miss и hit обязаны вернуть идентичный route.

---

# 87. Implementation milestones

## Phase R0 — Freeze

Перед новой реализацией:

1. запретить новые routing patches;
2. собрать все существующие routing defects;
3. преобразовать их в regression fixtures;
4. зафиксировать текущее поведение.

---

## Phase R01 - Geometry Kernel

Реализовать:

```text
Point
Vector
Rect
Segment
Direction
Orientation
numerical policy
geometry predicates
Manhattan distance
translation
rectangle relations
coordinate transforms
duplicate reduction
collinear reduction
normalization primitives
```

Gate:

```text
100% invariant tests
property tests green
```

---

## Phase R02 - Terminal / Perimeter

Реализовать:

```text
TerminalGeometry
TerminalBinding
ConnectionConstraint
PortConstraint
Perimeter abstraction
RectanglePerimeter
EllipsePerimeter
FixedTerminalResolver
FloatingTerminalResolver
```

Gate:

```text
all attachment BDD green
```

---

## Phase R03 — Direction Resolver

Реализовать:

```text
relative source/target quadrant classification
constraint-aware source/target direction resolution
direction preference and deterministic direction selection
```

R01 provides only X/Y projections, overlap, separation, and basic scalar/rectangle geometry. Routing quadrant policy belongs to R03, never Geometry Kernel.

Gate:

```text
direction-resolution scenario matrix green
```

---

## Phase R04 — Draw.io-compatible OrthogonalRouter

Реализовать:

```text
jetty
consume R03 quadrant/direction decisions
separation
pattern table
pattern executor
normalization
```

Gate:

```text
64+ route-pattern fixtures
draw.io parity fixtures green
```

---

## Phase R05 — SegmentRouter

Реализовать:

```text
control hints
horizontal/vertical channels
manual route topology
automatic → manual transition
```

Gate:

```text
manual geometry fixtures green
```

---

## Phase R06 — SegmentEditor

Реализовать:

```text
virtual segment handles
segment drag
straight-edge special case
terminal-adjacent segment edits
```

Gate:

```text
interaction BDD green
```

---

## Phase R07 — Preview / Commit

Реализовать:

```text
draft state
preview
commit
cancel
```

Gate:

```text
preview == commit
Escape never changes model
```

---

## Phase R08 — Self-loop

Gate:

```text
loop create/edit/move/reset
```

---

## Phase R09 — Draw.io Differential Harness

Gate:

```text
>= 1000 deterministic generated parity cases
```

---

## Phase R10 — X6 Integration

X6 должен стать:

```text
renderer + pointer/event adapter
```

а не владельцем routing semantics. Future adapter root: `packages/draw/src/routing/adapters/x6/`.

Visual regression follows geometry parity as R10 integration evidence, not a separate numbered milestone.

---

# 88. Architecture Gate

Feature не может считаться завершённой, если нарушается хотя бы одно:

### AG-01

Routing core не зависит от React.

### AG-02

Routing core не зависит от DOM.

### AG-03

Routing core не зависит от AntV X6.

### AG-04

Routing core — deterministic pure domain module.

### AG-05

Rendered points не являются source of truth.

### AG-06

Automatic и manual routing разделены.

### AG-07

Terminal resolution отделён от intermediate route calculation.

### AG-08

Preview использует тот же routing engine, что commit.

### AG-09

Каждая команда проходит invariant validation.

### AG-10

Все найденные баги имеют regression fixture.

---

# 89. Definition of Done

Routing Engine считается готовым только когда:

```text
[ ] automatic routes deterministic
[ ] all routes orthogonal
[ ] floating perimeter works
[ ] fixed anchors work
[ ] constraints work
[ ] jetty works
[ ] automatic/manual mode transition works
[ ] segment handles work
[ ] straight-route handle works
[ ] source/target drag works
[ ] moving source works
[ ] moving target works
[ ] moving both works
[ ] preview == commit
[ ] reset waypoints works
[ ] undo/redo works
[ ] self-loop works
[ ] zoom does not affect geometry
[ ] serialization round-trip stable
[ ] draw.io parity fixtures green
[ ] property tests green
[ ] mutation score >= 90%
[ ] visual regressions green
```

---

# 90. Наиболее важные anti-patterns

Следующие решения запрещены.

## AP-1

После каждого drag:

```text
manually repair polyline
```

## AP-2

Хранить rendered points как authoritative route.

## AP-3

Смешивать endpoint selection и route calculation.

## AP-4

Использовать одну state machine для:

```text
edge creation
endpoint drag
segment drag
```

без явных sub-states.

## AP-5

Удалять/добавлять bends на основе pixel threshold renderer.

## AP-6

Иметь разные algorithms preview и commit.

## AP-7

Исправлять routing в SVG layer.

## AP-8

Исправлять regressions без теста.

---

# 91. Recommended test directory

```text
routing/
├── __tests__
│   ├── unit
│   │   ├── perimeter.spec.ts
│   │   ├── direction-resolver.spec.ts
│   │   ├── jetty.spec.ts
│   │   ├── route-pattern.spec.ts
│   │   ├── normalization.spec.ts
│   │   └── segment-router.spec.ts
│   │
│   ├── property
│   │   ├── orthogonality.property.ts
│   │   ├── determinism.property.ts
│   │   ├── normalization.property.ts
│   │   └── constraints.property.ts
│   │
│   ├── parity
│   │   └── drawio-parity.spec.ts
│   │
│   ├── interaction
│   │   ├── segment-drag.spec.ts
│   │   ├── endpoint-drag.spec.ts
│   │   ├── preview-commit.spec.ts
│   │   └── loop.spec.ts
│   │
│   └── visual
│       └── routing.visual.spec.ts
│
└── fixtures
    ├── drawio
    ├── regressions
    └── generated
```

---

# 92. Главное отличие новой реализации Frade

Старая модель:

```text
edge is a polyline
```

Новая модель:

```text
edge =
  semantic endpoints
+ routing policy
+ optional routing constraints
```

Polyline:

```text
route(edge)
```

---

# 93. Финальная target architecture

```text
                    ┌───────────────────┐
                    │ EdgeRoutingModel  │
                    └─────────┬─────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │ TerminalResolver    │
                   └──────────┬──────────┘
                              │
                  ┌───────────▼───────────┐
                  │ Fixed Point Resolver   │
                  └───────────┬───────────┘
                              │
                              ▼
                ┌─────────────────────────────┐
                │ Routing Strategy Selector   │
                └───────────┬─────────────────┘
                            │
           ┌────────────────┼─────────────────┐
           ▼                ▼                 ▼
 ┌────────────────┐ ┌────────────────┐ ┌─────────────┐
 │ Orthogonal     │ │ Segment        │ │ Loop        │
 │ Router         │ │ Router         │ │ Router      │
 └───────┬────────┘ └───────┬────────┘ └──────┬──────┘
         └──────────────────┬┴─────────────────┘
                            ▼
                  ┌─────────────────────┐
                  │ Floating Perimeter  │
                  │ Resolver            │
                  └──────────┬──────────┘
                             ▼
                  ┌─────────────────────┐
                  │ RouteCanonicalizer  │
                  └──────────┬──────────┘
                             ▼
                  ┌─────────────────────┐
                  │ InvariantValidator  │
                  └──────────┬──────────┘
                             ▼
                    immutable EdgeRoute
                             │
               ┌─────────────┴─────────────┐
               ▼                           ▼
       Preview Renderer               X6 Renderer
```

---

# 94. Ключевое решение

Для Frade Draw я рекомендую **не пытаться улучшать текущий router постепенно**.

Нужно создать новый:

```text
Frade Routing Engine v2
```

за feature flag:

```text
routingEngine: "legacy" | "v2"
```

После чего:

```text
1. воспроизвести draw.io parity;
2. прогнать все старые дефекты как fixtures;
3. переключить default на v2;
4. legacy оставить временно;
5. после стабилизации удалить legacy.
```

Это значительно безопаснее, чем продолжать менять уже нестабильный алгоритм.

---

# 95. Итог исследования draw.io

Самые важные architectural lessons:

**1. Connection endpoint и route — разные вычисления.**

**2. Automatic route и manually constrained route — разные modes.**

**3. Ручное редактирование осуществляется на уровне segments.**

**4. Segment handles являются transient UI state и автоматически выводятся из route.**

**5. Наличие manual control hints переключает orthogonal routing на segment-based reconstruction.**

**6. Automatic OrthConnector использует deterministic route patterns, а не хаотическое локальное исправление polyline.**

**7. Perimeter intersection выполняется после построения intermediate route.**

**8. Jetty является частью routing semantics.**

**9. Route постоянно canonicalized.**

**10. Rendered polyline не должна становиться model truth.**

Именно эти десять принципов должны стать фундаментом Frade Routing Engine.
