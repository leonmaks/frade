STATUS: HISTORICAL_SUPERSEDED
SOURCE_STASH: 150af0254bd68cdb9f8c6d93f5b29d5d039b7215

Retained for historical traceability/TDD evidence. Old PASS, baseline and
archive claims do not authorize the current transition or complete tasks 8.3/8.4.

# R02 implementation test results

## Task 8.1 integration verification

Executed from the repository root:

| Command | Result |
| --- | --- |
| `pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/terminal/vitest.config.ts tests/routing-v2/terminal/unit tests/routing-v2/perimeter/unit` | PASS — 9 files, 110 tests |
| `pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/terminal/vitest.config.ts tests/routing-v2/terminal/property tests/routing-v2/perimeter/property` | PASS — 4 files, 12 properties; every property accepted 5000 cases with seed `0xFAD002` |
| `pnpm --filter @frade/draw exec tsc --project tests/routing-v2/terminal/types/tsconfig.json --noEmit` | PASS |
| `pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/geometry/vitest.config.ts tests/routing-v2/geometry/unit` | PASS — 7 files, 85 tests |
| `pnpm --filter @frade/draw exec vitest run --config tests/routing-v2/geometry/vitest.config.ts tests/routing-v2/geometry/property` | PASS — 1 file, 7 tests; six core generated properties accepted 5000 cases |
| `pnpm --filter @frade/draw exec tsc --project tests/routing-v2/geometry/types/tsconfig.json --noEmit` | PASS |
| `pnpm --filter @frade/draw typecheck` | PASS |
| `pnpm exec eslint packages/draw/src/routing/terminal packages/draw/src/routing/perimeter packages/draw/tests/routing-v2/terminal packages/draw/tests/routing-v2/perimeter` | PASS |

The first package-wide typecheck run identified three invalid-data fixtures whose raw objects widened
generic inference. They were classified as TEST defects and given explicit `ModelSpace` context; the
same typecheck and complete R02 suites then passed. No production behavior or tolerance changed.

## Task 8.2 specification and process checks

| Command | Result |
| --- | --- |
| `openspec show routing-v2-02-terminal-perimeter --json --deltas-only` | PASS — 14 deltas returned |
| `openspec validate routing-v2-02-terminal-perimeter --strict` | PASS |
| `node scripts/routing-v2-architecture-gate.mjs --self-test` | PASS — 153 assertions |
| `pnpm run routing:v2:arch-gate` | PASS — 39 changed files, 56 V2 source/test files, `GATE_STATUS: PASS` |
| `git diff --check` | PASS — only Git LF→CRLF checkout warnings for CURRENT_CHANGE/tasks Markdown |

Requirement/scenario traceability is retained in `evidence/acceptance.md`.
