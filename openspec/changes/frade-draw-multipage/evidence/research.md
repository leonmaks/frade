# Draw.io pages research — 27 October 2026

## Sources and limits

- Official manual: https://www.drawio.com/docs/manual/pages/ (insert, duplicate, rename, reorder, remove and undo).
- Official refreshed UI note: https://www2.drawio.com/blog/drawio-editor-update (insert moved to bottom left; page-list/overflow tools).
- Official keyboard reference: https://www.drawio.com/docs/reference/shortcuts/keyboard-navigation/.
- Official source inspected: https://raw.githubusercontent.com/jgraph/drawio/v31.5.2/src/main/webapp/js/diagramly/EditorUi.js.
- Normative local source: existing pinned `apps/desktop/vendor/drawio/styles/grapheditor.css`, `js/app.min.js`, resource strings and retained LICENSE; raw hashes in research/source-provenance.json. Vendor is ignored runtime material on main, not foreign uncommitted Frade source. No vendor bytes copied into production or changed.
- Supplementary live observation: https://app.diagrams.net/?splash=0&storage=device&offline=1 at 606x1128 content viewport; online version is NOT_CONFIRMED and is not a replacement for the pinned runtime comparison. Captured online-dom-observation.json and drawio-online-page-menu.png. No user diagram uploaded; an empty temporary diagram was used.

## Findings

Pinned CSS defines a 32px flex strip spanning the editor, outer padding `0 20px 0 12px`; control width 30px, margins `0 4px`; scroller margins `0 8px` and hidden scrollbar; tab font 13px; page inset 16px; menu icon only on active tab. The online default-size observation agrees: strip 32px, usable tabs 31px with top separator, inactive Page-1 72.125px and active Page-2 78.125px on the observed platform. Absolute widths depend on font/label; these are observations, not platform-independent constants.

Online insert selected a new Page-2 and enabled Undo. Active-page Options exposed Open in New Window, Duplicate Page, Move, Remove Page, Rename Page. Move listed the other page. Pinned source conditions Open in New Window on non-embedded mode, so it is absent from the embedded parity contract. Pinned source duplicates immediately after source, uses localized copy name, remaps cell/link identities and resets zoom/scroll. `removePage` chooses next neighbor, previous when deleting the last indexed page, and inserts/renames an empty first page when removing the only one; the replacement and removal share one model batch. `createPageName` begins at pages.length+1 and avoids occupied names. `renamePage` uses a 300x80 dialog and ignores empty input; duplicate names are permitted. `movePage` executes one model command. Default localized resource strings must be compared on the same language.

## Frade findings and ownership

Native `DiagramEditor` currently owns a single metadata ref and X6 graph; native document format is v1 and contains only `graph`. `loadDocument` validates and atomically replaces cells/viewport, then clears history. `FradeDiagramView` performs separate direct graph serialization during host snapshot/flush; an implementation limited to adding visible tabs would lose other pages. Repository references and flow panels currently refer to active cells and need page-switch refresh/closure. Existing native presentation already projects pinned Light independent of workbench density/theme, including forced-color exceptions. New bottom strip must use this contract.

The source/source-presentation and routing contracts stay independent. No uncommitted routing implementation/package/lockfile changes from main were adopted. Reference parity, complete-document save and global history remain required acceptance criteria, not assumed results.

## Local rendered source witness added after PRE-01

The unchanged local pinned runtime was loaded through a loopback-only host server at 127.0.0.1:8319, Russian Atlas, 1280x720. Its strip measured x=0/y=688/width=1280/height=32; controls measured 30x31 at x=16 and x=54, and page scroller began at x=96. Insert produced a second selected page. The list menu exposed Insert, both pages, Sort Pages and Delete All; context menu exposed standalone Open in New Window, Duplicate, Move, Remove and Rename. See pinned default/two-page/list screenshots, pinned-dom-observation.json and pinned-page-list-observation.json. Pinned DOM icon URLs match raw app.min.js constants Editor.plusImage/menuImage/thinExpandImage/chevronLeftImage/chevronRightImage; their offsets and raw script hash are retained in pinned-icon-source.json. These are actual source observations, not native parity or visual acceptance.
