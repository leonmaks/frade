# P01-LOWER-REFLOW-REFUSAL-01 — proposed exact B05 scope amendment

Status: PROPOSED / NOT_USER_ACCEPTED / NOT_PRE_PASS / NOT_IMPLEMENTED.
This document grants no new production authority. The accepted bounded reflow scope and immutable earlier evidence remain unchanged until explicit human acceptance of this exact draft SHA.

## Established blocker and responsible boundary

Focused automatic POST2 ended GATE_STATUS: FAIL with exactly B05 (INTEGRATION / STATE_TRANSITION).
Report: evidence/p01-popup-reflow-post2-fail-received-20261002T060636Z/result.md
Report SHA256: a204eeb25ba1eabca5c44659ae05b52124a0cd35ef86480958bdfbecc668feb3.
Receipt confirms unchanged candidate/packet/approved stage plan, complete event stream, exit1 and fresh canary.

Evidence-only reproduction: evidence/p01-popup-reflow-b05-rca-20261002T061037Z/reproduce2.mjs and result.json.
It extracts the actual current frameParticipant.ts handler into memory, sends a matching PAINTED followed by lower reflow REFUSED, and observes resolved1 / rejected0 / invalidated0 / diagnostic0 / waiting0. The expected observable diagnostic assertion fails with exit1. The first Windows ESM import failure is preserved separately as ENVIRONMENT, not defect RED.

Current bridge sends REFUSED using an already settled apply request, then retains a successful adoption/focus path. Parent consumes only pending transaction responses. Changing that parent behavior is outside the accepted sole-bridge production boundary. Routing has no dependency on this repair.

## Exact proposed additional authority

Only these production paths may change for B05:
- apps/desktop/src/main/drawio-theme-bridge.ts
- packages/ui-workspace/src/design/theme/frameParticipant.ts
- packages/ui-workspace/src/DiagramView.tsx

Bridge:
1. Make owned-chain reconciliation explicitly return success or failure. Impossible-fit must terminate successful adoption, ARIA-expanded and child-focus paths; observer/cache must never convert a refused result into success.
2. Restore exact owned inline values/priorities/style presence and owned attributes; cancel only the proven current original lower menu through the already permitted original hide cancellation path; restore meaningful connected opener focus. No page action, fitting call, node replacement, label deletion or target hiding may count as success.
3. Emit one bounded concrete refusal for the failed owned chain/current presentation lease. Remain capable of a normal later original opener action after resize/media recovery; do not create an observer/RAF loop or auto-reopen.
4. Preserve stale prepare/cancellation lease, normal feasible keyboard/mouse actions, graph/frame identities, authored model/file/preferences/undo/selection and viewport.

Frame participant:
1. Preserve pending READY/PAINTED/REFUSED transaction handling exactly. Add an optional first-party presentation diagnostic callback for a lower-menu refusal arriving after a successful painted phase.
2. Reuse the existing exact fradePresentation/REFUSED envelope and bounded message; no new serialized field, event, operation, runtime DTO or health key. Accept only the known lower reflow diagnostic from the actual frame/source/origin/id/generation with exact current painted context and matching painted operation.
3. Reject wrong source/origin/owner/context, obsolete or in-flight superseded ownership, disposed/detached handles, invalid size/controls, unrelated messages and duplicates. Never reject or re-resolve an already settled phase, roll back a completed durable commit, fake an ACK, call semantic APIs, or invalidate/reload the whole frame as a diagnostic workaround.
4. Report the local presentation failure through the optional callback; diagnostic state is transient, not persisted. Clear owner/dedup bookkeeping on the existing lifecycle boundaries.

DiagramView:
1. Wire that callback to the existing themeError live region (currently role="status", aria-live="polite") with a clear user-facing refusal message. Keep the graph visible and semantic editor/participant identity intact; no setThemeReady(false), forced rejoin, document load/save, draft mutation or graph refresh.
2. Clear the diagnostic at an explicitly successful existing authoritative presentation/lifecycle boundary; do not claim geometric recovery without an actual successful owned reconciliation. No new overlay host, preferences or provider behavior.

The earlier exact DTO/transaction/barrier/health contracts remain unchanged; this amendment adds only handling of the already existing bounded refusal after a painted phase and a scoped optional in-process callback. Do not reuse generic vendor/domain error reporting to bypass current presentation ownership checks.

## Exact test/support scope

Permitted permanent assertion paths:
- apps/desktop/tests/unit/drawio-theme.test.ts
- packages/ui-workspace/tests/ui-contract/participants.test.ts
- apps/desktop/tests/e2e/ui-contract-theme.spec.ts

Add meaningful bridge-to-actual-parent RED after completed apply, plus actual Electron visible live diagnostic / stopped failed menu / exact restoration / feasible retry and semantic preservation. Assert pending transaction behavior and settled promises unchanged; wrong/stale/duplicate/disposed diagnostic rejection. Preserve all original assertions/tolerances and every raw prior FAIL/BLOCKED. No WB or bundle fixture changes, no skip/only or blind snapshot update.

Supporting current P01 proposal/design/spec/tasks, docs/ui BDD/traceability/status/context and new dated decision/evidence are allowed. Tokens, exceptions, dependencies, CI, vendor, other features, routing, persisted semantics and brand assets are excluded. Exactly3 approved legacy exceptions remain; no fourth exception or reduced target/contrast minimum.

## Proposed four-artifact edits after human acceptance

- proposal.md: append this exact narrow B05 handling boundary and separate acceptance; retain current product intent and dependencies.
- design.md: explicitly distinguish pending transaction refusal from authenticated asynchronous lower presentation diagnostics; add only these two parent paths and the optional callback/live diagnostic semantics above. Keep the sole-bridge restriction for all other lower-menu behavior.
- specs/theme-core/spec.md: add settled-apply impossible-fit observable refusal/STOP/restoration/retry and stale/forged/pending/semantic preservation scenarios, leaving all existing requirements intact.
- tasks.md: add this within open2.4/2.5/3.2; preserve current6/10 and3.1 actual checks, and retain full FUI/human visual/cumulative closure/archive tasks. No numbered stage advancement.

Approved reviewer assignment remains the exact current P01-LOWER-ORIGIN-POPUP-KEYBOARD-01 PRE and POST rows: gpt-6-astra/xhigh. Select and record the newly accepted coherent plan raw hash/excerpt after reconciliation; this draft/request metadata is not PRE approval.

## Required order and STOP

Explicit human acceptance of this draft SHA → preserve origin/raw states → coherent four artifacts/BDD + strict validation → fresh automatic independent read-only PRE PASS using the exact owning stage/role plan → permanent meaningful RED → only authorized B05 implementation → targeted affected lint/typecheck/unit/BDD and old/new native/frame compatibility → six-theme/density/viewport/text/media target/focus/contrast/preservation matrix and fresh full check:all → focused verification → automatic independent POST PASS.

FAIL/BLOCKED stops its owner. No production change before fresh PRE PASS. If these exact paths/semantics cannot implement the correction, stop for an actual decision. Human visual approval, full FUI closure, cumulative verify/POST/archive remain open; STOP before P02. No Routing-owned work or dependency is introduced.
