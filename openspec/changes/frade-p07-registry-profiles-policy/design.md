# Design

## Context

Actual modules/manifests/contracts: frade-ui-design-contract/evidence/audit.md. No implementation exists for this stage. Prerequisite frade-p06-native-contributions: verify, independent POST PASS, archive/close. Follow guide/Themes-and-Plugins-Spec v1.0 and existing AGENTS/gates.

## Goals / Non-Goals

**Goals:** P07 Registry profiles and policy with observable preservation and failure evidence.

**Non-Goals:** predecessor bypass, routing/Repo repair, arbitrary workbench CSS, executable vscode compatibility or unmeasured provider/network claims.

## Decisions

Provider interface list/search/details/download/checkUpdates with local directory, corporate HTTPS and optional public Frade provider. Network is mediated by approved origin broker; no Microsoft Marketplace promise. P02 installer receives exact bytes/hash/source and verifies signatures only against configured trust keys. Claimed publisher/provenance/signature status independent; unsigned never Verified. Profiles store theme/file/product icons/enabled extension sets plus pinned IDs/versions/hashes/source, no secrets/private repository contents. Offline export/import never requires public endpoints; missing bytes reported unresolved, no package magic. Auto-update policy profile/grants diff new capability consent keeps old version until grant; executable packages can be denied globally. Rollback only retained valid prior bytes. Atomic profile apply through P01/P02, revisioned trust/grants; workspace untrusted override never auto-installs or executes.

### Scope after PRE

packages/extension-service registry/providers/profiles/policy; packages/extension-contracts DTOs; apps/desktop main authenticated registry/secret handles; packages/ui-workspace/src/extensions profiles/policy UI; isolated integration fixtures. These target paths are proposed, not asserted to exist. Refresh precise files/exports/dependencies against the predecessor's actual closing state at PRE; preserve unchanged domain/routing/control files. Tests/docs/evidence remain in approved areas. If frozen artifacts or architecture boundaries conflict, stop for planning repair.

### BDD TDD and verification

Map every spec scenario to real assertions/fixtures. RED precedes production fixes; retain meaningful assertions. Existing Vitest/Testing Library/node:test/Playwright are the starting runners. No skips, loosened tolerances or blind snapshots. Use applicable package typecheck/lint/test/test:bdd scripts, root pnpm check:boundaries/check:all, and openspec validate frade-p07-registry-profiles-policy --strict. New packages must expose scripts and be wired into workspace checks. For changed UI verify Light/Dark/HC × compact/comfortable, keyboard, forced colors/coarse/reduced-motion, actual screenshots and relevant states; untouched screens retain historical baselines. Record commands/exits/baseline/date/environment/hashes and applicable FDS/A11Y/EXT IDs in dated evidence; NOT_RUN/BLOCKED is never PASS. Security/filesystem/Worker checks exercise actual runtime where applicable, not merely mocked settings.

## Risks / Trade-offs

- Missing predecessor/PRE or frozen conflict → no production edits.
- Partial transaction/data loss → controlled-barrier and adversarial lifecycle assertions.
- Mocked integration hides runtime failure → actual filesystem/Electron/Worker/adapter checks.
- Missing tooling → BLOCKED/NOT_RUN and no archive.

## Migration Plan

Planning → predecessor closed → scope and independent PRE PASS → BDD/TDD → implementation → required checks → OpenSpec verify → independent POST PASS → archive/close → stop. No automatic next numbered implementation. Rollback restores last committed presentation/package state without writing user repository content.
