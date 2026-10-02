## Context

The repository is greenfield. The requested product is a standalone local diagram editor, with AntV X6 3.1.8 as its sole graph engine. It must favor Draw.io-like floating contour attachments and direct orthogonal segment manipulation over fixed-port-only editing. See proposal.md and the capability specs for behavioral contracts.

## Goals / Non-Goals

**Goals:**

- Keep the X6 graph as the authoritative mutable cell model while React owns only UI and selection projection.
- Maintain one document schema, one routing configuration, one X6 History integration, and one pure shared geometry validator.
- Resolve floating terminals against actual supported contours and construct terminal escapes before routing.
- Prove both model geometry and actual SVG behavior in Chromium.

**Non-Goals:**

- A backend, accounts, collaboration, repository-domain types, Git synchronization, or automatic graph layout.
- Universal Manhattan-normal behavior for arbitrary rotated or curved shapes. MVP supports axis-aligned rectangular, rounded-rectangular, diamond, ellipse, and text shapes; rectangle-like shapes use exact contour/normal policy. Non-rectangular shapes use X6 boundary attachment plus an explicit compatibility policy validated by spike results.
- Self-loop editing, ELK relayout, or edge labels unless a later spec extends this change.

## Decisions

### D1: One X6 graph with a thin editor controller

The React shell owns controls and lifecycle. A single `createGraph(container, options)` factory owns graph configuration, plugins, events, and disposal; an editor controller owns commands, document lifecycle, and selection. React will not mirror all cells after every mutation. This avoids divergent state while permitting conventional React UI.

### D2: Versioned local document adapter

Documents persist `{ format, version, metadata, graph, viewport? }`. Node and edge records are domain-neutral. Edges persist terminal attachment mode (`floating` with node ID or `fixed` with node ID plus port ID) and canonical manual constraints rather than hover state, pointers, or router-produced bends. Parsing validates into a candidate document before replacing the current graph. Download/upload is the portable baseline; File System Access is optional enhancement.

### D3: Floating attachment resolver before X6 Manhattan routing

The X6 spike is an explicit first implementation task. It tests `anchor: center`, `connectionPoint: boundary`, `manhattan`, `rounded`, and native `segments` against actual X6 3.1.8 behavior. The default persisted floating terminal names only its node; the resolver proposes sides, points, and outward normals from current constraints and geometry. For rectangle sides: left (-1,0), right (1,0), top (0,-1), bottom (0,1). Source uses its outward normal; target uses the inverse. A deterministic side score plus hysteresis prevents flicker. Fixed ports bypass this resolver.

X6 supplies rendering, edge lifecycle, boundary helpers, router, connector, and events. If its router cannot retain a requested segment coordinate or terminal-direction contract, a constrained route adapter supplies canonical vertices to X6 rather than replacing the graph engine. The shared validator decides acceptance; an X6 fallback is never accepted solely because it rendered.

### D4: Native segments spike, then minimal adapter choice

The native `segments` tool is tested before custom code with candidate values `{ precision: 0.5, threshold: 20, snapRadius: 10, removeRedundancies: false }`. Native tool is retained only if it keeps the real edge visible, preserves connector/style/terminals, supports atomic history and persistence, and gives valid live routes. Otherwise an adapter/custom overlay derives handles from the real logical polyline and changes constraints on the same edge. This preserves the requested UX without assuming undocumented APIs.

### D5: Segment drag uses immutable session semantics

`RouteSnapshot` is normalized to remove duplicate/zero-length/collinear points before extracting segment orientation and eligibility. A drag session stores edge ID, original route and constraints, semantic segment identity, orientation, start pointer, requested coordinate, and last valid route. Pointer movement is projected to one graph axis, snapped only on that axis, and computed relative to drag start. RAF coalesces updates; pointerup flushes the final pending update. The active handle remains session-owned until commit/cancel, then all handles are derived again.

Straight floating edges first attempt to slide both attachments on their current sides; only out-of-range or blocked movement introduces a local orthogonal detour. Floating terminal segments may slide an attachment. Fixed terminal stubs remain protected. Every candidate passes terminal policy, obstacle, intersection, normal-direction, and requested-coordinate checks; invalid candidates leave the last valid edge rendering intact.

### D6: Normalization and X6 History boundaries

Commit normalizes canonical constraints and validates again. One drag is wrapped in one existing X6 history batch/transaction; cancel restores the captured initial state without an entry. Save/load re-resolves floating attachments from current node geometry and restores fixed/manual legacy edges without migration-induced corruption.

### D7: Browser verification is integration evidence, not the only oracle

Vitest covers pure geometry, resolver, constraints, state machines, document parsing, and history adapters. Gherkin feature files map requirement IDs to executable Vitest-backed steps. Playwright owns the only browser harness. A test-only Vite page reuses production graph/routing/segment code and exposes `window.FRADE_VISUAL_TEST`; `waitForStable` observes model/view activity and two animation frames with a bounded timeout. Browser tests assert route, attachments, SVG, style and screenshots separately.

## Risks / Trade-offs

- [X6 3.1.8 native segments cannot meet live-render or floating-terminal contracts] → Complete the documented spike first; select an adapter/custom tool only with concrete failed contract evidence.
- [X6 router fallback creates loops or crosses obstacles] → Validate every resolved route, retain diagnostics and last valid geometry rather than accepting fallback.
- [Rounded and ellipse contours conflict with strict Manhattan normals] → Keep logical polyline distinct from rendered rounded path and apply explicitly documented supported-shape policy.
- [Browser geometry APIs differ from model vertices] → RouteSnapshot adapter is verified against real rendered X6 view in Chromium before becoming the test oracle.
- [History emits an entry per pointer event] → Run mutations in one batch and regression-test 100 pointer moves.

## Migration Plan

1. Initialize the new local application and baseline document schema.
2. Deliver foundational graph/document behavior, then connection/routing behavior and visual harness before segment editing.
3. Load legacy vertex edges as manual geometry; preserve their terminal representation. Convert only upon a successful segment-edit commit when required by the chosen canonical constraint representation.
4. No deployed service migration or rollback is required; local JSON validation rejects incompatible versions without overwriting the current document.

## Open Questions

None. The native X6 behavior is an implementation spike with a predetermined decision gate rather than an unresolved product requirement.
