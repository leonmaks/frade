# Foundation closure — 30 September 2026

CHANGE: frade-ui-design-contract
STATUS: ARCHIVED; 21/21 tasks complete; STOP before P01.

IMPLEMENTED: This checkpoint synchronized three main specs (12 requirements / 24 scenarios), ran strict validation, executed the real project archive and verified post-archive compliance and durable links. Foundation provides guide v1.0, tokens 1.0.0 and CSS adoption revision 1, mandatory AGENTS rules, static token exports and compliance in the existing local CI definition. Runtime resolver/density/settings/preview and surface migration are not implemented by foundation; P01 owns them. Routing is not a prerequisite.

FILES CHANGED: New main specs openspec/specs/ui-design-contract/spec.md, openspec/specs/ui-token-compliance/spec.md and openspec/specs/workbench-visual-contract/spec.md; the entire selected change moved to openspec/changes/archive/2026-09-30-frade-ui-design-contract; only tasks.md and execution-context.json received closure bookkeeping after checks. New closure evidence and docs/ui/foundation-status.md were added. No production scripts, components, generated tokens, dependencies, CI, AGENTS, brand, domain, routing or future P01–P07 files changed in this checkpoint.

TESTS ADDED: None for this archive operation. Existing meaningful lifecycle/token/color/traceability/fresh-checkout tests were executed against the actual archived state.

COMMANDS EXECUTED:

- openspec validate --specs --strict --json: exit 0; 9/9 main specs valid.
- openspec validate frade-ui-design-contract --strict --json: exit 0; selected change valid.
- openspec archive frade-ui-design-contract --yes --skip-specs --json: exit 0. Specs were already synchronously merged and strictly validated; --skip-specs avoids a second application, not an omitted sync. Only 4.5 was open because it contains archive and post-archive checks; user continuation authorized this operation. It remained unchecked until those passed.
- pnpm ui:compliance after actual archive: exit 0; 26/26 tests, zero skips, 102 contrast pairs, 124 exact legacy/domain exceptions, 28 foundation bindings; 23 future cases explicitly not executed.
- Isolated controls: actual exits [0,0,1,1,1,0,1], matching expectations. Generated drift, contrast, new literal and missing traceability negatives failed. Positive controls passed. Fresh Git checkout: absent attributes physical CRLF drift exit 1; accepted eight rules raw LF preservation exit 0 / 102 pairs. Owned temporary fixtures removed.
- openspec list --json: exit 0; foundation absent from active changes; P01–P07 all 0 completed.
- git diff --check: exit 0. Final git status/diff and raw inventory inspected.
- Executor raw integrity/link checks: PASS; 199 moved files plus pre-move snapshot preserved; all 4950 pre-closure artifacts preserved before bookkeeping. Canonical BDD and durable owner instructions equal archived copies; all 12 current links resolve.

TEST RESULTS: PASS for the applicable archive checkpoint. The accepted independent POST is POST-FOUNDATION-20260930T145619Z, GATE_STATUS PASS. Its original report hash and reviewed manifest are unchanged. This executor record does not constitute a new independent architecture gate. Full prior applicable Windows validation (215 Draw tests, 41 desktop tests including 20 CSS cascade cases, standalone cascade 20/20) remains historical reviewed evidence and was not rerun for this docs/lifecycle closure.

Evidence: [archive execution](foundation-archive-command-2026-09-30.json), [actual compliance log](foundation-post-archive-compliance-2026-09-30.txt), [integrity and links](foundation-post-archive-integrity-2026-09-30.json), [before snapshot](foundation-closure-before-2026-09-30.json), [bookkeeping](foundation-closure-bookkeeping-2026-09-30.json), [accepted POST](post-foundation-received-POST-FOUNDATION-20260930T145619Z.txt). Before snapshots preserve raw tasks/context bytes; old reports, paths and manifests remain point-in-time evidence, not rewritten after relocation.

GUIDE / APPLICABLE RULES: Guide v1.0, token contract 1.0.0, adoption revision 1; AGENTS §1–19, accepted FOUNDATION-ARCHIVE-01 / FOUNDATION-EOL-01 and PRE-01, ui-design-contract / ui-token-compliance / workbench-visual-contract requirements. Routing gates are not applicable because routing semantics/controls are excluded. No visual migration baseline is approved by this token/archive PASS.

SCREENSHOTS: No screen changed in this archive checkpoint. Seven real baseline screenshots under evidence/baseline remain immutable historical evidence. App theme/density, migrated visual regression and screen-reader verification remain NOT_RUN in their owning stages. No mockup behavior or AI provider integration is claimed.

REVIEW AUTOMATION: Local independent Codex CLI transport is ready, gpt-6-astra / xhigh requested; fresh read-only session, approval never, prompt/result/events and before/after integrity collected automatically. Technical read-only smoke PASS; actual backend/effort NOT_CONFIRMED. Accepted manual POST came first; it was not replaced by a transport smoke.

KNOWN BLOCKERS: None for foundation closure. Remote CI remains LOCAL_ONLY/unobserved, branch protection NOT_CONFIGURED/unverified and Linux execution NOT_RUN. Those limitations were disclosed in the accepted scope; no merge protection is claimed. Runtime themes and P01–P07 implementation remain pending, not foundation blockers.

READY_FOR_VERIFY: YES — verification and accepted POST completed, actual archive and post-archive checks PASS.

No commit, staging, PR, remote policy change or next numbered change was started.
