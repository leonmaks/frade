# R04 planning blocker: too-short fallback versus direction constraints

CHANGE: routing-v2-04-orthogonal-router
PHASE: PLANNING
STATUS: RESOLVED_BY_USER_DECISION
CLASSIFICATION: SPEC_CONFLICT
BASE_COMMIT: 0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4
PRE_IMPLEMENTATION_GATE: NOT_RUN
READY_FOR_PRE_IMPLEMENTATION: YES

## Historical discovery (before the decision)

The master specification section 25 and BDD-006 require fixed endpoints closer
than sourceJetty + targetJetty to use the draw.io SegmentConnector fallback.
Sections 20 and 38 require singleton direction masks and source/target direction
invariants INV-007/INV-008 to hold. The R04 playbook repeats these invariants and
requires an explicit too-short fallback contract, while the full SegmentRouter
belongs to R05.

Exact reference fallback and unconditional direction invariants cannot both
hold for every valid constrained fixed-endpoint input. The conflict required an
explicit planning decision before authoring the R04 contract; see the resolution below.

## Executed deterministic counterexample

- Source rectangle: (0, 0, 10, 10), fixed north midpoint (5, 0), NORTH-only mask.
- Target rectangle: (15, 0, 10, 10), fixed north midpoint (20, 0), NORTH-only mask.
- Source and target jetty: 10 each; endpoint distance 15 < 20.
- Pinned mxEdgeStyle.js SHA-256:
  `8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d`.
- Actual unmodified OrthConnector called actual SegmentConnector once.
- Port-constraint reads: zero; the fallback occurs before those reads.
- Returned intermediate points: empty.
- Complete route: [(5,0), (20,0)].
- Actual source outward direction EAST and target outward direction WEST;
  both violate their declared NORTH-only constraints.

The read-only probe evaluates the complete pinned vendor source in an isolated
VM. Point/cell cloning and style-value access supply framework data support;
they do not replace either routing algorithm. A forwarding wrapper counts
SegmentConnector calls. The port-constraint reader is instrumented and is not
reached. The source hash and all observations above have executable assertions.
No Frade production code is under test here; this is specification discovery.

Reproduce from the repository root:

```powershell
node openspec/changes/routing-v2-04-orthogonal-router/evidence/too-short-reference-probe.mjs
```

## Alternatives presented at discovery

Recommended: keep direction constraints mandatory, explicitly document a Frade
adaptation for constrained too-short fallback, and define its bounded automatic
geometry, jetty policy and parity domain in R04. Reconcile master section 25,
BDD-006 and R04/R05 responsibility before claiming planning is ready. The
fallback must not become a hidden dependency on R05 or legacy routing.

Alternative: preserve exact reference fallback and explicitly narrow direction
invariants for this case. That changes a core guarantee and requires a deliberate
specification decision; it must not be implemented as a silent exception.

## Resolution

The user selected option 1: preserve direction constraints without exceptions,
reconcile master/BDD-006/R04 planning, state fallback and jetty policy explicitly,
and introduce no R05 or legacy dependency. See [fallback-decision.md](fallback-decision.md).
Master section 25, BDD-006, playbook and all four R04 artifacts now reflect that
decision. The original reference probe and observations above are preserved.

The specification conflict is resolved. The subsequent task 1.2 implemented the
exact R04 profile, frozen-approval binding and executable controls; see
[process-control-validation.md](process-control-validation.md). Independent PRE
is now the next checkpoint. No independent PRE PASS is claimed from machine checks.

## Preserved boundaries

R03 is closed at the baseline above. R01-R03 source, tests, specifications and
archived evidence remain read-only. The discovery itself changed no production,
existing tests or controls. The subsequent user-authorized reconciliation changes
master/playbook and R04 planning/process documents only; production, existing
tests, AGENTS and architecture-gate code remain unchanged. No implementation,
commit, archive or R05 work was performed.
