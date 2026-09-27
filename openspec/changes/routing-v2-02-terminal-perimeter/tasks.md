# Tasks

All tasks remain unchecked during PLANNING. Implementation starts only after an independent Pre-Implementation Gate PASS, an approved planning commit, and an explicit phase transition. No archive or R03 implementation belongs to this checklist. Never repair frozen controls while implementing.

## 1. Confirm approved scope and executable test discovery

- [x] 1.1 Confirm CURRENT_CHANGE is R02 IMPLEMENTATION with PRE_IMPLEMENTATION_GATE PASS, BASE_COMMIT equal to APPROVED_PLANNING_COMMIT, both pinned to the accepted R02 planning commit; verify node scripts/routing-v2-architecture-gate.mjs --self-test and pnpm run routing:v2:arch-gate pass before touching product files. STOP on missing approval, frozen-control conflicts, or R01_EXTENSION_REQUIRED.
- [x] 1.2 Add isolated Node Vitest discovery under tests/routing-v2/terminal/ covering terminal/** and perimeter/**, and a strict ES2022 no-DOM compiler config under terminal/types including both trees; document exact commands in the test-local README and verify real unit and *.type-test.ts discovery without changing package/R01 configs.

## 2. Domain vocabulary and coordinate-space contracts — tests first

- [x] 2.1 Write terminal model/contract unit cases before implementations: default floating, fixed/anchor identity, [0,1] affine fractions, perimeter flag, shared axis-aligned bounds, malformed fields, readonly/frozen inputs, all 15 non-empty masks, ALL default and precedence; observe failing new tests or missing exports and retain that evidence.
- [x] 2.2 Implement terminal bindings, connection constraints, DirectionMask/PortConstraint data, terminal geometry, center derivation and effective-mask access under terminal/ with perimeter descriptors under perimeter/; document data-only ownership locally and pass task 2.1 cases without direction selection, new R01 primitives or root exports.
- [x] 2.3 Add actual strict compiler fixtures for same-space geometry/binding/anchor construction, generic callers, readonly fields, all mixed-space pairs and implicit union widening, using @ts-expect-error; verify fixtures fail if their space guard is removed and run tsc rather than relying on Vitest.
- [x] 2.4 Complete invariant terminal-space ownership and inference control for these domain APIs; verify task 2.3 with pnpm --filter @frade/draw exec tsc --project tests/routing-v2/terminal/types/tsconfig.json --noEmit and no @ts-ignore/@ts-nocheck or space-erasing casts.

## 3. Perimeter validation and generated evidence harness — tests first

- [x] 3.1 Write invalid/degenerate and numerical membership tests plus seed 0xFAD002 property support under approved test trees: all non-finite numeric partitions, negative dimensions, zero extents, overflow/collapsed-center/half-radius cases, malformed hint/kind, exact inclusive EPSILON membership and sub-EPSILON positive dimensions; assert conditioned integer-domain predicates and replay/count reporting before perimeter implementation.
- [x] 3.2 Implement the pure perimeter type contract and local validation/membership helpers under perimeter/, reusing R01 EPSILON/validators/rectEdges; pass task 3.1 helper tests with actionable RangeError/TypeError fields. Concrete shape calls/dispatch arrive in groups 4/5 after their tests; do not create unfinished production stubs or silent fallback.
- [x] 3.3 Document semantic bounds versus derived centers/edges and numerical rejection in test-local README; verify documentation agrees with the delta and generator exclusions are separately counted rather than replacing deterministic invalid/boundary fixtures.

## 4. Rectangle perimeter — analytical and generated tests first

- [x] 4.1 Before rectangle implementation add deterministic radial/orthogonal tables for all delta scenarios, four cardinal approaches/corner ties, arbitrary diagonal, horizontal/vertical alignment, inside/boundary/center and EPSILON center threshold, exact bands, both hints, degeneracy/error partitions and 5.04 precision; add boundary, safe-translation, deterministic and frozen-input properties and strict mixed-space API fixtures, then observe failures.
- [x] 4.2 Implement stateless rectangle projection under perimeter/ using the delta ray formula, exact selected edge/tie rule and explicit orthogonal bands; document corner fallback versus route-level perpendicularity and pass focused rectangle tests, the task 4.1 properties and strict compiler fixtures. Do not build route segments or quantize.

## 5. Ellipse perimeter — analytical and generated tests first

- [x] 5.1 Before ellipse implementation add cardinal/diagonal analytical tests, inside/boundary/center and sub-unit parseInt regression, orthogonal horizontal/vertical/outside bands, band endpoints, all degenerate/invalid cases, equation residual, safe translation, deterministic/frozen-input properties and strict mixed-space API fixtures; observe failures without tolerance changes.
- [x] 5.2 Implement stateless ellipse radial and orthogonal formulas under perimeter/, with checked Math.hypot normalization and deliberate center/sign rules; document reference differences and pass focused ellipse tests, properties and strict compiler fixtures while completing shape dispatch and exercising the shared validation from task 3.2.

## 6. Fixed and floating terminal resolution — separate tests first

- [x] 6.1 Before fixed implementation write explicit-anchor, non-projected affine, projected rectangle/ellipse, floating-null, missing-geometry, zero-size projected/non-projected, invalid-field, frozen-input and unrelated-target independence cases; add its determinism/immutability/target-independence properties and actual mixed-space resolver compiler fixtures, then observe failures.
- [x] 6.2 Implement fixed resolution under terminal/ using authoritative binding cases and radial perimeter projection only when enabled; document pre-routing null/result contract, then pass fixed unit/property/compiler evidence without consulting opposite points, route history or direction policy.
- [x] 6.3 Before floating implementation write first/last intermediate selection, empty-list opposite fixed/center references, both-floating call-order independence, source/target reversal, coincident-first-point behavior, explicit/default hint, immutable list, malformed-side/reference and invalid geometry cases; add reversal, safe translation, determinism/non-mutation properties and full compiler API matrix, then observe failures.
- [x] 6.4 Implement floating resolution under terminal/ with explicit adjacency and pre-floating opposite-reference snapshot; document caller responsibilities and fixed-result bypass, then pass floating unit/property/compiler tests without normalizing incoming points, generating bends, selecting directions or using the just-resolved opposite endpoint.

## 7. Property, compiler and architecture evidence integration

- [x] 7.1 Audit and execute the properties added before their respective implementations: rectangle membership, ellipse equation, source/target reversal, safe translation, determinism, non-mutation and fixed target-independence; verify >=5000 accepted cases EACH, seed 0xFAD002, raw/accepted/rejected totals, replay paths and concrete counterexamples, and preserve any reproduced failure as a deterministic fixture before fixing.
- [x] 7.2 Add executable test-local import/dependency fixtures using the already-installed process checker; verify inward imports pass and reverse/framework/browser/legacy/vendor/root/higher-layer imports fail. Rerun the complete strict compiler matrix, including generic/union-widening/result-space cases and explicit R01 transforms, with real tsc.
- [x] 7.3 Run complete R02 unit and property suites, including all independent deterministic boundary fixtures and mutation checks; verify no skipped/focused tests, snapshots as primary proof, suppressed compiler errors, weak placeholders, changed tolerances or accidental rejection of accepted generated domains.
- [x] 7.4 Run installed gate self-tests and pnpm run routing:v2:arch-gate, inspect git status/diff against the approved R02 planning baseline, and verify all product paths are in the four R02 trees with no archived R01/legacy/vendor/root-export edits. Do not modify the frozen script to obtain PASS.

## 8. Final integration verification and independent gate evidence

- [x] 8.1 Run full R02 tests and unchanged R01 unit/property suites plus isolated R01/R02 compiler fixtures, @frade/draw typecheck and scoped lint using the commands below; record exact executed counts/results and require every check PASS.
- [x] 8.2 Run openspec show routing-v2-02-terminal-perimeter --json --deltas-only, openspec validate routing-v2-02-terminal-perimeter --strict, installed routing:v2:arch-gate, gate self-tests and git diff --check; record PASS and retain the requirement/scenario-to-test evidence map in change-local process evidence.
- [x] 8.3 Obtain OpenSpec implementation verification and a fresh independent POST_IMPLEMENTATION architecture gate against the approved spec/design/tasks, code, diff and tests; require PASS with no correctness/architecture/missing-evidence blockers. STOP and classify failures instead of altering frozen contracts.
- [x] 8.4 Record the independent verification/gate PASS in CURRENT_CHANGE and complete the final evidence task only after actual results exist; keep NEXT_CHANGE_ALLOWED false and leave archive/commit/next-phase operations to separately authorized checkpoints.

## Commands for implementation verification

Run from repository root. The test-local config is created by task 1.2; these are future implementation checks, not planning results.

```text
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/terminal/vitest.config.ts tests/routing-v2/terminal/unit tests/routing-v2/perimeter/unit
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/terminal/vitest.config.ts tests/routing-v2/terminal/property tests/routing-v2/perimeter/property
pnpm --filter @frade/draw exec tsc --project tests/routing-v2/terminal/types/tsconfig.json --noEmit
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/geometry/vitest.config.ts tests/routing-v2/geometry/unit
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/geometry/vitest.config.ts tests/routing-v2/geometry/property
pnpm --filter @frade/draw exec tsc --project tests/routing-v2/geometry/types/tsconfig.json --noEmit
pnpm --filter @frade/draw typecheck
pnpm exec eslint packages/draw/src/routing/terminal packages/draw/src/routing/perimeter packages/draw/tests/routing-v2/terminal packages/draw/tests/routing-v2/perimeter
openspec show routing-v2-02-terminal-perimeter --json --deltas-only
openspec validate routing-v2-02-terminal-perimeter --strict
node scripts/routing-v2-architecture-gate.mjs --self-test
pnpm run routing:v2:arch-gate
git diff --check
git status --short
```

Requested routing:v2 currently has no package.json script. The executable installed gate is routing:v2:arch-gate; do not modify package-root scripts during implementation to manufacture an alias. Independent gates must verify reference divergences, numerical conditioning and requirement evidence, not merely OpenSpec syntax.
