# Design

## Context

See proposal.md and preflight.md. Two native engines already store empty bundles; canonical repository objects, authenticated commands, events and schema-driven inspectors exist. The KA adapter currently rejects create. The 42 acceptance scenarios in bdd are the behavioral contract.

## Goals / Non-Goals

Complete UI → application service → Repo Core → adapter persistence and independent UI → diagram command → diagram persistence in both engines. No repository delete, descendant expansion, offline snapshots, CMDB, new Navigator or automatic flow generation.

## Decisions

### Domain identity and invariants

Reuse ObjectRef {repositoryId,objectId}; this identity is repository-wide unique and type comes from the resolved object. Flow semantics belong to configurable metamodel capabilities on object types: source/consumer roles, search fields, table columns, editable/clone policy and ID patterns. The KA dialect supplies its mapping outside UI/domain; native definitions can declare the same capability. Eligibility/direction, unique membership, reversal, clone sanitization and validation are pure domain functions. Endpoints match exactly including subsystems; the pair is unordered while flows are directed.

### Repository query and index

IntegrationFlowService in repository-application uses RepositorySession reads, queryObjects, applyChanges, capabilities and events. Build a revision-pinned derived map once from bounded object pages, keyed by canonical unordered pair; index row text includes configured fields and batch-resolved reference names. Pair search reads its bucket; text typing never reparses source files. Repository events invalidate/update the index; rebuild is shared and cancellation/stale results are guarded. Results return only a bounded page with stable order, current-pair boost, included-first pair sorting, filters and total eligible count. Existing Result/errors/cancellation are retained. Remote adapters can push down query in future without changing UI.

### Repository mutations

Reuse createObject/updateObject, expectedRevision, idempotencyKey and authorization. Create obtains canonical identity from the adapter policy (user ID where required, UUID where permitted). The KA writer places a new object in the existing type collection, falling back to the authorized entry collection when absent; one source is patched by its existing CST preservation, journal, lock and atomic replacement. No second writer. Reverse is a draft swap followed by update. Clone is create after centralized non-cloneable/audit/generated field stripping. Other readable fields survive and forms use ObjectInspector and LOV controls.

### Diagram persistence and commands

Extend optional repositoryBundle metadata with integrationFlowRefs while accepting old kind:empty markers. Do not copy flow attributes. Frade graphAdapter validates and round-trips canonical refs. Draw.io stores JSON refs in a UserObject XML attribute; native Draw.io preserves it outside Frade. Native X6 batches and mxGraph model transactions provide add/remove/bulk membership undo/redo and existing dirty/save state. Reconnection prevalidates prospective endpoints, explicitly confirms incompatible removals, and changes terminals+membership in one transaction; cancellation restores both. Delete affects only the edge.

### Workspace and UI

A shared FlowManager is a right dock in each live diagram portal, with resizable separator and narrow-screen overlay. The editor boundary supplies bundle selection/endpoints, native commands and Repo Core client; the shared UI never accesses graph internals, filesystem, Git or YAML. Double-click, context-menu and inspector action open it; new bundles show dismissible discovery hint. Bundle edges show included-flow descriptions with lifecycle markers and four-character continuation indent. N/M remains in manager controls. Use semantic table, checkboxes independent of row selection, direction text, overflow actions, all-attribute read-only details and the existing schema inspector for create/edit/clone. Forms retain dirty drafts, validate before save and announce errors/status.

### Permissions, concurrency and errors

Repository read-only blocks mutations but not writable diagram membership. Diagram read-only blocks membership and reconnect but allows permitted global edits. Unavailable queries show retry independently of empty results; known missing refs remain removable. Failed create membership leaves the repository object intact and offers idempotent retry. Endpoint edit warns before repository save and removes current membership only after success. Other diagrams retain refs for validation. Expected revisions prevent overwrite; conflict offers current version reload while retaining draft. No object bodies enter logs.

### Performance and accessibility

Debounce text and ignore stale responses; page size50, stable canonical keys, batch reference labels, shared pair index and 100000-flow fixture. Table does not render all repository rows. Tab/ShiftTab, Space membership, Enter details, Escape transient layer/search and keyboard resizing remain available; visible focus, field errors and live status are required.

