# Verification Plan

## Planning status

Planning only, 2026-09-24. No compiler production code, runtime step bindings or behavioral test results exist as part of this change yet. All 16 implementation tasks remain unchecked.

Planning checks performed: strict OpenSpec validation; Markdown formatting; actual Cucumber parsing with Examples expansion and requirement-tag checks. The three feature files contain 99 planned concrete cases covering all 13 requirement IDs. Syntax/tag validation is not execution evidence.

## Requirement traceability

| Requirements      | Planned feature              | Cases in file | Additional verification                                                                                                                   |
| ----------------- | ---------------------------- | ------------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| MC-1 through MC-5 | features/compilation.feature |            44 | Exact budget boundaries, sparse arrays, aggregate input limits, source provenance, extension collision permutations                       |
| MP-1 through MP-3 | features/projections.feature |            12 | Full-model relation validation after hidden endpoints, no inferred authorization, presentation isolation                                  |
| MV-1 through MV-5 | features/publication.feature |            43 | SHA-256/Unicode conformance vectors, deferred-promise races, source-only impact, all lock fields, cross-repository diagnostic attribution |

The implementation runner must execute every expanded row, await every step and perform assertions against actual public compiler/domain operations. Tags or fixture names alone are not tests. Add runner negative tests for missing/ambiguous bindings, rejected async steps, unknown arguments/children and unexpanded placeholders.

## TDD and property evidence

For each behavior task, first record the expected failing test, then its passing implementation and focused regressions. Do not fabricate a historical RED result after implementing behavior.

Run five fixed-seed fast-check properties (seed 20260924, at least 200 runs each): declaration-permutation identity, source purity, published-result isolation, additive preservation of original constraints, and latest-started publication ordering. Use bounded generated fixtures and controlled promise completion. Preserve any counterexample and seed in the final evidence.

Exercise exact maximum and maximum-plus-one cases for text, source depth/values, package/edge/depth counts and aggregate values, plus flattened analysis limits. Large tests must fail with diagnostics instead of overflowing the call stack or returning truncated data.

## Integration commands

After implementation:

- pnpm --filter @frade/metamodel-compiler test
- pnpm --filter @frade/metamodel-compiler test:bdd
- pnpm --filter @frade/metamodel-compiler typecheck
- pnpm --filter @frade/metamodel-compiler build
- pnpm test:boundaries
- pnpm check:boundaries
- pnpm test:bdd
- pnpm install --frozen-lockfile
- pnpm format:check
- openspec validate frade-metamodel-compiler --strict
- pnpm check:all

Source/manifest negative fixtures must reject forbidden Node, UI, Electron, runtime, storage and dynamic-loading dependencies in the compiler while allowing only the public domain package. The domain package must remain dependency-free. The consumer fixture must compile without Node or DOM ambient libraries.

## Evidence and completion boundary

Save actual command outcomes, test counts, RED/GREEN examples and property seeds to docs/verification/metamodel-compiler.md during implementation. Preserve existing Draw visual baselines and real Electron behavior. Do not claim remote CI was run unless observed.

Host YAML/I/O, production SHA-256 adapters, on-disk model locks, permission enforcement, transactional repository model adoption, migration execution and UI integration are future work, not passing checks here. Preview validity applies only to the complete snapshot explicitly supplied by the caller.

Do not archive this change merely because planning is complete. Implementation, verification and separate archive authorization are still required.
