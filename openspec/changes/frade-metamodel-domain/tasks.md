# Tasks

## 1. Package and definition contracts

- [x] 1.1 Add the host-neutral metamodel-domain workspace package and public consumer fixture using existing tool versions; verify install, build and strict consumer typecheck.
- [x] 1.2 Write failing tests, then implement schemaVersion/ID/SemVer validation, model envelopes, diagnostics and safe bounded JSON traversal; verify malformed, duplicate, unknown-field, cyclic and limit cases pass without input mutation.
- [x] 1.3 Add typed lifecycle/UI/import/profile/viewpoint declarations and tests; verify round-trip preservation, invalid lifecycle endpoint rejection and rejection of viewpoint domain overrides.

## 2. Attributes

- [x] 2.1 Write RED tests and implement discriminated schemas and validators for all eleven kinds; verify valid/invalid matrices, calendar dates, timezone-bearing datetimes, enum membership and recursive paths.
- [x] 2.2 Implement independent required/nullability handling, bounds and pure default application; verify missing/null/default truth tables, invalid defaults, absent parent behavior and independent copies.
- [x] 2.3 Add repository-qualified reference value checks with caller-supplied target types; verify exact/subtype success and missing/forbidden target diagnostics without I/O.

## 3. Inheritance and relations

- [x] 3.1 Write RED tests and implement complete-set single-inheritance analysis; verify unknown parents, cycles, identical versus conflicting overrides, abstract instances, inherited lifecycle/attributes and canonical diagnostics.
- [x] 3.2 Define relation schemas and preliminary endpoint eligibility; verify directed/undirected matching, subtype flags, contradictory bounds and symmetric undirected cardinality requirements.
- [x] 3.3 Implement complete prospective-snapshot validation; verify endpoint existence, attributes, self-loops, duplicate IDs/pairs, repository-qualified identity, min/max counts including zero-degree objects, update-once semantics and non-mutation.

## 4. Executable evidence and integration

- [x] 4.1 Port every planned Gherkin scenario into package features and assertion-bearing executable steps; verify all scenarios and every outline row execute, unmapped/ambiguous steps fail, and root test:bdd runs both Draw and metamodel suites.
- [x] 4.2 Pin development-only property-test tooling and add seeded properties for deterministic diagnostics, input purity, default-copy isolation, subtype transitivity and undirected orientation; verify passing runs and record reproducible seed/counterexample evidence.
- [x] 4.3 Extend source/manifest architecture boundaries with negative fixtures and two company vocabulary fixtures; verify the package has no infrastructure/UI production dependency and no hardcoded architecture types.
- [x] 4.4 Document the public API, conservative MVP policies and completeness preconditions; run frozen install, package gates, pnpm check:all and strict OpenSpec validation, record RED/GREEN evidence and unchanged Draw baselines in docs/verification/metamodel-domain.md before marking complete.
