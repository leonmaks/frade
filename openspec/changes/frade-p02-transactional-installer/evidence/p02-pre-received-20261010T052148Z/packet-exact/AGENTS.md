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

---

## 18. Independent Feature Ownership and Parallel Work

The active change is selected for the current task and workspace. A program's
`CURRENT_CHANGE.md`, phase, frozen fingerprints and numbered sequence govern work
in that program; they are not a repository-wide lock on independent features.
Sections 1–17 remain mandatory. A failing applicable check still stops its owner.

Independent features may proceed in parallel in separate branches/worktrees.
Each has its own approved scope, baseline, PRE, tests, verification, POST and
archive checkpoint. Do not run concurrent writers in the same checkout. Do not
copy another feature's uncommitted source, tests, dependency edits or process
state into a feature workspace. Record the exact transferred files and hashes.

Declare a directed dependency only when a feature consumes another feature's
API, artifact or behavior. The consumer owns its waiting, integration, adapter,
compatibility tests and control revalidation tasks. The supplier does not wait
for the consumer's gate, completion, archive or process repair. Shared ancestry,
a common package, a dirty checkout or a historical whole-file fingerprint is
not by itself a product dependency.

Frozen files stay frozen in the owning workspace against its approved baseline.
An independent authorized change to a shared file in another workspace does not
require that frozen feature's approval. When the frozen feature adopts that
change, it must review the resulting control/behavior changes in its own process,
preserve cumulative origin and historical evidence, and pass applicable gates
before advancing. Shared-file merges are serialized; conflicts are resolved
explicitly. No broad allowlist or baseline movement may conceal unauthorized work.

List gate applicability by affected contract and actual feature scope. Routing
V2 gates are required for routing/core or routing-contract/control work; they do
not gate independent UI tokens, components, docs or UI compliance implementation.
Presentation changes still require evidence that persisted/domain behavior is
preserved. If a presentation change actually alters routing semantics, that
change must be split into a routing-owned dependency with its required contracts
and gates. Retain general repository/build/typecheck/boundary/CI requirements.

Apply sequential checkpoints within each dependency chain. Independent feature
chains do not acquire an ordering merely because their changes have numbers.
Never report another feature's historical FAIL as the selected feature's PASS,
or relabel a failing applicable check as not applicable to avoid a blocker.

---

## 19. Mandatory Frade UI Design Contract

Every new or modified Frade UI MUST follow `docs/ui/Frade-UI-Style-Guide.md` v1.0 and the canonical shared UI tokens/components. This includes Electron, web, Draw, Repository, Projects, AI, Settings, dialogs, overlays and notifications.

Read `docs/ui/Themes-and-Plugins-Spec.md` for hot-pluggable themes and native extension contracts. Light and dark ship together. Do not equate VS Code-like UX or theme import with support for all executable VS Code extensions. Every plugin contribution inherits Frade tokens, focus, keyboard and component contracts.

Before a UI change:

1. Read root/scoped AGENTS.md, the style guide, existing shared UI and current approved OpenSpec scope.
2. Record applicable FDS/A11Y rule IDs, screens, states, theme/density coverage and keyboard contracts in the change.
3. Reuse existing shared components and semantic tokens. Do not add feature-level color literals, a second visual system, an icon family or a competing theme resolver.
4. Preserve VS Code workbench structure and Frade's architectural-workshop character: restored context, clear focus, beautiful diagrams, meaningful feedback on actual work.

Implementation MUST stay within authorized paths. This contract does not override safety, frozen artifacts, approved domain/routing contracts or existing sequential PRE/POST gates. When an approved specification conflicts with this guide, document the exact conflict and propose a specification change through the existing workflow; do not silently reinterpret it.

For every affected UI surface, verify applicable light/dark/high-contrast themes, compact/comfortable density, keyboard access, pointer targets, focus, resize/text zoom and loading/error/dirty/empty states. New behavior needs meaningful interaction coverage; cosmetic changes need appropriate visual verification, not tests that merely restate CSS.

