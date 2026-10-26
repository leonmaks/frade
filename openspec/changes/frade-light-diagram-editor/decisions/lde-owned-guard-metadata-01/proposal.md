# LDE-OWNED-GUARD-METADATA-01

Status: PROPOSED_NOT_ACCEPTED. Adds only one exact exception to the action/domain-handler freeze; no new production paths.

## Actual blocker

The retained roots are Light in actual Electron, but the dirty guard is portaled into the shared Workbench host and still receives global Dark. An actual synthetic native editor/node drag/close interaction fails the required Light dialog check: expected rgb(255,255,255), actual rgb(39,43,51). Screenshot/trace/observations are in evidence/owned-guard-red-20261026. This is a missing presentation-owner boundary, not a domain/routing defect. The existing guard passes only a text label to ask, so the UI cannot prove which draft originated the prompt, especially for a background tab or multiple dirty documents.

Current design section6 explicitly says action/domain handlers remain exact. Correct identity cannot be inferred from active tab, focus, coordinates or label text. A single explicit metadata argument is the smallest correct exception.

## Exact permitted delta

Only inside the guard body replace the uniquely mapped call ask(label) with ask(label, dirty), where dirty is the already-computed key list. The complete raw before/proposed guard bodies, SHA256 and exact reverse are pinned in guard-call-transform.json. Every other guard byte, condition, key filter, flush/save/discard/cancel/close call/order and domain handler remains unchanged. The metadata is copied/read only; it cannot change actions or keys.

Existing presentation code may extend Prompt/ask typing and capture an opaque live editor appearance lease. For exactly one diagram key, resolve its existing draft repository/path to a unique retained root inside this Workbench. For unknown/multiple/mixed workspace origins keep workspace ownership. Never use the active editor/focus/coordinates as a substitute. Stale/foreign leases reject attachment. Root/overlay teardown and same-transaction apply/rollback remain scoped, without changing global pickers, the single overlay host or modal priority/keyboard/focus.

All implementation stays in already allowed Workbench, DiagramView/FradeDiagramView presentation metadata, editorPresentationParticipant, overlays and named tests. No new domain field/persisted schema/protocol, service state transition, vendor, routing, timeout, assertion weakening or additional UI library. The design draft adds only these explicit ownership details and the one-call freeze exception.

## Strategy and proof requirements

Keep every original FAIL/RED, including the current actual owned-guard failure. Do not globally force overlays Light. Do not bind to whichever tab is active when an asynchronous guard completes. Do not duplicate the host or modify the guard's save/discard behavior. Use explicit immutable origin metadata and a generation-bound lease, then prove one/two-editor/global-picker isolation, forced-colors/rollback propagation, stale disposal and unchanged focus/cancel/save/discard/close behavior.

Initial45-minute probe completed06:20:14Z–07:04:10Z. Shared profile/retained roots:105 unit tests PASS, Desktop build/typecheck PASS, actual dual-engine/density4-context probe PASS in13.3s. Those are partial checks, not closure. This proposal does not waive current owned-guard FAIL or other pending UI coverage.

After exact acceptance: apply only design draft, strict validation, commit and automatic fresh PRE gpt-6-sol/xhigh under the approved stage assignment before implementing this hook/lease repair. Reuse unchanged source-bound results where equivalent; no duplicate full historical runs. Actual final runtime/visual acceptance/verify/POST remain mandatory.

Manifest SHA256: dabce08e220f1e3f86ccb7ecc43984663b460b69d6a889e73fc4622716a0a68e.
