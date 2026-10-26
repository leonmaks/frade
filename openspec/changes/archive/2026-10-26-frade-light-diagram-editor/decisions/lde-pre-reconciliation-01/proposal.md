# LDE-PRE-RECONCILIATION-01

Status: PROPOSED_NOT_ACCEPTED. No product, source-control implementation or active spec draft has been applied.

## Observed blocker

Automatic independent PRE 02 (gpt-6-sol/xhigh) is FAIL with verified unchanged candidate/packet. The old actual editor visual expectations in apps/desktop/tests/e2e/ui-contract-theme.spec.ts (notably lines 296/352/426) expect Dark. The existing exact replay helper rejects any changed live source before restoring the historic selector-only origin. The active design permits the E2E visual change but excludes its helper/test. This contradiction prevents the accepted Light behavior from passing required historical controls.

## Exact proposed additional paths

1. packages/ui-workspace/tests/ui-contract/vscode-dark-2026-origin.ts
2. packages/ui-workspace/tests/ui-contract/vscode-dark-2026-origin.test.ts

Existing source hashes are in manifest.json; no other new product/control path is permitted. Original scopes/exclusions remain. The E2E file and traceability manifest are already authorized; this adds only their exact two-file replay-control consumer.

## Mandatory preservation

- Preserve the exact full pre-LDE live source/hash and original historical source/hash, all prior raw reports/events and accepted failures. Never overwrite prior evidence.
- Change only visual expectations directly contradicted by fixed Light, with exact original/new text, occurrence counts, locations and hashes; global workbench expectations remain theme-dependent. Preserve all behavioral assertions, keyboard/focus/semantic/persistence checks, timeout/performance/geometry tolerances, fixture actions and canonical pin tests.
- Historical replay must first require the hard-coded exact new final live-source SHA, undo only the enumerated accepted visual changes into pre-LDE SHA 3535fd97bbb5ad514abd7cc896e2dab750042a757afde459cd4be71984e367e9, then retain the original selector reversal producing original SHA 7c3e52a69c1b8346a78f4297774f5c2342a3ecdaeb05a2611465d2f09c546f43. Do not accept arbitrary old/current inputs, calculate expected SHA from incoming live bytes, normalize bytes or replace the guard with a permissive AST check.
- Negative controls must reject unrelated byte/assertion changes, missing/extra/wrong transform occurrences, tampered mappings and mismatched before/intermediate/final hashes. New exact final pin is bound after the approved E2E source change and covered by fresh regression and independent POST; unknown deltas STOP.
- No checkout oracle, raw-protected Guide/QA/Theme/token file, .gitattributes, review harness, routing/domain/vendor/lockfile/branding change.

## Included planning corrections

The four exact drafts in manifest.json also reconcile the already authorized unsupported-capability behavior: page/image witnesses apply to Draw.io, native schema limitations are explicitly reported. The workbench spec removes only the newly added duplicate geometry sentence, retaining every original condition and both scenarios; merged strict current FAIL / corrected PASS is recorded in merged-spec-probe.json. No original requirement is deleted or deferred.

The next packet additionally includes baseline ThemePicker.tsx and picker.test.tsx, which PRE 02 identified as missing global-overlay witnesses; adding relevant read-only Frade packet inputs is already authorized.

## Sequence after acceptance

Apply only these planning drafts; strict-validate the active change and merged affected main specs in an isolated fixture; prepare fresh full relevant packet; automatically execute PRE gpt-6-sol/xhigh. Production remains forbidden until clean PRE PASS. Then meaningful RED/implementation/current tests/verify/automatic POST and new human visual acceptance follow the unchanged workflow. This decision does not itself mark PRE PASS, accept screenshots, waive any failure or authorize push of a new remote ref.
