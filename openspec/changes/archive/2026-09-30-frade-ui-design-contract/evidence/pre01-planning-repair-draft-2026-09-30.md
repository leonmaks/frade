# PRE-01 planning repair — DRAFT, NOT ACCEPTED

Active change: frade-ui-design-contract.
Current independent PRE: FAIL; READY_FOR_IMPLEMENTATION: NO.
Authority: user supplied the independent PRE report; no acceptance of this new CSS exception is inferred.
No production/input/planning artifact is modified by this draft.

## Decision proposed for explicit acceptance

Keep guide v1.0, token source version 1.0.0, original input bytes, all role IDs/order/palette values and all 102 named contrast pairs unchanged. Introduce separate **Frade CSS adoption revision 1** in provenance and generator/checker contract metadata. It is not a new upstream guide/token version and does not widen allowed drift.

The only permitted CSS deviation from supplied tokens.css is this exact single selector replacement in the automatic Dark media block:

```diff
-:root:not([data-frade-theme]), [data-frade-theme="system"] {
+:root:where(:not([data-frade-theme])), [data-frade-theme="system"] {
```

This lowers the root automatic Dark selector from specificity (0,2,0) to (0,1,0). The base root, automatic Dark and final forced-colors root then have equal specificity and declared source order supplies the intended precedence. Explicit Light/Dark/HC and System retain their contract. No !important or forced-color-adjust bypass is introduced.

The original source is immutable evidence. Input SHA256:
- tokens.css: 11aac6f1c08ae67ef25415b220330d26bef9d0d805090ecc9626bb7ca6707d29
- tokens.json: d02e342cd54dc98807778fcdf10e386080f5b97a5c0a8dc1245b0ee9191e2764
- generate-tokens.py: eba41e9ca9849c1ee99253588785d14b75373b465f4250f22751893048a37e64

The byte-equivalence oracle uses original LF/UTF-8 CSS plus exactly this single accepted replacement, asserting its original occurrence count is one. All other bytes remain equal. No generic normalization, selector allowlist, baseline regeneration or ignored mismatch is allowed. Generated CSS/TS drift still compares against the canonical Node generator output and fails on any unapproved change.

The source checker remains a check of original upstream assets. The Frade checker implements adoption revision 1; source checker PASS is not proof of browser cascade correctness. Canonical adoption documentation records source hashes, the specific exception, revision, human acceptance and independent PRE evidence.

## Concrete edits proposed after acceptance

### proposal.md

Add to token/check bullet: "Frade CSS adoption revision 1 permits only the recorded automatic-Dark selector specificity correction; original input, token version/palettes and 102 contrast pairs remain unchanged. Independent PRE must review the exception before implementation."

### design.md — replace entire Token pipeline first paragraph

Adapt the supplied Python generator to a Node module used by both generate and check commands, because every CI job already provisions Node/pnpm and no Python step exists. Preserve role IDs, declared order, token version 1.0.0, palette values, density, coarse-pointer and reduced-motion semantics and all 34 named contrast pairs per theme (102 total). Frade CSS adoption revision 1 permits exactly one automatic-Dark selector correction: :root:not([data-frade-theme]) becomes :root:where(:not([data-frade-theme])); original input bytes remain immutable. This enforces the already required final forced-colors mapping with no theme attribute as well as explicit System/Light/Dark/HC. The equivalence oracle is the original LF/UTF-8 CSS with exactly that one replacement, checking its source occurrence count and every remaining byte. Any additional discrepancy fails. Record source hashes, accepted exception/revision and review provenance in canonical adoption documentation. Produce CSS and typed TS roles deterministically with LF/UTF-8 and no dates. Generator check computes output in memory and compares both artifacts without rewriting them. Version mismatches, missing/extra roles, malformed HEX, nonfinite values and drift fail with paths and IDs. Source palette changes require separate contract review.

Add browser evidence requirement after that paragraph:
"Foundation owns standalone generated-CSS cascade tests in apps/desktop/tests/e2e/ui-contract-token-cascade.spec.ts using the existing Playwright dependency. This is a candidate approved path limited to loading generated CSS in an isolated document; it does not launch or migrate the workbench, install a runtime resolver or write repository data. Run RED against the unchanged source before the Node-generator repair; then run the approved generated CSS against the full 20-state matrix (OS Light/Dark × forced-colors on/off × no attribute/System/Light/Dark/HC), asserting every theme role on root and an inherited child. Non-forced controls preserve the original palette; forced controls assert the approved system-keyword mapping. P01 still owns actual runtime root/portal/canvas integration and accessibility evidence."

