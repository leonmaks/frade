# Spec Delta

## Purpose

Separate preliminary type compatibility from complete relation integrity checks over an explicitly supplied architecture snapshot.

## ADDED Requirements

### Requirement: Inheritance-aware endpoint eligibility

Relation definitions SHALL declare directed or undirected semantics, allowed source/target types with explicit subtype matching, typed attributes, self-reference policy, duplicate policy and nonnegative endpoint cardinalities. Preliminary checking SHALL evaluate type rules and clearly identify itself as eligibility only, not repository mutation approval.

#### Scenario: Check a directed type pair

- **WHEN** a candidate source is an allowed subtype and the target satisfies its rule
- **THEN** preliminary eligibility succeeds while reversing the pair fails unless the reversed rules also permit it

#### Scenario: Check an undirected type pair

- **WHEN** either orientation satisfies an undirected relation's endpoint rules
- **THEN** preliminary eligibility succeeds independently of endpoint input order

### Requirement: Snapshot-based relation integrity

Final validation SHALL evaluate supplied objects and the complete prospective relation set, including endpoint existence and type eligibility, typed attributes, self-reference, duplicate policy and minimum/maximum cardinality. Identity SHALL use repository-qualified object references. An update SHALL be represented once by stable relation identity, and duplicate relation identities SHALL be invalid. The domain SHALL neither fetch repository state nor claim concurrency guarantees.

#### Scenario: Eligibility is insufficient

- **WHEN** a type pair is eligible but the prospective snapshot contains a missing endpoint, forbidden self-reference, forbidden duplicate or cardinality violation
- **THEN** final validation rejects the snapshot with a constraint-specific diagnostic

#### Scenario: Count identities and orientation correctly

- **WHEN** two repositories contain the same local object ID or an undirected duplicate has reversed endpoints
- **THEN** different repository-qualified objects remain distinct and reversed undirected duplicates are counted as the same pair

#### Scenario: Validate minimum cardinality and updates

- **WHEN** a complete prospective snapshot removes the only required relation or updates an existing relation in place
- **THEN** the missing minimum is reported and the updated relation is counted once, not as an additional insertion

### Requirement: Explicit complete-state contract

Final relation validation SHALL document that callers must supply all objects and relations relevant to the constraints. Directed endpoint bounds SHALL count source/outgoing and target/incoming participation separately. Undirected bounds SHALL be symmetric and count incident relations once per object, including an allowed self-loop. Duplicate policies SHALL distinguish allow from forbid-same-type-and-pair. The same inputs SHALL yield stable non-mutating diagnostics.

#### Scenario: Reject ambiguous undirected bounds

- **WHEN** an undirected relation definition supplies different source and target cardinality bounds
- **THEN** definition validation rejects it instead of deriving order-dependent counts

#### Scenario: Retain caller data

- **WHEN** a frozen complete prospective snapshot is validated twice
- **THEN** equal ordered diagnostics are returned without changing object or relation data
