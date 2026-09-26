# Tasks

## 1. Native editor compatibility

- [x] 1.1 Package pinned official Draw.io assets, checksums and attribution; verify local startup with network disabled.
- [x] 1.2 Implement isolated embed bridge with source/origin validation and flush/error handling; verify compressed multi-page XML roundtrip in the actual engine.
- [x] 1.3 Publish detailed compatibility matrix and supported file/resource boundaries with official sources.

## 2. Repository diagram files

- [x] 2.1 Implement scoped list/read/create/folder/rename/save operations with bounded data, read-only and revision guards; test traversal, symlinks, conflicts and unaffected files.
- [x] 2.2 Show `_diagrams` first in the ordinary navigator with nested folders and file management; verify creation and reopening in a temporary repository.
- [x] 2.3 Document file layout and external-change/conflict behaviour; verify documented paths match tests.

## 3. Common editors and object references

- [x] 3.1 Integrate diagram resources into tabs/groups, restoration and shared Save/Save All/Discard/Cancel lifecycle; test card-plus-diagram editing and close guards.
- [x] 3.2 Add owning-repository object insertion and preserved XML references; verify two-root isolation and unresolved references.
- [x] 3.3 Add explicitly connected separate external catalog descriptions and workspace persistence; test source identity and document catalog schema.
- [x] 3.4 Remove Desktop Draw mode/icon after ordinary diagram tabs work; retain standalone Draw regression behaviour.

## 4. Integrated acceptance

- [x] 4.1 Run focused Electron acceptance on copied KA fixtures: create nested diagram, insert objects, save/reopen, reorder tabs, discard/cancel, external conflict and roundtrip.
- [x] 4.2 Run repository quality gates and OpenSpec validation; record actual results and remaining limitations without modifying original KA repositories.

## 5. Confirmed dual-engine refinement

- [x] 5.1 Add backward-compatible `.frade` node references and portable validation; test roundtrip, invalid references and unchanged legacy geometry.
- [x] 5.2 Embed Frade Draw in ordinary tabs with shared file guards and format selection; verify creating, saving and reopening both extensions through Electron.
- [x] 5.3 Implement typed repository integration events, NRT bound-caption refresh and card activation; test owning-root isolation, rename events and unresolved objects, and document event semantics.

## 6. Navigator drag and drop

- [x] 6.1 Remove the repository object panels from both editors; expose connected catalogs in the navigator.
- [x] 6.2 Implement scoped navigator-to-canvas drops at model coordinates in both engines, preserving references, undo and read-only guards.
- [x] 6.3 Verify actual mouse dragging, persistence, cross-root rejection, explicit catalogs and existing diagram lifecycle; update documentation.

## 7. System appearance

- [x] 7.1 Implement validated configurable system rules and Settings group with persistence.
- [x] 7.2 Apply styles and native-equivalent shadows on drop and NRT refresh in both engines, preserving read-only, undo, geometry and manual Draw.io mode.
- [x] 7.3 Verify rule matrix, serialization, settings persistence and real editor updates; document compatibility and limits.

## 8. Empty bundles

- [x] 8.1 Add validated empty-bundle persistence and appearance preferences with migration of existing user settings.
- [x] 8.2 Integrate native system-to-system mouse connections, undo, save/reopen and settings in both engines.
- [x] 8.3 Verify actual gestures and regression, and document Draw.io differences and current scope.
