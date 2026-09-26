# Foundation traceability

## Monorepo workspace

| Requirement                               | Scenario evidence                                                   | Result |
| ----------------------------------------- | ------------------------------------------------------------------- | ------ |
| Reproducible workspace installation       | Frozen install plus before/after `pnpm-lock.yaml` hash              | PASS   |
| Root command contract                     | Root `check`, focused scripts, and demonstrated non-zero lint probe | PASS   |
| Dependency-aware task execution           | Turbo dry graph and package-scoped build/test/typecheck/lint tasks  | PASS   |
| Strict shared TypeScript baseline         | `tsconfig.base.json`, package inheritance, `pnpm typecheck`         | PASS   |
| Enforced architectural package boundaries | Manifest/import scan plus forbidden Electron-import contract        | PASS   |

## Reusable Draw package

| Requirement                                 | Scenario evidence                                                          | Result |
| ------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| Standalone and embeddable editor            | Standalone Vite build, `DiagramEditor` export, consumer typecheck          | PASS   |
| Local diagram lifecycle compatibility       | `diagram-lifecycle.feature`, document/graph/file adapter tests             | PASS   |
| Existing diagram editing behavior           | editor lifecycle tests and palette Chromium scenarios                      | PASS   |
| Floating Manhattan connection compatibility | attachment/routing units and Chromium orbit, obstacle, reconnect scenarios | PASS   |
| Segment editing compatibility               | segment unit suites, 160-case symmetry matrix, live-drag screenshots       | PASS   |
| Source regression preservation              | 26 Vitest files / 182 tests and Playwright 207/207                         | PASS   |

## Foundation quality gates

| Requirement                            | Scenario evidence                                                                         | Result |
| -------------------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| Layered automated verification         | lint, typecheck, 182 unit tests, 3 BDD tests, build, boundaries, 207 browser tests        | PASS   |
| Executable BDD traceability            | Four feature files; positive mapping and negative missing-tag/unmapped-step probes        | PASS   |
| Production-equivalent browser evidence | production graph configuration, logical route validation, SVG assertions, screenshots     | PASS   |
| Actionable failure artifacts           | Playwright screenshot/trace observed on diagnostic failure; CI uploads result directories | PASS   |
| Clean-environment CI                   | frozen install, lockfile drift check, foundation and Windows Chromium jobs                | PASS   |

## Retained Draw scenarios

| Feature                       | Stable IDs / scenarios                                     | Evidence                                                                 |
| ----------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| `diagram-lifecycle.feature`   | APP-001, APP-002, APP-006                                  | executable BDD mapping plus editor/document tests                        |
| `connection-preview.feature`  | CONN-015                                                   | executable BDD mapping plus preview route tests                          |
| `floating-attachment.feature` | ATTACH-001, ATTACH-020, ATTACH-015, ATTACH-016             | executable BDD mapping plus attachment/routing tests and Chromium matrix |
| `segment-editing.feature`     | SEG-001/008, SEG-012/017/018, SEG-025/031, SEG-039/040/048 | executable BDD mapping plus segment units and Chromium matrix            |

Additional evidence: all 12 imported PNG files match the source snapshot; the complete 131-file source snapshot remains unchanged. Draw-level test-to-module details remain in `packages/draw/docs/traceability.md`.
