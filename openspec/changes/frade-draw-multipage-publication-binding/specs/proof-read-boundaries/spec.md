## ADDED Requirements

### Requirement: Historical adoption dispatch preserves complete verification
The proof adapter SHALL dispatch historical transformation only for the exact nineteen immutable c9 origin paths, separately pinned Draw.io bridge and five separately pinned staged-commit files; unowned live bytes SHALL remain unchanged for complete downstream verification.

#### Scenario: Unowned source or report changes
- **GIVEN** an input outside those twenty-five paths
- **WHEN** the adapter receives its live bytes
- **THEN** it returns those exact bytes without consulting unrelated adoption authority
- **AND** the original complete input/report verifier still rejects any hash mutation

#### Scenario: Owned source consumes fresh authority
- **GIVEN** one of those twenty-five paths
- **WHEN** its source, manifest, snapshot or path ownership changes
- **THEN** all original fresh authority, link, byte-form and hash guards remain required and reject unauthorized changes

### Requirement: Windows path resolution preserves safety and deadlines
Proof readers SHALL retain every path/link/containment and live-byte check while using the documented native realpath API on Windows and the existing API on other platforms; original test deadlines SHALL remain unchanged.

#### Scenario: Previously safe path is replaced
- **GIVEN** an earlier successful read of a Unicode or space-containing path
- **WHEN** file bytes change or an ancestor becomes a symbolic link or junction
- **THEN** the next read observes the changed bytes or rejects the link without stale filesystem caches

#### Scenario: Full frozen LDE verification
- **GIVEN** complete current source profiles
- **WHEN** the unchanged eleven LDE tests run through normal pnpm check
- **THEN** every original assertion executes within its unchanged5000ms deadline

### Requirement: Pinned staged-commit metadata survives Git checkout
The two staged-commit JSON metadata files SHALL retain their exact reviewed raw hashes under Git checkout with autocrlf false or true. Exact nested text eol=lf rules SHALL cover only these filenames. Both rule files SHALL join the complete source closure; original root rules and unrelated files SHALL remain unchanged.

#### Scenario: Windows checkout of exact metadata
- **WHEN** real Git adds and checks out both JSON files with either autocrlf setting
- **THEN** both raw hashes remain exact and sibling JSON files receive no new rule
