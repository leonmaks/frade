# Tasks

All product tasks below are blocked until 1.2 and 1.3 complete. During current PLANNING only process artifacts and installed gate/self-tests may change. Do not infer PASS from checkboxes; attach actual command evidence. Do not archive until independent POST PASS and successful OpenSpec Verify.

## 1. Approved planning checkpoint

- [x] 1.1 Confirm coherent proposal/spec/design/traceability and run strict validation, gate self-tests and installed PLANNING gate; record actual outputs in evidence/planning-validation.md and evidence/process-control-repair.md plus evidence/approval-binding-repair.md, with no product source/test writes.
- [x] 1.2 Obtain independent PRE_IMPLEMENTATION PASS in fresh read-only GPT-6 Astra high review using evidence/pre-implementation-gate-prompt.md; persist the actual blocker-free report and reviewer-provided artifact fingerprint in the linked review JSON by extracting the exact saved report fingerprint (never by regenerating hashes after review), then update approval metadata only; never synthesize an independent PASS.
- [x] 1.3 Commit explicit approved planning/control paths, save SHA as APPROVED_PLANNING_COMMIT and BASE_COMMIT, transition to IMPLEMENTATION with frozen controls and run the installed gate; verify PASS and SHA equality before product work.

## 2. Regression and specification tests before implementation

- [x] 2.1 Add direction-local Node Vitest configuration and strict compiler-fixture configuration under the permitted test tree; verify explicit discovery and tsc inclusion by listing selected tests/files.
- [x] 2.2 Add contract/type and invalid-input fixtures for masks, null/options, every non-finite input/derived overflow, negative/zero extents, same-space generic calls, mixed/widened aliases and readonly evidence; record expected compiler/test failures before implementation.
- [x] 2.3 Add deterministic relative-geometry fixtures for four quadrants, each axis/coincident-center tie, touching/overlap/containment, differing sizes, +/-EPSILON boundary partitions, sub-grid values and cancellation; verify exact expected geometry evidence and record RED.
- [x] 2.4 Build and document the independent pinned-reference fixture generator and 900 quadrant/mask expectations before V2 production logic; verify source SHA/markers, no V2 helper dependency, reproducible generation and explicit reference domain/adaptation notes.
- [x] 2.5 Add exhaustive per-case expected-pair and membership assertions over all 900 combinations plus single-axis/overlap/asymmetric/reverse-role reference fixtures; record RED without weakening expected results.
- [x] 2.6 Add direct fixed-source/fixed-target/both fixtures for midpoints, corners, interior, out-of-span, ellipse-like diagonal points, degenerate bounds, EPSILON edges, FINAL singleton override (not an early fixed lock), paired-row regression and disallowed fixed-side filtering; record RED and unchanged-point assertions.
- [x] 2.7 Add evidence consistency, deep-frozen-input, output ownership, unrelated-call determinism and no-route-output fixtures; record RED.
- [x] 2.8 Add the six core generated properties and deterministic excluded-tie fixtures using the unchanged R02 runConditionedProperty harness with explicit seed 0xFAD003 and the specified safe/reflectable generators; verify accepted/rejected accounting, concrete failure replay and RED before implementation.

- [x] 2.9 Add the dependency-free test-local mutation runner, isolated source tree and import-redirection controls; verify known killed/surviving mutations, complete operator inventory, score, timeout/error behavior and no real production edits.

## 3. Pure direction implementation and direct validation

- [x] 3.1 Implement directory-local space-safe contracts and boundary validation using R01/R02 vocabulary without earlier-layer edits; make 2.2 targeted runtime/compiler fixtures PASS and document public input/errors locally.
- [x] 3.2 Implement quadrant and signed/non-negative relation evidence with the approved EPSILON policy, finite-result validation and no quantization; make 2.3 targeted fixtures PASS.
- [x] 3.3 Implement fixed-side evidence, ordered preferences, complete mask filtering and explicit tie precedence without route construction; make 2.5/2.6 and reference/adaptation assertions PASS.
- [x] 3.4 Assemble independently owned readonly results/evidence and directory-local exports; make 2.7/2.8 and compiler fixtures PASS, and document symmetry domains/API examples under the new production directory.
- [x] 3.5 Verify direction imports only inward/within its subtree, no earlier-layer edits or package-root exports and no route/jetty/framework/legacy responsibility; run the frozen installed gate and require PASS without changing it.

## 4. Integration verification evidence

- [x] 4.1 Run all R03 targeted and complete unit/reference fixtures via the direction-local Vitest config; record exact file/test and 900 logical-case counts with no skips/focus.
- [x] 4.2 Execute isolated R03 compiler fixtures, unchanged R01/R02 compiler fixtures, full @frade/draw typecheck and scoped ESLint; record actual PASS commands/results without TypeScript suppression or tolerance changes.
- [x] 4.3 Execute all R03 properties with >=5000 accepted cases per property and all unchanged R01/R02 unit/property regressions; record seed, per-property attempted/accepted/rejected counts, replay paths and any retained counterexamples.
- [x] 4.4 Run frozen machine gate, strict change validation, git diff --check and status; record exact baseline and independent discovery/snapshot coverage, confirm all changed paths are authorized and earlier dependencies untouched.

- [x] 4.5 Execute node packages/draw/tests/routing-v2/direction/mutation/run.mjs against the passing unit/reference suite; record every mutant and aggregate score >=90%, including compiler-invalid and timeout counts. STOP on a lower score or harness error; never omit surviving mutants to meet the target.

## 5. Formal review, commit and archive checkpoints

- [x] 5.1 Mark IMPLEMENTATION complete only from evidence, transition to VERIFICATION and freeze production; run openspec-verify-change and resolve every required correctness/evidence gap before continuing, retaining the approved baseline.
- [x] 5.2 Obtain fresh independent POST_IMPLEMENTATION PASS after OpenSpec Verify; record actual review evidence and archive permission, without treating the machine PASS as independent approval.
- [x] 5.3 Reconcile final tasks/process evidence and explicitly stage authorized implementation/process paths; run process checks and staged diff checks, commit implementation and save SHA.
- [ ] 5.4 Archive only after required permission/PASS, verify main capability sync and openspec validate --all --strict plus diff/status checks; commit archive separately, then CLOSED transition separately, and STOP before R04.

## Command plan

From repository root (commands for prospective test files execute only after implementation authorization):

```powershell
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/direction/vitest.config.ts tests/routing-v2/direction/unit
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/direction/vitest.config.ts tests/routing-v2/direction/property
pnpm --filter @frade/draw exec tsc --noEmit -p tests/routing-v2/direction/types/tsconfig.json
pnpm --filter @frade/draw exec tsc --noEmit -p tests/routing-v2/geometry/types/tsconfig.json
pnpm --filter @frade/draw exec tsc --noEmit -p tests/routing-v2/terminal/types/tsconfig.json
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/geometry/vitest.config.ts
pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/terminal/vitest.config.ts
pnpm --filter @frade/draw typecheck
pnpm exec eslint packages/draw/src/routing/orthogonal/direction packages/draw/tests/routing-v2/direction
node packages/draw/tests/routing-v2/direction/mutation/run.mjs
node scripts/routing-v2-architecture-gate.mjs --self-test
pnpm run routing:v2:arch-gate
openspec validate routing-v2-03-direction-resolver --strict
git diff --check
git status --short
```

R03 test config must discover every declared unit/reference/property test. The test-local reference generator command and fixture provenance must be documented in 2.4; generation never modifies vendor files or rewrites expected values to current V2 output.
