# Verification evidence

> Historical source evidence captured before monorepo migration. Current pnpm workspace evidence is recorded in `../../../docs/migration/foundation-verification.md`.

Последняя проверка выполнена локально из корня проекта.

| Command                                                      | Result | Evidence                                                                       |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------ |
| `npm run typecheck`                                          | PASS   | TypeScript 5.9.3, no diagnostics                                               |
| `npm test`                                                   | PASS   | 23 files, 91 tests                                                             |
| `npm run test:bdd`                                           | PASS   | Executable lifecycle, preview, floating-attachment and segment feature mapping |
| `npm run build`                                              | PASS   | Vite production bundle generated in `dist/`                                    |
| `npm run test:visual`                                        | PASS   | 7 Chromium tests, real X6 SVG and ten approved screenshots                     |
| `npx openspec validate build-standalone-frade-draw --strict` | PASS   | Change valid                                                                   |

Chromium evidence covers the X6 3.1.8 native-segments spike, real-edge live drag, semantic non-dashed rendering, floating attachments, node move/resize/reconnect, deterministic fixture reload, obstacle routing, legacy vertices, SVG presence, and shared route validation. Ten approved screenshots are stored in `tests/spike/production-visual.spec.ts-snapshots/`; ordinary visual runs compare them without rewriting them.
