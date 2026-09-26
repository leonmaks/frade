# Metamodel Compiler Verification

Date: 2026-09-24. Change: frade-metamodel-compiler.

Status: complete; all 16/16 OpenSpec tasks verified. The user authorized workspace-wide formatting on 2026-09-24; the formatting hold is resolved. Ready for a separately authorized archive.

## Verification evidence

- Initial RED: seven public API acceptance tests failed against explicit not-implemented stubs.
- Initial BDD RED: 99 planned cases failed due to missing bindings; runner negative contract passed.
- GREEN: all 99 BDD cases now execute real compiler/domain assertions, with one runner contract test.
- Reproduced RED then fixed: explicit null extensions accepted; profile/viewpoint presentation changes misclassified; equivalent relation declarations published in different orders despite equal fingerprints.
- Package suite: 131 passing tests (7 acceptance, 17 robustness, 2 determinism, 100 BDD/runner, 5 property tests).
- Properties: seed 20260924, 200 runs each; order determinism, source purity, data isolation, additive preservation and publication generations.
- Build and typecheck passed with ES2022-only consumer contracts.
- Architecture RED: new boundary tests failed before checker exports were implemented. GREEN: all 10 root contract tests passed.
- Root BDD: 158 passing tests (Draw 3, domain 55, compiler 100).
- Package installation including updated workspace lockfile passed in frozen/offline mode.

## Full workspace regression

- pnpm check:all completed with exit code 0 on Windows: lint, strict typecheck, tests, BDD, architecture checks, builds, Chromium and real Electron integration.
- Workspace package tests: 495 passed, including 131 compiler tests. Verification was repeated after workspace-wide formatting: affected Draw and desktop checks reran, while unchanged packages reused valid Turbo cache results. Dedicated BDD checks ran again.
- Draw Chromium after formatting: 214/214 passed (1.5 minutes). Built Electron integration: 1/1 passed (3.2 seconds).
- All 12 Draw PNG baselines match SHA-256 hashes in the untouched source checkout.
- The two organization examples typecheck through the ES2022-only consumer fixture.
- Strict OpenSpec validation, frozen/offline installation, changed root-script ESLint, workspace-wide Prettier format:check and final debug-check passed.
- Existing Electron-driver DEP0190/color-environment warnings remain non-failing.

## Workspace formatting completed

The initial workspace-wide pnpm format:check reported 103 existing files outside the compiler change. A later check also included two additional root documents, bringing the list to 105. The user explicitly authorized formatting the whole project; pnpm exec prettier --write . was applied with the existing configuration and ignore rules, without suppressing any checks.

Prettier's initial debug-check detected non-idempotent line wrapping in three files: routeSnapshot.ts, visual/api.ts and document-roundtrip.spec.ts. In-memory formatting converged after two passes; TypeScript syntax-tree comparisons confirmed that the original and final code structures were equivalent. Two mechanical formatting passes resolved those cases. The final workspace-wide format:check and debug-check both passed. No formatter configuration or ignore rules were changed, and no functional code edits were made in this formatting step.

Task 5.4 is complete with no outstanding formatting exception. No remote CI or archive execution is claimed.

## Requirement traceability

| Requirement              | Executed feature/tests                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| MC-1 bounded decode      | compilation.feature; robustness exact text/depth/value bounds and unsafe inputs                   |
| MC-2 exact imports       | compilation.feature; package/edge/depth exact-bound and aggregate-budget robustness tests         |
| MC-3 additive extensions | compilation.feature; transitive collision robustness; constraint-preservation property            |
| MC-4 complete semantics  | compilation.feature; imported inheritance and incompatible descendant/default/reference checks    |
| MC-5 structured failure  | compilation.feature; sanitized loader/hash errors and canonical semantic diagnostics              |
| MP-1 profiles            | projections.feature exact/empty selections and unknown type checks                                |
| MP-2 viewpoints          | projections.feature overlays, invalid presentation and full-model relation/cardinality assertions |
| MP-3 projection lookup   | projections.feature selector cases and mutation isolation                                         |
| MV-1 canonical identity  | publication.feature; determinism tests; UTF-8 hash vectors; reorder property                      |
| MV-2 locks               | publication.feature replay/tamper cases; async lock-copy robustness                               |
| MV-3 publication         | publication.feature failure stages/races/mutations; generated completion-order property           |
| MV-4 impact              | publication.feature; presentation regression and schema-like default value tests                  |
| MV-5 preview             | publication.feature; same-local-ID cross-repository and object/relation collision tests           |

## Boundaries

The compiler is not connected to desktop UI or repository I/O. Loader and SHA-256 ports are injected; known vectors verify the test host implementation. A lock is a DTO, not an on-disk file or publisher signature. Repository preview uses caller-supplied complete state, does not mutate/default-fill it, and cannot prove freshness or permissions.

The separate source checkout at E:/dev/codex/frade-draw, browser baselines and repository objects were not changed. Draw files inside this monorepo received only the user-authorized mechanical formatting. Archive and remote CI have not been run.
