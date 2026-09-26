# Design

## Context

See `proposal.md` for motivation. The target repository is an uncommitted partial scaffold: it has a pnpm lockfile, root manifest, `apps/desktop/package.json`, and an invalid `packages/draw/package.json`, but no shared TypeScript/Turbo configuration or implementation. The root currently resolves unrelated major upgrades (TypeScript 7, Vitest 5, Playwright 1.63), while the clean source repository at `E:\dev\codex\frade-draw` is verified around TypeScript 5.9.3, Vitest 3.2.7, Playwright 1.57.0, React 18.3.1, Vite 6.1.0, and AntV X6 3.1.8.

The source Draw directory is an initialized repository with no commits: it has no `HEAD`, and every project file is untracked. It nevertheless contains production code, 31 unit test files, four Gherkin feature files, deterministic fixtures, Chromium interaction tests, ten Windows screenshot baselines, OpenSpec specifications, and architecture/evidence documentation. Its React component currently doubles as the product UI, while `main.tsx` is the browser bootstrap and `window.FRADE_VISUAL_TEST` is a test-only browser API.

## Goals / Non-Goals

**Goals:**

- Import Draw with a reviewable file-for-file provenance boundary and prove behavioral parity before extending it.
- Make Draw both an independently runnable application and an explicit React package API.
- Establish deterministic workspace commands, package build ordering, strict typing, linting, tests, browser evidence, and CI.
- Leave a documented architecture runway for Electron, repository, metamodel, and adapter changes without creating empty placeholder packages.

**Non-Goals:**

- Implement Electron main/preload/renderer/utility behavior, IPC, packaging, SQLite, Git, repository adapters, metamodels, or federation.
- Upgrade Draw to React 19, Vite 7, TypeScript 7, Vitest 5, or a different graph engine during migration.
- Change route geometry, document semantics, interaction design, or approved visual baselines merely to fit the monorepo.
- Preserve the source repository's npm lockfile as a second dependency authority or mutate the source repository.

## Decisions

### 1. Import Draw as a hybrid library plus standalone harness

`packages/draw` will own the imported `src`, tests, fixtures, visual baselines, and Draw-specific documentation. A new package entry point will export `DiagramEditor` and supported public types/styles; the existing `main.tsx` and HTML pages will remain thin standalone/test harnesses that consume the same implementation.

This keeps one production editor implementation for library consumers, manual development, and Playwright. A separate copied demo application was rejected because it would permit renderer behavior to drift. Making the Electron renderer the only host was rejected because it would violate Draw's standalone contract and couple foundation verification to Electron.

### 2. Preserve source behavior before refactoring package internals

Because the source has no commits or tracked files, the initial import will use a deterministic SHA-256 inventory of all project files except generated or machine-local state (`.git`, `node_modules`, `dist`, `test-results`, `.npm-cache`, and `debug.log`). The import copies the implementation and evidence subset while deliberately excluding the source npm lockfile from the target package because pnpm owns dependency resolution. The source path, no-HEAD status, complete snapshot inventory, exclusions, and combined digest will be recorded in migration evidence. Tests and baselines will move with their relative layout so assertions are not weakened by the move.

Only changes required for pnpm paths, package naming, public exports, shared config inheritance, and monorepo commands are allowed before the first parity run. Broader component decomposition can occur in later changes after a green baseline. A line-by-line rewrite was rejected because the source is the user's priority and already has visual validation.

### 3. Use one pnpm lockfile and pin the package manager

The root will declare `packageManager: pnpm@12.6.0`, matching the available workspace tool, and a supported Node range compatible with the selected package set. The Draw dependency baseline will retain its exact known-working versions during foundation migration. Root-only tools will be pinned to reviewed versions and the lockfile regenerated once after manifests are corrected.

The current caret-based, cross-major root scaffold will not be treated as authoritative. Immediate framework upgrades were rejected because they combine migration risk with dependency risk and make regressions harder to localize. Upgrade changes can be proposed after parity.

### 4. Keep build and test configuration close to the owning project

The root supplies `tsconfig.base.json`, Turbo task definitions, shared formatting/lint primitives, and orchestration commands. Draw keeps environment-specific Vite, Vitest, and Playwright configuration next to its code. Package scripts expose a uniform contract (`dev`, `build`, `typecheck`, `lint`, `test`, `test:bdd`, `test:visual`, and baseline update as an explicit non-CI command).

