# Spec Delta

## Purpose

Defines adapter capabilities, session lifecycles and consistency guarantees that let repository services operate across different storage systems without host dependencies.

## ADDED Requirements

### Requirement: V2-001 Immutable bounded native pages

Native v2 SHALL store explicit canonical entities in bounded content-addressed JSONL pages selected by a versioned manifest. It SHALL preserve native v1 behavior, reject duplicate IDs/hash mismatches/unsafe paths and keep per-entity decoder limits unchanged.

#### Scenario: Read across page boundaries

- **WHEN** a valid repository exceeds the aggregate snapshot DTO budget
- **THEN** it opens through the paged path and stable references resolve without loading the graph into memory

### Requirement: V2-002 Complete streaming integrity

Opening and structural changes SHALL validate complete pinned source content using bounded iteration and rebuildable disk-backed facts. Existing metamodel attribute, reference, inheritance, endpoint, duplicate and cardinality semantics SHALL be preserved; unsupported policy features SHALL fail explicitly.

#### Scenario: Resolve a target in a later page

- **WHEN** a relation or attribute references a target in another page
- **THEN** validation resolves the complete pinned catalog and rejects missing or forbidden targets without source changes

### Requirement: V2-003 Equivalent bounded indexed reads

Paged reads SHALL use equivalent portable predicates, deterministic ordering and kind/session/query/revision-scoped cursors. Point and adjacency reads SHALL use indexed candidates, and excessive fallback work SHALL return RESOURCE_LIMIT rather than partial success.

#### Scenario: Compare paged and native v1 queries

- **WHEN** the same supported query is run on equivalent v1 and v2 fixtures
- **THEN** ordered entities agree, and stale/cross-session cursors fail explicitly

### Requirement: V2-004 Guarded delta publication

Changes SHALL pass application authorization/idempotency and complete validation, then recheck guards within a cooperating writer lock. Immutable pages SHALL be staged before one manifest swap; failed or interrupted publication SHALL retain source/recovery evidence and never claim partial success as SUCCESS.

#### Scenario: Interrupt publication

- **WHEN** a writer stops before or after the manifest swap
- **THEN** readers see a coherent old or new manifest or RECOVERY_REQUIRED, and explicit recovery never discards source evidence

### Requirement: V2-005 Explicit adoption and runtime compatibility

Native v2 SHALL be opt-in and routed only from host-owned validated profiles. Creating/exporting v2 SHALL not overwrite v1 or existing destination data; semantic exports SHALL disclose source-format preservation limitations.

#### Scenario: Keep an existing YAML repository

- **WHEN** native v2 support is installed and a v1 repository is opened
- **THEN** its format, identities and preservation guarantees remain unchanged without automatic migration

### Requirement: V2-006 Measured capacity evidence

Small/Medium/Large measurements SHALL record hardware, all requested operations and memory with explicit failures. Passing a small fixture SHALL not be presented as acceptance of the larger workloads.

#### Scenario: A large operation cannot complete

- **WHEN** a measured operation fails or exceeds a configured safety budget
- **THEN** evidence records its failure and dependent measurements as blocked, not successful

### Requirement: CORE-010 Profiles sessions and adapters

Versioned profiles SHALL define identity, adapter connection, model/mapping/policy refs, access, indexing, versioning and authentication refs. Exported profiles SHALL omit credentials. Opening SHALL validate compatibility before READY. Session state transitions, read-only behavior, cancellation and cleanup SHALL follow the normative session rules. Capabilities SHALL reflect verified services including batch/atomic/watch/history/transactions/cross-repository/server-query/model features.

#### Scenario: A read-only profile is opened and closed

- **WHEN** a read-only profile is opened and closed
- **THEN** queries are permitted, mutations perform zero writes and close releases watchers/connections

### Requirement: CORE-011 Native storage preservation and containment

Native YAML/JSON storage SHALL define a versioned format and explicit schema mapping for roots, patterns, discrimination, IDs, attributes, relations, references and serialization. It SHALL reject unsafe containment, symlink escape, malformed YAML, duplicates, incompatible versions and stale writes. Claimed preservation SHALL retain unknown metadata/comments; unsupported transformations SHALL be refused. External partial mappings SHALL remain read-only.

