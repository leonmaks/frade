# Full fixture state-transition analysis after PRE06

Classification: STATE_TRANSITION / ABSTRACTION_BOUNDARY / TEST. Two previous proposed drafts were rejected before any production/live-fixture modification; stop speculative predicate changes and derive the fault from the complete actual service phase graph. PRE06 raw FAIL is immutable.

| Caller | operation | context phase | request identity | Required fault behavior |
|---|---|---|---|---|
| register / boot / post-failure join | prepare | join | boot or latest owner | Allow; do not latch |
| execute forward preview/commit | prepare | prepare | new intent | First explicitly armed Light forward latches/refuses |
| execute bounded membership reprepare | prepare | prepare | same intent, changed membership | Refuse persistently |
| compensate without prior prepared handle | prepare | rollback | SAME intent, committed revision | Allow; do not latch |
| compensate with existing handle | rollback | rollback | SAME intent | Allow; operation is not prepare |
| explicit cancel after refusal | prepare | prepare | NEW intent | Allow while original target remains latched |
| ordinary apply | apply | apply/join/rollback | owned context | Allow; operation is not prepare |

Source: actual unchanged service.ts prepare callsites in execute, compensate and register; context generation/request semantics and strict ACKs unchanged. The earlier palette-only and intent-only predicates omitted different dimensions of this phase graph. Correct fault identity is forward prepare phase plus latched request, not palette kind alone or request alone.

## Alternatives and execution cost

- Keep either accepted old draft: rejected by deterministic cancellation/compensation counterexamples.
- Add only an exception after another expensive review: rejected; incomplete callback-only testing already missed service behavior.
- Turn off the armed flag after one message or before Escape: rejected; weakens persistent fault or historical user actions.
- Change service/DTO/ACK/timeouts: rejected, production behavior is correct and outside this fixture decision.
- Selected: exact forward-phase guard plus existing request latch, checked with the real service and full extracted callback. Bounded probe completed in approximately 2 seconds per invocation; no Electron, external data, network or runtime review involved. Two service-probe artifacts preserve initial and expanded parity coverage.

Final probe: 16 callback phase/operation/rearm checks and 6 end-to-end service sequences (plain refusal, prior preview, direct commit, prior-preview commit, membership reprepare, prior-preview membership). Each candidate sequence matches the original Dark fixture's actual service trace/context/status, ignoring only locally projected snapshot.kind. Reproduces intent-only RECOVERY_BLOCKED; corrected draft yields REFUSED, successful cancellation, no recovery curtain, no persist and unchanged durable record. Paint/host transport mocked: not Electron/real IPC or visual PASS. Probe source retained for independent reproduction.

Fresh review cost measured PRE06 total 9m14s including preparation, earlier approximately 6–7m. Do not dispatch another review until this exact scope is accepted and active design is coherent. Use same verified dependency closure plus new small proof/decisions; no repeated unchanged unit/full regressions. Reassess on any fresh deterministic conflict before another patch; known failures are never converted to PASS.
