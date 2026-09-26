# Tasks

## 1. Planning gate prerequisite

- [ ] 1.1 Before any implementation, parse deltas, run strict OpenSpec validation, execute the already-installed `pnpm run routing:v2:arch-gate` for the planning state, and obtain an independent PRE_IMPLEMENTATION gate PASS; record all four results and verify CURRENT_CHANGE remains PLANNING until they pass. Process repairs do not count as Geometry Kernel implementation or authorize R02.

## 2. Geometry-kernel test foundation

- [ ] 2.1 Add the test-local Vitest configuration and generated helper in the allowed geometry-test tree with seed `0xFAD001`; require at least 5000 executed cases per core property and 5000 accepted conditioned point/transform pairs, report accepted/rejected counts and seed/path/counterexample, and verify commands discover both suites without changing package-wide configuration. Document harness invocation and replay diagnostics with this group.
- [ ] 2.2 Add failing primitive-construction tests for readonly/non-mutating `Point`, `Vector`, `Rect`, and `Segment` behavior; explicitly test rejection of `NaN`, positive `Infinity`, and negative `Infinity`, rejection of negative rectangle width/height, and acceptance of zero width/height; verify failures exist before implementation.
- [ ] 2.3 Add failing numerical-policy tests for `EPSILON = 1e-6`, symmetric coordinate/point approximate equality at and beyond the epsilon boundary, `ROUTE_PRECISION = 0.1`, same-bucket values, opposite sides of a bucket boundary, positive and negative exact half-steps, the required positive/negative examples, negative-zero normalization, zoom independence, negative coordinates, and large finite values; explicitly test `quantizeCoordinate(0.04) = +0` and scalar quantization idempotence separately from structural normalization; verify failures exist before implementation.
- [ ] 2.4 Add failing segment-classification tests and assert `isOrthogonalSegment` is false for ZERO_LENGTH and DIAGONAL, true for non-zero HORIZONTAL and VERTICAL; cover exact Manhattan distance, identical-point zero, approximately equal points up to `2 * EPSILON`, symmetry, and immutable translation formulas with finite-input/output rejection; add the deterministic `A.x=0, B.x=1e-8, delta.x=1e9` cancellation fixture, assert finite IEEE-754 formula outputs without requiring preservation of tiny separation or artificial recovery; verify deterministic failures before implementation.
- [ ] 2.5 Add failing rectangle-relation tests for horizontal/vertical overlap, exact touching, positive gaps within `EPSILON`, separation beyond `EPSILON`, non-negative separation, basic relative scalar/rectangle placement without quadrant policy, and safe integer-lattice common-translation invariance; keep exact touching, within-EPSILON, just-beyond-EPSILON and clearly separated fixtures distinct from metamorphic properties; verify failures exist before implementation.
- [ ] 2.6 Add failing point/vector tests for affine formulas, compile-time coordinate-space separation, vector scaling without translation, invalid scale/translation/offset rejection, non-finite forward/inverse output rejection, and the exact per-coordinate conditioning formula from the delta spec. Assert EPSILON recovery only for conditioned pairs; explicitly classify `x=1, scale=1e-6, translation.x=1e9` as ill-conditioned and test finite one-way execution without strict recovery. Verify A/B/C categories and translation-zero vector conditioning separately.
- [ ] 2.7 Add failing normalization tests for adjacent-duplicate removal, non-adjacent-repeat preservation, horizontal/vertical collinear reduction only when the middle point lies between its neighbors, bend/diagonal preservation, endpoint/order preservation, structural normalization without quantization, and normalization idempotence; explicitly preserve `[(0,0),(1,0.04)]` as DIAGONAL, preserve all coordinates exactly when no point is redundant, and preserve neighboring survivor coordinates after duplicate/collinear removal; verify failures exist before implementation.
- [ ] 2.8 Add all six generated properties from Reproducible generated geometry verification. Construct category A efficiently and verify at least 5000 accepted conditioned point/transform pairs with seed `0xFAD001`, asserting both coordinate errors <= EPSILON and reporting accepted/rejected counts. Test B finite one-way formulas without strict recovery and C deterministic rejection. Use `SAFE_TRANSLATION_COORD_LIMIT = 1_000_000` integer-lattice point/rectangle origins/dimensions and delta coordinates for translation metamorphic properties. Assert exact Manhattan equality, non-degenerate significant segment differences above EPSILON, rectangle gaps zero/overlapping or at least `4 * EPSILON` away from the overlap threshold, and `normalizePointSequence(translate(S,D)) = translate(normalizePointSequence(S),D)`. Keep near-EPSILON boundaries separate, preserve broader non-translation finite domains and transform conditioning, exclude overflow, and verify replay from seed/path/counterexample.
- [ ] 2.9 Add product-local fixtures exercising the already-installed gate checker for framework, browser/timing/display state, higher-layer, package-root, persistence/document, and legacy dependencies; verify forbidden cases fail and `tests -> geometry -> model` cases pass without changing the gate script.

## 3. Dependency-free V2 routing model

- [ ] 3.1 Implement readonly coordinate-space marker types and validated `Point`, `Vector`, `Rect`, and `Segment` factories under `packages/draw/src/routing/model/`; verify finite-value, rectangle-validity, and non-mutation tests pass.
- [ ] 3.2 Implement the cardinal `Direction`, axis `Orientation`, and explicit `ZERO_LENGTH | HORIZONTAL | VERTICAL | DIAGONAL` classification result vocabulary without a geometry-to-model dependency; verify typecheck and vocabulary tests pass.
- [ ] 3.3 Add directory-local model exports without changing package-root exports, importing legacy types, or adding converters; document canonical V2 type ownership, readonly fields, and space types within the allowed test tree; verify typecheck and direct V2-value construction tests pass.

