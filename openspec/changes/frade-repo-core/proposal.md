# Proposal

## Why

Frade has a verified metamodel domain/compiler and isolated desktop host, but no repository entities, adapter contracts or application services connecting validated architecture data to storage. Repository Core supplies a storage-independent semantic kernel and a verified native filesystem vertical slice, as requested in the 2026-09-24 master prompt.

## What Changes

- Add `@frade/repository-domain`: repository-qualified object/relation identity, opaque revisions, separate resource provenance, model binding and safe bounded DTO decoding.
- Add `@frade/repository-ports`: capability-based adapters/sessions, object and relation readers, pagination/query, writer, change and history ports, cancellation, typed errors and explicit consistency/atomicity guarantees.
- Add `@frade/repository-application`: session orchestration, guarded reads, complete-snapshot metamodel validation and optimistic create/replace/delete commands with operation-result reconciliation.
- Supply in-memory conformance fixtures and executable BDD/property tests for read-only sources, lifecycle, concurrency, cancellation, invalid data and uncertain writes. Fixtures prove contracts, not production persistence.
- Integrate the three packages into existing strict workspace checks and document adapter obligations and phase boundaries.
- Implement native YAML/JSON storage, repository profiles, bounded graph queries, diagnostics, derived SQLite indexing, external-change detection and optional Git versioning.
- Add authorized transport and diagram bridge contracts/integration while preserving standalone Draw. Supply explicit restricted PostgreSQL/remote/federation/search contracts and batch import/export.
- Record CORE-001 through CORE-020, ADRs, requirement-linked BDD, isolated storage tests, fault recovery, performance measurements and gate evidence.
- Add opt-in native v2 immutable paged JSONL storage with a revision-pinned manifest, rebuildable disk-backed validation/query catalog and bounded delta writes. The user approved this expansion on 2026-09-24; native v1 and its decoding limits remain compatible, and no existing repository is migrated automatically.

## Capabilities

### New Capabilities

- `repository-entities`: stable identity, revisions, provenance and validated architecture DTOs.
- `repository-ports`: host-neutral capability negotiation, sessions, reads, optional services and mutation guarantees.
- `repository-commands`: validation/permission/revision orchestration and explicit mutation outcomes.

### Modified Capabilities

None. Existing workspace and quality-gate requirements apply unchanged to the new packages.

## Impact

New packages: `packages/repository-domain`, `packages/repository-ports`, `packages/repository-application`. Production dependencies point toward public domain/port/metamodel exports only. Existing reference and model-binding types are reused without modifying their APIs. Root BDD scripts, dependency-boundary checks, lockfile and documentation gain the new packages using existing pinned development tooling.

The existing three capability areas cover the expanded scope: entities own identity/metamodel/integrity; ports own profiles/storage/index/versioning/transport/bridge contracts; commands own query/mutation/event/authorization semantics. Production adapters and integrations are now in scope. PostgreSQL implementation is conditional on an available local test DB and migration infrastructure; otherwise explicit restricted contracts and executable conformance tests are required. Closed external schemas must not be invented. Existing Draw JSON Save/Open remains compatible. Navigator/Inspector UI and automatic destructive model migrations are not requested.
