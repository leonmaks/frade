# PRE-01 — Accepted CSS adoption revision 1

Status: USER_ACCEPTED_PLANNING_REPAIR.
Date: 30 September 2026.
Active change: frade-ui-design-contract.

The user explicitly replied **«Подтверждаю»** to the exact planning exception and related scope/test revision in [the preserved draft](../evidence/pre01-planning-repair-draft-2026-09-30.md). This record accepts that proposal; the original draft stays unchanged.

## Exact accepted deviation and version decision

Guide remains v1.0; token source remains 1.0.0. Frade CSS adoption revision is **1**, recorded in provenance and generator/checker metadata separately from generated CSS. It is not an upstream guide/token version bump.

The only permitted difference from the original supplied LF/UTF-8 CSS is this exact one-occurrence replacement inside the automatic Dark media block:

```diff
-:root:not([data-frade-theme]), [data-frade-theme="system"] {
+:root:where(:not([data-frade-theme])), [data-frade-theme="system"] {
```

The specificity becomes (0,1,0); later forced-colors declarations win without suppressing normal automatic Dark. All other CSS bytes, role IDs/order, palette values, density/coarse/reduced-motion semantics and 102 named contrast pairs stay unchanged. No generic normalization, blanket exemptions, !important or forced-color-adjust bypass is authorized.

| Immutable input    | SHA256                                                           |
| ------------------ | ---------------------------------------------------------------- |
| tokens.css         | 11aac6f1c08ae67ef25415b220330d26bef9d0d805090ecc9626bb7ca6707d29 |
| tokens.json        | d02e342cd54dc98807778fcdf10e386080f5b97a5c0a8dc1245b0ee9191e2764 |
| generate-tokens.py | eba41e9ca9849c1ee99253588785d14b75373b465f4250f22751893048a37e64 |
| check-tokens.py    | b035a444b73378574c93a9842a4153da3915dcb5b50e05875dfe136ca083030a |

The original input remains immutable. Equivalence uses the original CSS plus only that correction, asserts exactly one source occurrence and rejects every other byte discrepancy. Drift still compares actual generated CSS/TS with the canonical Node generator without rewriting output. Canonical foundation documentation will copy this decision/provenance into its approved docs/ui/decisions scope after PRE.

## Accepted test/scope revision

Foundation candidate scope gains only `apps/desktop/tests/e2e/ui-contract-token-cascade.spec.ts` for standalone CSS cascade tests using the existing Playwright runner. No workbench/runtime integration transfers from P01. The 20-state matrix is OS Light/Dark × forced-colors on/off × absent/System/Light/Dark/HC theme. Tests confirm media state and every theme role on root and an inherited child.

Maintain RED before generator repair, exact one-deviation equivalence and an additional unapproved-drift rejection. P01 remains the sole runtime resolver/root/portal/X6/Draw.io/settings owner. Existing CI/general checks remain required.

## Review state and evidence

The received independent PRE remains **FAIL**: [original report](../evidence/pre-independent-received-2026-09-30T080933Z.txt). Its backend model and effort are not confirmed by the report. No executor assertion converts that FAIL into PASS.

The accepted planning repair is applied; repeat independent PRE is **NOT_RUN**. Current implementation scope is NONE until independent repeat PRE PASS. Foundation tasks stay 3/17. The recorded source RED (exit 1), candidate matrix (exit 0, 1240 role assertions) and 102 named contrast checks are [investigation evidence](../evidence/pre01-candidate-investigation-2026-09-30.json), not implemented production tests or app-wide WCAG coverage.

Historical review manifest/report/draft/probes and accepted WB-001 text remain unchanged. Routing is not a predecessor. No implementation, P01, migration, verification, POST or archive has been started by this repair.
