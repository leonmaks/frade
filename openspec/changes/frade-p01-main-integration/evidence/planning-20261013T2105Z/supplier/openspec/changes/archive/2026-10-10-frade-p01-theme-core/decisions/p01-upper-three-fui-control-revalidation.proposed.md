# P01-UPPER-FUI-CONTROL-REVALIDATION-01

Status: PROPOSED, NOT_ACCEPTED. This narrowly extends only the test-support path boundary of accepted P01-UPPER-THREE-GLYPH-PAINT-01. No new production behavior or numbered stage.

## Reproduced blocker

The required append-only upper-three regressions change the raw bytes of apps/desktop/tests/e2e/ui-contract-theme.spec.ts. Current BDD correctly rejects its historical full-file source hash:109PASS/2FAIL SOURCE_HASH, evidence openspec/changes/frade-p01-theme-core/evidence/p01-upper-three-fui-revalidation-scope-20261002T222540Z/command.json and raw logs. The current registry can be revalidated in its already authorized path, but the separate positive/negative control loader in packages/ui-workspace/tests/ui-contract/p01.bdd.test.tsx hardcodes historical run p01-fui-runtime-20261002T130053Z. Its immutable positive fixture pins the old full source. Re-executing runtime and updating the registry alone cannot make this second required positive control valid. Historical evidence must not be rewritten.

Classification: TEST / SPEC_CONFLICT in authorized test-support paths. UI-owned; no Routing dependency.

## Exact additional permission

Allow only one string-literal replacement in packages/ui-workspace/tests/ui-contract/p01.bdd.test.tsx: the value of const fuiControlRun, from historical openspec/changes/frade-p01-theme-core/evidence/p01-fui-runtime-20261002T130053Z to the exact new immutable p01-fui-runtime-<UTC> run directory created by an actual fresh successful execution of all12existing FUI cases on the final current assertion source. The exact resulting path and raw before/after hashes will be recorded. No dynamic latest lookup, source-hash fallback, shortened prefix-only binding or relaxed command/result validation. No imports, test callback, assertion, required case, evidence-path grammar, helper/checkFuiBindings or negative-control mutation changes.

Create a new control-valid-bindings.json in that new run using the actual current source/callback/raw-command/report hashes only after the real12-case command passes unchanged. Update the existing fullRuntimeBindings registry to the same fresh source-bound execution. Preserve the old raw test, all original callback hashes, old registry and every historical command/report/control fixture unchanged in evidence. Negative controls must be rerun against the fresh valid baseline so each rejection remains meaningful.

All other allowed/excluded paths remain exactly those of the accepted upper-three scope. Production remains only apps/desktop/src/main/drawio-theme-bridge.ts. Do not change tokens, vendor, domain, routing, parent, dependencies or CI. This does not accept missing focus/disabled states, screenshots, cumulative closure or P02.

## Required workflow

After acceptance reconcile the existing proposal/design/tasks/specs, record this exact proposal hash, run strict validation and automatic fresh focused PRE under the approved P01 upper-three reviewer assignment gpt-6-astra/xhigh. Only then change the one string after actual12-case PASS. Verify exact one-line delta and unchanged helpers/callbacks, run BDD111including all14negative controls and targeted/full checks; verify and automatic POST remain required. Historical SOURCE_HASH FAIL is retained. No existing PASS is rebound without a fresh actual execution.