### Alternatives

Copying flow attributes into bundles creates divergent truth; canonical refs are selected. Separate modal dialogs hide the diagram; a unified docked manager is selected. Scanning YAML in React breaks adapter independence/performance; application query/index is selected. Replacing engine history adds conflicts; existing native transactions are selected.

## Risks / Trade-offs

- KA creation broadens writer scope → contract tests for one-source preservation, patterns, duplicate IDs, read-only, revisions and recovery; no deletion added.
- Native gesture transactions differ → real Electron reconnection and single-Undo tests in both engines.
- External Draw.io lacks repository services → metadata remains editable/preserved, manager works in Frade's isolated bridge.
- Derived index can be stale → revision/event invalidation and retry, never stale mutation validation.
- Closed diagrams may retain newly incompatible refs → validate on open without implicit rewrites.

## Migration Plan

Optional membership defaults to []. Existing files and settings stay readable without destructive migration. Update local bridge and renderer together, build desktop and restart. Rollback readers can still render ordinary lines, while new membership metadata must be retained by current Frade for semantics.

## Implementation refinements

The real Core index always reads revision-pinned bounded queryObjects pages, not fullSnapshot. Configured columns support sorting; ALL search boosts eligible rows and ID/name relevance. Every cached search rechecks session authorization; disposal and metamodel change invalidate the service. Membership commands are queued and reconnect compares the captured terminals/members before applying deferred results. Malformed Draw.io refs are preserved until explicit recovery. During dock use, native Draw.io panels hide immediately and restore on close; the active edge remains visible. Derived flow labels are transient and offset above the segment handle, while tool changes are excluded from history. Implementation report and screenshots: docs/diagrams/bundle-integration-flows.md.

### Review corrections: pointer and labels

Host panel resizing uses one captured pointer gesture with a transparent full-window shield, cleanup on release/cancel/lost capture/blur and recovery when buttons are zero. The isolated Draw.io bridge forwards release from the host as native pointerup plus mouseup using the original pointer ID; native gestures reset if released outside the frame. The frame also recovers on zero-button move and blur.

Bundle labels derive from canonical included flows, retain membership order, and update for all edges on load, membership, repository revision and capability changes. Optional capability status names its metamodel field; legacy capabilities infer the configured status column. KA maps status explicitly. Shared formatter supplies •/+/~/- and ? for unknown or missing status, wraps names at approximately 44 characters, and uses four nonbreaking spaces for continuation alignment in SVG/plain text. Native labels contain no HTML and do not change membership/history/files. Double-click resolves a bundle geometrically when the native label hit target is absent.

### Label geometry and alpha

Bundle label backgrounds use #FFFFFFAA (170/255 opacity), leaving glyphs opaque. X6 native label dragging uses absolute offset and relative edge distance, serialized as optional labelPosition without derived text. Runtime annotations retain existing geometry. Draw.io uses native mxGeometry for manual positioning; automatic placement applies only to untouched geometry. Native transactions provide one-step Undo/Redo and read-only restrictions.

### Unrelated shapes and native handle parity

Diagram routing must depend only on the two terminals and user geometry. Obstacle inputs remain compatible but are ignored by floating route, preview and drag APIs. X6 automatic fallback uses orth instead of obstacle-aware Manhattan; explicit computed paths use normal. Third-party add/move/resize never rewrites the edge. The pointer drives the dragged segment continuously without endpoint/obstacle magnet snapping. Draw.io 31.5.2 classic handles supply circle radii 5/6/7, fill #29b6f2, white stroke and selection #00a8ff at 1px dashed. A single adapter owns segment handles, terminal tools and transient selection highlighting for embedded and standalone editors.

X6 rounded connector also rounded bend coordinates to integer pixels. The frade-rounded connector preserves fractional coordinates with the same curve construction, preventing half-pixel jumps across terminal side transitions. Browser and embedded Electron tests inspect the real SVG path during continuous pointer motion.
