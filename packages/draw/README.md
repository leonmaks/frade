# Frade Draw

Standalone local-first diagram editor built on React, TypeScript, Vite and AntV X6 3.1.8. It has no backend or architecture-repository dependency.

## Commands

From the monorepo root:

```text
pnpm install --frozen-lockfile
pnpm dev:draw
pnpm --filter @frade/draw test
pnpm --filter @frade/draw typecheck
pnpm --filter @frade/draw build
pnpm test:e2e
pnpm test:visual:update
pnpm test:bdd
```

React hosts import `DiagramEditor` and `DiagramEditorProps` from `@frade/draw`, plus `@frade/draw/styles.css`. Production consumers do not receive the browser-only `FRADE_VISUAL_TEST` harness.

The editor currently provides a local X6 canvas, rectangle/rounded rectangle/ellipse/diamond/text shapes, node magnets, Manhattan + rounded connections, selection, resize, keyboard history, JSON Save/Open, SVG/PNG export, and shared floating/route/segment geometry modules.

## Testing

Vitest covers document validation, graph lifecycle, floating/fixed rectangle attachments, terminal direction, obstacle-aware Manhattan routing, segment extraction, RAF-coalesced drag, persistence and history. Playwright Chromium covers the X6 3.1.8 boundary/segments spike, real SVG path, live drag, floating attachments, obstacle routing, reconnect, and ten screenshot baselines.

## Current limits

The editor targets axis-aligned rectangular terminal geometry for strict floating Manhattan normals. Ellipse, diamond and text shapes use the X6 boundary policy; they do not promise a geometric normal that is simultaneously exact and Manhattan at every contour point. Self-loop editing, ELK layout and edge-label editing are intentionally outside this change.

## Pages and complete drawings

The bottom strip uses the pinned Draw.io 31.5.2 Light presentation: Insert, tab navigation,
Rename (double click or menu), Duplicate, Move/drag, Remove, page list, natural Sort Pages,
Delete All, overflow scrolling and standalone Open in New Window. Arrow/Home/End move tab
focus; Enter/Space activate; Shift+F10 opens the page menu. Menus support arrows, Enter,
Escape and Tab. Move provides the keyboard alternative to dragging. Readonly keeps page
navigation available and rejects graph/page/history mutations. The scoped page stylesheet
is imported by the component, including embedded consumers; it uses the same source adapter
as the Workbench. Vendor source/provenance and the jgraph/drawio attribution are retained.

`DiagramDocument`, `parseDocument`, `serializeDocument`, `graphToDocument` and `loadDocument`
retain their v1 single-graph contracts. Use `DrawingDocument`, `parseDrawingDocument`,
`serializeDrawingDocument` and `deserializeDrawingDocument` for complete drawings. Both the
package root and `@frade/draw/document` export the complete-drawing codecs.

An unchanged legacy document stays v1. The first explicit page operation produces v2:

```json
{
  "format": "frade-draw",
  "version": 2,
  "metadata": { "id": "drawing", "name": "Architecture" },
  "pages": [
    {
      "id": "overview",
      "name": "Overview",
      "graph": { "nodes": [], "edges": [] }
    },
    {
      "id": "details",
      "name": "Details",
      "graph": { "nodes": [], "edges": [] }
    }
  ]
}
```

Every page uses the existing graph schema and optional `{zoom, pan:{x,y}}` viewport.
Validation covers all pages before replacing a session. Page IDs must be nonempty and
unique; page names must be nonblank and may repeat. Cell IDs are page-local. Duplicate
remaps cell/terminal IDs and preserves supported repository references. Older v1-only
readers reject v2; they must adopt the complete-drawing codec rather than read its active
graph. Removing the final page or Delete All creates an empty first page in one undo action.

`DiagramEditorProps.initialDocument` is consumed when the editor session is created.
`onGraphReady(graph, session)` adds a `DrawingSession` handle; old one-argument callbacks
remain valid. Keep the callback identity stable (for example with React `useCallback`) to
retain the mounted graph. A callback can return its integration cleanup function.

The session exposes `load`, `snapshot`, `view`, `select`, page commands, `undo`/`redo`,
`setReadOnly` and `subscribe`. Subscribe to `change` for semantic dirty events; `page` and
`load` refresh page-specific host UI; `readonly` updates command availability. Hosts save
`serializeDrawingDocument(session.snapshot())`, and load/discard through `session.load()`.
Do not serialize the active X6 graph as the whole file. The repository filesystem service
validates the same full envelope while retaining path, size, revision and atomic-write rules.

Graph batches and page operations share chronological undo/redo. Navigation saves each
page's viewport without adding an undo action. File New/Open/Discard clears history and
loads the first page. Active selection, drag/menu/dialog state and the active page ID are
transient. `drawingContentKey` ignores viewport/formatting/object-key-order differences,
while preserving metadata, all page IDs/names/order and authored graph content for dirty
comparison. This does not change v1 serialization or the XML dirty comparator.

Standalone Save/Open/Save As round-trip the entire drawing (`.frade.json` downloads).
Open in New Window copies one selected page as a v2 drawing with a new document ID and
retained page name, ID, content, references and viewport. It uses a same-origin, one-shot
transfer removed on consumption or after 60 seconds; blocked popups report an error and
remove the transfer. Embedded mode omits that command. Popup edits never write back.

Fine-pointer defaults match source geometry and text rendering; explicit accessibility
exceptions enlarge the active options target from 20px to 24px and the label hit area from
17px to its 31px tab height, without moving the text. Coarse pointers, 200% text and forced
system colors take the documented accessibility priority over pinned chrome.

Rename uses the source 348×128px outer dialog. The input target increases from 21px
to 24px, moving its action row down by 3px; the close target increases from 20px to
24px while keeping its original corner and glyph placement. Its backdrop follows
the same pinned editor presentation. These are tested, enumerated accessibility
exceptions rather than pixel-identical claims.

Embedding hosts may supply `DiagramEditorProps.pageOverlays` to portal page menus
and Rename into their existing managed overlay host. The adapter registers focus,
modal ownership and cancellation with that host; Frade's integration also supplies
the editor appearance lease and participates in its theme commit barrier. Standalone
Draw uses a native modal dialog. Draw has no dependency on the Workbench package.