#### Scenario: A known attribute in a YAML document with unknown metadata and comments is updated

- **WHEN** a known attribute in a YAML document with unknown metadata and comments is updated
- **THEN** supported writes preserve unrelated content; unsafe constructs leave source bytes unchanged

### Requirement: CORE-012 Derived index consistency

A local SQLite index SHALL be reconstructible from source, include qualified identities/types/searchable attributes/reverse edges/source revisions, support rebuild and verified incremental update, detect corruption/out-of-sync state and never be sole storage for domain changes.

#### Scenario: Indexing fails after source persistence

- **WHEN** indexing fails after source persistence
- **THEN** the command remains committed, index is OUT_OF_SYNC and rebuilding restores equivalent queries without replay

### Requirement: CORE-014 Standalone diagrams

Draw SHALL operate without Repo Core. Bridge bindings SHALL support UNBOUND, BOUND, STALE, UNRESOLVED, DETACHED and CONFLICTED states, object/relation resolution, cached snapshots, subscription, detach and reconciliation. Multiple visual instances SHALL be able to bind the same object.

#### Scenario: A diagram's repository becomes unavailable

- **WHEN** a diagram's repository becomes unavailable
- **THEN** cached content remains renderable/editable and repository mutation is unavailable

### Requirement: CORE-015 Independent visual state

Geometry, visual overrides and diagram deletion SHALL be independent of domain attributes. Reconnect SHALL compare revisions and preserve overrides. Status-driven style SHALL refresh only non-overridden properties. Repo Core SHALL not own draw.io serialization.

#### Scenario: A detached bound node is moved/recolored and reconnected after a domain change

- **WHEN** a detached bound node is moved/recolored and reconnected after a domain change
- **THEN** the domain remains unchanged by visual edits, stale binding is reported and local overrides survive

### Requirement: CORE-016 Controlled runtime and resource bounds

Desktop and Web SHALL expose typed authorized application operations through controlled host boundaries. Renderer SHALL have no unrestricted filesystem/database access. I/O SHALL have host cancellation/deadlines; queries and payloads SHALL be bounded, errors redacted and resources closed. Performance evidence SHALL record synthetic sizes, hardware, measurements and failures rather than assert unmeasured budgets.

#### Scenario: A transport payload attempts to supply an arbitrary path or unlimited query

- **WHEN** a transport payload attempts to supply an arbitrary path or unlimited query
- **THEN** the operation is rejected without privileged I/O and returns a sanitized error

### Requirement: CORE-018 Offline and explicit versioning/extensions

Core/native storage SHALL operate without cloud, AI, internet or Git. Optional Git SHALL expose status, changed paths, current revision, history, conflicts and explicit commit; ordinary mutations SHALL never commit/push. PostgreSQL/remote/federation/search contracts SHALL state verified restrictions and share executable conformance tests; batch import/export SHALL validate before mutation.

#### Scenario: A native non-Git repository is edited offline

- **WHEN** a native non-Git repository is edited offline
- **THEN** the operation succeeds with no cloud or versioning request

### Requirement: CORE-020 Recoverable write boundaries

Native writes SHALL stage safely, sync as supported, check revisions immediately before replacement and detect unfinished recovery journals on reopen. Multi-file atomicity SHALL not be claimed without implementation; partial/unknown outcomes SHALL be explicit. Index/event failures after source commit SHALL not trigger replay or false rollback. Recovery SHALL preserve user content.

#### Scenario: A write is interrupted before finalization and repository is reopened

- **WHEN** a write is interrupted before finalization and repository is reopened
- **THEN** the incomplete operation is diagnosed, healthy writable state is withheld and source data is retained

### Requirement: RP-1 Host-independent capability contracts

Repository adapters SHALL expose session-based object/relation reading with explicit optional query, writer, change and history services. Capabilities SHALL describe supported filters, pagination, snapshot consistency, guarded writes, atomic batch support and outcome reconciliation. Advertised capabilities MUST match available services. Read-only and nontransactional adapters SHALL be valid. Unsupported operations MUST return a typed unsupported or read-only result without invoking missing services or silently emulating weaker guarantees. Public contracts MUST compile without Node, DOM or Electron ambient types.

