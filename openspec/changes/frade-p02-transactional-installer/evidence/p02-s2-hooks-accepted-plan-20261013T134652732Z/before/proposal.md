# Proposal

## Why

Hot theme selection requires safe local package registration and recovery, not opening a sample ZIP as if it were an integration.

## What Changes

- P02 Transactional declarative installer per Themes-and-Plugins-Spec.md v1.0.
- Preserve domain/routing/dirty data and shared UI contract.
- P01 is now physically archived, independent POST-approved and published. P02 implementation remains blocked until its fresh exact-model PRE PASS.

## Capabilities

### New Capabilities

- `extension-installer`: P02 Transactional declarative installer with explicit compatibility/failure behavior.

### Modified Capabilities

None; existing domain/routing contracts remain intact.

## Impact

Proposed paths: packages/extension-contracts/** (new platform-neutral leaf); packages/extension-service/** (new host service); apps/desktop/src/main extension installer adapter; packages/ui-workspace/src/extensions/**; corresponding tests/fixtures and runtime-contracts/preload named methods. No production edits or compatibility claims follow from artifact existence. Audit baseline HEAD 98f387f96b51b0ad139e3507c376ff1c3e8dec09; use actual approved predecessor closing state before implementation without hiding previous work.

## Accepted integration checkpoint

Human acceptance: [p02-integration-scope-accepted-20261010T002712Z.json](decisions/p02-integration-scope-accepted-20261010T002712Z.json), exact proposed SHA256 e0821a4e7e1676e772a191061c94e3fc6384df2fd82cbfd62251ce6ffd33c947. Scope is the exact path-and-purpose table in [P02-INTEGRATION-SCOPE-01](decisions/p02-integration-scope.proposed.md), including bounded existing Workbench/P01 controller/boot/Main/preload/check integration. Original proposed document stays immutable; its PROPOSED marker is superseded only by the exact accepted decision. Owning current baseline 0ecaf44938382bd8daa7d512887dda8a8ee9b372; original98f387f96b51b0ad139e3507c376ff1c3e8dec09 preserved. P02 consumes P01; Routing remains independent. Stage PRE and POST: gpt-6-sol/xhigh. No P03–P07 product implementation.

## Accepted Windows filesystem backend amendment

[P02-WINDOWS-FILESYSTEM-BACKEND-01 acceptance](decisions/p02-windows-filesystem-backend-accepted-20261010T035503Z.json) accepts unchanged proposal SHA256 8310cb500c9aeedfec91e3db2e6e01e39791f1625b144cb14495a99ab2dedc0e. The original PROPOSED document remains immutable. Node Windows no-follow/directory-sync limitations are reproduced in openspec/changes/frade-p02-transactional-installer/evidence/p02-windows-fs-readiness-20261010T013525Z/probe.json. A first-party, closed C#/.NET Framework filesystem helper is now authorized at the exact paths/purposes in that decision. It is infrastructure for theme-only P02, not executable extension hosting. No new dependency, global SDK installation, elevation, CI or Electron/Vite configuration change is authorized. A verified backend is prerequisite to staging/journal use. At this acceptance checkpoint archive validation had59 passing component assertions and no native implementation. Current portable/native component state is disclosed in the later native refinement; staging, installer transactions, IPC and Extensions UI remain unimplemented. Fresh strict validation and independent gpt-6-sol/xhigh PRE are required for this amended plan. Existing PRE PASS remains historical; remaining P02 gates and STOP before P03 are unchanged.

## Journal publication PRE clarification

Historical Windows PRE FAIL is preserved (reportSHA6688c9d555397e16be4221c6dfeea0c851ae61adbac3cca19550409005529e3a). Design now selects one concrete logical journal: immutable ordered hash-linked phase files, atomic same-directory temp-to-new-final publication with ReplaceIfExists=FALSE, preserved confirmed prefix and deterministic recovery authority from valid COMMITTED. Recovery dispositions are same-journal bookkeeping; original seven phases and state/domain obligations stay unchanged. No scope/path expansion or durability waiver. That checkpoint required new strict/freshPRE with backendNOT_IMPLEMENTED; current native component state is below.

## PRE invariant/state-transition and output repair

Raw retry FAILfe641067995eb11f855203b917d01272f897fd25c8abfdf2f9e7980eaf8ab055 stays immutable. Journal temp/final now use the same checked records parent; admission reserves a finite8-record/8MiB full outcome/recovery budget before STAGING and prevents duplicate cleanup/disposition writes. Helper copy target moves to sibling desktop out/extension-filesystem because an isolated real Vite probe disproved nested out/main survival. All paths/purposes remain accepted; original seven phases, old bytes, security/durability/package limits and domain behavior stay intact. No native production yet; strict + freshPRE required.

## Actual native rename planning refinement

2026-10-10T05:46:41.621Z: the first native implementation is partial, with an applicable checked-publication FAIL (Win32 87); no working installer is claimed. Actual owned matrix proves a documented NT same-source-directory rename avoids the wrapper/second-parent-open failure while retaining pinned source/parent, no-replace and no-path-fallback. Coherent design selects that mechanism within the accepted backend scope; fresh strict/PRE precedes production repair. No share-mask, privilege, operation, domain/routing, phase or durability waiver. Portable protocol43 and original archive59 remain components.

## Main persistence coexistence refinement

2026-10-10T06:36:38.735Z: the reviewed NT publication repair passes original4 native assertions; new actual Main persistence regression remainsFAIL with old bytes preserved. Historical narrow plan (superseded by P02-ANCESTOR-METADATA-HANDOFF-01 below) chose only the immediate-parent handoff after full guarded bind/root lease. No lifetime/share-mask/root/API/write-authority/P01 schema change; broad diagnostic variants are excluded. Fresh strict and independent PRE before repair; working backend/installer NOT_VERIFIED.

## Accepted ancestor metadata handoff amendment

2026-10-10T07:34:34.608Z: [human acceptance](decisions/p02-ancestor-metadata-handoff-accepted-20261010T073434608Z.json) binds unchanged proposalSHA f3a9e8c266f1939d9b7d5012e064bd37291ac501108696e82ada012f44350c23. Replace only immediate-parent-only selection with complete overlapping same-object outer metadata retention AFTER original full bind/strong root/exclusive lease. Retain all original identities continuously; per-operation full-chain validation, strong root/children and checked relative effects preserve confinement. Metadata shares alone are not writer/delete denial. Exact owned-object enumeration reuse repairs self-conflicts without releasing lease/pins or relaxing shares. No root/API/write authority/dependency/P01/routing change or FAIL waiver. Current native9:4PASS/5FAIL; strict and fresh independent Sol/xhigh PRE before production repair; capabilitiesNOT_VERIFIED.

## Accepted bounded bootstrap cleanup amendment

2026-10-10T14:04:38.413Z: [exact acceptance](decisions/p02-bootstrap-owned-cleanup-accepted-20261010T140438413Z.json), unchanged proposal SHA256 3e7379aae95d49644c269c3633aaa8a3e8a0a4c084492fc94104b5901b6426ed; [complete accepted scheme](evidence/p02-bootstrap-scheme-20261010T134423647Z/bootstrap-scheme.md), unchanged SHA256 32748eeb1fcb49bb763f464305cb1accafddb95ab4fa9e378d802bd96c2dda05. The original PROPOSED / NOT_APPROVED markers remain historical; this exact human acceptance supersedes those markers only. Adopt the complete referenced bootstrap/runtime/Main scheme for task2.2. Protocol v1 and remove stay the same operation/root/helper; only optional expectedIdentity (24 lowercase hex) and emptyOnly:true for directories are added. Actual held-target identity precedes deletion; empty-only deletion never recursively removes unknown children. Absent-field legacy semantics remain unchanged. A finite non-authoritative probe uses the existing pre-STAGING bootstrap metadata category; package/state effects still require the same coordinator intent. Interrupted/unknown fixture preserves bytes and blocks, never automatic stale cleanup. Native query/build remain NOT_VERIFIED, power loss NOT_PROVEN. Fresh strict and automatic PRE Sol/xhigh precede RED/implementation; full P02 gates remain open.

## Accepted narrow DEV timing diagnostics

2026-10-10T18:06:30.047Z: exact human acceptance [P02-DEV-PRESENTATION-TIMING-DIAGNOSTICS-01](decisions/p02-dev-presentation-timing-diagnostics.proposed.md) SHA256 ff75e18bad97b8c9e10da44c6404ec2a0e3539c34ef36a03b9c2a9b3355f283a; [acceptance](decisions/p02-dev-presentation-timing-diagnostics-accepted-20261010T180630047Z.json). The unchanged proposed document's NOT_APPROVED marker is historical and superseded only by this exact acceptance.

Only apps/desktop/src/renderer/presentation-bootstrap.ts gains the exact DEV-only bounded timing-marker exception to the S1/P01 source freeze; its raw pre-adoption SHA256 is c3161f1b0ced4d2036e524c6ca9d779041ef41d6ceab8924cad11ce814f1227f. Main/index.ts and existing new P02 unit/e2e paths remain scoped to the accepted diagnostic purposes. Preserve original P01 archive/evidence and record before/after adoption hashes. No5000ms timeout/startpoint/ready/show/parser/controller/order/await/listener/error/API/options/IPC/schema/persistence change. At most10 fixed-label numeric renderer markers per boot, no payload/path/settings/credentials; matching DEV Main markers and strictly filtered existing stdout only. Production builds eliminate diagnostic logging. No original P01 test edits/skip/assertion weakening, no Vite/package/lock/CI/vendor/routing/domain/sharedpolicy changes. Acceptance is not PRE PASS or FAIL waiver.

Existing guarded backend/factory/Main source is implemented and current desktop141unit/6canonicalruntime/type/lint/build source-boundPASS. Focused S1 POST remains FAIL; Main actual-close finding is repaired and checked but freshPOST NOT_RUN. Historical dev5s timeout causeNOT_PROVEN; installer/journal/recovery/IPC/UI remain NOT_IMPLEMENTED. Earlier dated planning/component states above are history, not current capability/closure claims. P02 stays3/9; no archive/P03.

## Accepted single historical development risk

2026-10-10T20:22:24.072Z: exact user acceptance [P02-DEV-TIMEOUT-DEFERRED-RISK-01](decisions/p02-dev-timeout-deferred-risk.proposed.md), SHA256 45f679ba135d23b2f5b39156374de8b890fa9f217a853635fb3eb0726288df48; [acceptance](decisions/p02-dev-timeout-deferred-risk-accepted-20261010T202224072Z.json). The proposed document remains immutable with its historical NOT_APPROVED label; this acceptance alone supersedes that label.

Only the historical dev5s FAIL at openspec/changes/frade-p02-transactional-installer/evidence/p02-check-s1-final-runtime-coexistence-20261010T153908765Z is deferred as P02-D01, cause NOT_PROVEN. The original raw FAIL and S1 POST FAIL at openspec/changes/frade-p02-transactional-installer/evidence/p02-s1-post-received-20261010T165324969Z remain unchanged; neither becomes PASS, FIXED or ENVIRONMENT_PROVEN. Establishing a causal fix for that one historical failure is no longer a prerequisite for S1 assessment/S2 after applicable revalidation. No other historical finding or current required failure is waived. Any recurrence or new required FAIL still stops its owner for reproduction/RCA and a separate scope decision when needed. Keep 5000ms, starting point, readiness/show/controller/dirty-work behavior, every original/current assertion, retries and all security/durability requirements unchanged. The three diagnostic attempts remain exhausted; this is not permission for another diagnostic rerun or speculative repair. The open Main actual-close assessment and all other findings still require independent POST. No routing dependency, no automatic next numbered change.

Current source state: accepted DEV diagnostics implemented, desktop147unit/19targeted/type/lint PASS with append-only new-tail EOL equivalence receipt; productionbuild/logabsence/AST and controls checked on their applicable exact unchanged production inputs. Canonical attempt1 retains5PASS/1FAILnew parser; parser RED→GREEN and attempts2/3 each1PASS. Six boots did not reproduce the original failure, with no causal claim. Main close repair is implemented and tested; fresh S1 POST NOT_RUN. Full P02 remains3/9; staging/journal/recovery/IPC/UI/cumulative checks/verify/POST/archive stay open. Earlier dated state paragraphs are history, superseded only for this exact current-state/risk disposition.

## Current S2 planning checkpoint

2026-10-10T21:29:38.373Z: user-requested [S2 scheme](evidence/p02-s2-scheme-20261010T212938373Z/s2-scheme.md) concretizes existing accepted staging/journal/recovery/bridge goals. Current focused S1 POST PASS (openspec/changes/frade-p02-transactional-installer/evidence/p02-s1-revalidation-post-received-20261010T211559325Z/verification.json) supersedes earlier dated pending-S1 claims only. Exact ZIP blobs preserve package bytes without new native commands; one seven-phase coordinator and P01 port decorators retain COMMITTED authority and all prior security/gates. No new product capability or scope expansion; no production edits. Full3/9,2.2/2.3unchecked; S2 PRE NOT_RUN, fullREADY_FOR_VERIFY:NO. Historical P02-D01/rawFAIL unchanged.
