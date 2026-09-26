# Frade

Frade is a configurable architecture IDE. The desktop KA Workbench opens existing sberea YAML repositories and edits architecture cards through metadata-driven forms. It includes multi-root workspaces, native v1/v2 adapters, isolated Utility backend sessions and the standalone `@frade/draw` editor. See the [KA Workbench guide](docs/ka-workbench/README.md) for opening the supplied KA and the [acceptance evidence](docs/ka-workbench/acceptance.md) for verification. The separate Repository Core change retains its own outstanding scope.

The authoritative product and architecture input is [FRADE IMPLEMENTATION MASTER PROMPT v2.md](./FRADE%20IMPLEMENTATION%20MASTER%20PROMPT%20v2.md). The completed foundation plan is under `openspec/changes/archive/2026-09-23-frade-monorepo-foundation/`, with its specifications in `openspec/specs/`.

The host-neutral [metamodel domain](./packages/metamodel-domain/README.md) provides configurable definitions, eleven attribute kinds, inheritance and snapshot-based relation validation. The [metamodel compiler](./packages/metamodel-compiler/README.md) adds exact-version imports, additive organization extensions, projections, fingerprints, lock DTOs, atomic snapshots and read-only migration previews. Both are connected to repository loading through metamodel-config and the adapter registry; card presentation and validation use their public contracts.

## Requirements

- Node.js 24.x
- pnpm 12.6.0 (declared in `packageManager`)
- Git
- Chromium installed by Playwright for browser verification

## Install

```powershell
pnpm install --frozen-lockfile
```

## Development

```powershell
pnpm dev:draw
pnpm dev:desktop
```

The standalone editor is served by Vite. The package also exports `DiagramEditor`, `DiagramEditorProps`, and `@frade/draw/styles.css` for React hosts.

For everyday desktop use, run `pnpm start:desktop` after building once with `pnpm --filter @frade/desktop build`. The built application loads its bundled interface through `frade://app/index.html` and does not need a Vite HTTP server. `pnpm dev:desktop` is for development: it starts Vite on `127.0.0.1` and loads that local address inside Electron for hot updates. Keep its terminal running; the printed `Local:` URL is the internal development server, not a browser redirect or an external website. An explicit IPv4 loopback address avoids Windows IPv4/IPv6 resolution differences for `localhost`. Electron downloads its platform binary during installation/first use and requires access to official release assets. KA card Save writes the original YAML through the guarded adapter. Draw retains its in-app name dialog and JSON download workflow. Workspace Save As persists root profiles separately from architecture data.

## Verification

```powershell
# Static analysis, strict TypeScript, unit + BDD contracts, build, and boundaries
pnpm check

# Chromium interaction, geometry matrix, and approved Windows screenshots
pnpm test:e2e

# Built Electron isolation, real utility crash/recovery, file round-trip and shutdown (Windows)
pnpm test:desktop

# Everything above (Windows with Chromium and Electron installed)
pnpm check:all
```

Focused commands are `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:bdd`, `pnpm test:boundaries`, `pnpm build`, and `pnpm check:boundaries`.

Ordinary verification never updates screenshot baselines. Baseline updates are an explicit reviewed operation:

```powershell
pnpm test:visual:update
```

See [packages/draw/docs/testing.md](./packages/draw/docs/testing.md) before using it.

## Workspace structure

- `packages/draw` — host-neutral React/AntV X6 editor, standalone Vite harness, unit/BDD/Chromium suites.
- `apps/desktop` — Main, sandboxed Preload, Renderer and Utility entries.
- `packages/runtime-contracts` — typed, validated health protocol and event contracts.
- `packages/runtime-node` — Electron-independent backend service.
- `packages/runtime-electron` — request/lifecycle supervisor with injected child transport.
- `packages/metamodel-domain` — configurable types, pure attribute/default validation, inheritance and relation integrity; no production dependencies.
- `packages/metamodel-compiler` — deterministic package composition, additive extensions, immutable publication and read-only model upgrade review; injected loader/hash ports.
- `openspec` — specifications and implementation changes.
- `docs/adr` — accepted architecture decisions.
- `docs/migration` — source snapshot, import accounting, traceability, and verification evidence.
- `scripts/check-boundaries.mjs` — executable Draw dependency/import boundary.
- `tests/contract` — root architecture contract tests.

See [desktop runtime ADR](./docs/adr/0003-isolated-desktop-runtime.md) and [verification reports](./docs/verification/) for exact guarantees, evidence and limits.

## Диаграммы репозитория

Диаграммы находятся в `_diagrams` и открываются в общих вкладках. `.drawio` использует локальный Draw.io, `.frade` — Frade Draw с интеграцией объектов и NRT. См. [инструкцию](docs/diagrams/README.md), [совместимость](docs/diagrams/compatibility.md) и [план реализации](openspec/changes/frade-repository-diagrams/tasks.md).
