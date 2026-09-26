# Metamodel domain verification

Date: 2026-09-23. Change: frade-metamodel-domain.

Status: complete. All 13 implementation tasks verified; change ready for archive.

## Final acceptance

- `pnpm check:all` completed with exit code 0 on Windows.
- 364 package tests passed across the workspace, including 134 new metamodel tests: 74 unit tests, 54 executable Gherkin cases, 1 runner contract test and 5 seeded property tests.
- The dedicated root BDD command passed 3 existing Draw checks and 55 metamodel scenario/runner tests.
- All 7 architecture contract tests passed, including forbidden imports, dynamic loading/execution and production/optional/peer dependency negative fixtures.
- Workspace lint, strict typecheck, consumer typecheck without Node/DOM ambient types, all builds and architecture checks passed.
- Draw Chromium: 214/214 passed (1.5 minutes). Built Electron integration: 1/1 passed (3.2 seconds).
- All 12 Draw PNG baselines match the source checkout hashes. The source checkout was not modified.
- Frozen lockfile installation, strict OpenSpec validation, targeted Prettier and gate-script ESLint checks passed.

The existing Electron test driver's DEP0190/color-environment warnings remain non-failing and unrelated to this domain package. No remote CI run, repository data migration, Git commit or automatic archive is claimed.

## RED → GREEN evidence

- Initial API contract stubs: all 59 behavioral unit tests failed with Not implemented. After implementation all 59 passed.
- Gherkin runner with no bindings: all 54 concrete scenarios failed closed. Real assertion-bearing steps were added; an inheritance case exposed a missing entityId in structural diagnostics, then passed after the fix.
- Robustness regressions: 3 failures covered known entity identification and unsafe local keys; all 7 tests passed after fixes.
- Extra edge cases: custom array prototypes reproduced execution of an overridden map method. The safety guard now rejects those prototypes before copying. Other cases cover strict date/version formats, lifecycle overrides and relation cardinalities.
- Architecture tests failed before the new checker exports existed, then passed with source/manifest constraints and negative fixtures.

## Property evidence

fast-check 4.10.2, seed 20260923, numRuns 200 per property: 1,000 generated checks across five properties (canonical diagnostics, frozen-input purity, independent defaults, subtype transitivity, undirected orientation). No final failing counterexample was produced. Seed and generators are saved under tests/property/invariants.test.ts; the runner prints seed/path/counterexample automatically if a future failure occurs.

## Scope and limitations

Domain operations are independent of Electron and physical storage. Gherkin steps call actual domain operations; this is not a filename/tag coverage map. Imports/profile/viewpoint declarations are preserved but no compiler or publication is implemented. Final relation checking depends on a complete caller-supplied prospective snapshot and does not provide repository concurrency guarantees. Existing Draw/Electron tests are regression gates, not evidence of a desktop metamodel UI.
