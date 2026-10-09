# Proposal

## Why

Frade has a working Electron workbench but no shared multi-theme UI contract or enforcement. The supplied Frade UI guide v1.0 defines a personal architectural workshop and hot themes/extensions; adopting it requires an explicit UI decision about existing VS Code visual fidelity. It has no dependency on Routing V2 implementation or closure.

## What Changes

- Adopt the supplied guide/checklist/themes specification through canonical docs and an additive root AGENTS section after the UI change's own PRE. Routing reconciles its historical fingerprints when it adopts the shared changes.
- Establish semantic tokens, deterministic generation/drift/contrast checks and a UI compliance gate in the existing pnpm/GitHub Actions pipeline. Preserve legacy screens through explicit baseline inventory, not blanket exemptions. User-accepted Frade CSS adoption revision 1 permits only the recorded automatic-Dark selector specificity correction; original input, token version/palettes and 102 contrast pairs remain unchanged. Independent repeat PRE PRE-20260930T091121Z reviewed and approved the exception and standalone CSS browser-test scope; its historical report remains unchanged.
- Preserve LF bytes through a narrowly scoped root .gitattributes with the eight user-accepted entries in docs/ui/decisions/token-eol.gitattributes.proposed. Add a fresh-Git-checkout regression/control under existing scripts/ui and tests/ui-contract, retaining the raw byte oracle. Focused independent PRE-EOL-20260930T120821Z approved the exact scope addition; actual EOL implementation and checks are recorded separately from POST.
- Make compliance durable across OpenSpec archive/removal using docs/ui/bdd/ui-contracts.feature as the sole runtime BDD contract, preserving all existing cases/assertions and explicit future boundaries. Move owner instructions to a durable docs path. The user accepted this exact planning repair; focused independent PRE must precede production reader/copy/test changes.
- Reuse the existing UI packages and native React controls. Introduce no full UI library and preserve current brand/font assets.
- Define the sequential P01–P07 program: resolver/preview; transactional installer; VS Code theme import; icon registries; isolated browser host; native contributions; registry/profiles/policy. These are planning artifacts, not implementations or approval to skip checkpoints.
- Make Light and Dark available together with HC/System and independent persistent density in P01. Foundation owns governance/tokens/checks; P01 owns the sole runtime resolver, preventing competing services.
- Define later separately approved visual migration scopes: shell/basic controls → tree/tabs → forms/tables/LoV → Draw/flow manager → AI.
- **BREAKING visual contract transition, accepted by the user on 30 September 2026:** replace pilot WB-001 exact VS Code palette/geometry fidelity with Frade guide fidelity for explicitly approved migrated surfaces. The accepted full text and supersession ownership record are in decisions/visual-contract.md and decisions/wb001-acceptance-2026-09-30.md. Untouched surfaces and historical evidence retain their contracts; foundation PRE and individual migration approval are still required.

## Capabilities

### New Capabilities

- `ui-design-contract`: canonical governance, component boundaries, migration/checkpoint and evidence requirements.
- `ui-token-compliance`: deterministic token generation, contrast, literal exceptions and CI enforcement.
- `workbench-visual-contract`: explicit user-accepted successor to the unarchived pilot WB-001; ownership and per-surface baseline transitions.

### Modified Capabilities

None in the root main-spec inventory. `repository-workbench` exists only in the complete but unarchived `frade-ka-workbench-pilot` change, not in `openspec/specs`. The accepted full WB-001 successor is supplied in `decisions/visual-contract.md`, with explicit supersession ownership in `decisions/wb001-acceptance-2026-09-30.md`. The pilot remains unchanged here; its archive/sync owner must preserve and link this accepted successor without restoring obsolete fidelity on migrated surfaces. Foundation/reusable Draw requirements remain intact.

## Impact

The user's later 30 September 2026 decision supersedes the coexistence prerequisite. UI works independently in an isolated feature workspace. Routing-owned freeze/scope revalidation stays in routing's integration stage, not as a UI predecessor. Root AGENTS §18 and docs/engineering/parallel-feature-workflow.md implement this process decision. That process decision did not approve WB-001. The user's subsequent explicit confirmation now accepts the complete replacement text; neither user decision by itself established independent UI PRE PASS. The received independent repeat review PRE-20260930T091121Z subsequently supplied foundation PRE PASS.

Candidate UI paths are enumerated in design.md. The user separately authorized the independent-feature process clarification and a routing consumer-task handoff. UI runtime still requires its own scope/PRE; the full WB-001 replacement text is accepted, while each migration's scope and new visual baselines still require approval. Routing source/tests/gate/baselines are excluded. The UI workflow definition now exists locally; remote CI and branch protection remain unverified. The ZIP sample is a future P02 fixture; its engine range needs reconciliation with current Frade 0.1.0.

## Current EOL planning repair — user accepted 30 September 2026

FOUNDATION-EOL-01 is ENVIRONMENT: a fresh Windows-style Git checkout converts unprotected LF artifacts to CRLF and fails the unchanged token oracle. The user accepted the exact eight-entry .gitattributes scope proposal. This confirmation approves the planning repair, not an independent focused PRE or a second CSS deviation. Focused PRE-EOL-20260930T120821Z passed; the exact attributes/control/test are now implemented. New post-repair logs prove targeted/CI commands and full pnpm check:all exit 0. Details and acceptance are in decisions/token-eol-acceptance-2026-09-30.md. Tasks 3.6/3.7 completed the EOL PRE and regression-first repair; the new archive planning repair reopens 4.3 for fresh checks while all historical PASS/FAIL evidence is preserved. UI remains independent of routing and does not start P01.

## Current archive blocker — discovered during verification

FOUNDATION-EOL-01 is locally resolved without changing the raw oracle. FOUNDATION-ARCHIVE-01 is a separately reproduced INTEGRATION blocker: compliance reads the active change BDD path, which disappears on archive. No archive/P01 or independent POST PASS has occurred. The user subsequently accepted the exact planning delta in docs/ui/decisions/bdd-archive-scope-proposal.md; decisions/bdd-archive-acceptance-2026-09-30.md records its raw hash and direct confirmation. This plan now declares the durable runtime BDD/owner-instruction paths and lifecycle scenarios. Focused archive PRE is NOT_RUN; production readers/copies/tests/registry/adoption remain frozen. Tasks 3.8/3.9 own independent PRE and regression-first repair; 4.3 is reopened while EOL logs retain their historical PASS. Routing is not a predecessor; no P01 starts.
