# Tasks

Change: routing-v2-04-orthogonal-router. Follow design.md and traceability.md.
Planning baseline: 0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4 (R03 CLOSED).
Artifact completeness is not PRE approval. Stop on any required failure; do not
change earlier layers, contract wording or frozen controls to fit implementation.

## 1. Planning controls and approval

- [x] 1.1 Reconcile master section 25, BDD-006, playbook and all R04 artifacts with the user-selected hard-constraint fallback. Preserve the actual reference counterexample and decision record. Verify strict OpenSpec validation, requirement/task coverage and planning-only diff; record results.
- [x] 1.2 Add the exact R04 planning/implementation architecture-gate profile and executable adversarial self-tests before PRE. Enforce the declared roots, earlier-layer read-only boundary, narrow package metadata exception, NUL-safe four-source union, independent HEAD/INDEX/WORKTREE inspection, modes and symlinks, approved fingerprints and frozen controls. Verify cancellation, committed/staged/unstaged/untracked, deletion/recreation, rename old/new, copy destination, unusual filenames and allowed-path controls; record actual assertion count and installed planning-gate PASS. Generic later-change handling is insufficient.
- [x] 1.3 Obtain independent read-only PRE review using evidence/pre-implementation-gate-prompt.md and Astra xhigh. Bind the saved PASS to the exact planning/control fingerprints; verify every required criterion and READY_FOR_IMPLEMENTATION: YES. Do not count this author's planning checks as independent approval.
- [ ] 1.4 Create the explicitly scoped approved planning checkpoint only after 1.3. Record its SHA as APPROVED_PLANNING_COMMIT and BASE_COMMIT, set IMPLEMENTATION and freeze controls. Verify the installed gate against that baseline before authorizing test or production changes; retain the R03 closing SHA as historical planning provenance.

## 2. BDD/TDD before production (Sol high)

- [ ] 2.1 Add R04-local Vitest/strict tsc configuration, direct fast-check 4.10.2 devDependency and only required Draw lock importer changes. Add positive and negative model-space/readonly compiler fixtures and malformed/same-cell input tests. Verify each negative fails for its intended reason through tsc; record the meaningful initial red runtime/compiler results without suppressing missing implementation.
- [ ] 2.2 Add deterministic fixed/floating/anchor orchestration, mask precedence, target-outward convention, copied evidence and numeric input/derived-overflow tests. Cover fixed bypass, common floating snapshot, rectangle/ellipse membership and distinct coincident cells. Verify independent expected geometry and initial failures before production.
- [ ] 2.3 Add jetty precedence/default/auto/marker and zero/sub-EPSILON construction-buffer tests; strict Euclidean below/equal/above-threshold cases with unequal axis deltas. Add the exact NORTH/NORTH counterexample plus all 16 fallback direction pairs, asymmetric/zero/auto minima, coincident exits/full circuits, both candidate validation, tie ranking and unrepresentable expansion. Assert exact first reduction/route and every hard direction/minimum after normalization; record red evidence.
- [ ] 2.4 Build hash-pinned independent reference extraction and at least 64 ordinary direction-pair/quadrant fixtures, plus aligned/overlap/fixed/floating/marker cases. Add direct decoded flag/side/attachment/midpoint, forward/no-op and final-approach cases. Document input-only strict-parity predicates and separately retain reference versus V2 adaptation outputs. Verify oracle independence and expected paths before executing production comparisons.
- [ ] 2.5 Add direct endpoint-preserving duplicate/collinear normalization and idempotence fixtures; add invalid-route validator cases for every applicable invariant with IDs/indices. Include terminal directions lost by reduction, near-equal endpoint representatives and zero/one-point routes. Verify meaningful expected failures and non-mutation before implementation.
- [ ] 2.6 Add independent fast-check generators and replay reporting for every core property and the dedicated fallback property (10000 accepted each, seed 0xFAD004). Audit bounded input/translation conditioning, all 16 fallback pairs, raw/accepted/rejected accounting and shrinking provenance. Verify a deliberately failing property is a failure, not a rejection, and quotas cannot silently under-run; execute initial red properties.
- [ ] 2.7 Add an R04-local mutation harness, structured reporter and hostile classifier controls without importing the executable R03 runner or modifying it. Cover test/suite/module/global unknown kinds with embedded timeout text, complete/partial/sparse audits, spawn ETIMEDOUT, infrastructure precedence, authentic timeout producers and isolated-root domain-origin controls. Verify controls before accepting any kill; specify an independently enumerable AST inventory and auditable child retention.

## 3. Implementation in dependency order (Astra high/xhigh)

