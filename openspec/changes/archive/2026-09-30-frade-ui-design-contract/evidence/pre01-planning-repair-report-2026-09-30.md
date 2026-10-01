# PRE-01 accepted planning repair — preparation report

CHANGE: frade-ui-design-contract.
IMPLEMENTED: accepted planning repair only.
READY_FOR_VERIFY: NO (product foundation remains NOT_IMPLEMENTED).
READY_FOR_REPEAT_PRE: YES.

The user explicitly confirmed the exact planning exception and scope/test revision. The accepted decision is decisions/token-css-adoption-2026-09-30.md. Guide v1.0 and tokens 1.0.0 remain unchanged; separate CSS adoption revision 1 allows only the automatic-Dark selector correction. The source CSS and every other input byte remain immutable. Revision metadata is outside CSS.

## Actual edits

Seven existing files revised:
- openspec/changes/frade-ui-design-contract/proposal.md
- openspec/changes/frade-ui-design-contract/design.md
- openspec/changes/frade-ui-design-contract/tasks.md
- openspec/changes/frade-ui-design-contract/specs/ui-token-compliance/spec.md
- openspec/changes/frade-ui-design-contract/bdd/ui-contracts.feature
- openspec/changes/frade-ui-design-contract/bdd/traceability-plan.md
- openspec/changes/frade-ui-design-contract/execution-context.json

New accepted decision, before snapshot, operation record, preparation checks/report, read-only verifier, repeat PRE prompt and fresh manifest are separate additions. The original report, 130-file review manifest, unaccepted draft at its historical timestamp, browser probes/logs and WB-001 text are unchanged. No production/test/CI/input/routing files were edited. No implementation task was completed: foundation stays 3/17.

The only extra candidate implementation path is apps/desktop/tests/e2e/ui-contract-token-cascade.spec.ts for standalone generated-CSS cascade testing after independent PRE PASS. That file does not exist yet. P01 still owns runtime theme/root/portal/canvas/settings integration.

## Actual checks on this planning revision

- openspec validate frade-ui-design-contract --strict: PASS.
- Project Prettier check of revised Markdown/JSON decision/planning and repeat prompt: PASS after scoped formatting.
- Gherkin parser: PASS; two new foundation outlines with 20 valid matrix examples.
- Prior BDD text excluding the two new outlines: byte-equivalent after its existing CRLF-to-LF representation; no prior scenario/step removed or weakened.
- Historical scope integrity: PASS; all 123 unedited files from the old manifest retain their SHA256; all seven edited files have valid immutable before payloads bound to that manifest.
- Accepted WB-001 quote block: unchanged SHA256 6e96a420d5bcc7e9165d2992f5bca4ec7cbfc37778e4d8acd193d07dab66ca9e.
- Source selector occurrence count: exactly one.
- Source CSS SHA256: 11aac6f1c08ae67ef25415b220330d26bef9d0d805090ecc9626bb7ca6707d29.
- In-memory single-selector candidate SHA256: 6a6b47b12f5090a66231ee2541387ada31a2435d76f245c6631ad4285ac784a4.
- git diff --check: PASS. Tracked diff remains the preexisting AGENTS §18; planning is untracked and separately hashed. No staged/commit/archive operation performed.

Exact outputs are in pre01-planning-preparation-checks-2026-09-30.json. The standalone verifier is pre01-planning-repair-check-2026-09-30.mjs and must run from the recorded UI workspace.

## Historical investigation, not rerun in this planning repair

pre01-candidate-investigation-2026-09-30.json records source RED exit 1, in-memory candidate PASS exit 0 (20 states, 1240 role assertions) and the original 102-pair checker PASS. These remain actual earlier runs, not new production test results. No app-wide accessibility, new visual baseline, CI enforcement or product implementation PASS is claimed.

## Current gates and next checkpoint

The received independent PRE is FAIL. Its reviewer backend/effort were not confirmed. Explicit acceptance repairs the planning requirement but does not issue an independent approval or convert historical FAIL to PASS. Repeat PRE is NOT_RUN; current implementation scope is NONE until fresh independent PASS.

Use pre-foundation-pre01-repeat-prompt-2026-09-30.md and pre01-repeat-pre-manifest-2026-09-30.json for a full independent foundation review. Recommended model remains GPT-6 Astra / xhigh. Reviewers may return the complete report in chat if unable to save new evidence. No routing repair/closure/PRE prerequisite is added.

Product checks/verification/POST/archive remain NOT_RUN. Remote UI merge enforcement remains NOT_CONFIGURED/unverified.
