# LDE-NATIVE-DRAG-DEFERRED-RISK-01 — proposed, NOT_ACCEPTED

## Exact observed state

The final current-source representative Electron matrix executed56 cases:55 PASS,1 FAIL. The failure is the original P01 native hot preview/commit case at its first mouse drag: dirty count remained0 instead of1 before theme preview. Original actions/assertions/timeouts/tolerances remain unchanged. inputs-before/after verify222 exact source hashes unchanged. Report: evidence/upstream-final-runtime-20261026/report.json. Current original-test raw SHA256 f9b08ca17f6eddcaa932de360e96d72a813532ff32d478d884dd3af30130dbd7; exact reversal3535 -> original7c3 is verified.

Two bounded unchanged executions PASS; five instrumented identical-action/assertion executions also PASS. The telemetry fixture has been removed after raw hash/realpath ownership proof; its bytes/reports remain in evidence. Earlier diagnostic setup failures/zero selections are preserved and do not count as passing samples. These samples did not reproduce the original failure. Cause and production causality are NOT_PROVEN. Do not claim a test-only, environmental or harmless cause. An early drag being ignored remains a possible user impact.

The independent target-width integration FAIL was separately reproduced and repaired by restoring only24px normal target width; its original responsive frame test passes. It is not this drag failure.

## Decision requested

Accept exactly the historical native initial-drag FAIL above as deferred risk LDE-D01 for this feature's cumulative closure. Preserve FAIL in all evidence/status/POST; it is never PASS. Permit remaining verification, visual acceptance and independent POST to assess closure with that explicit accepted risk. No production, fixture, assertions, action order, timeout, tolerance, retry or routing/domain change is authorized by this decision. Any new required failure, including another native drag failure, remains blocking. Mandatory performance/source/general checks still apply.

Record follow-up ownership in this change/status: investigate native first-interaction readiness with deterministic reproduction before any future repair. No next numbered feature begins automatically. Independent reviewer must see the original failure and all diagnostic outcomes. No source or historical evidence rewrite; no automatic baseline acceptance.

## Alternatives / bounded strategy

1. Continue root-cause investigation now: preserves zero-exception closure but no reliable time estimate; needs further targeted instrumentation, not full repeats. Existing native fixture awaits node visibility/save availability but does not explicitly await the presentation barrier, unlike frame readiness; this is only a hypothesis without a failing telemetry sample. No frozen-fixture change is justified yet.
2. Explicitly defer the exact observed risk: keeps this feature's fast delivery objective while disclosing uncertainty; requires the human decision under AGENTS sections2,3,6,20. It does not assert the bug is fixed or permit a new failure.

After acceptance: reconcile the formal verification/risk record, strict validation and automatic applicable review under the existing gpt-6-sol/xhigh plan. No further production change solely to make the historical test green. Until acceptance or proven repair, overall verification/POST/archive remain blocked.
