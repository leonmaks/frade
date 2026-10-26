# Proposal

## Why

Diagram colors currently appear inside theme-dependent editing chrome, so changing the application theme can change the viewing context. The user approved one shared light editing environment for Draw.io and Frade, preserving authored paint and Windows forced-colors precedence.

## What Changes

- Add a fixed, derived light presentation scope for both diagram editors: canvas, editor toolbars, palettes, format panels, flow/reference panels, menus, dialogs, tooltips and editor-owned overlays, including portals outside the editor DOM subtree.
- Keep the external workbench, editor-group tabs, application Settings and global theme picker on the selected application theme. Both density choices remain independent.
- Use one shared editor role projection from existing Frade Light tokens, with canvas `#F9FAFC` and decorative dot color `#CDD3DC`. Preserve authored page backgrounds/images over the neutral workspace.
- Preserve exact authored fill/stroke/text/opacity/gradient attributes and their palette previews. No automatic inversion, tint, theme-driven attribute replacement or document rewrite. Windows forced colors is the explicit system-controlled display exception.
- **BREAKING visual contract:** diagram-owned UI no longer follows Dark/HC/System/reference colors or the reference geometry preset when forced colors is inactive. Global theme identity and transaction revision remain unchanged.
- Establish common appearance/interaction measurements for comparable controls in both engines without claiming support for identical feature sets or universal pixel parity.

## Capabilities

### New Capabilities

- `diagram-editor-presentation`: stable light editing scope, ownership of nested/portaled surfaces, authored-paint fidelity and cross-engine presentation parity.

### Modified Capabilities

- `theme-core`: make local diagram presentation explicit while preserving atomic revision/ACK/rollback and document isolation.
- `workbench-visual-contract`: delimit reference geometry to the external workbench and require shared light diagram-editor measurements.
- `bundled-reference-themes`: disclose the local editor exception to reference fidelity and default-appearance restoration.

## Impact

Planning owner: `codex/frade-light-diagram-editor`, clean baseline `4244e5668e50f74b9b536c2f0ffc44c56279e945`. Existing shared theme adapters, Draw.io bridge and native editor roots are the implementation boundaries; see design.md for the explicit allowlist. No new UI library, resolver, persisted setting or dependency is proposed. P02-P07, routing/domain/vendor sources, branding and historical evidence remain outside scope. PRE and POST use exactly `gpt-6-sol` / `xhigh`, automatically under the existing confined review service.

This request authorizes planning only. Production remains unchanged until a subsequent apply request, strict validation and independent PRE PASS.
