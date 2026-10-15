# P01-MAIN-SPEC-STRUCTURE-01 — proposed

Status: PROPOSED / NOT_ACCEPTED. Active spec, transfer manifest and product remain unchanged. This decision addresses the strict-validation FAIL recorded under openspec/changes/frade-p01-main-integration/evidence/planning-validation-20261013T211511505Z.

## Exact bounded change

Split only the three overlong descriptions in ui-token-compliance into independent duties. All original description sentences are preserved verbatim in order across the resulting requirements; every original scenario remains unchanged. Six extracted duties gain explicit scenarios. No behavior, token, test, tolerance, exception, runtime, CI or scope expansion. Other four capability specs remain exact supplier copies. Full mapping and hashes: mapping.json.

Affected future live path: openspec/specs/ui-token-compliance/spec.md. Current integration delta path: openspec/changes/frade-p01-main-integration/specs/ui-token-compliance/spec.md. Supplier archive and supplier-copy evidence remain byte-exact and immutable. The manifest receives one explicit proposed canonical-spec adaptation entry rather than falsely claiming that changed spec has supplier-byte parity. No production adaptation is allowed by this decision.

- Proposed delta: delta.proposed.md; SHA256 a4cb9c4ba230e298c106cc861765f1925738dc15147d77190af7185f310df2e8.
- Proposed canonical: canonical.proposed.md; SHA256 34e85b41c71f1be045a55d9bafc5152d4c30e9ea1202cc71fdfc7285340cda17.
- Isolated complete-change strict validation: PASS (fixture-execution.json and full stdout); active validation remains FAIL until accepted and applied.

## Reason for decision

The applicable openspec-ff-change instruction delegates spec formatting to OpenSpec. Current instructions state: "Split an existing long requirement only when the user asks for it, in a change made for that purpose". This proposal makes that bounded structural change reviewable before approval. It does not retroactively mark old validation PASS.

## After acceptance

Reconcile active design/manifest/spec with exact accepted bytes and adaptation provenance; strict validate; automatically run independent PRE gpt-6-sol/xhigh; transfer only after PRE PASS. POST remains automatic after implementation checks. P02–P07 stay paused.
