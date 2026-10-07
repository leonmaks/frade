# Engineering direction lifecycle

## Purpose

Defines uniform auditable direction ownership, intake, research, requirement traceability and sequential delivery while preserving existing Frade domain contracts and evidence.

## ADDED Requirements

### Requirement: FWE-001 Direction ownership

Each direction SHALL identify its stable goal/ID, owning branch/worktree, original baseline, current change, allowed paths, dependencies and adopted policy version/hash. Ownership MUST be verified from actual Git registration before writes. Closure destinations SHALL be declared separately and activated only after the owning policy decision, required checks, formal Verify and current independent POST PASS; unrelated frozen paths MUST stay excluded.

#### Scenario: FWE-001-S01 Reject a foreign checkout

- **WHEN** creation or progression is requested from a checkout outside the canonical Frade Git common directory
- **THEN** the command reports BLOCKED without writing to that checkout

#### Scenario: FWE-001-S02 Preserve isolated owners

- **WHEN** an independent direction starts from an explicitly selected committed baseline
- **THEN** only its registered workspace is writable and foreign uncommitted product files are not transferred

#### Scenario: FWE-001-S03 Close within exact owning destinations

- **WHEN** the admitted owner has current required checks, formal Verify and independent POST PASS and executes closure
- **THEN** it synchronizes only its declared delta spec destinations, archives only its own dated change, relocates owned references and preserves immutable evidence origins/hashes

#### Scenario: FWE-001-S04 Reject unauthorized closure scope

- **WHEN** closure is attempted before its barriers or targets an unrelated specification/archive, unsafe path/date, stale approval or unrelocated owned reference
- **THEN** closure is BLOCKED and every unrelated or frozen file remains unchanged

### Requirement: FWE-002 Uniform intake and research

Every direction SHALL follow intake, evidence-based research and requirements before stage planning, using one artifact structure. Unknown product decisions MUST remain explicit; bounded research MUST continue when it does not depend on the unanswered decision.

#### Scenario: FWE-002-S01 Open a direction

- **WHEN** a user requests a new direction by name and goal
- **THEN** the owner records goal/users/outcomes/constraints/exclusions, Git baseline, publication authorization, research sources, alternatives, risks and unresolved decisions

#### Scenario: FWE-002-S02 Reject premature planning acceptance

- **WHEN** a required user/acceptance/compatibility or numerical limit is unresolved
- **THEN** dependent implementation remains BLOCKED rather than guessing a requirement

### Requirement: FWE-003 Safe repeatable bootstrap

Bootstrap SHALL preview the exact branch/worktree/files/baseline/destination, then create an isolated direction with common inherited rules and status. An identical retry MUST recover its original result; collisions or unsafe paths MUST fail without overwriting work.

#### Scenario: FWE-003-S01 Recover a partial creation

- **WHEN** bootstrap is repeated after a partial failure with the identical request identity
- **THEN** it returns the retained result or safe remaining actions without duplicate direction or destructive cleanup

#### Scenario: FWE-003-S02 Reject collisions and escapes

- **WHEN** a branch or target has a different owner/request or its canonical path crosses the approved workspace boundary through a link or traversal
- **THEN** creation fails and pre-existing data is unchanged

### Requirement: FWE-004 Requirements and executable traceability

Every requirement SHALL have stable ID, observable acceptance scenarios, approved constraints and links to tasks and actual executable evidence or an explicit human/future boundary. Critical invariants MUST include meaningful failure and boundary controls.

#### Scenario: FWE-004-S01 Detect missing traceability

- **WHEN** a required acceptance scenario has no meaningful assertion/evidence or approved boundary
- **THEN** checks fail and closure is prohibited

#### Scenario: FWE-004-S02 Keep numeric budgets independent

- **WHEN** performance or geometric tolerance is measured outside its approved budget
- **THEN** the failure remains FAIL and cannot be repaired by silently changing the budget

### Requirement: FWE-005 Sequential stage barriers

Every stage SHALL use coherent planning/strict validation, independent PRE, meaningful RED, implementation, required GREEN, OpenSpec Verify, independent POST and archive/closure. Stronger owner barriers MUST remain. Evidence-only diagnostics MUST explicitly preserve their bounded authority.

#### Scenario: FWE-005-S01 Block implementation before PRE

- **WHEN** an implementation attempt occurs without applicable current PRE PASS and required owner checkpoint
- **THEN** the transition is rejected

#### Scenario: FWE-005-S02 Block POST before Verify

- **WHEN** POST admission is requested before complete applicable GREEN and actual Verify
- **THEN** the transition is rejected

#### Scenario: FWE-005-S03 Keep focused review bounded

- **WHEN** a diagnostic or focused delta receives PASS
- **THEN** unreviewed cumulative scope, visual approval and stage archive remain unapproved

### Requirement: FWE-006 STOP and root cause integrity

