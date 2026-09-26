# Verification Plan

## Planning status

Implementation in progress, 2026-09-24. The expanded plan has 31 tasks. Eight production packages and a bounded native/SQLite/Git/HTTP/Electron/diagram slice now exist. Current executed evidence and uncovered requirements are recorded in `evidence/`; this document retains the original acceptance obligations and does not claim they all pass.

The three feature files parse with the installed Cucumber parser, expand to 112 concrete planned cases and cover all 13 requirement tags. Parsing checks include nonempty Examples, row widths, requirement tags and placeholder expansion. These are planning checks, not passing behavioral tests.

## Requirement traceability

| Requirements      | Planned feature           | Expanded cases | Additional implementation checks                                                                                                                            |
| ----------------- | ------------------------- | -------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RE-1 through RE-3 | features/entities.feature |             27 | Kind-qualified identity, exact budget boundaries, symbol/accessor rejection, complete binding and copy isolation                                            |
| RP-1 through RP-5 | features/sessions.feature |             29 | ES2022 consumer fixtures, cancellation subscription races, late rejections, paged history, optional services, malformed adapter capabilities                |
| RC-1 through RC-5 | features/commands.feature |             56 | Duplicate batch targets, invalid-state repair, full-model validation despite projections, rollback at every adapter commit barrier, outcome lookup failures |

During implementation copy these feature files into repository-application tests, execute every Examples row and await every assertion-bearing step. Runner negative tests must reject unknown children/arguments, missing and ambiguous bindings, unexpanded placeholders and rejected asynchronous assertions. A scenario name or tag alone is not executable evidence.

## TDD and deterministic race tests

Record observed RED before behavior implementation and focused GREEN afterwards. Do not reconstruct a historical RED result from a finished implementation.

Use memory adapters with controlled promise barriers to test open, read, authorize, snapshot, pre-commit guard, persistence and acknowledgement separately. Assert both outcome and actual backing state, writer count, revision changes and subscription cleanup. Include concurrent writers changing different resources to demonstrate the snapshot guard; checking only the target revision is insufficient.

Cancellation before dispatch must prove zero writes. Cancellation or session close after dispatch must preserve the operation ID and never claim rollback. Test authoritative resolution as committed, not-committed, pending and unknown, as well as malformed/rejected lookup results. Identical submissions, record-key reordering, changed payloads and changed expected revisions must exercise deduplication without automatic replay. Secondary-waiter cancellation must not cancel the originating write.

Use exact 1/1000 page and batch boundaries, invalid 0/1001, exact 1024/1025 operation admission, depth 64/65 and 100000/100001 visited values. Adapters reporting a complete snapshot must supply one revision and model binding; ordinary pages must not be silently accepted as that snapshot.

## Property and portability checks

Run five fast-check properties with seed 20260924 and at least 200 runs each: qualified identity injectivity, copy isolation, failed-commit state preservation, successful final-state validity and replay suppression. Save any counterexample and seed in implementation evidence. Use two independent organization vocabularies compiled by the real metamodel compiler.

Consumer fixtures for all packages must compile with ES2022 only and no Node/DOM ambient types. Runtime cancellation adapters are not required. Negative source/manifest tests must reject forbidden host/storage/UI imports, package-private paths, relative escapes and dynamic loading, and enforce the design's dependency matrix and compiler type-only binding import in repository-domain.

## Implementation acceptance commands

- pnpm --filter @frade/repository-domain test
- pnpm --filter @frade/repository-ports test
- pnpm --filter @frade/repository-application test
- pnpm --filter @frade/repository-application test:bdd
- pnpm typecheck
- pnpm test:boundaries
- pnpm check:boundaries
- pnpm test:bdd
- pnpm install --frozen-lockfile
- pnpm format:check
- openspec validate frade-repo-core --strict
- pnpm check:all

## Evidence and completion boundary

During implementation write actual test counts, command outcomes, RED/GREEN examples, property seeds and requirement mappings to `docs/verification/repository-core.md`. Preserve all approved Draw baseline hashes and verify real Electron regressions through the existing complete gate. Report cached versus rerun checks accurately and do not claim remote CI execution.

Native single-file persistence, SQLite, Git, authorized IPC/HTTP and bridge integrations now have executable tests; see `evidence/integration-results.md`. Durable cross-session journals, complete recovery/scaling, full legacy acceptance and a Designer UI are not complete. The new 23 feature files are test-linked rather than the original awaited step harness. Planning completion does not imply implementation completion or authorization to archive.
