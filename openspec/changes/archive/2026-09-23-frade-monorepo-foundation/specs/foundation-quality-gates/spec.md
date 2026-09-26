# Spec Delta

## Purpose

Establishes executable evidence that the monorepo foundation and migrated Draw editor remain buildable, type-safe, behaviorally compatible, and visually stable.

## ADDED Requirements

### Requirement: Layered automated verification

The foundation SHALL provide independently invocable unit, BDD, browser interaction, visual regression, typecheck, lint, and production-build checks. The complete verification gate MUST include every required non-interactive layer.

#### Scenario: Run a focused Draw unit check

- **WHEN** a developer invokes the Draw unit-test command
- **THEN** document, graph, connection, routing, attachment, segment-editing, persistence, and lifecycle tests execute without requiring a browser server

#### Scenario: Run the complete gate

- **WHEN** a developer invokes the documented complete verification command
- **THEN** all required static, unit, behavior, browser, and build checks execute or are explicitly reported as environment-gated

### Requirement: Executable BDD traceability

Every foundation Gherkin scenario SHALL map to executable automated evidence or to an explicitly documented manual or future-phase verification boundary. Automated mappings MUST fail when a referenced feature, scenario identifier, or implementation assertion is missing.

#### Scenario: Detect an unmapped critical scenario

- **WHEN** a critical foundation or retained Draw scenario has no executable mapping and no approved boundary record
- **THEN** the BDD traceability check fails

### Requirement: Production-equivalent browser evidence

Browser verification SHALL exercise the production Draw graph and routing configuration in Chromium. Geometry validity MUST be asserted from logical routes in addition to screenshots, and deterministic baseline comparisons SHALL cover retained visual regressions.

#### Scenario: Verify live segment drag

- **WHEN** a browser test captures an edge while a segment drag remains active
- **THEN** the actual rendered edge is visible with semantic styling, its logical route is valid, and the corresponding visual assertion is evaluated

### Requirement: Actionable failure artifacts

Browser and visual failures SHALL retain sufficient artifacts to diagnose the graph state, route validity, rendered path, interaction trace, and visual difference when the test runner supports those artifacts.

#### Scenario: Retain evidence for a visual failure

- **WHEN** a deterministic browser visual assertion fails in CI
- **THEN** the job exposes the relevant trace, screenshot or image diff, and test diagnostics as retained artifacts

### Requirement: Clean-environment CI

Continuous integration SHALL install from the committed lockfile and run foundation verification on a clean supported environment. CI MUST reject uncommitted lockfile drift and MUST report incompatible runtime or native prerequisites explicitly.

#### Scenario: Verify a proposed change in CI

- **WHEN** a change is submitted to the repository
- **THEN** CI performs a frozen installation followed by the documented foundation verification gates and prevents success when a required gate fails
