# Spec Delta

## Purpose

Assemble model packages and organization extensions into a fully validated model without host dependencies, order-sensitive merging or partially usable failures.

## ADDED Requirements

### Requirement: MC-1 Bounded source decoding

The compiler SHALL accept version-1 compiler envelopes containing a domain definition and optional additive extensions as structured data or JSON text. Existing domain definitions SHALL remain valid through an envelope with no extensions. Invalid syntax, unsupported versions, unsafe values and resource exhaustion MUST return structured diagnostics without a candidate snapshot. No source-supplied code SHALL execute.

#### Scenario: Decode supported sources

- **WHEN** equivalent envelopes are supplied as structured data and JSON text
- **THEN** their successful compiled models are equivalent

#### Scenario: Reject invalid sources

- **WHEN** a source contains invalid JSON, an unsupported envelope/domain version, accessors, unsafe keys or exceeds documented limits
- **THEN** compilation fails without a candidate or source mutation

### Requirement: MC-2 Exact import graph resolution

The compiler SHALL resolve imports through a supplied loader by exact model ID and version, validate returned identity, deduplicate diamond imports and reject missing packages, cycles, conflicting versions of one model ID and duplicate definition IDs. Results MUST NOT depend on import order. Package boundaries SHALL NOT introduce filesystem or network access into the compiler.

#### Scenario: Resolve a shared dependency

- **WHEN** two imported packages depend on the same exact package
- **THEN** it is loaded once per compilation and contributes its definitions once

#### Scenario: Reject an invalid graph

- **WHEN** an import is unavailable, has mismatched identity, forms a cycle, introduces another version of an existing model ID or duplicates a definition ID
- **THEN** compilation fails with package-qualified diagnostics and no candidate

### Requirement: MC-3 Additive imported-type extensions

A package SHALL be able to add new attributes to object or relation types owned by its transitive imports. Extensions MUST NOT replace existing own or inherited attributes, delete members, alter inheritance, abstract flags, lifecycle or relation constraints, or target unrelated packages. Attribute collisions between extensions MUST fail even if declarations are identical. Added object attributes SHALL propagate to descendants and undergo the same domain validation as original attributes.

#### Scenario: Extend an imported parent

- **WHEN** an organization adds a required attribute with a valid default to an imported parent
- **THEN** the parent and its descendants expose the attribute and retain every original domain constraint

#### Scenario: Preserve relation constraints

- **WHEN** an organization adds an attribute to an imported relation type
- **THEN** its endpoint, cardinality, direction, duplicate and self-reference policies remain unchanged

#### Scenario: Reject a conflicting extension

- **WHEN** an extension reuses an own or inherited attribute ID, conflicts with another extension or attempts a forbidden edit or target
- **THEN** compilation fails regardless of package or extension order

### Requirement: MC-4 Complete semantic validation

Compilation SHALL apply domain inheritance, attribute, reference, relation, profile and viewpoint checks to the complete composed model. Extension propagation MUST be validated against descendant declarations. Invalid defaults, unresolved type references and inheritance conflicts MUST NOT escape into a snapshot.

#### Scenario: Detect a descendant conflict

- **WHEN** an extension adds an attribute that an existing descendant redeclares with incompatible semantics
- **THEN** compilation fails with a conflicting-override diagnostic identifying the descendant

#### Scenario: Resolve an imported parent

- **WHEN** a local type inherits from a valid imported type
- **THEN** compilation exposes the effective inherited attributes and lineage

### Requirement: MC-5 Deterministic structured failure

Diagnostics SHALL contain a stable code, severity, stage, model ID/version when known, structured path and entity ID when known. Equivalent failing structured inputs with reordered keyed declarations SHALL yield consistently ordered semantic diagnostics. Loader/hash exceptions MUST become bounded stable diagnostics without leaking arbitrary exception details; failures SHALL return no usable candidate.

#### Scenario: Report a loader exception

- **WHEN** the supplied loader throws an error containing private host details
- **THEN** compilation returns a load-stage diagnostic without those details or a partial model

#### Scenario: Reorder invalid declarations

- **WHEN** semantically identical invalid keyed declarations are reordered
- **THEN** semantic diagnostics retain their canonical order and entity-relative paths
