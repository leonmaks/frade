# R04 fallback contract decision

STATUS: USER_SELECTED_CONTRACT
CHANGE: routing-v2-04-orthogonal-router
PHASE: PLANNING
PRE_IMPLEMENTATION_GATE: NOT_RUN
BASE_COMMIT: 0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4

## User instruction

> Выбираю вариант 1. Сохраняем direction constraints без исключений. Согласуй
> master spec, BDD-006 и planning R04; явно опиши fallback, его jetty-политику
> и отличие от draw.io. Не вводи зависимость от R05 или legacy router.
> Production пока не менять.

This approves the hard-constraint policy and planning reconciliation. The concrete
construction below is the proposed R04 contract, still subject to independent PRE;
this record is not a review PASS or authorization to implement.

## Concrete contract

1. Resolve fixed points/masks via unchanged R02 and directions via unchanged R03.
2. Trigger only with two fixed results and finite Euclidean distance strictly
   less than the sum of resolved jetty minima; equality remains ordinary routing.
3. Enclose both terminal routing rectangles and fixed endpoints, then expand each
   side by max(10, sourceJetty, targetJetty) model units. An anchor supplies zero
   bounds at its point. Cast the selected outward rays to this exterior rectangle.
4. Construct both perimeter connectors, clockwise and counterclockwise. Equal
   exits require a full circuit. Preserve semantic endpoints; structurally
   canonicalize and validate both candidates before selection.
5. Select by exact finite Manhattan length, bend count, then cardinal sequence
   WEST<NORTH<EAST<SOUTH; complete ties select clockwise.
6. Both fixed endpoints and selected directions/masks remain mandatory. Terminal
   runs must exceed EPSILON and meet their independent resolved minima within
   EPSILON. Expansion may lengthen a jetty but cannot shrink it. Zero minima do
   not permit zero-length terminal directions. Unrepresentable expansion/runs or
   nonfinite costs produce numeric errors, never weakened constraints.

This is bounded local R04 geometry, not a general obstacle-avoidance guarantee.
It does not inspect/manualize hints, call R05 SegmentRouter, reuse legacy routing
or call vendor code in production. Ordinary pattern defects are errors; this
fallback is not a catch-all recovery mechanism.

## Difference from draw.io

The preserved executable probe calls the actual pinned OrthConnector and actual
SegmentConnector. For two NORTH-only fixed points (5,0) and (20,0), source bounds
(0,0,10,10), target bounds (15,0,10,10), jets 10/10, reference returns
[(5,0),(20,0)] and never reads port masks. That loses both NORTH constraints.

R04 instead selects [(5,0),(5,-10),(20,-10),(20,0)]. It preserves fixed points,
both NORTH outward directions and both jetty minima. Retain both outputs and
label this intentional adaptation; do not change the oracle or call it parity.
Strict ordinary parity has its own input domain and independent fixtures.

## Reconciled documents and next checkpoint

Master section 25 and BDD-006, R04 playbook, proposal, delta, design, tasks and
traceability all use this policy. The historical discovery remains in
planning-blocker.md and its reference probe remains unchanged.

The follow-up task 1.2 supplied the exact R04 architecture-gate profile/self-tests
and fingerprint binding; see process-control-validation.md. Next is fresh independent
PRE using Astra xhigh. No production/test edits or package installation occurred
in this reconciliation or process-control work. R01-R03 remain read-only.
