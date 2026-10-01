# Proposal

## Why

Plugins need stable commands, schema-rendered views, settings and custom editor lifecycle using Frade contracts, not arbitrary UI injection.

## What Changes

- P06 Native contribution APIs per Themes-and-Plugins-Spec.md v1.0.
- Preserve domain/routing/dirty data and shared UI contract.
- Planning only; implementation blocked until frade-p05-isolated-browser-host verified/POST-approved/archived/closed and own PRE PASS.

## Capabilities

### New Capabilities

- `native-contribution-api`: P06 Native contribution APIs with explicit compatibility/failure behavior.

### Modified Capabilities

None; existing domain/routing contracts remain intact.

## Impact

Proposed paths: packages/extension-contracts public API DTOs; packages/extension-service contribution registry; packages/ui-workspace/src/design/commands/** and schema views/editors; apps/desktop broker integration; public consumer/type/security/UI tests. No production edits or compatibility claims follow from artifact existence. Audit baseline HEAD 98f387f96b51b0ad139e3507c376ff1c3e8dec09; use actual approved predecessor closing state before implementation without hiding previous work.
