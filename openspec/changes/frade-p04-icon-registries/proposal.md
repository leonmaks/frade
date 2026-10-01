# Proposal

## Why

Independent theme/icon settings require safe icon contributions without mixing command icon families or executing assets.

## What Changes

- P04 File and product icon registries per Themes-and-Plugins-Spec.md v1.0.
- Preserve domain/routing/dirty data and shared UI contract.
- Planning only; implementation blocked until frade-p03-vscode-theme-import verified/POST-approved/archived/closed and own PRE PASS.

## Capabilities

### New Capabilities

- `icon-registries`: P04 File and product icon registries with explicit compatibility/failure behavior.

### Modified Capabilities

None; existing domain/routing contracts remain intact.

## Impact

Proposed paths: packages/extension-contracts icon DTOs; packages/extension-service icon validators/registries; packages/ui-workspace/src/design/icons/**; applicable navigator binding through approved leaf boundary; test fixtures. No production edits or compatibility claims follow from artifact existence. Audit baseline HEAD 98f387f96b51b0ad139e3507c376ff1c3e8dec09; use actual approved predecessor closing state before implementation without hiding previous work.