Add this narrow test file to the foundation allowed-path table with the above restrictions. No other runtime/e2e integration transfers from P01.

### tasks.md — revise existing open tasks, no checkbox completion

- 1.4: explicitly include independent repeat PRE after PRE-01 exception acceptance, fresh manifest and reviewed hashes.
- 2.1: include provenance/source hashes/CSS adoption revision 1 and accepted narrow deviation in canonical docs.
- 3.1: retain existing meaningful node:test RED cases and add RED generated-CSS browser cascade for automatic Dark + forced-colors without attribute plus explicit-theme positive controls.
- 3.2: replace raw source equivalence with exact single-deviation equivalence oracle; preserve all other bytes, tokens/palettes/102 pairs.
- 3.4: map the new foundation forced-colors outline/examples to actual meaningful browser assertions.
- 4.1: integrate narrow cascade test into the existing Windows UI check; preserve all CI jobs.
- 4.3: require real execution of the new standalone 20-state cascade test alongside retained regression checks.

### specs/ui-token-compliance/spec.md — add requirement

### Requirement: Forced-colors precedence and exact adoption exception

Generated CSS SHALL map every theme color role to its declared system keyword under forced-colors for root and inherited descendants with absent, System, Light, Dark and HC theme attributes under OS Light/Dark. The original input SHALL remain unchanged. Frade CSS adoption revision 1 SHALL permit only the exact single selector replacement :root:not([data-frade-theme]) → :root:where(:not([data-frade-theme])) in the automatic Dark media block. Every other source CSS byte, palette value, role and token version SHALL remain equivalent. Drift checks MUST reject any additional discrepancy.

#### Scenario: Automatic Dark with forced colors

- **WHEN** OS prefers Dark, forced-colors is active and root has no theme attribute
- **THEN** all generated theme roles resolve to the declared system keywords on root and inherited descendants

#### Scenario: Explicit palette without forced colors

- **WHEN** OS Light/Dark is active, forced-colors is inactive and a supported theme is selected
- **THEN** the explicit palette remains unchanged; System and absent attribute follow OS preference

#### Scenario: Unapproved second CSS deviation

- **WHEN** generated CSS differs from the single-exception equivalence oracle in any other byte
- **THEN** equivalence and drift checks fail without rewriting outputs or source evidence

### bdd/ui-contracts.feature — add foundation outline

```gherkin
  @foundation @pre01
  Scenario Outline: Forced colors override every generated palette role
    Given generated token CSS in an isolated browser document
    And OS prefers "<scheme>" with root theme "<theme>"
    When forced colors are active
    Then every generated theme role uses its declared system keyword on root and inherited child
    And original input files remain unchanged
    Examples:
      | scheme | theme         |
      | light  | absent        |
      | light  | system        |
      | light  | light         |
      | light  | dark          |
      | light  | high-contrast |
      | dark   | absent        |
      | dark   | system        |
      | dark   | light         |
      | dark   | dark          |
      | dark   | high-contrast |
```

Add separate positive-control coverage for identical scheme/theme combinations with forced-colors inactive, for a total 20 states. Stable IDs and exact example mappings must be assigned during traceability implementation.

### bdd/traceability-plan.md

Foundation owner includes node:test checks plus the narrow standalone generated-CSS Playwright matrix; all coverage remains NOT_IMPLEMENTED until actually added and executed. Evidence probes do not count as production tests.

### execution-context.json / new accepted decision / new PRE manifest

After explicit acceptance, record the received independent PRE FAIL and PRE-01 status awaiting repeat review (do not call it fixed/PASS). Record adoption decision and revision. Save immutable before snapshots, new dated command evidence, fresh manifest and repeat-review prompt. Preserve the original 130-artifact manifest and independent report. WB-001 text/acceptance and routing independence remain unchanged.

## Actual investigation results

- Original source RED: Chromium 143.0.7499.4, dark + forced-colors + absent attribute; exit 1; 62 role mismatches (31 roles × root/child).
- In-memory selector candidate: 20 combinations, 1240 role assertions, exit 0, zero mismatches.
- Original input checker: exit 0, 102 named contrast checks.
- Input hashes identical before/after; no files loaded into production or browser workbench.
- This establishes a tested planning candidate, not production GREEN, independent PRE PASS, app-wide a11y compliance or migration completion.

## Next checkpoint

Accept or reject the exact planning exception and related scope/test revision. After acceptance: reconcile artifacts → strict validation → fresh manifest → independent repeat PRE of whole foundation with emphasis on PRE-01 → implementation only if independent PASS. No routing predecessor is added.
