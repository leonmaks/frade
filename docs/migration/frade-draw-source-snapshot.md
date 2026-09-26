# Frade Draw source snapshot

Captured before the monorepo import on 2026-09-23.

## Repository state

- Source: `E:\dev\codex\frade-draw`
- Target: `E:\dev\codex\frade`
- Source Git state: initialized repository with no commits and no `HEAD`; 16 top-level untracked status entries.
- Target Git state: initialized repository with no commits and no `HEAD`; 11 top-level untracked status entries at capture time.
- Source project-file count: 131.

## Snapshot identity

- Inventory: [`frade-draw-source-snapshot.tsv`](./frade-draw-source-snapshot.tsv)
- Inventory file SHA-256: `2ac228b3195f3c7ec379d1767f1558a1b6d210fb32a4f59ad1aea35ba2187cd6`
- Combined source snapshot SHA-256: `72704f2c034f41ff942e7bfedb0b5814c54cfe3986145c5923c0dde6c64f5a85`

The combined digest is SHA-256 over UTF-8 lines in ordinal path order, each formatted as `<relative-path>\t<lowercase-file-sha256>\n`. The TSV header is excluded from the combined digest.

## Included inventory

| Top-level path         | Files |
| ---------------------- | ----: |
| `.agents`              |     8 |
| `.gitignore`           |     1 |
| `docs`                 |    11 |
| `index.html`           |     1 |
| `openspec`             |    15 |
| `package-lock.json`    |     1 |
| `package.json`         |     1 |
| `playwright.config.ts` |     1 |
| `README.md`            |     1 |
| `spike.html`           |     1 |
| `src`                  |    29 |
| `tests`                |    57 |
| `tsconfig.json`        |     1 |
| `visual.html`          |     1 |
| `vite.config.ts`       |     1 |
| `vitest.config.ts`     |     1 |

## Explicit snapshot exclusions

- `.git/`
- `.npm-cache/`
- `dist/`
- `node_modules/`
- `test-results/`
- `debug.log`

The snapshot includes `package-lock.json` so the original source state is fully identifiable. The import deliberately omits that file because the target monorepo uses the single root `pnpm-lock.yaml`.

## Import accounting

- Imported into `packages/draw`: 122 files.
- Missing after import: 0 files.
- Initial post-copy SHA-256 mismatches: 0 files.
- Deliberately excluded from import: 9 files — the eight `.agents/skills/**` files and `package-lock.json`.
- Source snapshot after import and workspace adaptation: unchanged, 0 mismatches, combined SHA-256 `72704f2c034f41ff942e7bfedb0b5814c54cfe3986145c5923c0dde6c64f5a85`.

Ten imported files were subsequently adapted for workspace naming/configuration, test-harness isolation, or lint-only cleanup:

- `package.json`
- `playwright.config.ts`
- `src/editor/DiagramEditor.tsx`
- `src/geometry/validateManhattanRoute.ts` (unused parameter rename only)
- `src/style.css`
- `src/visual-entry.ts`
- `tests/spike/palette-placement.spec.ts`
- `tests/spike/production-visual.spec.ts` (unused local removal only)
- `tests/unit/bdd-mapping.test.ts` (`const` lint cleanup only)
- `tsconfig.json`

No document, routing, attachment, segment-editing, or interaction-policy behavior was rewritten during import.
