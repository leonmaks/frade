# Design

## Context

Actual modules/manifests/contracts: frade-ui-design-contract/evidence/audit.md. No implementation exists for this stage. Prerequisite frade-p02-transactional-installer: verify, independent POST PASS, archive/close. Follow guide/Themes-and-Plugins-Spec v1.0 and existing AGENTS/gates.

## Goals / Non-Goals

**Goals:** P03 Declarative VS Code theme import with observable preservation and failure evidence.

**Non-Goals:** predecessor bypass, routing/Repo repair, arbitrary workbench CSS, executable vscode compatibility or unmeasured provider/network claims.

## Decisions

Use a real JSONC parser and P02 bounded ZIP reader. Read standalone JSON/JSONC or theme contributions in extension/package.json within user VSIX; never execute main/scripts/activationEvents. Include stays within same package root, depth≤16, cycle/path escape rejection. Explicit sorted mapping/priority table independent of JSON insertion order: global foreground wins text.primary over editor.foreground; editor.background maps surface.base; fallback kind palette fills unmapped roles. uiTheme vs/light, vs-dark/dark, hc-black/HC; hc-light UNSUPPORTED_KIND until a separately approved light HC base exists. Alpha composite only on explicit role-registry background; unsupported background reports role/fallback. TokenColors remain data, not CSS; adapter absent diagnostic says syntax unsupported. P01 contrast repair reports imported effects. No Marketplace network integration.

### Scope after PRE

packages/extension-service/src/theme-import/**; packages/extension-service/tests/theme-import/**; packages/ui-workspace/src/extensions import diagnostics; docs/ui import mapping. These target paths are proposed, not asserted to exist. Refresh precise files/exports/dependencies against the predecessor's actual closing state at PRE; preserve unchanged domain/routing/control files. Tests/docs/evidence remain in approved areas. If frozen artifacts or architecture boundaries conflict, stop for planning repair.

### BDD TDD and verification

Map every spec scenario to real assertions/fixtures. RED precedes production fixes; retain meaningful assertions. Existing Vitest/Testing Library/node:test/Playwright are the starting runners. No skips, loosened tolerances or blind snapshots. Use applicable package typecheck/lint/test/test:bdd scripts, root pnpm check:boundaries/check:all, and openspec validate frade-p03-vscode-theme-import --strict. New packages must expose scripts and be wired into workspace checks. For changed UI verify Light/Dark/HC × compact/comfortable, keyboard, forced colors/coarse/reduced-motion, actual screenshots and relevant states; untouched screens retain historical baselines. Record commands/exits/baseline/date/environment/hashes and applicable FDS/A11Y/EXT IDs in dated evidence; NOT_RUN/BLOCKED is never PASS. Security/filesystem/Worker checks exercise actual runtime where applicable, not merely mocked settings.

## Risks / Trade-offs

- Missing predecessor/PRE or frozen conflict → no production edits.
- Partial transaction/data loss → controlled-barrier and adversarial lifecycle assertions.
- Mocked integration hides runtime failure → actual filesystem/Electron/Worker/adapter checks.
- Missing tooling → BLOCKED/NOT_RUN and no archive.

## Migration Plan

Planning → predecessor closed → scope and independent PRE PASS → BDD/TDD → implementation → required checks → OpenSpec verify → independent POST PASS → archive/close → stop. No automatic next numbered implementation. Rollback restores last committed presentation/package state without writing user repository content.
