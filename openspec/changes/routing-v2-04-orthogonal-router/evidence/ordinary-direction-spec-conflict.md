# R04 ordinary direction conflict — implementation stopped

CHANGE: routing-v2-04-orthogonal-router

CLASSIFICATION: SPEC_CONFLICT (algorithm adaptation is missing from the approved design)

READY_FOR_VERIFY: NO

## Fresh reproduction on 2026-09-28

The retained original accepted property input is unchanged in
`packages/draw/tests/routing-v2/orthogonal/unit/anchor-direction-regression.test.ts`.
The targeted Vitest command was executed again and exited 1: one test failed
with INV-007, source expected EAST, actual WEST. This is an algorithm/contract
failure, not an environment, infrastructure or network failure.

```powershell
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/orthogonal/vitest.config.ts tests/routing-v2/orthogonal/unit/anchor-direction-regression.test.ts
node openspec/changes/routing-v2-04-orthogonal-router/evidence/ordinary-direction-diagnostic.mjs
```

The diagnostic exits 0 because its assertions confirm the counterexample;
it does NOT establish router correctness. Its complete output is retained in
`ordinary-direction-diagnostic.json`. It checks the approved vendor SHA-256,
extracts the executor from the actual OrthConnector AST, and runs it independently
of R04 production. No vendor or production source is edited by the diagnostic.

## First incorrect geometric decision and independent corroboration

Source is (338,-71166), fixed on rectangle (-8,-71166,692,1862), EAST-only.
Target is anchor (-15,-70862). R03 selects EAST/NORTH, quadrant 0. Fixed distance
465.85942085569116 exceeds resolved jetty sum 145; the strict fallback is inapplicable.

The source jetty starts at (733,-71166). The selected deployed pattern is
[2114,2561]: NORTH toward the target's north limit, WEST to its attachment x.
The first limit is -70958, south of the current y, so the forward-only NORTH
instruction does not move and removes its provisional corner. WEST then moves
the remaining initial waypoint to (-15,-71166). The resulting first segment
leaves the source WEST, contrary to its selected direction and singleton mask.

The independently extracted native executor produces exactly that intermediate
when supplied R03's required direction/quadrant context. Target attachment
fractions are represented as zero to express the exact anchor without dividing
by its zero extents. This is explicitly an executor-only experiment, not a claim
of end-to-end native parity on the anchor input.

The unmodified full native oracle returns no intermediates for the degenerate
anchor terminal (its zero-extent early return). A separate nondegenerate control
uses target rectangle (-16,-70862,2,2), its fixed top-center at the same point,
and NORTH-only target mask. Native draw.io selects NORTH/NORTH, overriding the
source EAST-only constraint with fixed-side evidence. Its valid orthogonal
geometry is therefore not a permissible replacement for R03's result. Neither
experiment justifies changing the archived direction resolver.

## Why a local patch would silently change the approved contract

The active delta requires exact fixed points, R03 authority and hard direction
membership. Its generated accepted domain includes this case and rejects no
input based on failed output. Design section 3 prescribes forward-only moves,
reference no-movement corner removal and final parity handling. Section 4 and
the strict branch delta allow exterior fallback only for d < sourceJetty+targetJetty;
an ordinary invariant failure is explicitly not an extra trigger.

The implementation is following those mechanical instructions on this input.
An actionable invariant exception prevents returning an invalid route, but it
does not meet the required successful-routing property for the accepted case.
The delta limits strict reference parity to its declared domain; that alone
does not supply the missing construction policy for this inherited R03 adaptation.

Dropping R03 evidence, ignoring the source mask, expanding the fallback trigger,
inventing bends in normalization, or excluding this input would change an
approved contract. Merely preserving the first jetty point is also insufficient:
it leaves a horizontal reversal until an additional transverse segment is defined.
No production patch has been attempted for this defect.

## Proposed planning repair for approval, not an implemented decision

Preserve hard masks, exact attachments and unmodified R01-R03. Define an explicit
ordinary-construction adaptation for direction-constrained cases outside strict
native parity. Planning must specify an input-derived applicability predicate,
how both terminal rays remain protected, bounded connector topology, ordinary
jetty/buffer semantics, deterministic tie ordering, finite arithmetic and evidence.
The d < J fallback rule must stay unchanged unless separately explicitly revised;
a catch-and-detour implementation is not the proposed repair.

For this counterexample a feasible route is
[(338,-71166),(733,-71166),(733,-70958),(-15,-70958),(-15,-70862)].
It retains EAST/NORTH and both fixed endpoints. This is a feasibility witness,
NOT a general algorithm or a new expected-output fixture. The general policy
must also address opposite/same directions, coincidences, zero buffers and
floating endpoints without R05, legacy or renderer dependencies.

After authorization: return to PLANNING; reconcile design/delta/tasks and any
affected master/playbook contract; preserve the current failing regression and
implementation snapshot; obtain independent PRE revalidation and an explicit
new baseline/approval binding before resuming BDD/implementation. Do not simply
move BASE_COMMIT to hide the existing implementation diff.

Until then the approved baseline remains cf424e247490fdfae2c4efc9f7e7377b6d5b6e11,
implementation tests remain FAIL, and no task is newly completed. Production,
tests, frozen planning, earlier layers and process state are unchanged this turn.
Only the three new diagnostic/evidence files were added. No full property,
mutation, Verify, POST, commit, archive or R05 progression is claimed.

## Process checks after recording the evidence

- Installed `pnpm run routing:v2:arch-gate`: PASS; 107 changed paths, 123 V2
  source/test files, HEAD/INDEX/WORKTREE snapshots checked.
- `openspec validate routing-v2-04-orthogonal-router --strict`: PASS.
- `git diff --check`: PASS; Git reported only its existing LF/CRLF notices.
- `git diff --stat` and `git status --short`: inspected. The four tracked
  modifications and previously untracked R04 implementation/tests predate this
  investigation; this turn adds only the three evidence files named above.

These process checks do not override the fresh required regression failure.
