# Proposal

## Why

Frade Draw currently stores one graph per document and has no page strip. Users need the same bottom-strip workflow as the bundled Draw.io editor, with independent diagrams in one file and no lost content when changing pages.

## What Changes

- Add a native Draw.io-compatible bottom strip: insert, select, page list/overflow, page menu, rename, duplicate, remove and reorder by drag or menu; support keyboard and readonly navigation.
- Introduce version-2 multipage documents, retaining the existing version-1 single-graph API and lossless legacy import. **BREAKING for old readers:** multipage files use version 2 so old versions reject rather than silently discard pages.
- Keep page content, references, authored styles and viewport independent; coordinate graph and page operations in one chronological undo/redo history.
- Integrate all-page save, discard, reload and dirty tracking in standalone Draw and repository-bound `.frade` editors.
- Derive strip appearance from pinned bundled Draw.io 31.5.2 through the existing shared presentation adapter; retain forced-colors and accessibility exceptions.

## Capabilities

### New Capabilities

- `diagram-pages`: Multipage document lifecycle, reversible page management, navigation and Draw.io bottom-strip parity.

### Modified Capabilities

None. Existing single-graph and presentation requirements remain applicable; this is an additive capability.

## Impact

Authorized implementation: `packages/draw/src/document/`, `packages/draw/src/editor/`, `packages/draw/src/index.ts`, `packages/draw/src/style.css`, Draw tests/README; `packages/ui-workspace/src/FradeDiagramView.tsx`, related native document consumers/tests and shared editor presentation CSS; bounded shared adapter generation/mapping if required; desktop native diagram E2E tests. No new runtime dependency. No changes to routing source/contracts, Draw.io vendor bytes, repository object ownership, unrelated workbench surfaces or other feature process state. Root boundary/build/UI checks remain required.

Research, strategy, exact UI and review assignments are in design.md and evidence/research.md. User request authorizes implementation; PRE PASS is still required before production edits.
