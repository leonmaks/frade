# ui-token-compliance Specification

## Purpose

Provide executable evidence of semantic token integrity and enforce reviewable presentation rules in Frade's existing quality pipeline.

## Requirements

### Requirement: Deterministic token generation and contrast

One versioned JSON token source SHALL generate all builtin CSS/typed role outputs deterministically. Light, Dark and HC SHALL have identical role sets. Drift, invalid source values or a failing named contrast pair MUST cause a nonzero check result. Checks MUST distinguish named-pair contrast from accessibility of the running application.

#### Scenario: Manual generated output edit

- **WHEN** a generated token file differs from regeneration
- **THEN** the check fails without rewriting the evidence or output

#### Scenario: Builtin token source

- **WHEN** the canonical v1.0.0 source and generated outputs are checked
- **THEN** all three palettes and 102 named contrast pairs pass independently of application visual approval

### Requirement: Forced-colors precedence and exact adoption exception

Generated CSS SHALL map every theme color role to its declared system keyword under forced-colors for root and inherited descendants with absent, System, Light, Dark and HC theme attributes under OS Light/Dark. The original input SHALL remain unchanged. Frade CSS adoption revision 1 SHALL permit only the exact single selector replacement `:root:not([data-frade-theme])` → `:root:where(:not([data-frade-theme]))` in the automatic Dark media block. Every other source CSS byte, palette value, role and token version SHALL remain equivalent. Drift checks MUST reject any additional discrepancy. Adoption revision/provenance SHALL be recorded separately from CSS bytes. Browser checks SHALL confirm requested media states and every role on root and an inherited child across the 20-state matrix; source named-pair checks alone MUST NOT claim cascade correctness.

#### Scenario: Automatic Dark with forced colors

- **WHEN** OS prefers Dark, forced-colors is active and root has no theme attribute
- **THEN** all generated theme roles resolve to the declared system keywords on root and inherited descendants

#### Scenario: Explicit palette without forced colors

- **WHEN** OS Light/Dark is active, forced-colors is inactive and a supported theme is selected
- **THEN** the explicit palette remains unchanged; System and absent attribute follow OS preference

#### Scenario: Unapproved second CSS deviation

- **WHEN** generated CSS differs from the single-exception equivalence oracle in any other byte
- **THEN** equivalence and drift checks fail without rewriting outputs or source evidence

### Requirement: Feature literals and explicit exceptions

New or changed feature presentation colors SHALL use semantic tokens. Validated theme data, approved brand data and persisted/domain diagram paint SHALL remain distinct permitted boundaries. Legacy exceptions SHALL identify exact occurrences, reasons and closure stages; they MUST NOT permit new literals in the same file.

#### Scenario: Disallowed feature color

- **WHEN** an isolated fixture adds a feature-level color literal
- **THEN** the compliance check returns FAIL with its location

#### Scenario: Declarative palette data

- **WHEN** a valid theme fixture contains permitted HEX role data
- **THEN** the theme boundary is accepted and unrelated feature literals remain checked

### Requirement: Existing CI integration and honest enforcement

UI compliance SHALL run in the real repository CI alongside retained project checks. A negative drift/literal control and a positive control SHALL execute outside production source and retain actual outcomes. Required branch checks SHALL be reported as configured only after authenticated remote verification; otherwise owner instructions and NOT_CONFIGURED or LOCAL_ONLY SHALL be provided.

#### Scenario: Missing remote authority

- **WHEN** branch rules cannot be verified or changed through an authorized authenticated mechanism
- **THEN** the report records the limitation and never claims merge protection

### Requirement: Fresh Git checkout preserves canonical LF bytes

The root .gitattributes SHALL contain exactly the eight user-accepted logical entries in docs/ui/decisions/token-eol.gitattributes.proposed. A fresh Git checkout with temporary-repository core.autocrlf=true SHALL preserve all eight canonical artifact SHA256 hashes and LF bytes. The token checker and source-byte equivalence oracle MUST remain unchanged and MUST NOT normalize checked artifacts to hide CRLF drift. Only root configuration line separators may be normalized to compare its eight logical entries. Missing, extra, wildcard or CRLF-target rules MUST fail the checkout check. Controls SHALL execute in a verified OS-temp Git repository using existing Node/Git, retain actual exit/hash evidence and safely remove that isolated root. Missing Git or failed cleanup MUST NOT count as PASS or skipped coverage. Focused independent PRE MUST approve the added path before production implementation; prior review evidence MUST remain immutable.

#### Scenario: Windows-style checkout with accepted attributes

- **WHEN** all eight protected artifacts are staged and freshly checked out with core.autocrlf=true and the exact accepted attribute entries
- **THEN** all eight raw hashes match their original LF/UTF-8 bytes and the unchanged token checker exits 0 with 102 named pairs

#### Scenario: Missing LF configuration reproduces drift

- **WHEN** the isolated fixture freshly checks out the same artifacts with core.autocrlf=true and no LF attributes
- **THEN** physical CRLF drift is observed and the unchanged token checker exits 1; canonical production/source/history files remain unchanged

#### Scenario: Attribute scope broadening or retargeting

- **WHEN** a required attribute entry is removed or an extra, wildcard or eol=crlf entry is supplied
- **THEN** the checkout compliance check fails without changing the artifact byte oracle or automatically accepting new scope


### Requirement: UI compliance survives specification archival

UI compliance SHALL read a stable canonical BDD contract independent of the active OpenSpec change directory. Archiving or removing the completed change artifact SHALL preserve successful binding/control execution. Missing or malformed canonical BDD MUST fail rather than fall back to an active/archive copy. Existing foundation assertions, explicit future boundaries, token/literal negatives and immutable historical evidence MUST remain strict. Owner instruction links SHALL point to durable documentation.

#### Scenario: Completed change is archived

- **WHEN** an isolated fixture moves the active change into archive
- **THEN** actual traceability CLI and compliance controls still pass against the unchanged canonical BDD contract

#### Scenario: Active and archive artifacts are absent

- **WHEN** an isolated fixture contains canonical docs/registry/assertion sources but no active or archived change
- **THEN** actual runtime checks still pass without consulting OpenSpec lifecycle state

#### Scenario: Canonical contract is missing or malformed

- **WHEN** canonical BDD is missing or malformed while a historical change copy still exists
- **THEN** compliance fails without fallback, suppressed errors, skipped tests or a rewritten baseline
