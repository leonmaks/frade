# Spec Delta

## Purpose

Provide reproducible model identity, verifiable dependency locks and atomic publication, with read-only evidence for reviewing repository model upgrades.

## ADDED Requirements

### Requirement: MV-1 Canonical fingerprints

The compiler SHALL compute a versioned SHA-256 fingerprint from canonical model content including root identity/version, resolved package identities/content hashes, effective definitions, extensions, profiles and viewpoints. Keyed/set-like declaration ordering and JSON formatting SHALL NOT affect identity; ordered default list values SHALL retain order. Presentation, constraints, defaults or resolved source content changes MUST affect identity. Fingerprints MUST exclude timestamps and host locations.

#### Scenario: Reorder equivalent sources

- **WHEN** object keys, package imports and keyed declaration collections are permuted without changing their content
- **THEN** the fingerprint remains identical

#### Scenario: Change an ordered default

- **WHEN** an attribute's default list changes from one order to another
- **THEN** the fingerprint changes

### Requirement: MV-2 Verifiable model locks

Successful compilation SHALL produce a versioned lock DTO containing root identity, every resolved package's exact identity and canonical content hash, and the compiled fingerprint. Locked compilation SHALL require an exact graph/content match and reject missing, extra, duplicate or tampered entries. Generating a replacement lock SHALL require an explicit unlocked compilation; supplied locks MUST NOT be silently rewritten.

#### Scenario: Detect same-version content drift

- **WHEN** a package retains its model version but its content differs from a supplied lock
- **THEN** compilation fails and the lock and published model remain unchanged

#### Scenario: Replay a valid lock

- **WHEN** identical sources are compiled against their generated lock
- **THEN** compilation succeeds with the same fingerprint

### Requirement: MV-3 Atomic immutable publication

A publisher SHALL expose only a complete successful immutable snapshot and SHALL retain its prior snapshot on any failure. Concurrent requests SHALL use latest-started-request-wins: an older completion MUST NOT replace the model after a newer request has begun, even when the newer request fails. Successful publication SHALL replace the whole snapshot in one operation. Caller mutations of inputs or returned values MUST NOT affect published content.

#### Scenario: Fail after a successful publication

- **WHEN** a second compilation fails at loading, analysis, projection, hashing or lock validation
- **THEN** readers continue to observe the first complete snapshot

#### Scenario: Complete overlapping requests out of order

- **WHEN** a newer request finishes before an older one
- **THEN** the older request reports superseded and cannot overwrite the newer result

#### Scenario: Mutate returned collections

- **WHEN** a consumer attempts to alter a published definition, nested default or lookup collection
- **THEN** subsequent reads retain the original published content and fingerprint

### Requirement: MV-4 Read-only impact analysis

The compiler SHALL compare two compiled models by stable IDs, list added, removed and changed definitions, and distinguish presentation-only differences from validation-affecting changes. Validation-affecting changes SHALL require review; model diff alone MUST NOT claim data compatibility. Impact output SHALL be deterministic and MUST NOT mutate either model.

#### Scenario: Remove a type

- **WHEN** a candidate removes a previously defined type
- **THEN** impact reports that stable ID as removed and requiring review without deleting any repository data

### Requirement: MV-5 Repository migration preview

A preview SHALL accept an explicit repository model binding and a complete caller-supplied prospective repository snapshot. It SHALL verify the binding against the old model, validate the snapshot against the candidate using domain rules and report affected repository-qualified identities with diagnostics. Missing snapshot context SHALL be reported as not evaluated, not compatible. Preview MUST NOT fill stored defaults, execute migrations, update bindings or delete objects/relations.

#### Scenario: Preview a removed type

- **WHEN** a supplied repository object uses a type removed by the candidate
- **THEN** the preview identifies the object and unknown type while leaving all supplied data and the repository binding unchanged

#### Scenario: Refuse a stale model binding

- **WHEN** the repository binding does not match the supplied old model's ID, version and fingerprint
- **THEN** preview returns a binding-mismatch diagnostic instead of a compatibility result

#### Scenario: Preview without repository data

- **WHEN** only old and candidate models are supplied
- **THEN** model impact is available but repository compatibility is marked not evaluated
