# P01-READONLY-STATE-01 — proposed evidence-path clarification

Status: PROPOSED / NOT_USER_ACCEPTED / NOT_PRE_PASS. No accepted artifact or production behavior is revised by this draft.

## Actual blocker and source boundary

Actual p01-b02-effective-viewport-r2-20261001T030935Z native readonly restart opens the readonly diagram and disables Save, but the ordinary bundle double-click cannot open FlowManager. Existing styles.css .frade-canvas.readonly > main disables pointer events; .diagram-frame.readonly iframe and its existing readonly overlay similarly block frame pointer access. These are existing feature behavior, not token/contrast defects. P01 B02 explicitly forbids feature source/CSS/behavior edits. Current required check stays FAIL/BLOCKED; screenshots are NOT_APPROVED and no gate/archive advances.

## Recommended exact clarification, if accepted

For B02 the real FlowManager read-only visual state is exercised while its already-open diagram is in an actual pending or unknown diagram-write state, using an isolated declared transport fixture, the existing readonly prop and original handler/DTO. Assert visible panel, disabled membership and unchanged draft/member bytes under all six theme/density states, forced colors and three viewports. Explicitly distinguish diagram read-only from repository read-only: repository flow creation permissions retain the actual backend capabilities. No renderer props, graph model, XML, controller, vendor or feature handlers may be fabricated or changed to create this state.

A restored read-only workspace must still be tested for disabled Save, blocked editing and unchanged actual file bytes. Do not claim that it can open FlowManager. Preserve the current failed opening fixture as historical raw evidence and document the missing readonly inspection entry point as a separate forms/Draw-owned functional task. That task is the consumer of P01 tokens and owns its integration/tests/PRE/POST; P01 does not wait for this unrelated behavior repair. This clarification is not an accessibility or visual exception: the actual pending/unknown readonly FlowManager still must pass the accepted color/focus/state evidence.

Before applying this clarification: human accepts this exact text; update coherent proposal/design/spec/tasks/traceability; validate and obtain focused independent gpt-6-astra/xhigh read-only PRE PASS. Original failed readonly-open source/assertions/results are retained verbatim in dated evidence. Do not merely delete a regression to make current tests pass.

## Alternative scope expansion

Authorize P01 to add a readonly-safe bundle inspection entry point, with exact source paths, keyboard/accessibility/permission contract, no write/reconnect/endpoint changes, regression-first tests and a new independent PRE. This broadens P01 from presentation to feature behavior and requires a separate accepted design before any production edit. Routing semantics remain outside both options.

Neither option is applied. P01 remains 5/10 and READY_FOR_VERIFY NO.