Required failures, regressions, invariant/parity errors or specification conflicts SHALL stop the owner. Two unsuccessful fixes of one deterministic defect MUST require classified RCA before another production edit; tests/thresholds/fixtures MUST NOT be weakened to obtain PASS.

#### Scenario: FWE-006-S01 Stop a patch loop

- **WHEN** two attempted fixes fail to resolve the same reproducible defect
- **THEN** the next production change is blocked until responsible layer and root cause are documented

#### Scenario: FWE-006-S02 Preserve historical failures

- **WHEN** a new check succeeds after an earlier failure
- **THEN** the new dated evidence is added and the old raw FAIL remains unchanged

### Requirement: FWE-007 Applicable contract preservation

Each stage SHALL declare general and subsystem-specific checks by affected contract before execution. Routing, UI, repository, metamodel, runtime and adapter invariants remain mandatory where applicable. Unavailable required checks MUST block closure.

#### Scenario: FWE-007-S01 Reject false not-applicable

- **WHEN** a failing affected routing-semantic check is relabelled cosmetic or N/A without a scope/spec decision
- **THEN** applicability validation fails

#### Scenario: FWE-007-S02 Verify process-only scope

- **WHEN** a direction changes only engineering controls/documents
- **THEN** it runs actual control checks and proves product-tree preservation without claiming unexecuted product tests passed

### Requirement: FWE-008 Owner-controlled adoption and integration

Existing directions SHALL adopt reviewed shared controls in their own approved process with exact provenance and preserved origin/history. Integration SHALL revalidate the actual merged candidate and conflicts before authorized target publication.

#### Scenario: FWE-008-S01 Supplier closes independently

- **WHEN** shared workflow supplier passes its own checks/Verify/POST
- **THEN** a consumer's separate adoption failure does not invalidate supplier approval or grant consumer readiness

#### Scenario: FWE-008-S02 Reject inherited merge approval

- **WHEN** a merged tree differs from the feature's approved candidate
- **THEN** required integration checks/review bind to the new tree before merge permission

#### Scenario: FWE-008-S03 Preserve old closure states

- **WHEN** an old change has completed tasks but no verified POST/archive
- **THEN** migration records pending closure rather than inventing CLOSED

### Requirement: FWE-019 Automatic repository control plane

После D05 approval repository control plane SHALL автоматически start/attach на submit/resume из existing admitted Windows host context и вести source-bound lifecycle intake/research/requirements/planning/PRE/RED/implementation/checks/Verify/POST/checkpoints/status. Controller MAY быть on-demand reusable process; он MUST NOT требовать OS service installation, per-direction sessions/profiles/configs, ручного worker launch или text relay. Approved scope и current gates SHALL определять каждый transition; material unresolved decisions MUST блокировать dependent work. Controller MUST NOT автоматически начинать следующий numbered change.

#### Scenario: FWE-019-S01 Execute two independent actual fixtures

- **WHEN** два disposable registered fixtures имеют разные intents/baselines/scopes/worktrees/branches/local bare remotes и explicit D05 test grants
- **THEN** один service API проводит каждый через approved planning, actual PRE, RED/implementation/checks, actual Verify/POST, verified checkpoint/status и STOP без ручных launches; mock-only runs не удовлетворяют приёмку

#### Scenario: FWE-019-S02 Start or attach on the admitted host

- **WHEN** пользователь подаёт submit/resume при existing host grant и verified controller/runtime identities
- **THEN** host автоматически запускает или присоединяет один repository controller; missing capability даёт concrete BLOCKED без elevation, нового service account или global configuration expansion

#### Scenario: FWE-019-S03 Wait for a material decision

- **WHEN** transition зависит от unresolved material scope/spec/permission/destination/visual decision
- **THEN** controller сохраняет exact candidate/question/source bindings и BLOCKED reason WAITING_FOR_HUMAN, запрещает dependent work и продолжает только после проверенного решения; PAUSED остаётся состоянием по инструкции человека

#### Scenario: FWE-019-S04 Revalidate the amended stage

- **WHEN** D05 принят для изменённого W01 scope
- **THEN** specific human approval corrected package и fresh complete clean 1.6/1.7 предшествуют production; accepted immutable corrected overlay задаёт scope, live D03 operational files/pins сохраняются через 2.8/2.9/2.10, а exact eleven-artifact/current-authority migration выполняется только в 2.11 после meaningful RED; 2.9 требует всех applicable D03-installed controls плюс reception regressions, 2.11 и 3.4 требуют migrated current controls плюс separately executed unchanged historical D03 replay и additive D05 authority/drift controls по explicit human-approved mapping; missing/failed required tests или clean PRE/Verify/POST останавливают owner, 3.4 и fresh 4.1/4.2 проверяют полный amended scope, historical gates не заменяют current gates, а 4.3/4.4 остаются inactive до обязательных gates/decisions в рамках existing bounded closure authorization

