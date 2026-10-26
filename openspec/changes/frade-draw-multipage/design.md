# Design

## Context

Baseline `e54cf0c1e4e70ed833398c673ea3140b6f10469e`; owning branch `codex/frade-draw-pages`, isolated checkout `E:/dev/codex/frade/.worktrees/draw-pages`. Git common directory `E:/dev/codex/frade/.git`. No uncommitted source/tests/dependencies from main were transferred. Main's existing routing/package/lockfile changes are unrelated and remain there.

`packages/draw/src/editor/DiagramEditor.tsx` owns standalone file controls and one X6 instance. `document/schema.ts` validates only version 1, and `graphAdapter.loadDocument` resets selection/history on file open. `FradeDiagramView.tsx` separately loads and serializes the same active graph for repository Save/Discard, references, appearance and flow UI. Updating only the standalone view would silently omit inactive pages in desktop saves. `diagram-editor-presentation` already mandates pinned Draw.io Light inside both engines independently of outer theme/density; it resolves the general style-guide palette/density question for this scope.

## Goals / Non-Goals

Implement the capability in proposal/spec without replacing X6. Keep routing and existing graph adapter serialization decisions intact. Do not implement print/PDF, page-linked connectors, Draw.io file import, background-page geometry or unrelated toolbar parity. The reference's Open in New Window item is conditionally excluded in its embedded mode, matching Frade's repository embedding; standalone page extraction needs a host-neutral callback/browser flow if exposed, never a dead control. No new feature depends on unfinished R04.

## Decisions

### Document boundary

Keep `DiagramDocument`/`parseDocument`/`graphToDocument` as the version-1 single-graph contract, including its unsupported-version regression. Add a separately named `DrawingDocument` envelope and parser/serializer for v1 or v2. Version 2 is `{format:'frade-draw',version:2,metadata,pages:[{id,name,graph,viewport?}]}`. Validate the entire envelope and every page before loading. Reuse the v1 graph validator for each page rather than duplicate geometry validation. Page IDs are unique within the drawing; cell IDs remain unique within each page. Stable legacy first-page identity derives from document identity. IDs for new pages enter pure operations as arguments generated at the UI/application boundary. Duplicate remaps node, edge and terminal IDs using the new page identity and preserves repository object IDs. No domain algorithm uses randomness or time.

### Session and history

Introduce one application-level drawing session shared by embedded and standalone use. It owns ordered page payloads, active ID, legacy/v2 mode and an in-memory history of immutable before/after semantic states, with unchanged pages structurally shared. Snapshot the active page at native X6 `history:add` committed-command/batch boundaries, never from each pointer move or React render. Restoration uses the existing validated graph loader under a session suppression guard; restoration events cannot become user commands. Route snapshots are reused as serialized by the existing adapter; no route algorithm changes. Navigation captures viewport/session state, activates the requested page and clears transient selection/tools without adding a semantic edit. File open/new/discard reset session and graph history; page switches do not reset document history. Undo/redo buttons and existing keyboard bindings delegate to the same session coordinator while mounted. Preserve standalone `createGraph` behavior for other consumers. Reject navigation/mutation during incomplete invalid graph operations with visible feedback rather than losing content. Test native batch granularity and chronological history before adopting this bridge.

Expose a lifecycle handle for `load`, `snapshot`, page-change subscription and document-change subscription via additive editor props, while retaining `onGraphReady`. Host must load through the session, flush the complete drawing, and subscribe to committed session changes rather than serialize only graph events. Existing repository object/flow logic still operates on the active graph. A page switch closes page-specific flow/reconnect/context UI, updates references and reapplies current object appearance; callbacks are generation-bound. Theme changes and viewport navigation cannot create semantic history entries or rewrite authored cells.

### Presentation and components

Use `.geTabContainer`, `.geTabScroller`, `.geTab`, `.geControlTab`, `.gePageTab`, `.geActivePage` anatomy under the native editor's existing scoped presentation owner. Place the strip in a third editor grid row, across the whole native editor width; keep canvas resize observation. Extend the existing `scripts/ui/drawio-editor-style.mjs` generator with one reusable bounded page-strip asset under `packages/draw/src/editor/generated/`, selecting the relevant pinned rules/variables/resources with explicit mapping/provenance. Both standalone and embedded Draw import that same generated asset through Draw's stylesheet; existing ui-workspace presentation remains canonical for surrounding controls. Do not make Draw depend on ui-workspace (which already depends on Draw), copy feature palettes, introduce a second resolver, or move the whole adapter. Include the new output in existing source/output closure checks. Match icons via existing approved shared resource contract and retained upstream license/provenance. Menus/dialogs use shared ownership/focus contracts and source classes; runtime coordinates only may use inline styling.