Before completion, produce a UI compliance report with PASS/FAIL/BLOCKED/NOT_RUN per applicable check, actual commands/results, commit, environment and limitations. Missing evidence MUST NOT be reported as PASS. Failed or blocked required gates prevent progression/archive under the project workflow. Baselines are not auto-approved.

Changes to MUST rules, token contracts, workbench behavior or brand assets require the corresponding approved specification/ADR change. Routine choices within existing components/tokens do not require another user confirmation. The agent must not broaden a small UI task into an unrelated migration.

The guide becomes binding for new changes after this section and the canonical docs are integrated. Branch/CI enforcement must be verified separately; an AGENTS instruction alone is not a technical merge protection.

---

## 20. Shared automatic independent reviews and branch progress

These mandatory engineering rules apply to every Frade feature branch/worktree.
Keep sections1–19, scoped AGENTS, approved contracts, test integrity and STOP rules.

At start/resume identify the owning branch/worktree/change and Git common directory.
Read the reviewed shared policy published under that common directory's
frade-workflow/current.json, when present. Its content-addressed release is common
to registered Frade worktrees; no account-global or per-branch reviewer setup.
If a stale branch lacks the local docs/runner, load that shared release directly
and record exact policy-version/hash adoption in the owning process evidence.
No whole UI merge, foreign uncommitted product files or silent baseline movement.

For every required PRE and POST automatically prepare a relevant authorized Frade
source/contracts/tests/evidence packet, dispatch a fresh independent OpenAI Codex
review using the exact model and reasoning effort assigned in the approved
owning branch plan for its current stage and PRE/POST role, and receive the result. The
reviewer runs in technically verified read-only packet confinement: original
checkout/other-worktrees/credentials/secrets/global settings/writes/network/apps
are unavailable. Authenticated harness access stays outside reviewer commands.
Do not ask the human to relay prompts/results or approve each authorized review.
User authorization on1October2026 extends this workflow to all Frade worktrees;
other repositories and sensitive data remain excluded. Do not silently substitute
a model/effort or claim an unattested backend. There is no universal model/effort
default. Missing, ambiguous or conflicting stage assignments, unavailable requested
models/efforts or an unverified sandbox are BLOCKED for the actual decision/limitation.
Record the selected stage/role and exact plan source hash/excerpt with the review.

Approved coherent plan plus validation precedes PRE; PRE PASS precedes production.
Actual required tests and OpenSpec verification precede POST; POST PASS precedes
archive. Run explicit revalidation after scope changes, not a historical PASS.
Keep stricter owner gates, frozen controls and each numbered STOP checkpoint.
A machine gate is not independent approval. FAIL stops its owner; unavailable,
mutated, truncated, timed-out or ambiguous review is BLOCKED, never PASS.
Review completion needs actual successful execution, complete event stream,
exactly one GATE_STATUS PASS/FAIL and unchanged candidate/packet/request/control
hashes. Save raw reports/events/exits/provenance immutably before interpreting them.
A focused PASS does not grant cumulative closure or human visual acceptance.

Every engineering branch MUST maintain its own tracked *-STATUS.md. Retain an
existing program dashboard; otherwise use docs/engineering/BRANCH-STATUS.md.
Include branch/worktree/change/original baseline, phase/tasks, actual checks/gates,
blockers/decisions, next step and commit/push state. Refresh on start/resume, scope
acceptance, task completion/blocker, check batch, PRE/POST, verification/visual
decision, archive and checkpoint publication. Open it in the right panel and
report queued vs visible honestly. Never update a frozen candidate during review;
record the outcome after unfreezing. Dashboard is not approval or historical
evidence. Preserve old FAIL/NOT_RUN and each feature's separate ownership.

Commit completed authorized checkpoints with honest incomplete/gate status; push
only to a user-authorized destination/ref, verify actual remote SHA, never force.
Ask humans only for material scope/spec/permission/visual or blocked-environment
decisions. Independent review findings cannot change the contract by themselves.
The consumer owns necessary adoption/control revalidation; it cannot make an
independent supplier wait for its routing/product gate or numbered completion.
