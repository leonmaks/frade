# Proposal

## Why

Frade needs a reproducible monorepo foundation before repository, metamodel, or Electron work can safely begin. The existing `frade-draw` editor already has validated interaction behavior and regression coverage, so the foundation must preserve it as the reference implementation while replacing the current partial and version-misaligned workspace scaffold.

## What Changes

- Establish a pnpm workspace and Turborepo build graph with strict shared TypeScript configuration, pinned compatible tool versions, deterministic installation, and root development/verification commands.
- Move the existing Frade Draw source, fixtures, tests, visual baselines, and supporting documentation into a reusable `@frade/draw` workspace package without rewriting its routing or editing behavior.
- Keep Frade Draw independently runnable in a browser while exposing an explicit React/package boundary suitable for later desktop and web hosts.
- Integrate the existing unit, BDD-mapping, and Playwright visual suites into monorepo quality gates and CI, including retained failure evidence.
- Record target package boundaries and dependency rules in architecture documentation and ADRs, including the separation between Draw, repository concerns, and future Electron runtime packages.
- Normalize the partial desktop scaffold only as needed for workspace consistency; typed IPC, utility-process lifecycle, and production Electron behavior remain in the subsequent `frade-electron-runtime` change.

## Capabilities

### New Capabilities

- `monorepo-workspace`: Reproducible pnpm/Turborepo workspace operation, strict shared configuration, dependency boundaries, and root commands.
- `reusable-draw-package`: A standalone and embeddable Frade Draw package that preserves the existing editor's document, routing, segment-editing, and export behavior.
- `foundation-quality-gates`: Executable unit, BDD, browser-visual, build, typecheck, lint, and CI checks for the migrated foundation.

### Modified Capabilities

None. The target Frade OpenSpec store has no existing capability specifications; the source Draw specifications are imported as reference behavior under the new package capability.

## Impact

- Affects the root workspace configuration, lockfile, shared TypeScript/lint/format/test configuration, CI, architecture documentation, and `packages/draw`.
- Imports maintained source and evidence from `E:\dev\codex\frade-draw`; that repository remains the behavioral reference until parity is verified.
- Pins a compatibility baseline around the working Draw stack (React 18, AntV X6 3.1.8, TypeScript 5.9, Vite 6, Vitest 3, and its verified Playwright line) instead of accepting unrelated major upgrades already present in the partial scaffold.
- Establishes package APIs consumed later by Electron renderer and web applications, but introduces no repository, filesystem, Git, SQLite, or Electron dependency into Draw.
