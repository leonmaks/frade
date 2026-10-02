## Purpose

Supplies deterministic browser evidence that the production routing and segment-editing implementation renders valid SVG in Chromium.

## ADDED Requirements

### Requirement: Shared geometry oracle

The editor SHALL use the same logical Manhattan-route validator in unit tests and browser verification. Geometry success MUST NOT be inferred from screenshot similarity alone.

#### Scenario: Inspect live segment drag

- **WHEN** a browser test captures an edge while a segment pointer drag remains active
- **THEN** the extracted logical route is valid and the actual SVG edge is visible with its semantic style

### Requirement: Deterministic visual fixtures

The project SHALL provide deterministic fixtures and a browser-only test API for loading fixtures, querying routes, attachments, segments, handles, rendered state, and stability. Visual tests SHALL use production graph and routing configuration.

#### Scenario: Repeat fixture loading

- **WHEN** Chromium loads the same fixture repeatedly
- **THEN** the normalized route and resolved attachments are identical

### Requirement: Regression evidence

The visual suite SHALL cover a live segment-drag regression, floating attachments, node move, resize, obstacle avoidance, and before/after drop equivalence; failures SHALL retain route, validation, render, trace, and image artifacts where supported.

#### Scenario: Compare live and dropped geometry

- **WHEN** a segment is captured at a final coordinate before pointer release and then released
- **THEN** the normalized valid route and resolved attachments after release match the live state
