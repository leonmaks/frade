# Frade — Engineering Agent Contract

## Purpose

This file defines repository-wide engineering rules for AI coding agents working on Frade.

These rules are mandatory.

Subsystem-specific rules may exist in nested `AGENTS.md` files and may impose stricter constraints.

---

## 1. Development Method

Frade uses:

```text
SDD / OpenSpec
    ↓
BDD
    ↓
TDD
    ↓
Implementation
    ↓
Verification
    ↓
Architecture Gate
    ↓
Archive
```

Implementation follows specification.

Specification must not be silently changed to match implementation.

Tests must not be weakened to make implementation pass.

---

## 2. OpenSpec Is the Change Authority

For substantial product or architecture work:

1. identify the active OpenSpec change;
2. read its proposal/spec/design/tasks;
3. validate the change before implementation;
4. implement only the active scope;
5. run required tests;
6. run OpenSpec verification;
7. pass the Architecture Gate;
8. only then archive the change.

Do not implement a later dependent change before the previous change has passed its gate.

---

## 3. STOP Conditions

Stop progression whenever any of the following is true:

```text
required test fails
typecheck fails in affected code
OpenSpec validation fails
OpenSpec verification has a correctness blocker
architecture invariant fails
architecture gate fails
reference parity fails
a specification conflict exists
a previously fixed regression reappears
```

Resolve the blocker before moving to the next phase.

---

## 4. No Patch-Loop Rule

After two unsuccessful fixes of the same deterministic defect:

```text
STOP PATCHING
```

Before another production-code modification, perform root-cause analysis.

Classify the failure as:

```text
DOMAIN_MODEL
INVARIANT
ALGORITHM
ABSTRACTION_BOUNDARY
STATE_TRANSITION
TEST
SPEC_CONFLICT
INTEGRATION
ENVIRONMENT
```

Do not continue making local symptom-oriented fixes.

---

## 5. Regression-First Rule

For a reproduced defect use:

```text
DEFECT
 ↓
DETERMINISTIC REPRODUCTION
 ↓
FAILING TEST / FIXTURE
 ↓
ROOT CAUSE
 ↓
IMPLEMENTATION FIX
 ↓
TARGETED TEST
 ↓
FULL REGRESSION SUITE
```

Do not fix production code first and add a regression test afterwards unless reproduction before the fix is technically impossible and explicitly documented.

---

## 6. Test Integrity

Do not make tests pass by weakening them.

Forbidden without an explicit specification decision:

```text
test.skip
it.skip
describe.skip

test.only
it.only
describe.only

removing meaningful assertions
loosening geometry tolerances
blind snapshot regeneration
deleting regression fixtures
ignoring thrown errors
changing expected values merely to match current implementation
@ts-nocheck
@ts-ignore
```

Existing regression tests are historical evidence.

Do not remove them casually.

---

## 7. Architecture Direction

Prefer dependency direction:

```text
UI / Framework
      ↓
Adapters
      ↓
Application / Interaction
      ↓
Domain
      ↓
Pure primitives
```

Do not solve domain defects inside renderers, React lifecycle hooks, persistence adapters, or framework glue.

Fix the first incorrect decision in the proper layer.

---

## 8. Derived State

Do not persist state that can be deterministically derived from semantic state unless the specification explicitly requires materialization.

Typical transient/derived state includes:

```text
selection handles
preview geometry
render-only paths
cached projections
temporary interaction coordinates
```

---

## 9. Determinism

Core domain algorithms must not depend on accidental runtime state such as:

```text
Math.random()
Date.now()
DOM ordering
React render ordering
screen zoom
devicePixelRatio
pointer event frequency
animation-frame timing
```

Identical semantic inputs must produce identical semantic outputs within the explicitly defined numeric tolerance.

---

## 10. Scope Discipline

Do not turn an active OpenSpec change into an unrelated repository-wide refactoring.

If unrelated technical debt is discovered:

```text
document it
do not opportunistically implement it
```

unless it blocks the active change.

---

## 11. Evidence

Never report:

```text
"should pass"
"looks correct"
"probably fixed"
```

as verification.

Claims about passing tests or validation must come from commands that were actually executed.

At the end of implementation report:

```text
CHANGE:
IMPLEMENTED:
FILES CHANGED:
TESTS ADDED:
COMMANDS EXECUTED:
TEST RESULTS:
KNOWN BLOCKERS:
READY_FOR_VERIFY: YES | NO
```

---

## 12. Architecture Gate

An Architecture Gate is a review phase.

During a gate:

```text
DO NOT MODIFY PRODUCTION CODE
```

unless the task is explicitly changed from review to repair.

Gate output must contain exactly one unambiguous status:

```text
GATE_STATUS: PASS
```

or:

```text
GATE_STATUS: FAIL
```

Correctness or architecture blockers always mean `FAIL`.

---

## 13. No Autonomous Phase Advancement

Do not automatically start the next numbered OpenSpec change after completing the current one.

Example:

```text
R04 complete
→ STOP
→ report status
```

Do not automatically begin R05.

Each numbered change is an engineering checkpoint.

---

## 14. Routing Engine V2

Any task involving:

```text
edge routing
edge connections
terminal attachment
waypoints
orthogonal routing
segment editing
routing preview
self-loops
routing rendering
routing/X6 integration
```

must additionally read:

```text
docs/routing-v2/drawio-routing-master-spec.md
docs/routing-v2/implementation-playbook.md
```

These documents define the Routing Engine V2 architecture and implementation program.

When a routing-specific nested `AGENTS.md` exists, its stricter rules also apply.

Do not implement Routing Engine V2 from memory or from legacy code alone.

---

## 15. Routing V2 Sequence

Routing Engine V2 follows this dependency order:

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

A later change must not compensate for a defect in an earlier layer.

Fix the responsible layer.

---

## 16. Git Safety

Do not perform destructive operations merely to simplify implementation.

Do not execute without explicit instruction:

```text
git reset --hard
git clean -fd
discard unrelated user changes
rewrite unrelated commits
```

Before reporting implementation complete, inspect:

```text
git status
git diff
```

Unexpected unrelated changes must be identified.

---

## 17. Prime Directive

Do not optimize for:

```text
"make the current visual symptom disappear"
```

Optimize for:

```text
correct domain model
+
explicit invariants
+
deterministic implementation
+
executable regression protection
+
correct architecture boundary
```
