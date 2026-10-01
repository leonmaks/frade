# Spec Delta

## Purpose

Define a reviewable successor visual contract for migrated workbench surfaces without silently replacing the existing approved VS Code pilot.

The user accepted the full WB-001 replacement text on 30 September 2026. The canonical accepted text is in `../../decisions/visual-contract.md`; authority, text hash and explicit supersession ownership are in `../../decisions/wb001-acceptance-2026-09-30.md`. The pilot archive/sync owner consumes that record; this change does not edit/archive the pilot. Acceptance does not approve migration baselines or replace independent PRE.

## ADDED Requirements

### Requirement: Explicit accepted visual transition

An approved decision SHALL reconcile pilot WB-001 ownership before migrated surfaces use Frade guide v1.0 instead of exact VS Code Dark Modern colors/geometry. Non-migrated surfaces SHALL retain their existing contracts. Behavioral workbench requirements, diagram compatibility and historical evidence SHALL remain intact. A proposal or token PASS MUST NOT be treated as acceptance of visual migration.

#### Scenario: Proposed palette conflict

- **WHEN** the guide requires graphite/light/HC colors and dimensions differing from the pinned pilot
- **THEN** the exact conflict and complete replacement decision are reviewed before implementation or baseline acceptance

### Requirement: Measurable stage evidence

Each affected surface SHALL have actual runtime screenshots and interaction/accessibility evidence for approved themes, density, viewport, fonts and scale. Loading/error/dirty/empty coverage SHALL reflect real implemented capabilities. Screenshots from a mockup or historical run MUST NOT substitute for current runtime evidence.

#### Scenario: Electron does not start

- **WHEN** the supported desktop cannot launch in the audit environment
- **THEN** the report records the executed command and environment error separately from UI defects and leaves screenshots BLOCKED
