# Proposal

## Why

The archived foundation advertises document lifecycle compatibility, but the UI currently drops shape identity, styling, viewport and edited route geometry on Save/Open. Correct this gap before embedding Draw in Electron, with browser evidence exercising real file controls.

## What Changes

- Preserve supported shape identity, node/edge styles, labels, ports, full route vertices, terminal offsets and viewport through version-1 JSON documents.
- Add Save As naming, retain opened document metadata, reset history on New/Open, and report invalid files without replacing the active graph.
- Validate duplicate IDs, references, geometry and optional document fields before graph replacement; keep legacy version-1 documents readable.
- Add unit and actual browser file round-trip coverage, including post-load editing and failure preservation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reusable-draw-package`: Specify complete document round trips, Save As naming, validation and atomic open behavior explicitly.

## Impact

Draw document schema/adapters, editor file actions and tests. Additive version-1 fields keep old files readable; no new dependencies or routing-policy changes. The original frade-draw directory remains untouched.
