# LDE-REFUSAL-PHASE-INTENT-01

Status: PROPOSED_NOT_ACCEPTED. Replaces only the not-implemented fixture rule in LDE-REFUSAL-INTENT-01; fixed Light policy, forced colors, allowed paths and all other accepted scope remain unchanged.

## Root cause and exact replacement

PRE06 proves that compensation may send operation prepare with the SAME requestId as a refused target but phase rollback. The intent-only draft incorrectly refuses its own compensation. The real service is correct; no production repair is needed. Full state graph, alternatives and bounded strategy are in root-cause-and-strategy.md.

Add exactly context.phase === 'prepare' to the existing proposed intent-bound fixture guard. Only explicitly armed forward Light prepare can latch/refuse. Repeated forward prepare for the same request, including a membership reprepare, remains refused. Join and rollback preparation never latch or refuse; a subsequent cancel with a new ID remains allowed. Keep the existing flag/setter and every original test callsite, action, assertion, REFUSED payload/context, timeout, budget and tolerance. The full draft and exact two-transform reverse map are pinned in manifest.json. No new path, production DTO/phase/ACK or model operation.

All bytes outside the two mapped initializer/guard changes remain exact. Reverse returns pre-LDE live SHA 3535fd97bbb5ad514abd7cc896e2dab750042a757afde459cd4be71984e367e9; retain current -> pre-LDE -> historical7c3e52a6 replay without normalization or self-accepting pins. The live fixture is unchanged.

## Executed proof

The retained probe.cjs loads/transpiles the actual unchanged service/types and extracts/transpiles the complete actual page.addInitScript callback. Final probe PASS: 16 phase/operation/rearm checks and six service sequences with exact original-service trace/context/status parity after excluding only projected kind. It deterministically reproduces the previous draft RECOVERY_BLOCKED and proves corrected target refusal, allowed same-ID compensation, successful cancel, persistent membership reprepare refusal, no settings persistence and unchanged durable record. Paint/host boundary is mocked; this is not Electron/visual/IPC certification. Both bounded probe artifacts are retained.

## Application order and preserved gates

Human acceptance is required by AGENTS2/6 and current exact fixture scope. After acceptance apply only design.draft.md, validate, commit and run fresh automatic cumulative PRE gpt-6-sol/xhigh. Only PRE PASS then meaningful RED authorizes implementing the fixture/product. Original pin tests6/6 stay historical PASS; PRE01–06 remain FAIL. Protected sources, benchmark bytes/pin/budget/workload, Guide/token oracle and routing/domain/vendor remain exact. Full required integration, visual acceptance, verify and independent POST remain mandatory.

Manifest SHA256: 27f36eb2ea197e4ff420309f6c852d98379ffc3ad91548027778891586aad764.
