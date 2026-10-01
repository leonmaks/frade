# Design

## Context

Actual modules/manifests/contracts: frade-ui-design-contract/evidence/audit.md. No implementation exists for this stage. Prerequisite frade-p04-icon-registries: verify, independent POST PASS, archive/close. Follow guide/Themes-and-Plugins-Spec v1.0 and existing AGENTS/gates.

## Goals / Non-Goals

**Goals:** P05 Isolated browser extension host with observable preservation and failure evidence.

**Non-Goals:** predecessor bypass, routing/Repo repair, arbitrary workbench CSS, executable vscode compatibility or unmeasured provider/network claims.

## Decisions

Depends transitively on transactional P02 and does not launch before closed predecessors. Dedicated sandboxed Electron renderer/session with contextIsolation on/nodeIntegration off executes validated package JS only inside Worker. Schema-checked MessagePort protocol carries requestId/deadline/cancel/version/revision/extensionId/generation. Host cannot reach workbench DOM or generic Node/fs/process/Electron bridge. Navigation/new windows/network denied; CSP default-src none and approved package script/worker protocol only. Broker capabilities repository.read/repository.proposeWrite/diagrams.edit/network.request allowlisted origins/secrets.use opaque handles/notifications.show with trust/grant revisions. Actual domain writes remain through approved APIs; no bypass. Activation events + timeout5s, idempotent disposal, crash explicit retry/disable, bounded restart policy/no loops, old generation callbacks ignored. Browser/web Worker contract matches DTO/capability rules. No Node extension host or executable VS Code shim.

### Scope after PRE

packages/extension-host-browser/** (new Worker host); packages/extension-contracts versioned broker DTOs; packages/extension-service lifecycle/grants; apps/desktop/src/main isolated host/protocol/security; named preload host bridge only; security tests. These target paths are proposed, not asserted to exist. Refresh precise files/exports/dependencies against the predecessor's actual closing state at PRE; preserve unchanged domain/routing/control files. Tests/docs/evidence remain in approved areas. If frozen artifacts or architecture boundaries conflict, stop for planning repair.

### BDD TDD and verification

Map every spec scenario to real assertions/fixtures. RED precedes production fixes; retain meaningful assertions. Existing Vitest/Testing Library/node:test/Playwright are the starting runners. No skips, loosened tolerances or blind snapshots. Use applicable package typecheck/lint/test/test:bdd scripts, root pnpm check:boundaries/check:all, and openspec validate frade-p05-isolated-browser-host --strict. New packages must expose scripts and be wired into workspace checks. For changed UI verify Light/Dark/HC × compact/comfortable, keyboard, forced colors/coarse/reduced-motion, actual screenshots and relevant states; untouched screens retain historical baselines. Record commands/exits/baseline/date/environment/hashes and applicable FDS/A11Y/EXT IDs in dated evidence; NOT_RUN/BLOCKED is never PASS. Security/filesystem/Worker checks exercise actual runtime where applicable, not merely mocked settings.

## Risks / Trade-offs

- Missing predecessor/PRE or frozen conflict → no production edits.
- Partial transaction/data loss → controlled-barrier and adversarial lifecycle assertions.
- Mocked integration hides runtime failure → actual filesystem/Electron/Worker/adapter checks.
- Missing tooling → BLOCKED/NOT_RUN and no archive.

## Migration Plan

Planning → predecessor closed → scope and independent PRE PASS → BDD/TDD → implementation → required checks → OpenSpec verify → independent POST PASS → archive/close → stop. No automatic next numbered implementation. Rollback restores last committed presentation/package state without writing user repository content.
