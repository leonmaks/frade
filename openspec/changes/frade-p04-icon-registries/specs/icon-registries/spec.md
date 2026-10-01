# Spec Delta

## Purpose

Independent theme/icon settings require safe icon contributions without mixing command icon families or executing assets.

## ADDED Requirements

### Requirement: Independent icon contributions

File and product icon selections SHALL be independent of color theme and density. Existing licensed Codicons SHALL remain the default product family with stable named roles.

#### Scenario: Color theme switch

- **WHEN** Light changes to Dark
- **THEN** file and product icon choices remain selected with appropriate rendering

### Requirement: Safe asset validation

SVG/font contributions SHALL validate against supported types, reject executable/events/external/foreignObject content and report license/glyph compatibility. Malicious assets MUST NOT enter workbench DOM.

#### Scenario: Executable SVG

- **WHEN** an icon contains script or external reference
- **THEN** validation rejects it before registration and current icons remain

### Requirement: Scoped disposal and fallback

Registrations SHALL be generation-bound and disposable. Missing glyphs, disable or removal SHALL yield builtin fallback with diagnostics; late disposed generation MUST NOT replace current icons.

#### Scenario: Missing glyph

- **WHEN** a selected pack lacks a requested product glyph
- **THEN** the builtin icon renders and diagnostic identifies the missing glyph
