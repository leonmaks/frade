# Proposal

## Why

Corporate/offline package delivery, profile portability and policy need factual provenance and safe update consent rather than marketplace promises.

## What Changes

- P07 Registry profiles and policy per Themes-and-Plugins-Spec.md v1.0.
- Preserve domain/routing/dirty data and shared UI contract.
- Planning only; implementation blocked until frade-p06-native-contributions verified/POST-approved/archived/closed and own PRE PASS.

## Capabilities

### New Capabilities

- `extension-registry-profiles`: P07 Registry profiles and policy with explicit compatibility/failure behavior.

### Modified Capabilities

None; existing domain/routing contracts remain intact.

## Impact

Proposed paths: packages/extension-service registry/providers/profiles/policy; packages/extension-contracts DTOs; apps/desktop main authenticated registry/secret handles; packages/ui-workspace/src/extensions profiles/policy UI; isolated integration fixtures. No production edits or compatibility claims follow from artifact existence. Audit baseline HEAD 98f387f96b51b0ad139e3507c376ff1c3e8dec09; use actual approved predecessor closing state before implementation without hiding previous work.
