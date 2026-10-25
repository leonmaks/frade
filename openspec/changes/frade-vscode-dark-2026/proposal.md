# Proposal

## Why

The user requests an offline selectable VS Code Dark 2026 with the closest measurable appearance in Frade. Existing Frade exposes only its three built-in palettes and coarse semantic roles; original theme data does not specify workbench geometry.

## What Changes

- Preserve the complete pinned Microsoft theme/include closure and MIT notice, register stable ID frade.reference/vscode-dark-2026 with label VS Code Dark 2026 using the existing resolver/picker/settings.
- Add a first-party presentation preset scoped exclusively to that ID, covering existing shell, tree/tabs, shared controls/forms and managed overlays. Preview/cancel/commit and restoration include the preset.
- Translate upstream colors with explicit per-surface alpha composition, semantic mapping, accessibility diagnostics and complete supported/retained/unmapped inventory. Preserve syntax data without claiming a nonexistent syntax consumer.
- Keep Frade Light/Dark/HC/System, both densities, default selection and authored/persisted domain paint unchanged. No P02 installer or general P03 import dependency.

## Capabilities

### New Capabilities

- bundled-reference-themes: Provenance-preserving first-party reference palettes and compatibility evidence.

### Modified Capabilities

- workbench-visual-contract: Opt-in theme-ID-scoped geometry contract and measured fidelity boundaries.

## Impact

Exact paths/purposes are in design.md. New source/generated data and preset CSS; bounded registry/root projection/style imports; new tests/generator/compliance hooks and docs only. No dependency additions, icons/brand replacement, vendor, routing/domain, diagram authored geometry, P02 implementation or old test/evidence edits. User geometry/model decisions are recorded in evidence/planning-20261025/user-authority.json.
