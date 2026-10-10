# Proposal

## Why

Hot theme selection requires safe local package registration and recovery, not opening a sample ZIP as if it were an integration.

## What Changes

- P02 Transactional declarative installer per Themes-and-Plugins-Spec.md v1.0.
- Preserve domain/routing/dirty data and shared UI contract.
- Planning only; implementation blocked until frade-p01-theme-core verified/POST-approved/archived/closed and own PRE PASS.

## Capabilities

### New Capabilities

- `extension-installer`: P02 Transactional declarative installer with explicit compatibility/failure behavior.

### Modified Capabilities

None; existing domain/routing contracts remain intact.

## Impact

Proposed paths: packages/extension-contracts/** (new platform-neutral leaf); packages/extension-service/** (new host service); apps/desktop/src/main extension installer adapter; packages/ui-workspace/src/extensions/**; corresponding tests/fixtures and runtime-contracts/preload named methods. No production edits or compatibility claims follow from artifact existence. Audit baseline HEAD 98f387f96b51b0ad139e3507c376ff1c3e8dec09; use actual approved predecessor closing state before implementation without hiding previous work.
