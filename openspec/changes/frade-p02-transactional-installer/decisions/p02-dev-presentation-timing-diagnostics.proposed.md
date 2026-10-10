# P02-DEV-PRESENTATION-TIMING-DIAGNOSTICS-01

Status: PROPOSED, NOT_APPROVED. 2026-10-10T17:20:49.951Z. Decision extends only P02 consumer-side diagnostics, not the P01 UI behavior or timeout contract.

## Established evidence and objective

Focused S1 POST FAIL openspec/changes/frade-p02-transactional-installer/evidence/p02-s1-post-received-20261010T165324969Z. Main actual-close defect reproduced and repaired with actual callbacks RED→GREEN and source-bound141unit/6runtime/type/lint/buildPASS. Historical dev5s presentation handshake failure remains unresolved. Two bounded isolated cache probes pass: cold initial HTTP last-response4423ms, warm1741ms; these are server timings, not proof of the historical failure cause or actual paint readiness. No more identical warm reruns and no fresh POST while this blocker is unresolved.

Authorize precise observability to distinguish resource loading, synchronous boot projection, controller settlement and ready acknowledgement on a genuine failure. Existing approved scope freezes original P01 source; this is an explicit narrow consumer-owned control exception, not an automatic baseline movement or supplier dependency.

## Allowed source and purpose

1. apps/desktop/src/renderer/presentation-bootstrap.ts, current exact original SHA256 c3161f1b0ced4d2036e524c6ca9d779041ef41d6ceab8924cad11ce814f1227f: DEV-only bounded console timing markers at function entry, before/after existing getBoot+parse, controller creation, ready entry, before/after existing controller.whenReady and api.ready, disposal. At most10 markers per boot; fixed phase labels and numeric timings only. No document/selection/session payload, project paths, tokens, credentials or settings dump. No new function/API/options/IPC/schema/message/network/storage fields. Existing operation order, awaiting, error propagation, listeners, controller inputs and behavior remain identical. Production build eliminates DEV logging. No edits yet.
2. apps/desktop/src/main/index.ts, already accepted S1 path: matching dev-only monotonic markers around existing pre-window backend init, BrowserWindow/navigation/load events, existing visibility construction/onReady/failure; forward only those fixed-label renderer markers to captured stdout. Do not add an IPC or renderer debug API, alter existing event handling or expose OS handles.
3. Only existing approved new P02 unit/e2e paths: append observability/preservation assertions and capture logs/timings, retaining every original assertion, timeout, retry, fixture and expected value. UI scopes, overlays, coordinates and DOM stay unchanged.
4. Current P02 proposal/design/spec/tasks/status/evidence may reconcile this exact acceptance and record actual before/after source hashes and controls. Original P01 archive/source origin/evidence and FAILs remain immutable.

## Explicit exclusions

No change to5000ms or its starting point, reveal/paint readiness, parser/schema, persisted presentation, domain/routing/vendor, renderer main.tsx, preload, presentation-settings.ts, package/lock/CI/Vite production config, guide/tokens/brand or shared reviewer. No test skip, loosening, rerun-to-PASS, waiver/reclassification of FAIL, P02 cumulative closure/archive or P03. No provider or extension activation. This decision authorizes diagnostics only, never a speculative timeout repair.

## Process, bounded strategy and stop

After exact human acceptance: reconcile active plan and strict validate; fresh automatic PRE gpt-6-sol/xhigh as assigned to P02, then instrumentation/tests. Capture exact P01 before/after raw bytes/hash adoption without touching archive. Required source-bound affected unit/type/lint/build/runtime and unchanged applicable P01 controls precede automatic POST.

Alternatives: ordinary warm rerun and another cold/warm pair already cannot attribute the failure; timeout/startpoint change lacks root cause and approval; Main-only HTTP observations cannot measure renderer controller settlement; narrow renderer logs give causal phases without changing semantics. Selected risk-first bounded observation, no weakened procedure. Forecast diagnostics/test work15–30min and at most3 canonical dev/rebuild attempts45sec per test (whole command hard240sec); PRE/POST8–20min each from measured~18min current harness, dominated by full source scans. Forecasts, not guarantees; token cost unmeasured. No duplicate fullcheck run before final coherent source. Reassess after first instrumented run; STOP after3 attempts if no failure reproduced, report NOT_PROVEN and seek actual environment/scope decision. Keep each failure and all prior reports. Any repair beyond these fixed markers requires separate approved scope and meaningful RED before production.
