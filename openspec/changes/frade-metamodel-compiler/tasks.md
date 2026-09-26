# Tasks

## 1. Package and executable acceptance harness

- [x] 1.1 Scaffold @frade/metamodel-compiler with strict ES2022-only public/consumer contracts, domain-only production dependency and existing pinned test tools; verify build, consumer typecheck and frozen installation after lockfile update.
- [x] 1.2 Copy the three planning feature files into package tests/features and implement an awaited Gherkin runner with real step assertions; record RED for unimplemented behavior and verify missing/ambiguous bindings, unexpanded rows and rejected async steps fail.

## 2. Source composition

- [x] 2.1 Implement bounded envelope/JSON/lock structural decoding and diagnostic types without changing ModelDefinition; verify MC-1 RED -> GREEN plus accessor, prototype, cycle, sparse-array, depth, text-size and value-budget tests.
- [x] 2.2 Implement exact import graph loading, per-run deduplication, provenance and canonical diagnostics; verify MC-2/MC-5 RED -> GREEN including diamond load count, all graph errors, sanitized exceptions and aggregate/graph budget boundaries.
- [x] 2.3 Compose unextended definitions through analyzeModel and preserve provenance; verify imported inheritance succeeds, duplicate entity IDs fail and inherited/reference/default errors retain correct source identity.
- [x] 2.4 Implement additive object/relation extensions and post-merge inheritance analysis; verify MC-3/MC-4 RED -> GREEN for propagation, relation-policy preservation, own/inherited/ancestor-descendant collisions, unrelated targets, invalid defaults and incompatible descendant overrides.

## 3. Projections and reproducible identity

- [x] 3.1 Compile exact profile/viewpoint selections, presentation overlays and projection lookup; verify MP-1 through MP-3 RED -> GREEN, empty/intersected selections, unknown IDs and unchanged full-domain relation validation.
- [x] 3.2 Implement context-aware canonical encoding, source hashes and model fingerprint through the injected SHA-256 port; verify MV-1 RED -> GREEN, standard/Unicode hash vectors, set reordering invariance and ordered-default sensitivity.
- [x] 3.3 Generate and validate exact model locks without I/O; verify MV-2 RED -> GREEN for replay, same-version drift, missing/extra/duplicate entries, wrong root/fingerprint and unsupported formats.

## 4. Publication and model-change review

- [x] 4.1 Implement immutable candidates and atomic latest-started-wins publication; verify MV-3 RED -> GREEN with failure at each stage, controlled overlapping loads including newer failure, and runtime mutation attempts on nested data and map access.
- [x] 4.2 Implement deterministic model impact classification; verify MV-4 RED -> GREEN for added/removed/changed definitions, presentation-only changes, required attributes with defaults and source/version-only changes without compatibility overclaims.
- [x] 4.3 Implement read-only repository preview using the domain snapshot validator and explicit model binding; verify MV-5 RED -> GREEN for removed types, constraints, cross-repository identities, stale binding, absent data and no default materialization or mutation.

## 5. Integration and evidence

- [x] 5.1 Add fast-check properties with seed 20260924 and at least 200 runs each for canonical ordering, purity, result isolation, additive constraint preservation and publication ordering; verify focused tests pass and report seeds/counterexamples.
- [x] 5.2 Extend architecture source/manifest/dynamic-loading negative tests and root BDD integration while retaining domain isolation; verify pnpm test:boundaries, pnpm check:boundaries and pnpm test:bdd include compiler and fail deliberate forbidden-import fixtures.
- [x] 5.3 Document public API, two organization examples, port conformance, limits, lock/preview semantics and deferred host/repository responsibilities; typecheck the examples and verify all requirements map to executable tests in the evidence report.
- [x] 5.4 Run strict OpenSpec validation, frozen install, formatting and pnpm check:all; record actual RED/GREEN, unit/BDD/property/consumer/boundary/browser/Electron results in docs/verification/metamodel-compiler.md, with unchanged visual baselines and no claim of remote CI or repository migration execution.

Verification note (2026-09-24): the user authorized formatting the whole workspace. Workspace-wide format:check and final Prettier debug-check passed; check:all, strict validation and frozen installation passed again. All 12 visual baseline hashes remain unchanged. Formatting hold resolved; all tasks complete.
