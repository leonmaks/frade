# Proposal

## Why

Hot theme selection requires safe local package registration and recovery, not opening a sample ZIP as if it were an integration.

## What Changes

- P02 Transactional declarative installer per Themes-and-Plugins-Spec.md v1.0.
- Preserve domain/routing/dirty data and shared UI contract.
- P01 is now physically archived, independent POST-approved and published. P02 implementation remains blocked until its fresh exact-model PRE PASS.

## Capabilities

### New Capabilities

- `extension-installer`: P02 Transactional declarative installer with explicit compatibility/failure behavior.

### Modified Capabilities

None; existing domain/routing contracts remain intact.

## Impact

Proposed paths: packages/extension-contracts/** (new platform-neutral leaf); packages/extension-service/** (new host service); apps/desktop/src/main extension installer adapter; packages/ui-workspace/src/extensions/**; corresponding tests/fixtures and runtime-contracts/preload named methods. No production edits or compatibility claims follow from artifact existence. Audit baseline HEAD 98f387f96b51b0ad139e3507c376ff1c3e8dec09; use actual approved predecessor closing state before implementation without hiding previous work.

## Accepted integration checkpoint

Human acceptance: [p02-integration-scope-accepted-20261010T002712Z.json](decisions/p02-integration-scope-accepted-20261010T002712Z.json), exact proposed SHA256 e0821a4e7e1676e772a191061c94e3fc6384df2fd82cbfd62251ce6ffd33c947. Scope is the exact path-and-purpose table in [P02-INTEGRATION-SCOPE-01](decisions/p02-integration-scope.proposed.md), including bounded existing Workbench/P01 controller/boot/Main/preload/check integration. Original proposed document stays immutable; its PROPOSED marker is superseded only by the exact accepted decision. Owning current baseline 0ecaf44938382bd8daa7d512887dda8a8ee9b372; original98f387f96b51b0ad139e3507c376ff1c3e8dec09 preserved. P02 consumes P01; Routing remains independent. Stage PRE and POST: gpt-6-sol/xhigh. No P03–P07 product implementation.
