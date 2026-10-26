# LDE-REFUSAL-INTENT-01

Status: PROPOSED_NOT_ACCEPTED. Supersedes only the not-implemented one-line fixture rule in LDE-REFUSAL-FIXTURE-01. Fixed Light, Windows forced colors, the accepted origin-control paths and all other scope stay unchanged.

## Reproduced root cause

PRE05 FAIL exposed an error in the owner's proposed one-line replacement: application Dark preview and cancellation now both deliver a Light editor snapshot. The old fixture had distinguished them by global palette kind. After local projection that distinction is lost, so the armed flag rejects cancellation as well as the target. Classification: STATE_TRANSITION / ABSTRACTION_BOUNDARY. No production or live fixture patch was made.

The actual page.addInitScript callback was extracted from the full source, transpiled and executed in a deterministic isolated message harness. The original Dark callback refuses its Dark target and permits Light cancel. The accepted-but-unimplemented Light-only callback also refuses cancel: deterministic counterexample REPRODUCED_FAIL. A first probe harness attempt lacked performance.now and is preserved as ERROR; the corrected harness does not change the fixture source.

## Exact replacement

Only apps/desktop/tests/e2e/ui-contract-theme.spec.ts remains the fixture target. The full proposed TS source, exact two-edit transform map and design draft are pinned in manifest.json.

- Keep the external __p01RefuseDark flag name and existing true/false callsites. A configurable fixture-only getter/setter retains its boolean state and resets the captured request whenever the test explicitly arms/disarms it, including rearm with no intervening message.
- On the first armed valid Light prepare, capture context.requestId. Refuse that same requestId persistently, including a membership reprepare, and echo the exact original REFUSED/context/message.
- A subsequent cancellation has a different requestId (the unchanged service request() generates a new session/intent sequence), so it is allowed even while the flag remains armed. Non-prepare, wrong-kind and unarmed messages cannot latch a target.
- Only this initializer insertion and the exact refusal guard/latch are changed. All existing test callsites, user actions, assertions, fixture message payloads, participant context, timeout/performance/geometry tolerances and document/settings/rollback checks remain byte-identical outside the two mapped edits. No new production protocol or field is introduced.

## Executable preflight proof

behavior-probe.json records nine candidate checks PASS: unarmed, wrong operation, wrong kind, intended refusal, repeated same-intent refusal, cancellation allowed while armed, old target still refused, rearm without intermediate messages and disarm. Every emitted REFUSED preserves exact context and message. This is a controlled callback probe, not an Electron/UI PASS. The two edits reverse exactly to pre-LDE source SHA 3535fd97bbb5ad514abd7cc896e2dab750042a757afde459cd4be71984e367e9. Existing source is unchanged.

The accepted origin helper/test paths will verify the hard-coded final live SHA, reverse only the exact new initializer/guard/latch and approved visual expectations into that pre-LDE SHA, then retain the original historical selector reversal to SHA 7c3e52a69c1b8346a78f4297774f5c2342a3ecdaeb05a2611465d2f09c546f43. Missing/extra/reordered/tampered transforms and unrelated source/assertion changes must fail. No normalization, arbitrary allowlist or runtime self-accepting pin is permitted.

## Alternatives and bounded strategy

The one-line Light replacement is rejected by the reproduced cancel failure. Consuming the flag after one message is rejected because a repeated prepare for the same target could then succeed. Disarming before Escape in the test actions is rejected because it changes the retained regression rather than preserving cancellation under the controlled fault. Changing production DTOs to satisfy a fixture broadens product scope and is rejected. Binding the fixture to its intended request is selected: it preserves persistent target refusal and independent cancel identity without changing product behavior. No new expensive review is dispatched while this known scope conflict is unresolved.

## Application order

After exact human acceptance, apply only design.draft.md before fresh PRE gpt-6-sol/xhigh. The TS draft remains a prospective implementation input until PRE PASS and meaningful RED. Preserve PRE01-05 raw FAIL/receipts and the existing benchmark pin/workload/budget. The benchmark checkout was restored exactly from its own baseline Git blob (no source diff); unchanged origin/pin tests PASS6/6. Fresh review uses the transitive in-repository dependency packet and explicit environment evidence. No review finding itself grants scope authority. Actual full regression, native/frame runtime, visual acceptance and independent POST remain mandatory.