## 4. Numerical policy and geometry predicates

- [ ] 4.1 Implement validation, `EPSILON`, coordinate/point equality, and `ROUTE_PRECISION` quantization with half-away-from-zero ties and positive-zero normalization in the allowed geometry tree; document numerical API examples near its tests and expose opt-in `quantizeCoordinate(value)` and verify scalar-idempotence/policy/error tests identify operation and offending field/result without implicit arithmetic or point-sequence quantization.
- [ ] 4.2 Implement non-repairing segment classification, orthogonality, exact Manhattan distance, and non-mutating point/segment translation; verify zero-length, diagonal, distance, symmetry, finite-result rejection, safe-domain invariance, and excluded-domain cancellation tests pass without artificial separation recovery.
- [ ] 4.3 Implement rectangle edges, axis overlap, non-negative separation, relative placement predicates, and rectangle translation with exact/within-`EPSILON` touching treated as overlap and larger gaps returned as positive separation; verify rectangle validity and relation tests pass.

## 5. Coordinate transforms and normalization primitives

- [ ] 5.1 Implement pure point/vector transforms and conditioning evaluation only inside the allowed geometry tree. Separate structural validity, finite execution, and EPSILON conditioning; ill-conditioning alone must not reject finite one-way conversion. Verify formulas, A/B/C cases, explicit ill-conditioned input, and conditioned round-trip tests pass without rotation, matrices, or display-state reads; document these API semantics with this group.
- [ ] 5.2 Implement adjacent duplicate reduction that preserves order, endpoints, and non-adjacent repeats; verify duplicate-reduction and idempotence tests pass.
- [ ] 5.3 Implement between-aware orthogonal collinear reduction and composed structural point-sequence normalization without adding bends, repairing diagonals, importing legacy normalization, or invoking scalar quantization; preserve every surviving original coordinate exactly; verify normalization, endpoint, order, bend, and diagonal-preservation tests pass.
- [ ] 5.4 Run all six core properties with seed `0xFAD001`; verify at least 5000 executed cases per property and at least 5000 accepted conditioned transform pairs, with B/C separately checked and accepted/rejected counts recorded. Retain discovered seed/path/counterexamples as regression fixtures inside the allowed test tree.

## 6. Post-implementation evidence

- [ ] 6.1 Execute the already-installed `pnpm run routing:v2:arch-gate`, require PASS, and record dependency/scope/isolation evidence; run product-local fixtures against the installed checker. Do not modify `scripts/routing-v2-architecture-gate.mjs` as an R01 product task: improvements belong to process/control repair before implementation.
- [ ] 6.2 Verify the commands documented with groups 2-5 for unit/property tests, typecheck, applicable lint, and architecture evidence all run from the repository root; record integration results without moving earlier groups' test/documentation work into this final group.
- [ ] 6.3 Run the R01 unit tests, generated-property tests, affected Draw typecheck, applicable lint, and `routing:v2:arch-gate`; record exact commands and require every result to PASS without modifying legacy tests or package-wide behavior.
- [ ] 6.4 Run OpenSpec verification for `routing-v2-01-geometry-kernel`; resolve every correctness, architecture, missing-test, and incomplete-requirement finding and require `openspec verify` to PASS.
- [ ] 6.5 Obtain an independent post-implementation Architecture Gate PASS after all preceding implementation evidence is green; do not archive or begin R02 from this task.

## Requirement/task traceability

Requirement names below refer to `specs/routing-geometry-kernel/spec.md`. Groups 1 and 6 are process prerequisites/integration evidence; they never expand product scope. All behavior stays within R01 and all architecture-script improvements are completed as control work before implementation.

| Delta requirement | Design decisions | Implementation tasks | Test/evidence tasks |
| --- | --- | --- | --- |
| Finite geometry primitives | 1-4 | 3.1, 3.2, 4.1 | 2.2, 2.3, 6.3 |
| Rectangle primitive validity | 4, 8 | 3.1, 4.3 | 2.2, 2.5 |
| Central numerical tolerance | 5 | 4.1 | 2.3 |
| Canonical routing precision | 5, 9 | 4.1 | 2.3 |
| Segment orientation classification | 3, 7 | 3.2, 4.2 | 2.4 |
| Orthogonality predicate | 7 | 4.2 | 2.4 |
| Manhattan distance | 7, 8a | 4.2 | 2.4, 2.8, 5.4 |
| Geometry translation | 7, 8a | 4.2, 4.3 | 2.4, 2.5, 2.8 |
| Rectangle relation primitives | 8, 8a | 4.3 | 2.5, 2.8 |
| Explicit coordinate spaces | 6 | 3.1, 5.1 | 2.6, 2.8, 5.4 |
| Vector coordinate transformations | 6 | 5.1 | 2.6 |
| Adjacent duplicate point reduction | 9 | 5.2 | 2.7, 2.8 |
| Collinear point reduction | 9 | 5.3 | 2.7 |
| Geometry normalization idempotence | 9 | 5.3 | 2.7, 2.8, 5.4 |
| Deterministic geometry operations | 3, 10 | 4.1-4.3, 5.1-5.3 | 2.8, 5.4 |
| Geometry kernel scope boundary | 1-4, 10 | 3.1-3.3, 4.1-4.3, 5.1-5.3 | 2.9, 6.1, 6.3 |
| Reproducible generated geometry verification | 8a, 10 | 2.1, 2.8, 5.4 | 2.6, 2.8, 5.4, 6.3 |
