# Proposal

## Why

Empty diagram bundles already connect repository systems, but cannot select or manage their canonical integration flows. Users need one manager to discover both directions and manage diagram membership independently from repository existence.

## What Changes

- Add a resizable docked manager in Frade Draw and native Draw.io, with entry points, counts, schema-driven details/forms, search, filters and pagination.
- Add configurable Integration Flow semantics and an endpoint-pair index in Repo Core; reuse canonical ObjectRef, authenticated commands, revisions and events.
- Persist only flow references in bundles. Membership, bulk selection and endpoint reconnection use native diagram undo transactions.
- Implement repository create/edit/reverse/clone, permissions, conflicts, broken references and guarded endpoint changes.
- Extend the current KA adapter's conservative writer to create objects in one authorized source collection with existing durability/recovery.

## Capabilities

### New Capabilities

- bundle-integration-flow-management: independent repository flow lifecycle and diagram membership in both engines.

### Modified Capabilities

None. Existing reusable-draw requirements remain valid; optional bundle metadata is backward compatible.

## Impact

repository-domain/application/api, metamodel-config, adapter-sberea-yaml, runtime-node, ui-inspector/workspace, draw persistence and isolated Draw.io bridge. No new UI library, analytics dependency, repository deletion, hierarchical expansion or direct YAML access in UI.
