# Foundation verification evidence

## Acceptance correction

A later source review found that the original green checks did not prove complete UI Save/Open fidelity: shape identity, styles, viewport and edited route geometry could be lost. The archived 23/23 checklist records the original acceptance decision, not evidence that these missing cases passed. Corrective change `frade-draw-document-roundtrip` adds real file download/upload scenarios and transaction-validation regressions; see `docs/verification/draw-document-roundtrip.md` for its results.

Verified on Windows with Node.js 24.18.0 and pnpm 12.6.0.

| Command or check                                               | Result                                                |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| `pnpm install --frozen-lockfile`                               | PASS; `pnpm-lock.yaml` SHA-256 unchanged              |
| `pnpm lint`                                                    | PASS                                                  |
| `pnpm typecheck`                                               | PASS                                                  |
| `pnpm --filter @frade/draw typecheck:consumer`                 | PASS                                                  |
| `pnpm test`                                                    | PASS; 26 files, 182 tests                             |
| `pnpm test:bdd`                                                | PASS; 2 files, 3 tests                                |
| `pnpm test:boundaries`                                         | PASS; 2 tests including forbidden Electron import     |
| `pnpm build`                                                   | PASS; Vite production output in `packages/draw/dist/` |
| Production bundle scan for `FRADE_VISUAL_TEST`                 | PASS; absent                                          |
| `pnpm test:e2e` equivalent (`playwright test --reporter=line`) | PASS; 207 tests, 1.4 minutes                          |
| Imported PNG baseline hashes                                   | PASS; 12 files, 0 mismatches                          |
| Source snapshot recheck                                        | PASS; 131 files, 0 mismatches                         |
| README `dev:draw` smoke check                                  | PASS; standalone harness returned HTTP 200            |
| README/CI workflow YAML formatting                             | PASS; Prettier parsed both files                      |
| Clean-copy frozen install and `pnpm check`                     | PASS; lock hash unchanged; all required layers passed |
| Root lint failure-propagation probe                            | PASS; package parse error produced root exit code 1   |
| Playwright failure-artifact probe                              | PASS; screenshot and `trace.zip` retained             |
| Ordinary E2E baseline immutability                             | PASS; 12 approved PNG files, 0 hash changes           |
| `pnpm check:all`                                               | PASS; complete documented root verification gate      |
| `openspec validate frade-monorepo-foundation --strict`         | PASS                                                  |

The Vite build reports a non-failing warning that the current single Draw bundle is larger than 500 kB. Code splitting is intentionally deferred because it is not required for behavioral parity and would broaden foundation scope.
