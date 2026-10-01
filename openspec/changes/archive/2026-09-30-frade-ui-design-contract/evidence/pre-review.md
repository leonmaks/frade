# PRE blocker review — 30 September 2026 Europe/Moscow

Change: frade-ui-design-contract. Baseline: 98f387f96b51b0ad139e3507c376ff1c3e8dec09 plus preserved existing worktree snapshot. Guide v1.0/token1.0.0. This is the executor's planning/blocker review, not a fabricated independent approval. Independent PRE has not been conducted; no independent PASS is issued.

Order executed: applicable instruction/contract/source audit → OpenSpec CLI scaffold and instruction-driven proposal/spec/design/tasks → eight strict validations → PRE blocker review. Audit smoke/static tests do not authorize implementation. No production code was modified during review.

## Correctness and architecture blockers

1. **SPEC_CONFLICT: WB-001.** The complete unarchived pilot requires exact pinned VS Code appearance, while the new guide requires different palette, sidebar/row/status geometry, focus and multiple themes. See decisions/visual-contract.md for measured conflicts and full proposed replacement/scenarios. This proposal has no accepted visual supersession/ownership record. Do not mark the new guide as satisfying the old gate or loosen old screenshots/tests.
2. **Frozen control/scope conflict.** docs/routing-v2/CURRENT_CHANGE.md explicitly lists AGENTS.md as frozen and requires planning/PRE revalidation for a frozen contract edit. Mandatory UI fragment cannot be appended under the current state. Existing machine gate `pnpm routing:v2:arch-gate` was actually executed: exit1, GATE_STATUS FAIL; it reports the preexisting input package and new UI/P planning paths outside exact R04 scope. It checked HEAD/INDEX/WORKTREE,839 changed paths and130 V2 source/test files. Broadening its allowlist or moving its baseline in this task would bypass the user's preserved routing program. Repair must belong to an explicitly authorized compatible owning workflow, or integration must wait until closure. Worktree/checkpoint inconsistencies were already present and remain unrepaired.
3. **Missing independent approval and implementation evidence.** Artifact existence/strict validation does not establish approved scope. No independent reviewer has approved visual ownership/frozen-control reconciliation. Canonical docs/AGENTS/tokens/CI and P01 runtime are not integrated, so a POST, verification/archival readiness or mandatory merge protection claim would be false.

## Checks actually passed

Eight planning changes validate strictly. Existing UI/desktop typecheck/lint/83 tests, desktop production build, four existing boundary checks and seven synthetic runtime screenshots passed their own executed scope. Input palette checker passed102 named pairs; isolated drift/low-contrast controls failed as expected with exit1 and their temp roots were removed. None is an independent PRE, app WCAG audit or new theme visual acceptance.

## Review result and permitted next action

GATE_STATUS: FAIL

READY_FOR_IMPLEMENTATION: NO
POST_IMPLEMENTATION: NOT_RUN
READY_FOR_VERIFY: NO
ARCHIVE_ALLOWED: NO

Permitted output is concrete reviewable planning/evidence. No production/frozen control edits, CI installation, feature migration or numbered P implementation may begin under this FAIL. Resolve the explicit visual decision and R04 control/scope reconciliation, then obtain a fresh independent PRE bound to approved artifacts/baseline. Subsequent stages preserve verify-before-independent-POST and all numbered checkpoints.
