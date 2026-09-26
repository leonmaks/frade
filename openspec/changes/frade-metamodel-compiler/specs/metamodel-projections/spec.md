# Spec Delta

## Purpose

Compile repository profile and viewpoint selections as explicit projections of a validated model while retaining all fundamental domain constraints.

## ADDED Requirements

### Requirement: MP-1 Explicit profile selections

Profiles SHALL select exactly their declared object and relation type IDs, without implicit subtype expansion. An empty selection SHALL mean no types. Unknown IDs SHALL fail compilation. Selection SHALL NOT remove types from the complete domain analysis or imply operation authorization.

#### Scenario: Select a parent without its child

- **WHEN** a profile selects a parent but does not list its child
- **THEN** only the parent is selected while the full analysis still contains both

#### Scenario: Compile an empty profile

- **WHEN** a profile has empty object and relation lists
- **THEN** it exposes no selected types rather than the entire model

### Requirement: MP-2 Constraint-preserving viewpoints

A viewpoint SHALL select exact type IDs and apply only supported presentation metadata to its own selected types. Combining a profile and viewpoint SHALL intersect their selections. Unknown selections or presentation entries outside the viewpoint's declared selection SHALL fail. Hidden types SHALL remain in the full domain analysis, and projections MUST NOT alter inheritance, validation, endpoint rules or cardinalities.

#### Scenario: Intersect two selections

- **WHEN** a viewpoint includes a type excluded by the selected profile
- **THEN** their combined projection omits that type without modifying the full model

#### Scenario: Reject presentation for an unselected type

- **WHEN** a viewpoint styles a known type that it did not select
- **THEN** compilation fails with a viewpoint diagnostic

#### Scenario: Preserve constraints behind presentation

- **WHEN** a viewpoint changes a selected relation's label or hides an endpoint type
- **THEN** full-model relation validation still applies its original endpoint and cardinality constraints

### Requirement: MP-3 Explicit projection lookup

Projection lookup SHALL reject unknown profile/viewpoint IDs. Omitting both selections SHALL expose the full type selection; supplying only one SHALL use that selection. Projection results SHALL be isolated from caller mutation and SHALL NOT claim that selected relations are valid for any particular object pair.

#### Scenario: Reject an unknown profile

- **WHEN** a caller requests a nonexistent profile
- **THEN** lookup returns a diagnostic rather than silently falling back to all types