#### Scenario: Open a read-only source

- **WHEN** a source exposes readers but no writer
- **THEN** reads succeed and a mutation returns read-only without accessing storage writes

#### Scenario: Detect contradictory capabilities

- **WHEN** a source advertises atomic writes without the corresponding writer service
- **THEN** opening the session fails with an adapter-contract error and releases the returned session

### Requirement: RP-2 Session lifecycle and cancellation

Sessions SHALL own their operations and subscriptions and support idempotent close. Cancellation SHALL use a host-neutral contract. Cancellation before dispatch MUST avoid adapter I/O; cancellation or close during an outstanding read MUST settle the caller and prevent late result publication. Closing a session SHALL release subscriptions and invoke adapter close once. Late successful open results after cancellation SHALL be closed. Adapter failures MUST be sanitized into typed errors. An adapter that ignores cancellation MUST NOT keep a read caller waiting indefinitely after cancellation.

#### Scenario: Close during a read

- **WHEN** a session closes while an adapter read is outstanding
- **THEN** the caller receives session-closed, subscriptions are released and a late adapter response is ignored

#### Scenario: Cancel session opening

- **WHEN** opening is cancelled before a delayed adapter session is returned
- **THEN** the caller receives cancelled and the delayed session is closed without becoming usable

### Requirement: RP-3 Bounded and revision-aware reads

Point reads SHALL distinguish missing resources, repository mismatch and malformed adapter data. Paged reads SHALL carry bounded page sizes from 1 to 1,000, opaque continuation cursors and a source snapshot revision. Cursors SHALL be bound to session, query and snapshot; changed inputs or stale snapshots MUST fail explicitly rather than silently skipping or duplicating data. Query/history services SHALL reject unsupported filters. Public results MUST be defensive values and MUST NOT imply that one page is a complete repository snapshot.

#### Scenario: Continue a query after repository changes

- **WHEN** a caller uses a continuation cursor whose source revision is stale
- **THEN** the query returns a stale-cursor error without returning a mixed-revision page

#### Scenario: Reject malformed adapter output

- **WHEN** a reader returns an object from the wrong repository or an oversized page
- **THEN** the application boundary rejects the response with an adapter-contract error

### Requirement: RP-4 Explicit mutation guarantees

Writer contracts SHALL specify single-resource or atomic-batch guarantees, expected entity revisions or create-if-absent conditions, expected snapshot revision, operation ID and result reconciliation. A guarded writer MUST check entity preconditions and the snapshot revision atomically with persistence. Multi-resource commands MUST require atomic-batch support and MUST NOT be implemented as sequential single writes. A writer without guarded snapshot support SHALL remain representable but MUST be rejected by invariant-validating commands. Reconciliation SHALL distinguish committed, not-committed, pending and unknown outcomes within a declared session-scoped retention contract.

#### Scenario: Detect a concurrent unrelated relation change

- **WHEN** a relation changes after validation while the target object's own revision remains unchanged
- **THEN** the guarded commit rejects the stale snapshot and writes nothing

#### Scenario: Reject an unsupported batch

- **WHEN** a multi-resource command targets a single-resource writer
- **THEN** the command returns unsupported without performing any constituent write

### Requirement: RP-5 Change and history service semantics

Change subscriptions SHALL report adapter-originated committed changes with repository identity and monotonic session sequence, or explicit invalidation when continuity is lost. Unsupported history SHALL NOT be represented as an empty successful history. Unsubscribe and session close MUST prevent subsequent callbacks. Listener exceptions MUST NOT fail an already committed operation or prevent delivery to other listeners. History cursors SHALL follow the same scoped paging rules as queries.

#### Scenario: Lose event continuity

- **WHEN** the adapter reports a gap in its change sequence
- **THEN** subscribers receive an invalidation requiring refresh rather than an invented change history

#### Scenario: Read unavailable history

- **WHEN** the caller requests history from a source without history capability
- **THEN** the result is unsupported, not an empty history page
