# Design

## Context

Actual modules/manifests/contracts: frade-ui-design-contract/evidence/audit.md. No implementation exists for this stage. Prerequisite frade-p03-vscode-theme-import: verify, independent POST PASS, archive/close. Follow guide/Themes-and-Plugins-Spec v1.0 and existing AGENTS/gates.

## Goals / Non-Goals

**Goals:** P04 File and product icon registries with observable preservation and failure evidence.

**Non-Goals:** predecessor bypass, routing/Repo repair, arbitrary workbench CSS, executable vscode compatibility or unmeasured provider/network claims.

## Decisions

Product icon default is existing Codicons with preserved license/font/hash. File/product registries/settings independent of color themes and each other. Use stable namespaced IDs and generation-bound disposables; missing/disabled/removed contribution fallback builtins. SVG validator rejects scripts/events/external links/foreignObject and unsafe URL/CSS references; do not merely regex strip malicious input. Product glyph validation checks allowed font/glyph metadata/license and missing glyph diagnostic. Assets served through validated package protocol, no arbitrary DOM/CSS injection. Versioned user/profile icon settings are separate. Do not add upward navigator→ui-workspace dependency; inherited CSS and approved neutral binding boundary only.

### Scope after PRE

packages/extension-contracts icon DTOs; packages/extension-service icon validators/registries; packages/ui-workspace/src/design/icons/**; applicable navigator binding through approved leaf boundary; test fixtures. These target paths are proposed, not asserted to exist. Refresh precise files/exports/dependencies against the predecessor's actual closing state at PRE; preserve unchanged domain/routing/control files. Tests/docs/evidence remain in approved areas. If frozen artifacts or architecture boundaries conflict, stop for planning repair.

### BDD TDD and verification

Map every spec scenario to real assertions/fixtures. RED precedes production fixes; retain meaningful assertions. Existing Vitest/Testing Library/node:test/Playwright are the starting runners. No skips, loosened tolerances or blind snapshots. Use applicable package typecheck/lint/test/test:bdd scripts, root pnpm check:boundaries/check:all, and openspec validate frade-p04-icon-registries --strict. New packages must expose scripts and be wired into workspace checks. For changed UI verify Light/Dark/HC × compact/comfortable, keyboard, forced colors/coarse/reduced-motion, actual screenshots and relevant states; untouched screens retain historical baselines. Record commands/exits/baseline/date/environment/hashes and applicable FDS/A11Y/EXT IDs in dated evidence; NOT_RUN/BLOCKED is never PASS. Security/filesystem/Worker checks exercise actual runtime where applicable, not merely mocked settings.

## Risks / Trade-offs

- Missing predecessor/PRE or frozen conflict → no production edits.
- Partial transaction/data loss → controlled-barrier and adversarial lifecycle assertions.
- Mocked integration hides runtime failure → actual filesystem/Electron/Worker/adapter checks.
- Missing tooling → BLOCKED/NOT_RUN and no archive.

## Migration Plan

Planning → predecessor closed → scope and independent PRE PASS → BDD/TDD → implementation → required checks → OpenSpec verify → independent POST PASS → archive/close → stop. No automatic next numbered implementation. Rollback restores last committed presentation/package state without writing user repository content.
