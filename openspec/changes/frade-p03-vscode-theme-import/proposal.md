# Proposal

## Why

Users need explicit theme-data import with compatibility diagnostics while executable VS Code API support remains outside v1.

## What Changes

- P03 Declarative VS Code theme import per Themes-and-Plugins-Spec.md v1.0.
- Preserve domain/routing/dirty data and shared UI contract.
- Planning only; implementation blocked until frade-p02-transactional-installer verified/POST-approved/archived/closed and own PRE PASS.

## Capabilities

### New Capabilities

- `vscode-theme-import`: P03 Declarative VS Code theme import with explicit compatibility/failure behavior.

### Modified Capabilities

None; existing domain/routing contracts remain intact.

## Impact

Proposed paths: packages/extension-service/src/theme-import/**; packages/extension-service/tests/theme-import/**; packages/ui-workspace/src/extensions import diagnostics; docs/ui import mapping. No production edits or compatibility claims follow from artifact existence. Audit baseline HEAD 98f387f96b51b0ad139e3507c376ff1c3e8dec09; use actual approved predecessor closing state before implementation without hiding previous work.
