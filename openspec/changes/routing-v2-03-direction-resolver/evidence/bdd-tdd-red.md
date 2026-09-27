# R03 BDD/TDD startup evidence

Change: `routing-v2-03-direction-resolver`

## Scope and current RED

Test implementation changes are confined to `packages/draw/tests/routing-v2/direction/**`; process evidence/task state was updated under the authorized R03 change and CURRENT_CHANGE paths. No production source was created or modified. The approved DirectionResolver entry point is not present yet. Consequently, six behavior-focused unit suites and the property suite stop at module resolution; their scenario assertions/property cases have not executed. The standalone mutation-runner control test does execute and passes. The type fixture is included by its dedicated strict TypeScript config, but `tsc` reports the expected missing module and then unused `@ts-expect-error` directives. This does not yet prove the negative assignability contract. Keep implementation blocked on completing this test-first stage and do not treat these results as behavioral PASS.

Executed evidence:

- `pnpm --filter @frade/draw exec vitest list --filesOnly --config tests/routing-v2/direction/vitest.config.ts` — PASS; discovered 8 test files (7 unit, 1 property).
- `pnpm --filter @frade/draw exec tsc --showConfig -p tests/routing-v2/direction/types/tsconfig.json` — PASS; `space.type-test.ts` is in the compiler file list.
- `pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/direction/vitest.config.ts tests/routing-v2/direction/unit` — RED; 1 test passed (mutation harness self-test), 6 suites could not import `../../../../src/routing/orthogonal/direction`. No behavior assertions in those suites ran.
- `pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/direction/vitest.config.ts tests/routing-v2/direction/property` — RED before collection for the same missing production entry point; 0 property cases executed.
- `pnpm --filter @frade/draw exec tsc --noEmit -p tests/routing-v2/direction/types/tsconfig.json` — RED: missing production module, followed by unused expected-error diagnostics caused by unresolved imported types.
- `pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/direction/vitest.config.ts tests/routing-v2/direction/unit/mutation-runner.test.ts` — PASS; 1/1 test. It runs a real isolated Vitest probe that kills the comparator mutant at zero and lets the same mutant survive at one, verifies the loader sentinel, and checks the resulting 50% control score.
- `pnpm exec eslint packages/draw/tests/routing-v2/direction` — PASS.
- `node packages/draw/tests/routing-v2/direction/mutation/run.mjs --self-test` — PASS. This checks every declared operator substitution, score and timeout/error classification, lower-layer copies, Windows-safe source redirection, and the known killed/surviving controls. It does not claim an executed production mutation score.
- `node packages/draw/tests/routing-v2/direction/reference/generate.mjs` — PASS twice; each run generated 900 matrix and 9 direct cases from pinned vendor SHA256 `8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d`. Generated fixture SHA256 was identical both times: `951E4030C50C10E9CADED7B09558B55A1189AF16C64CCD6A4EB5F365A7002CBB`.
- `node --check` for reference generator, mutation runner, and resolver plugin — PASS.

Tasks 2.1 and 2.4 are checked for verified discovery/configuration and deterministic independent reference fixtures. Task 2.9 is checked because the isolated harness controls—including real synthetic killed/surviving mutants—passed. Tasks 2.2, 2.3 and 2.5–2.8 remain open: production-dependent assertions and generated R03 properties cannot execute until the approved resolver exists. Full production mutation scoring remains task 4.5.

## Test-only continuation: fixture review and evidence controls

Production remains absent and unchanged. The approved planning baseline/HEAD is
`ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c`.

Corrected new fixture defects against existing contracts, before production:

- R01 non-negative separation returns positive zero within EPSILON; signed gaps remain separate.
- A point in the expanded north/west corner span selects NORTH under the approved Y-over-X rule.
- The unchanged-anchor assertion now includes its 0.5-unit reference-adaptation point.
- Allowed-list membership uses the original source mask instead of a mask built from the candidate itself.
- Non-finite fixed-point fields are injected into a valid point shape so the R03 boundary is exercised, rather than rejected earlier by the R01 constructor.
- The signed-gap overflow case now uses finite edges and finite center differences; it no longer duplicates the center-difference overflow case.
- Point-bounds direction assertions now require EAST/WEST instead of merely checking array length.
- Restored the accidental extra slash in task 2.9 to its approved wording; no task text or criteria changed.

Added three direction-local property-harness controls using the unchanged R02 harness:
accepted/rejected accounting, exact seed/path/concrete-counterexample replay, and
exhaustion rejection. These synthetic controls do not constitute execution of the
six R03 geometry properties. Mutation infrastructure checks now reject missing-module
and loader failures instead of counting them as killed mutants. Default mutation
execution selects only unit/reference tests as planned.

Fresh commands/results:

- Targeted `unit/property-harness.test.ts` + `unit/mutation-runner.test.ts`: PASS, 2 files / 4 tests.
- Complete direction unit suite: 2 files passed / 4 tests passed; 6 behavioral suites RED at missing-module import, with no behavioral assertions executed.
- Direction property suite: RED at missing-module import; 0 generated R03 geometry cases executed.
- Isolated R03 strict compiler fixture: RED, TS2307 plus 8 unused expected-error diagnostics from unresolved types. Negative assignability remains unproved.
- Direction Vitest discovery: PASS, 9 files (8 unit and 1 property).
- Scoped ESLint: PASS. Mutation runner syntax check: PASS.
- Installed frozen architecture gate: PASS; HEAD/INDEX/WORKTREE checked, 22 changed paths, 71 V2 source/test files.
- OpenSpec strict validation: PASS. `git diff --check`: PASS.
- Production direction directory and temporary mutation probe: both absent.

No additional task checkboxes were completed: tasks 2.2–2.3 and 2.5–2.8 retain
their unresolved production-dependent evidence. The next implementation worker
must run these fixtures, preserve their meaningful assertions, and close each task
only from actual evidence. Full production mutation scoring remains unexecuted.