- [ ] 3.1 Implement router-local readonly input/result/instruction contracts, checked numeric handling and jetty resolution. Keep public coordinates model-only and dependencies inward. Pass targeted 2.1-2.3 fixtures/typechecks and document option precedence and numeric errors locally.
- [ ] 3.2 Implement endpoint-pinning structural normalization and independent-context invariant validation using unchanged R01/R02 primitives. Pass 2.5 tests, including direct correctness and idempotence, and document invariant IDs and endpoint rules. Do not add a validator-to-router dependency.
- [ ] 3.3 Implement decoded ordinary pattern selection/execution with per-call state, checked limits and reference-compatible final approach. Pass direct 2.4 instruction tests and ordinary parity fixtures; document extraction-to-decoder mapping and input parity domain. Do not call vendor/legacy code in production.
- [ ] 3.4 Implement only the specified R04 exterior fallback: enclosing expanded rectangle, two perimeter traversals, full circuit for equal exits, validation of both candidates and deterministic canonical cost ranking. Pass all 2.3 fallback fixtures and dedicated 2.6 properties; document jetty minima and intentional draw.io divergence. Do not add another fallback trigger or R05 dependency.
- [ ] 3.5 Compose R02 fixed/masks, R03 directions, checked branch selection, ordinary floating resolution, normalization and validation; return independently owned frozen route/evidence. Pass 2.2 orchestration and all applicable 2.4 references/2.6 properties. Document automatic-only API and same-cell/R05+ exclusions; leave package exports and consumers unchanged.

## 4. Complete verification evidence

- [ ] 4.1 Run all R04 unit/reference and property suites, strict compiler fixtures, Draw typecheck and scoped lint. Execute every property quota at its approved seed and retain counts/replay information; report exact commands and results. Do not lower quotas, weaken assertions or reclassify failing outputs as rejected inputs.
- [ ] 4.2 Run passing mutation classifier controls followed by the complete enumerated R04 inventory. Retain child output/audits/hashes, compiler-invalid diagnostics and progress/aggregate consistency; verify score >=90% with all compiler-valid survivors/timeouts in the denominator. Abort infrastructure/unknown failures and repair only within approved scope before restarting a complete run.
- [ ] 4.3 Run unchanged R01-R03 unit/property suites and compiler fixtures plus the existing Draw unit suite. Verify earlier-layer and legacy/vendor hashes/diffs remain unchanged and report every failure; do not modify their fixtures to fit R04.
- [ ] 4.4 Run full architecture-gate self-tests, installed gate, strict OpenSpec validation and diff checks. Independently inspect the four-source changed-path set and source/control snapshots; retain actual counts and baseline. Freeze current source/test hashes and complete traceability evidence before formal Verify.

## 5. Sequential lifecycle checkpoints

- [ ] 5.1 Set VERIFICATION and perform formal OpenSpec Verify against the frozen completed source/test snapshot, all delta scenarios and retained test/mutation evidence. Resolve every correctness blocker or required evidence gap before independent POST; record the actual report without claiming POST approval.
- [ ] 5.2 Obtain fresh independent read-only POST (Astra xhigh) after 5.1; require unambiguous PASS, no blockers and auditable gate/reference/property/mutation integrity. Preserve the review; do not modify production during the review.
- [ ] 5.3 Record final verification/PASS process-state and explicitly scoped implementation commit after 5.2. Verify staged scope, strict validation, installed gate and diff checks; retain the commit SHA and unchanged approved planning BASE_COMMIT. No archive before this checkpoint.
- [ ] 5.4 Sync/archive this completed change only after 5.3, validate all specs strictly and inspect status/diff. Commit archive separately, then record CLOSED and a separate closure commit. Retain implementation/archive/closure SHAs and stop; do not start R05 automatically.

## Planned command entry points

Paths/configurations below are to be created by the approved BDD/TDD tasks, not
commands claimed to have run during planning. Run from repository root:

```powershell
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/orthogonal/vitest.config.ts tests/routing-v2/orthogonal/unit tests/routing-v2/orthogonal/reference
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/orthogonal/vitest.config.ts tests/routing-v2/orthogonal/property
pnpm --filter @frade/draw exec tsc --noEmit -p tests/routing-v2/orthogonal/types/tsconfig.json
pnpm --filter @frade/draw typecheck
pnpm exec eslint packages/draw/src/routing/orthogonal/router packages/draw/src/routing/normalization packages/draw/src/routing/validation packages/draw/tests/routing-v2/orthogonal
node packages/draw/tests/routing-v2/orthogonal/mutation/run.mjs --self-test
node packages/draw/tests/routing-v2/orthogonal/mutation/run.mjs
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/geometry/vitest.config.ts
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/terminal/vitest.config.ts
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/direction/vitest.config.ts
pnpm --filter @frade/draw exec tsc --noEmit -p tests/routing-v2/geometry/types/tsconfig.json
pnpm --filter @frade/draw exec tsc --noEmit -p tests/routing-v2/terminal/types/tsconfig.json
pnpm --filter @frade/draw exec tsc --noEmit -p tests/routing-v2/direction/types/tsconfig.json
pnpm --filter @frade/draw test
node scripts/routing-v2-architecture-gate.mjs --self-test
pnpm run routing:v2:arch-gate
openspec validate routing-v2-04-orthogonal-router --strict
git diff --check
```

The R02 terminal configuration also includes perimeter tests. Confirm config
discovery and existing compiler entry points from disk when executing; retain
the actual commands. The installed R04 gate is meaningful only after task 1.2.
