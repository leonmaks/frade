# Spec Delta

## Purpose

Defines repository application operations that preserve metamodel invariants and make concurrent, denied, cancelled and uncertain mutations observable to callers.

## ADDED Requirements

### Requirement: CORE-006 Bounded query semantics

Queries SHALL implement explicit AND/OR/NOT, missing/null semantics, typed operators, deterministic identity tie-breakers, projection, snapshot-scoped cursors, bounded pagination and graph direction/depth/result limits. Adapters SHALL use equivalent semantics or reject unsupported execution; raw SQL is forbidden.

#### Scenario: A cyclic graph is traversed and equal-name objects are paged

- **WHEN** a cyclic graph is traversed and equal-name objects are paged
- **THEN** traversal terminates within limits and a stable snapshot yields each match exactly once

### Requirement: CORE-007 Controlled validation

Every mutation SHALL be a validated authorized ChangeSet in one repository, with immutable input, ordered commands, entity preconditions, final-state validation, explicit defaults and policy checks. Critical constraints SHALL be rechecked within the write boundary. Diagnostics SHALL include stable codes, path/reference and safe details.

#### Scenario: The second command violates a required attribute

- **WHEN** the second command violates a required attribute
- **THEN** the complete ChangeSet is rejected before persistence

### Requirement: CORE-008 Revision and replay protection

Stale repository/entity revisions SHALL reject without overwrite. Idempotency keys SHALL identify canonical payload and scope, reject different payload reuse and avoid duplicate effects; cancellation or lost acknowledgment SHALL require reconciliation rather than automatic replay.

#### Scenario: A stale revision or reused key with a changed payload is submitted

- **WHEN** a stale revision or reused key with a changed payload is submitted
- **THEN** the command returns an explicit conflict and preserves authoritative state

### Requirement: CORE-009 Explicit deletion policy

Deletion SHALL default to RESTRICT for relation and attribute references; CASCADE SHALL require explicit supported policy, permission and final-state validation. Visual deletion SHALL never imply domain deletion.

#### Scenario: An object with an incoming reference is deleted under RESTRICT

- **WHEN** an object with an incoming reference is deleted under RESTRICT
- **THEN** neither the object nor dependent relation is removed

### Requirement: CORE-013 Post-commit events and watch

Events SHALL include ID, repository, reference, revision and session order for object/relation CRUD, model changes and reload. Command events SHALL follow confirmed writes. Delivery guarantees SHALL be explicit; listener failures SHALL not undo commits. Watchers SHALL debounce duplicates, revalidate external changes, update/invalidate index and queries and permit full resync after gaps.

#### Scenario: A subscriber throws or a watcher loses continuity

- **WHEN** a subscriber throws or a watcher loses continuity
- **THEN** the committed source remains intact and subscribers can refresh without invented history

### Requirement: CORE-019 Application authorization

All reads and writes SHALL check caller identity, repository scope and permissions at the application/server boundary; disabled UI and profile visibility SHALL not imply authorization. External configuration SHALL not execute arbitrary code, and exported profiles/logs/errors SHALL omit secrets.

#### Scenario: A denied caller requests an otherwise valid edit

- **WHEN** a denied caller requests an otherwise valid edit
- **THEN** aCCESS_DENIED is returned and adapter write count remains zero

### Requirement: RC-1 Permission and session guards

Every application mutation SHALL require an active session, suitable writer capabilities and an explicit authorization decision from an injected policy. Missing policy SHALL deny writes. Denials, unsupported operations, malformed commands and wrong-repository targets MUST NOT invoke the writer. Capabilities, visible profiles and viewpoints MUST NOT be treated as authorization. Creates SHALL require absence; replace/delete SHALL require caller-supplied exact expected revisions.

#### Scenario: Deny a visible object edit

- **WHEN** an object is visible in a profile but the authorization policy denies replacement
- **THEN** the command returns permission-denied and performs no write

#### Scenario: Reject an update without a revision

- **WHEN** replacement omits its expected revision
- **THEN** the command returns invalid-input without obtaining write authorization or dispatching a write

### Requirement: RC-2 Complete prospective-state validation