FDS applicable: 001–010, 012–014; A11Y 001–009 (010: existing canvas alternative outside changed page surface). Verify one/many/overflow/long Unicode names; active/inactive/hover/focus/menu/dialog/drag/canceled/readonly/loading/error/dirty; outer Light/Dark/HC/System and compact/comfortable; forced colors, 200% text, effective 320px and coarse pointer. Existing diagram-editor-presentation exceptions take precedence over guide default control sizing/outer palette/density. Fresh visual evidence needs human acceptance; no auto-approved baselines.

### Strategy before expensive work

Objective: real multipage `.frade` lifecycle plus pinned bottom-strip behavior/appearance. Evidence: RED then GREEN model/session/interaction tests, desktop all-page save/discard tests, unchanged graph/routing regression tests, pinned reference measurements/screenshots, UI report, actual OpenSpec verify and independent PRE/POST PASS.

Alternatives (forecasts, not measured timings):

| Strategy                                                          | Expected time/resource cost                                    | Risk/dependency                                                         | Decision                        |
| ----------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------- |
| Add tabs only over current one-graph storage                      | ~1–2h, low code/review tokens                                  | Save loses inactive graphs; no valid history                            | Fails acceptance                |
| Replace native X6 editor with Draw.io                             | ~1–2h UI wiring, much larger compatibility work                | Changes native format/API and repository behavior                       | Outside authorized architecture |
| One graph instance per page                                       | ~4–8h, increasing retained DOM/memory                          | Rebind host/theme/bundle lifecycle for every graph; duplicate listeners | Avoid                           |
| One stable graph plus pure pages/session and source-derived strip | ~3–6h implementation/verification, moderate code/review tokens | History bridge and full-document host saves require regression coverage | Selected                        |

Do one bounded source/runtime probe first (about 15–30min forecast) to establish reference and model/host touchpoints. This established a 32px strip and that host saves currently bypass editor file controls. Next reassess at PRE receipt and at the first graph/session integration test. Stop on deterministic failure or unacceptable batch granularity; perform RCA after two unsuccessful fixes per AGENTS. Start with focused model and session tests, then required affected-package suites/general checks once on exact inputs; avoid rerunning large unrelated historical evidence. Reuse verified pinned source bytes, never another feature's PASS. Reference and native comparison use identical local platform/font/state; current online screenshots are supplementary. Runner hard timeouts are transport limits, not success estimates; no measured success probability is available.

### Independent review assignment

User explicitly selected in this chat on 27 October 2026:

PRE: gpt-6-sol / high; POST: gpt-6-sol / high

Stage: `frade-draw-multipage`; both review roles use exact model `gpt-6-sol`, reasoning effort `high`. Independent dispatch/reception uses common workflow release `a6829c6d731b73a23dce8ada25f89d4aa2fb37a1a75e568314e956fa647b3da5`, policy v1.1 SHA256 `6c6cf78fccfc4dac9e53c859715850db127f897e7eb79aa94957134bd1c1ffeb`. Record this plan's raw hash and exact assignment excerpt in each request. `status` returned AVAILABLE in main; owning worktree probe still required. No backend attestation beyond receipt; reported actual model remains NOT_CONFIRMED unless attested.

## Risks / Trade-offs

- History snapshots cost memory proportional to changed page payloads → structural sharing, native committed batches, no whole-document copy per pointer move; record a bounded multi-page interaction probe.
- Legacy host snapshots or object updates drop pages/stale flow state → one complete session handle and desktop save/discard fixtures with distinct inactive-page data.
- Generated CSS has editor-root-dependent selectors → same scoped owner/anatomy, isolated standalone import boundary, actual reference comparison.
- Invalid inactive page fails late → validate all pages before any mutation; rollback graph and session on load failure.
- Required reference/regression or independent gate failure → stop progression and preserve raw evidence.

## Migration Plan

Legacy files open as one page and remain v1 until explicit page structure/name edits. Version 2 is never downgraded by current save; old versions reject it. New/open/discard are atomic and cannot recover a previous document via undo. Deliver a committed isolated checkpoint; push/merge only to a user-authorized destination. Archive only after verification, POST and required visual acceptance.
