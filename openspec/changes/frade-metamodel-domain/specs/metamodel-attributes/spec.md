# Spec Delta

## Purpose

Validate configurable attribute definitions and values consistently without coercion, storage dependencies or executable configuration.

## ADDED Requirements

### Requirement: Complete typed attribute vocabulary

Attribute schemas SHALL use discriminated kinds for string, text, integer, decimal, boolean, date, datetime, enum, reference, list and structured object. Validation SHALL reject wrong types without coercion; numeric values must be finite and integers safe. Dates must be real calendar dates; datetimes must include a valid timezone. Enum members must be declared. Recursive object fields and list items SHALL obey their declared schemas.

#### Scenario: Validate every supported kind

- **WHEN** valid and invalid representative values for each of the eleven kinds are validated
- **THEN** valid values are accepted and invalid values are rejected at their precise attribute or item path

#### Scenario: Reject invalid nested values

- **WHEN** a list contains a structured object with an invalid field or undeclared field
- **THEN** validation identifies its list index and field without dropping or converting data

### Requirement: Required nullable defaults and bounds

Required presence and nullability SHALL be independent. Explicit null SHALL NOT trigger a default. Defaults SHALL themselves validate, apply only to absent values and be copied without mutating or sharing mutable data with the definition. Numeric/string bounds, enum membership and list cardinality SHALL be enforced; contradictory bounds SHALL invalidate the schema. Optional absent structured objects SHALL NOT be synthesized solely because a nested field has a default.

#### Scenario: Distinguish absence null and default

- **WHEN** required, optional and nullable fields are evaluated with absent, null and defaulted values
- **THEN** missing required values without defaults fail, explicit non-nullable null fails and only absent values receive valid defaults

#### Scenario: Copy recursive defaults

- **WHEN** the same object/list default is applied to two inputs
- **THEN** both results are valid independent copies and changing one result does not change the other or the schema

#### Scenario: Enforce declared bounds

- **WHEN** values violate numeric bounds, string lengths or list cardinality, or a schema has contradictory bounds
- **THEN** validation reports the corresponding constraint violation

### Requirement: Reference target validation

Reference values SHALL carry repository and object identities without physical paths. Validation SHALL use caller-supplied target information to enforce allowed target types including permitted subtypes. Missing target information SHALL produce an unresolved-reference diagnostic rather than successful validation.

#### Scenario: Validate reference targets

- **WHEN** a reference resolves to a permitted subtype in supplied target information
- **THEN** the reference passes without filesystem or network access

#### Scenario: Reject unresolved or forbidden targets

- **WHEN** a reference is unresolved or resolves to a forbidden type
- **THEN** validation returns an explicit reference diagnostic at the attribute path