Turbo orchestrates cacheable static/unit/build tasks. Browser visual tests run through an explicit root script and a Windows CI job because current approved screenshot baselines are Windows-specific. This avoids pretending cross-platform screenshot equality while still allowing non-visual browser interaction tests to expand later.

### 5. Make BDD traceability fail closed

The migrated Gherkin files remain first-class inputs. The existing mapping test will be generalized only as necessary so parsed scenarios, stable requirement tags, and step implementations fail when missing. Foundation-specific features will be added under the root or owning package with mappings to unit/integration/CI evidence. A documentation-only traceability table is insufficient on its own and will supplement, not replace, executable checks.

### 6. Enforce package boundaries with static rules and manifest inspection

Foundation verification will check that `@frade/draw` has no production dependency on Electron or future repository/runtime/adapter packages and that shared domain packages cannot import applications or infrastructure. The target dependency map will be documented in an ADR. Physical packages will be created only when a change implements real behavior; the full future tree remains an architectural roadmap rather than empty directories.

### 7. Keep Electron foundation work deliberately shallow

The existing desktop manifest may be corrected enough not to corrupt workspace installation, but it will not claim working scripts until `frade-electron-runtime` supplies actual main, preload, renderer, and utility entry points. Electron dependencies can be removed from foundation manifests and reintroduced with compatible versions in that change. This prevents a green foundation from implying that an empty desktop package is runnable.

### 8. Capture authoritative project input and decisions in repository documentation

The zero-byte README and master-prompt placeholders will be replaced with useful content. The supplied implementation package will be retained as project input, while concise ADRs will record the monorepo/package-boundary decision and the Electron-over-Tauri target. Operational README commands must be verified before being documented as working.

## Risks / Trade-offs

- **[Risk] The uncommitted source and target diverge during migration** → Record a complete source snapshot digest before import, recompute it after migration, and verify all retained source tests and evidence before target-only changes.
- **[Risk] Exact source dependency versions conflict with current root packages** → Rebuild manifests from the known-working Draw baseline and regenerate one root lockfile; defer unrelated upgrades.
- **[Risk] Screenshot tests are platform-sensitive** → Run approved Windows baselines on Windows CI, keep geometry assertions platform-neutral, and require explicit reviewed baseline updates.
- **[Risk] A hybrid package accidentally ships test APIs** → Keep visual test installation behind the standalone visual harness/build mode and exclude test-only globals from the public package entry point.
- **[Risk] Turbo caching hides stale browser or mutable outputs** → Do not cache development or browser interaction tasks; declare only deterministic package outputs and retain ordinary test failure artifacts outside cached success outputs.
- **[Risk] No source Git history exists to protect or preserve** → Preserve the source directory untouched and record its no-HEAD state plus full project-file snapshot. A history-preserving subtree import is impossible until the source has commits.
- **[Trade-off] Foundation initially remains on React 18 and the source test stack** → This minimizes regression risk; framework upgrades become isolated, reviewable follow-up changes.

## Migration Plan

1. Capture target and source no-HEAD Git status plus a path-and-SHA-256 inventory of all non-generated Draw project files; recompute the combined digest after migration and do not modify `frade-draw`.
2. Repair root manifests and configs, add the pinned package manager/Node contract, move Turbo configuration to `turbo.json`, and generate shared strict TypeScript/lint/format settings.
3. Import relevant Draw files into `packages/draw`, rename the package to `@frade/draw`, add the public export boundary, and adapt only paths/scripts/config inheritance.
4. Regenerate the root pnpm lockfile and prove frozen installation.
5. Run typecheck, unit, executable BDD, build, browser geometry/interaction, and Windows visual parity checks; record actual counts and results rather than copying historical counts as current evidence.
6. Add architecture ADRs, verified developer documentation, dependency-boundary checks, and CI jobs with retained Playwright artifacts.
7. Run strict OpenSpec validation and the complete root verification command before marking foundation tasks complete.

If migration verification fails, revert only the target import/config edits for the failing task; the independent source repository remains the rollback reference. Do not update source baselines or weaken assertions as a rollback mechanism.
