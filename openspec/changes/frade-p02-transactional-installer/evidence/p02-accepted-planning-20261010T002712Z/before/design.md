# Design

## Context

Actual modules/manifests/contracts: frade-ui-design-contract/evidence/audit.md. No implementation exists for this stage. Prerequisite frade-p01-theme-core: verify, independent POST PASS, archive/close. Follow guide/Themes-and-Plugins-Spec v1.0 and existing AGENTS/gates.

## Goals / Non-Goals

**Goals:** P02 Transactional declarative installer with observable preservation and failure evidence.

**Non-Goals:** predecessor bypass, routing/Repo repair, arbitrary workbench CSS, executable vscode compatibility or unmeasured provider/network claims.

## Decisions

Create platform-neutral package DTO/schema and injected filesystem/journal service, with concrete Electron file picker/authorized installation root in Main/service. Do not reuse repository journals or write workspace. Frade is currently 0.1.0; initial package compatibility uses supported application range >=0.1.0 <0.2.0 and a separately versioned Frade API baseline 1.0.0. Parse real semver. Keep original sample archive byte-identical as a future fixture: its >=1.0.0 <2.0.0 Frade range is incompatible with current runtime and must reject; create explicitly derived compatible positive fixture, recording both hashes. Native ZIP limits: 50 MiB compressed/200 MiB expanded/10000 entries/ratio100/depth32, reject traversal/absolute/symlink/case duplicates/Windows reserved/NUL. Hash exact archive SHA256, do not infer trust from publisher. Versioned staging + old/new registry snapshots + journal phases. Validate before pointer swap; crash-at-each-phase loader restores last commit/cleans staging. Disable/update/remove atomically unregister and fallback via P01. Cleanup after handles release; Windows locks retain honest pending state. Declarative packages never execute scripts. Installer leaves active theme unchanged until explicit picker selection. Extension details/diagnostics view uses shared contract.

### Scope after PRE

packages/extension-contracts/** (new platform-neutral leaf); packages/extension-service/** (new host service); apps/desktop/src/main extension installer adapter; packages/ui-workspace/src/extensions/**; corresponding tests/fixtures and runtime-contracts/preload named methods. These target paths are proposed, not asserted to exist. Refresh precise files/exports/dependencies against the predecessor's actual closing state at PRE; preserve unchanged domain/routing/control files. Tests/docs/evidence remain in approved areas. If frozen artifacts or architecture boundaries conflict, stop for planning repair.

### BDD TDD and verification

Map every spec scenario to real assertions/fixtures. RED precedes production fixes; retain meaningful assertions. Existing Vitest/Testing Library/node:test/Playwright are the starting runners. No skips, loosened tolerances or blind snapshots. Use applicable package typecheck/lint/test/test:bdd scripts, root pnpm check:boundaries/check:all, and openspec validate frade-p02-transactional-installer --strict. New packages must expose scripts and be wired into workspace checks. For changed UI verify Light/Dark/HC × compact/comfortable, keyboard, forced colors/coarse/reduced-motion, actual screenshots and relevant states; untouched screens retain historical baselines. Record commands/exits/baseline/date/environment/hashes and applicable FDS/A11Y/EXT IDs in dated evidence; NOT_RUN/BLOCKED is never PASS. Security/filesystem/Worker checks exercise actual runtime where applicable, not merely mocked settings.

## Risks / Trade-offs

- Missing predecessor/PRE or frozen conflict → no production edits.
- Partial transaction/data loss → controlled-barrier and adversarial lifecycle assertions.
- Mocked integration hides runtime failure → actual filesystem/Electron/Worker/adapter checks.
- Missing tooling → BLOCKED/NOT_RUN and no archive.

## Migration Plan

Planning → predecessor closed → scope and independent PRE PASS → BDD/TDD → implementation → required checks → OpenSpec verify → independent POST PASS → archive/close → stop. No automatic next numbered implementation. Rollback restores last committed presentation/package state without writing user repository content.
