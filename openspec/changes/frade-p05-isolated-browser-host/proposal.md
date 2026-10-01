# Proposal

## Why

Executable native Frade browser plugins need isolation and explicit capabilities; a separate process alone is not sufficient.

## What Changes

- P05 Isolated browser extension host per Themes-and-Plugins-Spec.md v1.0.
- Preserve domain/routing/dirty data and shared UI contract.
- Planning only; implementation blocked until frade-p04-icon-registries verified/POST-approved/archived/closed and own PRE PASS.

## Capabilities

### New Capabilities

- `browser-extension-host`: P05 Isolated browser extension host with explicit compatibility/failure behavior.

### Modified Capabilities

None; existing domain/routing contracts remain intact.

## Impact

Proposed paths: packages/extension-host-browser/** (new Worker host); packages/extension-contracts versioned broker DTOs; packages/extension-service lifecycle/grants; apps/desktop/src/main isolated host/protocol/security; named preload host bridge only; security tests. No production edits or compatibility claims follow from artifact existence. Audit baseline HEAD 98f387f96b51b0ad139e3507c376ff1c3e8dec09; use actual approved predecessor closing state before implementation without hiding previous work.
