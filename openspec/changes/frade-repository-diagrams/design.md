## Context

Desktop already provides repository-scoped object cards, editor groups and guarded saving. Its separate X6 Draw edits a different JSON model. Converting arbitrary mxGraph documents to X6 loses unknown shapes, styles, layers and behaviour. Repository diagram documents therefore use the original embedded Draw.io editor; standalone X6 retains its existing behaviour and gains backward-compatible host hooks and optional node references.

## Goals / Non-Goals

Goals: ordinary repository file navigation under `_diagrams`, common editor lifecycle, native Draw.io XML editing offline, explicit object scope and honest compatibility guarantees.

Non-goals: cloud storage, collaboration servers, remote rendering services, third-party executable plugins, automatic access to other workspace roots, migration of standalone X6 documents.

## Decisions

1. Store documents directly in `_diagrams`, allowing nested folders and ordinary valid filesystem names. Display the service folder first, creating it only on a write. Backend resolves paths relative to its trusted root and rejects traversal, symlinks and reserved filesystem syntax. Read-only repositories remain read-only. Use revision hashes and atomic replacement; external changes produce a conflict instead of overwrite.
2. Use a pinned local distribution of Draw.io 31.5.2 behind an isolated editor origin. No remote fallback and no host IPC in its frame. Validate postMessage origin/source, bound data and flush XML before guarded save/close. Restrict network, popups and plugin loading. Keep licensing/attribution with bundled assets and document reproducible acquisition.
3. Persist native mxfile or mxGraphModel XML without conversion through X6. Preserve original bytes on open/no-op. On editing, upstream serialization may normalize XML; semantic fidelity is the goal, not byte identity. Compressed pages, multiple pages, layers, groups, ports, routes, styles and metadata are handled by the original engine. Future-version features, unavailable external images/fonts/stencils/plugins and server-backed functions are explicitly outside full compatibility.
4. Diagram resources participate in the existing tab groups and dirty guard. Resource identity includes repository and relative path. Add save, save all, discard, cancel, close, reorder and restored tabs. Retain live editor state while switching tabs. Invalid documents fail visibly without rewriting the file.
5. Bound cells store fradeObjectId and optional fradeSourceId as UserObject XML attributes. Navigator drag-and-drop resolves objects only from the owning repository and explicitly connected declarative external catalogs. Catalogs are separate JSON descriptions referenced by the workspace profile; they do not grant arbitrary filesystem access or access to other roots. Missing references remain on the diagram and are reported rather than silently rebound.

## Risks / Trade-offs

- Bundling the real editor increases distribution size and requires periodic audited upgrades. Use pinned official assets and checksums; asset acquisition is currently affected by GitHub release endpoint connectivity.
- Upstream editor supports more operations than the host: hide its file lifecycle controls and retain the host as sole persistence authority.
- XML roundtrip tests cover representative documents, not every third-party or future extension. Publish a compatibility matrix rather than claim universal lossless compatibility.
- Concurrent external writers cannot be controlled by Frade; use revision checks and atomic writes, report detected conflicts and retain drafts.

## Migration Plan

Existing repository data remains unchanged until a diagram is created. Existing standalone Draw JSON stays supported by the standalone editor. Remove the Desktop Draw activity entry only when ordinary diagram tabs work. Test against temporary copies of KA; never change original source repositories during verification.

### User refinement: two native formats

The user explicitly selected both engines. `.drawio` uses local Draw.io; `.frade` uses Frade Draw/X6. Both are ordinary repository documents. Frade nodes carry validated optional repository references. The first NRT integration updates bound captions when the owning repository emits changes, reports missing objects and exposes typed selection/activation/document/object-update events. Double-clicking a bound local node opens its card. Diagram edits do not implicitly write object attributes. Arbitrary future business functions remain extension points rather than an invented specification.

### Navigator drag-and-drop

Both diagram formats accept typed object identities dragged from the existing navigator and remove their duplicate object panels. Explicit catalogs are displayed under the owning root in the navigator. The host resolves identity against live scoped objects, without trusting dragged labels or paths. Frade converts client coordinates through X6; Draw.io uses a small locally served frame bridge, installed during the configure handshake, to calculate graph coordinates and create one undoable native vertex only after host authorization. A transient transparent drop surface over the iframe handles repository drags; the frame rejects coordinates outside the canvas. The bridge validates parent origin/source and bounded insertion messages, has no host IPC, and does not change pinned upstream assets. Read-only state blocks insertion. Reference navigation and unresolved warnings remain in a compact collapsed toolbar control.

### Configurable system appearance

Resolve styles in the host from trusted scoped objects and validated local user preferences. Match explicit type IDs (defaults sberea:kadzo.v2023.systems and kadzo.v2023.systems), with editable field mappings. Priority: external placement, non-target status (modified/planned exceptions), change type, fallback. Non-target defaults are purple #E1D5E7/#9673A6/1; modified inherits fill with #FF00FF outline; planned inherits that palette with width 2, per the user clarification. Use Draw.io UI width units consistently in both engines. Shadow defaults verified in pinned 31.5.2: black, 25%, dx=2, dy=3, blur=2; populated parent suppresses shadow. Frade JSON gains an optional validated shadow, rendered by CSS drop-shadow like Draw.io. Settings persist in the local UI profile and apply to open writable diagrams. Card drafts feed NRT presentation without writing repository data.

Draw.io supports native live updates through the existing origin-validated bridge. Update only managed appearance keys, retaining geometry, edges and unrelated styles. A local setting disables live refresh for manual editing. Compare resolved input signatures so manual edits/undo are not immediately overwritten on unrelated renders; the next relevant attribute/settings change reapplies managed styles. Refresh the current page and pages on activation; unopened pages retain their last saved appearance. Read-only and unresolved references remain unchanged. The bridge remains restricted to known style keys and bounded messages.

### Empty bundles

Use native body-magnet dragging in X6 and native connection-point/direction-arrow dragging in Draw.io. Tag only newly completed connections between two resolved system nodes; do not reinterpret old or ordinary connectors. Preserve native terminals, geometry, undo and file lifecycle. Store an optional validated bundle: {kind: "empty"} on Frade edges and fradeBundle="empty" on native Draw.io UserObject edges. No repository writes or flow editor. Shared emptyBundle stroke/width preferences migrate previous saved preferences without resetting system styles. Settings refresh tagged empty bundles only (Draw.io obeys its live-mode switch); imported unrelated connections remain untouched.
