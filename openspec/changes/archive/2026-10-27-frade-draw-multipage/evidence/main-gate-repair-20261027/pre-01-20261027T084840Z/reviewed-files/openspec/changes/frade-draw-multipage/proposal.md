# Proposal

## Why

Frade Draw currently stores one graph per document and has no page strip. Users need the same bottom-strip workflow as the bundled Draw.io editor, with independent diagrams in one file and no lost content when changing pages.

## What Changes

- Add a native Draw.io-compatible bottom strip: insert, select, page list/overflow chevrons, page menu, rename, duplicate, remove, reorder by drag/menu, natural sort and clear all; standalone Open in New Window; keyboard and readonly navigation.
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

Authorized implementation: `packages/draw/src/document/`, `packages/draw/src/editor/`, `packages/draw/src/index.ts`, `packages/draw/src/style.css`, Draw tests/README; `packages/ui-workspace/src/FradeDiagramView.tsx`, `src/diagramContent.ts` and related native document consumer tests, native readonly layout in `src/styles.css` and shared editor presentation CSS; bounded shared adapter generation/mapping if required; `packages/runtime-node/src/diagram-files.ts` and its tests for the complete drawing validator; desktop native diagram E2E tests. No new runtime dependency. No changes to routing source/contracts, Draw.io vendor bytes, repository object ownership, unrelated workbench surfaces or other feature process state. Root boundary/build/UI checks remain required.

Research, strategy, exact UI and review assignments are in design.md and evidence/research.md. User request authorizes implementation; PRE PASS is still required before production edits.

Additional necessary consumer control adoption: the bounded historical-origin reader call and new test-only origin/current-binding regressions; exact coordinate-only legacy color inventory rebase with retained origin proof. The plan in evidence/control-adoption-plan.md requires a fresh PRE before these edits. Closed program manifests, report pins and assertions remain immutable; fresh current executions remain mandatory.

Necessary architectural correction: authorize only the already-declared pure @frade/draw/document source entry in ui-workspace's boundary inspection, with exact import/dependency/private-path negatives. This explicit contract correction requires focused PRE under evidence/document-facade-boundary-plan.md; no wildcard/source escape, new dependency, export/bundler change or broader checker bypass is authorized.

User-authorized main repair (27 October): restore all11 historical LDE checks without changing their assertions, preserve the five dirty and849 untracked files byte-for-byte, revalidate the full actual current main input set and pass the general gate. Extend exact historical adoption only by pnpm-lock.yaml and the two proven checkout-origin sources; no live routing/vendor changes. Remove the native footer's jgraph/drawio icon/link as an explicit visual-parity exception requested by the user. Preserve repository license/provenance. Exact scope/review/strategy: evidence/main-gate-repair-20261027/plan.md; fresh PRE precedes control/product edits and fresh POST follows actual current checks.
