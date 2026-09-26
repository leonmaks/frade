# Spec Delta

## Purpose

Define a reusable, storage-independent metamodel vocabulary and deterministic diagnostics for configurable architecture models.

## ADDED Requirements

### Requirement: Versioned configurable definitions

The domain SHALL accept version-1 model definitions with stable namespaced IDs, a semantic model version, imports, object types, relation types, profiles and viewpoints. Display labels SHALL NOT identify types. Definitions SHALL remain independent of Electron, UI, storage and runtime services.

#### Scenario: Distinct company vocabularies

- **WHEN** two definitions use different namespaces and the same display label
- **THEN** their type identities remain distinct and neither vocabulary requires a hardcoded application type

#### Scenario: Reject malformed definitions

- **WHEN** a definition has an unsupported schema version, malformed ID, invalid semantic version, duplicate ID or unknown structural field
- **THEN** validation returns structured diagnostics and does not produce a successful definition

### Requirement: Declarative metadata contracts

Definitions SHALL represent single object inheritance, abstract flags, typed attributes, declarative lifecycle states/transitions and UI labels/descriptions. Import, profile and viewpoint declarations SHALL be data-only; viewpoint presentation declarations MUST NOT contain domain-constraint overrides. This contract SHALL NOT imply import loading, overlay compilation or policy execution.

#### Scenario: Preserve declarative metadata

- **WHEN** a valid definition declares lifecycle states, UI metadata and import/profile/viewpoint references
- **THEN** those declarations are preserved without I/O or code execution

#### Scenario: Reject invalid lifecycle and weakening declarations

- **WHEN** a lifecycle transition names an undeclared state or a viewpoint attempts to override attribute constraints
- **THEN** definition validation reports the invalid declaration

### Requirement: Safe single inheritance

Given a complete caller-supplied definition set, domain analysis SHALL reject missing parents, multiple parents, inheritance cycles and conflicting inherited-attribute overrides. It SHALL compute inherited attributes and subtype eligibility, and reject instances of abstract types. For this MVP an inherited attribute can be redeclared only with identical domain semantics; label/description metadata can differ.

#### Scenario: Inherit attributes and subtype eligibility

- **WHEN** a concrete type extends an abstract type with a required attribute
- **THEN** the concrete type inherits that requirement and matches endpoint rules allowing the ancestor and its subtypes

#### Scenario: Reject inheritance defects

- **WHEN** the definition set contains a cycle, unknown parent or override changing an inherited attribute kind, default or constraint
- **THEN** analysis reports the offending definitions and returns no usable partial analysis

#### Scenario: Reject an abstract instance

- **WHEN** an instance names an abstract type
- **THEN** validation rejects it even if all its attributes are valid

### Requirement: Deterministic non-mutating validation

Domain parsing and validation SHALL return diagnostics with stable codes, severity, entity identity when known, and a path to the invalid value. Operations SHALL NOT mutate inputs, perform I/O or execute supplied code. Repeated validation and reordering equivalent definition collections SHALL produce equivalent canonically ordered semantic results. Cyclic input values and documented resource-limit violations SHALL be rejected without unbounded recursion or silent truncation.

#### Scenario: Repeat and reorder validation

- **WHEN** the same invalid definition set is validated repeatedly and with its top-level type collections reordered
- **THEN** diagnostic codes/entity-relative paths and their canonical order agree and frozen input data remains unchanged

#### Scenario: Reject unsafe or excessive input

- **WHEN** input contains executable values, a cyclic object or exceeds a documented validation resource limit
- **THEN** validation returns a structured diagnostic rather than executing code, hanging or publishing a partial result
