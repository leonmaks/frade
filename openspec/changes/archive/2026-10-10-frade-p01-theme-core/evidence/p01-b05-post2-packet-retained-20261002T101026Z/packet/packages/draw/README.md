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
