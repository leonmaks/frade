# Spec Delta

## Purpose

Users need explicit theme-data import with compatibility diagnostics while executable VS Code API support remains outside v1.

## ADDED Requirements

### Requirement: Data only import

JSON/JSONC and VSIX theme contributions SHALL import declaratively without executing package code. Compatibility SHALL distinguish recognized, ignored, repaired and unsupported syntax roles; it MUST NOT claim executable extension compatibility.

#### Scenario: VSIX contains main

- **WHEN** a theme package with main/scripts/activation events is imported
- **THEN** only validated theme data is registered and package JS is never executed

### Requirement: Bounded include resolution

Includes SHALL remain in the same package root with maximum depth 16. Traversal, cyclic includes and external references MUST reject before registration.

#### Scenario: Include escapes root

- **WHEN** an include names a parent or external path
- **THEN** import fails and existing theme/registry remain unchanged

### Requirement: Deterministic mapping and unsupported kinds

Explicit key priority SHALL make mapped output independent of JSON order. hc-light SHALL return UNSUPPORTED_KIND until supported by an approved base. Alpha SHALL composite only against a declared background or report unsupported fallback.

#### Scenario: Conflicting foreground keys

- **WHEN** equivalent themes reorder foreground and editor.foreground
- **THEN** the same global foreground priority and resolved output are produced

### Requirement: Syntax is adapter specific data

Syntax highlighting data SHALL apply only through a validated editor adapter. Absence of such adapter SHALL yield explicit unsupported diagnostics while color-theme application remains safe.

#### Scenario: No syntax adapter

- **WHEN** a theme contains tokenColors without an available adapter
- **THEN** diagnostics identify unsupported syntax rather than claiming it is rendered