#### Scenario: FWE-019-S05 Draft future owner controls automatically

- **WHEN** поступает intent нового направления и доступны versioned repository policy и owner contracts
- **THEN** planning role автоматически готовит scope, exact role proposals, check applicability и rights request; dispatch использует собственный approved stage plan, а W01 pairs не становятся universal defaults и не требуют ручного role/text relay

### Requirement: FWE-020 Capability-confined execution and recovery

Execution capability SHALL быть пересечением verified canonical registration, approved phase/task scope и existing host grant, дополнительно ограниченным rules/runtime/lease/freeze. Initial adapter SHALL использовать pinned Codex 0.159.3 в WSL Ubuntu-22.04_E и verified Windows-host mapping; preflight SHALL сохранять runtime/toolchain/profile/grant/source/canary receipts по design D05.2. Worker commands MUST NOT получать original/common/foreign checkouts, secrets/global settings/auth/broker credentials или arbitrary network. Writes SHALL ограничиваться task allowlist либо isolated staging. Один canonical worktree SHALL иметь максимум одного writer с fenced lease. Freeze MUST блокировать source/index/HEAD/status/adoption/publication. Expiry MUST NOT сам допускать нового writer или снимать freeze.

#### Scenario: FWE-020-S01 Enforce the actual host boundary

- **WHEN** runtime выполняет allowed read/write и synthetic denied original/common/foreign/secrets/settings/network/link/reparse/Windows-interop canaries
- **THEN** разрешённые действия успешны, запрещённые технически отклонены, denied targets неизменны и receipts связывают actual Windows/WSL runtime; failure/unknown confinement блокирует execution

#### Scenario: FWE-020-S02 Fence concurrent writers

- **WHEN** второй run запрашивает writer lease того же canonical worktree либо прежний run использует отозванный epoch
- **THEN** mutation/adoption отклоняются до доказанной остановки старого process tree и revocation; expiry не служит доказательством остановки

#### Scenario: FWE-020-S03 Preserve freeze across lease expiry

- **WHEN** candidate frozen и поступает source/index/HEAD/status/adoption/publication write либо истекает lease
- **THEN** candidate остаётся неизменным, events сохраняются внешне и unfreeze требует проверенного завершения/остановки и reconciliation

#### Scenario: FWE-020-S04 Recover crash and cancellation

- **WHEN** controller/worker/launcher прекращается или run отменён
- **THEN** journal/partial evidence сохраняются, children/capabilities проверяются и отзываются, resume сверяет owner/source/runtime/authority/lease/freeze и side effects без duplicate writes или fabricated PASS

#### Scenario: FWE-020-S05 Reject drifted staging adoption

- **WHEN** staging result имеет baseline/output hashes, но owner bytes/scope/lease/gates изменились либо result содержит unsafe links/modes/paths
- **THEN** broker блокирует adoption без overwrite; при полном совпадении применяет только explicit allowed changes и сохраняет receipt

#### Scenario: FWE-020-S06 Derive and validate bounded capabilities

- **WHEN** request/manifest предлагает root вне existing grant, registration не совпадает, runtime/profile drift обнаружен либо heartbeat/expiry policy invalid
- **THEN** preflight BLOCKED; declaration не расширяет права, historical W01 exception не переносится, а valid policy проверяется boundary tests с heartbeat 10s/expiry 60s и expiry не меньше трёх heartbeat

### Requirement: FWE-021 Owner-controlled control adoption

Control adoption SHALL выполняться в owning scope с verified registration, origin/HEAD/dirty snapshot, exact old/new policy/control/authority hashes, nested contracts и current gates. Capability SHALL выводиться из approved owner scope и existing host grant; adoption MUST NOT создавать arbitrary filesystem grants или переносить W01 historical exception. Origin/raw history/unresolved FAIL и unrelated dirty work SHALL сохраняться. Production Routing/UI/Repo Core adoption MUST оставаться отдельными owner checkpoints.

#### Scenario: FWE-021-S01 Adopt the stale test owner

- **WHEN** disposable stale owner имеет exact mapping и D05-bounded fixture approval, verified registration/grant и актуальные source bindings
- **THEN** service применяет только разрешённую mapping, сохраняет origin/history и проводит owner через его собственный полный lifecycle

#### Scenario: FWE-021-S02 Reject unverifiable adoption

- **WHEN** wrong owner/common/root, missing approval, stale hashes, unexpected dirty bytes или отсутствующий host grant обнаружены
- **THEN** adoption BLOCKED без перезаписи owner work и без elevation

#### Scenario: FWE-021-S03 Keep real owners separate

- **WHEN** W01 завершает supplier implementation или disposable fixture adoption
- **THEN** реальные Routing/UI/Repo Core остаются NOT_STARTED до собственных checkpoints; fixture success и supplier closure не выдают им readiness или permissions