Commands SHALL obtain either an explicitly complete revision-consistent snapshot or a capability-declared revision-pinned paged validation view bound to the compiled model. An incomplete snapshot alone is never sufficient. Both paths SHALL reject binding mismatches and unresolved external references and validate the complete prospective state, including attributes, references, inheritance, endpoints, duplicate policies and cardinality. A paged implementation MAY use proven incremental validation against a fully validated unchanged baseline; otherwise it SHALL stream full validation. Changed-entity defaults SHALL be materialized explicitly; untouched stored entities MUST NOT be rewritten. Projection visibility MUST NOT weaken validation. Deletion MUST NOT silently cascade.

#### Scenario: Mutate a repository larger than the snapshot envelope limit

- **WHEN** an authorized ChangeSet uses a pinned paged validation view
- **THEN** all constraints are checked without constructing a full graph DTO and a stale manifest rejects the whole delta without publication

#### Scenario: Delete a referenced object

- **WHEN** an object deletion would leave a relation endpoint or attribute reference unresolved
- **THEN** the command is rejected and existing objects and relations remain unchanged

#### Scenario: Satisfy a minimum cardinality atomically

- **WHEN** an atomic batch creates objects and the relations required by their minimum cardinality
- **THEN** validation evaluates their final combined state and accepts it if every invariant holds

#### Scenario: Preserve stored attributes

- **WHEN** a command changes one object while another stored object has an omitted defaulted attribute
- **THEN** the changed object's defaults are materialized and the untouched object's attributes remain byte-for-byte equivalent as JSON values

### Requirement: RC-3 Optimistic commit and validated results

A validated command SHALL pass the snapshot guard, entity preconditions and operation identity to the adapter exactly once per dispatch. A revision conflict SHALL preserve existing state without automatic retry or overwrite. Confirmed success SHALL include validated committed entities or deletion acknowledgements, new snapshot revision and new revisions for created/replaced entities. Core MUST NOT invent revisions or emit success before confirmation. Malformed responses after dispatch SHALL produce an unknown-outcome result rather than a false claim of rollback.

#### Scenario: Reject stale replacement

- **WHEN** a guarded adapter reports a revision conflict
- **THEN** the command returns conflict and does not retry, publish success or overwrite newer state

#### Scenario: Receive a malformed commit acknowledgement

- **WHEN** a dispatched write returns an acknowledgement with missing committed revisions
- **THEN** the caller receives outcome-unknown with its operation ID for reconciliation

### Requirement: RC-4 Cancellation and operation reconciliation

Cancellation before writer dispatch SHALL return cancelled with no write. Cancellation, close or transport failure after dispatch without authoritative completion SHALL return outcome-unknown with the original operation ID; it MUST NOT imply rollback or trigger replay. Concurrent identical submissions with the same session operation ID SHALL share one dispatched operation. A reused ID with a different command SHALL fail explicitly. Repeated identical completed submissions within the session SHALL return the retained result. The application SHALL permit explicit outcome resolution while the session is active; unknown, expired or lost session outcomes MUST NOT cause automatic re-execution. Operation tracking SHALL have a documented finite bound and reject new distinct commands at capacity without evicting accepted IDs.

#### Scenario: Cancel after persistence but before acknowledgement

- **WHEN** a write commits and its response is delayed past caller cancellation
- **THEN** the caller receives outcome-unknown and can reconcile the same operation ID without a second write

#### Scenario: Reuse an operation ID for another command

- **WHEN** the same session operation ID is submitted with a different payload or precondition
- **THEN** the second submission returns operation-ID-conflict without another writer call

### Requirement: RC-5 Portable executable acceptance

Repository packages SHALL enforce inward-only public package dependencies and compile against ES2022 without host ambient libraries. Their BDD scenarios SHALL execute real public operations against deterministic in-memory conformance adapters with observable I/O counts. Missing or ambiguous steps and rejected asynchronous assertions MUST fail the runner. The complete existing workspace gate SHALL include the repository packages without changing approved Draw visual baselines.

#### Scenario: Detect a host dependency

- **WHEN** repository production code imports Electron, filesystem, storage adapters or private package files
- **THEN** the dependency-boundary checks fail

#### Scenario: Detect an unbound acceptance step

- **WHEN** a repository feature contains an unmapped step
- **THEN** the BDD gate fails instead of counting the scenario as passed
