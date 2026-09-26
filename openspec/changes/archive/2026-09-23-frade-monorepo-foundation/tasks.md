# Tasks

## 1. Establish the workspace baseline

- [x] 1.1 Record the source and target no-HEAD Git status plus a path-and-SHA-256 snapshot of every non-generated Frade Draw project file in migration evidence, and verify the combined source digest remains unchanged after migration.
- [x] 1.2 Rebuild the root manifest around `packageManager: pnpm@12.6.0`, a documented supported Node range, exact reviewed foundation tool versions, and the required root commands; verify the manifest parses and each command resolves to an existing workspace task.
- [x] 1.3 Create `turbo.json`, `tsconfig.base.json`, shared lint/format configuration, and workspace ignore rules; verify Turbo discovers the intended task graph and a deliberate TypeScript/lint violation fails the owning command.
- [x] 1.4 Resolve the manifest-only desktop scaffold without claiming a runnable Electron application, and verify foundation workspace discovery contains no empty or falsely executable application package.
- [x] 1.5 Regenerate the single root `pnpm-lock.yaml` from corrected manifests and verify `pnpm install --frozen-lockfile` succeeds without changing it.

## 2. Import Frade Draw without behavioral rewriting

- [x] 2.1 Import tracked Draw source, tests, feature files, fixtures, visual baselines, HTML harnesses, and maintained documentation into `packages/draw`, excluding generated and machine-local state; verify the recorded inventory accounts for every included and excluded source file.
- [x] 2.2 Replace the invalid target Draw manifest with `@frade/draw`, preserve the known-working exact React/X6/test dependency baseline, and expose uniform workspace scripts; verify pnpm resolves the package and its scripts from the repository root.
- [x] 2.3 Add the supported package entry point for `DiagramEditor`, public types, and styles while retaining `main.tsx` as a thin standalone bootstrap; verify a package-consumer typecheck and the standalone production build both succeed.
- [x] 2.4 Keep the browser visual API confined to the standalone visual test harness rather than the public package surface, and verify a normal consumer build does not expose or install the test API.
- [x] 2.5 Adapt imported configuration and documentation only for pnpm/workspace paths and names, and verify a review diff shows no unplanned routing, geometry, document, or interaction-policy changes.

## 3. Restore and strengthen executable evidence

- [x] 3.1 Run all migrated Draw unit tests and fix only migration-induced failures; verify document, graph, connection, routing, attachment, segment, persistence, and lifecycle suites pass with recorded test counts.
- [x] 3.2 Preserve the four imported Gherkin feature files and make their scenario/tag/step mapping fail closed; verify `test:bdd` passes and a temporary unmapped step or required tag causes the mapping test to fail.
- [x] 3.3 Adapt Playwright startup to pnpm and the package-local standalone harness, then verify Chromium interaction and logical geometry assertions pass against production graph configuration.
- [x] 3.4 Run the approved Windows visual baselines without updating them and verify the live-drag, attachment, routing, obstacle, reconnect, and before/after-drop comparisons pass or produce reviewed migration evidence for any genuine platform-only difference.
- [x] 3.5 Add an architecture-boundary check for Draw production dependencies and imports, and verify it rejects Electron, repository adapter, Git, SQL, and privileged filesystem dependencies.
- [x] 3.6 Update traceability and verification evidence with actual migrated command results, test counts, browser coverage, and any environment-gated checks; verify every foundation requirement and retained Draw scenario maps to evidence or an explicit approved boundary.

## 4. Documentation and continuous integration

- [x] 4.1 Replace zero-byte project documentation with a verified root README and retain the supplied Frade implementation package/master prompt as authoritative project input; verify every command presented as working succeeds from the root.
- [x] 4.2 Add ADRs for pnpm/Turborepo package boundaries, Draw independence, compatible-version migration, and the Electron-over-Tauri target; verify the documented dependency direction matches the boundary check.
- [x] 4.3 Add clean-install CI jobs for static/unit/build verification and Windows Chromium visual verification with retained Playwright failure artifacts; verify workflow syntax and local equivalents of all job commands.
- [x] 4.4 Document explicit visual-baseline review/update procedure and generated-output locations, and verify ordinary test and CI commands cannot update approved baselines.

## 5. Foundation acceptance

- [x] 5.1 Run root lint, typecheck, unit test, BDD, production build, and dependency-boundary commands from a clean dependency state; verify each succeeds and that root failure propagation is demonstrated.
- [x] 5.2 Run the complete Chromium interaction and visual suite through the root E2E command, and verify failure traces/screenshots are retained while success leaves approved baselines unchanged.
- [x] 5.3 Run the documented complete verification command and strict OpenSpec validation for `frade-monorepo-foundation`; verify all three capability specs pass validation and all completed checklist items have corresponding evidence.
