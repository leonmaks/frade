# Design

## Context

Actual modules/manifests/contracts: frade-ui-design-contract/evidence/audit.md. No implementation exists for this stage. Prerequisite frade-p05-isolated-browser-host: verify, independent POST PASS, archive/close. Follow guide/Themes-and-Plugins-Spec v1.0 and existing AGENTS/gates.

## Goals / Non-Goals

**Goals:** P06 Native contribution APIs with observable preservation and failure evidence.

**Non-Goals:** predecessor bypass, routing/Repo repair, arbitrary workbench CSS, executable vscode compatibility or unmeasured provider/network claims.

## Decisions

Versioned Frade API registers namespaced commands/menus/keybindings, viewsContainers/tree/table providers, configuration schemas and custom editors; use idempotent Disposable and context.subscriptions. UI schema renderer uses shared tokens/components/overlay/focus/keyboard. Namespace collision/shortcut conflict reports; no arbitrary workbench DOM/CSS. Async handlers validated DTOs with cancellation/deadline and revision events. Editor lifecycle includes dirty/save/undo/close/disable save-convert-cancel and recovery. Repository adapters, diagramTools and AI providers are separately gated contracts: UI API names do not implement all backing domain integrations. P06 supplies broker registration/validation only for approved public capabilities, unavailable contributions return UNSUPPORTED with diagnostics. Secrets/network through P05 broker only. Native OS drivers stay trusted service adapters; no broad Node runtime.

### Scope after PRE

packages/extension-contracts public API DTOs; packages/extension-service contribution registry; packages/ui-workspace/src/design/commands/** and schema views/editors; apps/desktop broker integration; public consumer/type/security/UI tests. These target paths are proposed, not asserted to exist. Refresh precise files/exports/dependencies against the predecessor's actual closing state at PRE; preserve unchanged domain/routing/control files. Tests/docs/evidence remain in approved areas. If frozen artifacts or architecture boundaries conflict, stop for planning repair.

### BDD TDD and verification

Map every spec scenario to real assertions/fixtures. RED precedes production fixes; retain meaningful assertions. Existing Vitest/Testing Library/node:test/Playwright are the starting runners. No skips, loosened tolerances or blind snapshots. Use applicable package typecheck/lint/test/test:bdd scripts, root pnpm check:boundaries/check:all, and openspec validate frade-p06-native-contributions --strict. New packages must expose scripts and be wired into workspace checks. For changed UI verify Light/Dark/HC × compact/comfortable, keyboard, forced colors/coarse/reduced-motion, actual screenshots and relevant states; untouched screens retain historical baselines. Record commands/exits/baseline/date/environment/hashes and applicable FDS/A11Y/EXT IDs in dated evidence; NOT_RUN/BLOCKED is never PASS. Security/filesystem/Worker checks exercise actual runtime where applicable, not merely mocked settings.

## Risks / Trade-offs

- Missing predecessor/PRE or frozen conflict → no production edits.
- Partial transaction/data loss → controlled-barrier and adversarial lifecycle assertions.
- Mocked integration hides runtime failure → actual filesystem/Electron/Worker/adapter checks.
- Missing tooling → BLOCKED/NOT_RUN and no archive.

## Migration Plan

Planning → predecessor closed → scope and independent PRE PASS → BDD/TDD → implementation → required checks → OpenSpec verify → independent POST PASS → archive/close → stop. No automatic next numbered implementation. Rollback restores last committed presentation/package state without writing user repository content.
