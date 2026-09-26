# Spec Delta

## Purpose

Defines portable architecture repository data with stable identities and safe validation independently of storage locations and host runtimes.

## ADDED Requirements

### Requirement: CORE-001 Portable domain

The domain SHALL compile without Node, DOM, Electron, React, storage drivers or application dependencies and SHALL reuse existing public metamodel contracts.

#### Scenario: A host dependency is introduced

- **WHEN** a host dependency is introduced
- **THEN** architecture and ES2022-only consumer checks fail

### Requirement: CORE-002 Configurable metamodel

Repository types SHALL be configuration-owned, support existing inheritance, scalar/structured attributes, defaults, enums, references and cardinality, and reject invalid definitions. Lifecycle, readonly/computed, cycle and deletion rules SHALL be explicit validated policies rather than executable external JavaScript.

#### Scenario: A model adds a new type or has cyclic inheritance

- **WHEN** a model adds a new type or has cyclic inheritance
- **THEN** a valid type is available without Core changes and invalid inheritance prevents opening

### Requirement: CORE-003 Stable source identity

Object/relation IDs SHALL remain stable after display renames, reloads, source relocation and index rebuild. External sources without stable IDs SHALL require explicit identity mapping; duplicate IDs SHALL be diagnosed without merging.

#### Scenario: A native record is moved within allowed roots

- **WHEN** a native record is moved within allowed roots
- **THEN** the original qualified reference resolves to the same entity

### Requirement: CORE-004 First-class relations

Relations SHALL have distinct identity, type, endpoints, attributes and revision. Incoming/outgoing views SHALL derive from the same canonical records; retargeting SHALL be explicit and validated.

#### Scenario: A directed relation is created and retargeted

- **WHEN** a directed relation is created and retargeted
- **THEN** both adjacency views agree and invalid endpoint types preserve the original relation

### Requirement: CORE-005 Structured resolution

Reference resolution SHALL distinguish malformed, unsupported, not-found, unavailable and access-denied targets for local and optional cross-repository references. No display-name identity inference is permitted.

#### Scenario: A foreign repository is unavailable

- **WHEN** a foreign repository is unavailable
- **THEN** resolution returns REPOSITORY_UNAVAILABLE rather than ENTITY_NOT_FOUND

### Requirement: CORE-017 Version compatibility and migration

Profile, native format and model versions SHALL be validated before use. Incompatible versions SHALL return SCHEMA_INCOMPATIBLE without destructive conversion. Explicit model migration SHALL have preview, validation and a separately authorized change boundary.

#### Scenario: A repository declares an unsupported major schema version

- **WHEN** a repository declares an unsupported major schema version
- **THEN** opening fails without altering repository files

### Requirement: RE-1 Stable repository-qualified identity

Objects SHALL contain a repository-qualified reference, type ID, name, attributes and opaque revision. Relations SHALL have their own repository-qualified reference and revision, type ID, source, target and attributes. Object and relation identities SHALL occupy separate namespaces. Revisions MUST be compared only for exact equality. Physical resource provenance SHALL remain separate from entity identity and domain attributes.

#### Scenario: Relocate an object resource

- **WHEN** an adapter reports a changed resource location for an existing object
- **THEN** its repository-qualified identity remains unchanged and the new provenance is represented separately

#### Scenario: Reuse local identifiers

- **WHEN** two repositories contain objects with the same local ID and a relation shares that local ID
- **THEN** every resource remains distinguishable by repository, entity kind and local ID

### Requirement: RE-2 Safe bounded entity decoding

The core SHALL decode unknown input into validated caller-independent DTOs and structured diagnostics. It MUST reject malformed fields, blank identities/names/revisions, unknown envelope fields, non-finite numbers, accessors, dangerous keys, custom prototypes, cycles and sparse arrays without executing getters or mutating inputs. It SHALL reject depth above 64 or more than 100,000 visited JSON values per decoded input with a resource-limit diagnostic and no partial success. Type IDs SHALL follow existing metamodel ID rules; reference IDs and revisions SHALL remain opaque nonblank strings without normalization.

#### Scenario: Reject unsafe input

- **WHEN** an entity contains an accessor in nested attributes
- **THEN** decoding fails with a structured diagnostic without invoking the accessor

#### Scenario: Isolate decoded values

- **WHEN** a caller changes the original attributes after successful decoding
- **THEN** the returned entity retains its validated values

### Requirement: RE-3 Explicit model binding and validation projection

Repository snapshots SHALL carry repository identity, an opaque snapshot revision, a completeness declaration and exact model ID/version/fingerprint binding. Projection into metamodel validation SHALL preserve qualified references and relation identity while omitting entity names, revisions and provenance. Neither decoding nor read projection SHALL materialize attribute defaults or change the stored model binding.

#### Scenario: Project a repository snapshot

- **WHEN** a complete bound snapshot is projected for metamodel validation
- **THEN** object and relation references and supplied attributes are preserved without adding defaults or storage metadata

#### Scenario: Reject mismatched binding

- **WHEN** validation is requested with a compiled model whose fingerprint differs from the snapshot binding
- **THEN** validation reports a binding mismatch and no mutation is dispatched
