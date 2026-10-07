# Frade — единый workflow: статус W01

UPDATED_AT_UTC: 2026-10-07T21:18:00.650Z
STATUS_SOURCE: manually reconciled from retained raw evidence; not an automatically attested metrics projection.

## 1. Решение / следующий шаг

STAGE: W01 | PHASE: PLANNING | HEALTH: BLOCKED
PHASE_SOURCE: accepted D05 effective overlay; live D03 manifest/plan pins intentionally preserved until fresh PRE PASS and exact reviewed adoption.
NEXT_PERMITTED_ACTION: specific D05-T01 order/context-mapping decision on exact package945d306d4404565f0533cbda901d57cbe1df13b45c7885e9b455f00b58df6466; after acceptance run fresh complete clean task1.7 PRE. No production/live D05 adoption before required barriers.
HUMAN_DECISION: D05 accepted and preserved; D05-T01 technical adoption timing + exact historical test mapping PROPOSED_NOT_APPROVED; concrete package openspec/changes/frade-standard-workflow/evidence/d05-order-proposal-20261007/APPROVAL.md. Existing model/host/remote permissions persist; no per-task reauthorization.
READY_FOR_ARCHIVE: NO. Task 4.2 не закрыта; переход к 4.3/4.4 запрещён.

## 2. Идентичность / scope

Branch: codex/frade-standard-workflow.
Worktree: E:/dev/codex/frade-worktrees/frade-standard-workflow.
Git common: E:/dev/codex/frade/.git.
Original baseline: 98f387f96b51b0ad139e3507c376ff1c3e8dec09.
Reviewed HEAD: 62b9e0fbfd55f8b2e99f8ea210786fc6c9f01fd0; reviewed snapshot: 76d198aa36733bab083e8165447bf38e919ae2518f40f84ef23225cae2309a12. После завершённого gate изменился index stat-cache; source/HEAD/staged content не менялись, точное сравнение сохранено в post-snapshot-diagnostic.json.
Policy v1.1: a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0.
Scope: собственные process controls/docs/tests/evidence. Product/foreign owners/main integration исключены. Общий release не изменён.

## 3. Roadmap этапов

| Этап | Фактическое состояние | PRE / Verify / POST / archive |
|---|---|---|
| W01 | POST_REVIEW / FAIL; исправление приёма + согласование полной автоматизации | прежний PRE PASS — история; formal Verify PASS admission оспорен; новый POST FAIL; archive NOT_RUN |
| Existing-owner adoption | NOT_STARTED; отдельные owner checkpoints | собственные applicable gates |
| Main integration | NOT_STARTED; не разрешена автоматически | merge и revalidation отдельно |

STOP после W01. Автоматизация внутри направления не разрешает следующий нумерованный этап.

## 4. Активные задачи / шаги

| Задачи | Статус | Следующий шаг / оценка (не обещание) |
|---|---|---|
| 1.1–1.5, 2.1–2.7, 3.1–3.2 | административно выполнены; историческое evidence сохранено | новая область требует отдельной повторной проверки |
| 4.1 | исторически отмечена выполненной; clean formal Verify сейчас не установлен | повтор после исправления/расширения; 30–90 мин без ремонта |
| 4.2 | OPEN / POST FAIL | reception repair + fresh checks/Verify/POST; 2–6 ч без новой автоматизации |
| 4.3 | OPEN / WAITING 4.2 | reviewed release/discovery; 30–90 мин после PASS |
| 4.4 | OPEN / WAITING 4.3 | три spec sync, W01-only archive, ссылки, публикация; 45–120 мин после gates |
| Дополнение автоматизации | D05_ACCEPTED / PRE_FAIL / NOT_IMPLEMENTED | 1.6→1.7→2.8–2.13→3.3–3.4→4.1→4.2; оценка полного нового scope74–152ч, automation48–96ч, reception6–12ч; ожидания и4.3/4.4 отдельно |

ADMINISTRATIVE_TASKS: live D03 checkbox history15/18; D05 approved overlay28tasks, historical4.1 reopened, task1.6 completion evidence recorded externally pending exact plan adoption. Neither count grants readiness. Task1.7 actual PRE FAIL; clean admission BLOCKED; remains incomplete. Exact D05 overlay unchanged.

## 5. Проверки / gates / качество

| Проверка | Факт / ограничение |
|---|---|
| Write preflight | все три корня Create/Read/Delete PASS через auto-reviewed escalation; обычный sandbox helper setup падает до команды |
| Исполнители / freeze | чужого executor при resume не найдено; POST завершён, runner снял freeze; кандидат не менялся во время gate |
| ENAMETOOLONG | RED:33270 chars rejected; GREEN:28741 chars launch exit0; 277files/7,389,082bytes сохранили все прежние273files+4 |
| OpenSpec | isolated pinned1.14.0; guards/global install не менялись; strict selected PASS и strict all16/16 PASS в текущем POST |
| Текущий independent POST | GATE_STATUS: FAIL; complete raw stream сохранён; candidate/packet unchanged; inspection limitations не дают PASS |
| Исторические native tests | 221/221; 204 unique; zero skip; targeted35/35; owner1/1 — исходные записи, нового native полного прогона не было |
| Текущий reviewer tests | actual readonly Linux35/35; zero skip |
| General lint/type/build | прежние20/20 each cached; uncached check:all / remote CI / protection NOT_RUN |
| Formal Verify | прежний RECEIVED_VALID_PASS сохранён; новый POST выявил exits2/1 inspection — clean admission BLOCKED, rerun required |
| Метрики |18requirements/46scenarios; planning-only projection 0 accepted/0 executed не заменяет raw assertions/runs; автоматический ingest ещё не доставлен |

## 6. Модели / исполнение

| Роль W01 | Точная утверждённая пара | Authority |
|---|---|---|
| planning-architecture | gpt-6-astra / high | design D03 |
| tooling-tests | gpt-6-sol / high | design D03 |
| formal-Verify | gpt-6-astra / high | design D03 |
| independent-PRE | gpt-6-astra / xhigh | design D03 |
| independent-POST | gpt-6-astra / xhigh | design D03; фактически запрошена текущим POST |

Authority: openspec/changes/frade-standard-workflow/design.md; raw SHA256 501168ced50a35e128a0fc86e79bab6ac9aa31cd343eca3eedac56f81570978a.
ACTUAL_BACKEND / ACTUAL_EFFORT: NOT_CONFIRMED. Запрошенная пара не является backend attestation. Writer dispatcher: NOT_IMPLEMENTED. Planning revision gpt-6-astra/high executed successfully: complete stream, exit0, immutable inputs, zero tool/command/file writes; staging machine audit strict/parser/schema PASS does not grant PRE.

## 7. Зависимости / решения / blockers

| ID | Состояние / причина | Действие |
|---|---|---|
| POST-20261007-01 | OPEN: verifyRawReview принимает PASS со command exit1/2 | regression-first correction без ослабления clean-stream rule |
| POST-20261007-02 | OPEN: Verify receipt противоречит retained inspection failures | сохранить историю, новый clean Verify |
| POST-20261007-03 | OPEN: truncated outputs/corrected inspection mistakes в текущем review | новый clean cumulative POST |
| AUTOMATIC-WRITER-SCOPE | D05_ACCEPTED / PRE_FAIL / NOT_IMPLEMENTED | plan ordering repair + fresh PRE; no manual per-direction settings required by target |
| D05-AUTHORITY-ORDER | SPEC_CONFLICT reproduced; exact D05-T01 correction machine-validated, NOT_APPROVED | approve atomic2.11 timing + precise unchanged8file replay mapping; then fresh PRE |
| D05-PRE-20261007 | independent verdict FAIL; truncated inspections and missing current strict-all in reviewed packet | current strict-all now PASS in staging; fresh complete PRE still required |
| Planning sandbox launcher | первый staging draft BLOCKED, последовательный retry выполнил draft без commands; уточнение плана в работе | последовательный retry с финальным JSON, без write-tools |

Foreign owner FAIL не блокирует supplier; чужие scope/adoption не выполнялись.

## 8. Git / публикация / evidence

SOURCE_CHECKPOINT_SHA: 04f2306202a7697a4775e2dedfbe03fba2516c29 at correction proposal; reviewed PRE candidate19021057 remains unchanged in its history.
COMMIT_STATE: PRE failure/strict-all/conflict evidence04f2306202a7697a4775e2dedfbe03fba2516c29 PUBLISHED; preparing exact D05-T01 proposal checkpoint, no source implementation.
AUTHORIZED_REMOTE_REF: git@github.com:leonmaks/frade.git refs/heads/codex/frade-standard-workflow.
PUSH_STATE: PUBLISHED04f2306202a7697a4775e2dedfbe03fba2516c29 verified authorized remote/ref; proposal publication pending its separate receipt.
CURRENT_EVIDENCE: openspec/changes/frade-standard-workflow/evidence/task42-resume-20261007/resume-summary.json; POST-REPORT.md; receipt.json; raw-index.json; argv-red-green.json; preflight.json.
PRIVATE_RAW: Git common run 2026-10-07T19-22-17-357Z-351c9b51-46a3-48ba-ad02-9c94329c3822; сохранён runner-ом до интерпретации.
D05_T01_REVIEWABLE_PACKAGE: openspec/changes/frade-standard-workflow/evidence/d05-order-proposal-20261007/APPROVAL.md; approval-request.json; draft-audit.json; historical-replay-mapping.json. Machine validation is not approval/PRE.
D05_PRE_RESULT: openspec/changes/frade-standard-workflow/evidence/d05-pre-20261007/receipt.json; PRE-REPORT.md; exact raw events/report/exit/provenance retained as verified base64. No accepted gate.
D05_ACCEPTED_DECISION: openspec/changes/frade-standard-workflow/evidence/d05-accepted-20261007/decision.json; supported-transition-preflight.json; PRE-OBLIGATIONS.md.
D05_REVIEWABLE_PACKAGE: openspec/changes/frade-standard-workflow/evidence/d05-planning-proposal-20261007/approval-request.json; prospective artifact copies under artifacts/; effective OpenSpec proposal/design/tasks/specs unchanged.
PANEL_STATE: NOT_OPENED; доступного UI-controller для правой панели сейчас нет.
HISTORICAL_EVIDENCE: старый tail ниже сохранён; его FAIL/PASS относятся к указанным историческим кандидатам.

<!-- LEGACY HISTORY: historical only -->

# Frade standard workflow — статус

UPDATED_AT_UTC: 2026-10-05T08:14:20.861Z
POLICY_VERSION: v1.1 / a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0
Это собственный dashboard нового направления; общий стандарт ACCEPTED_FOR_IMPLEMENTATION, ещё не deployed.

## 1. Решение / следующий шаг

STAGE: W01 | PHASE: VERIFICATION | HEALTH: BLOCKED
NEXT_PERMITTED_ACTION: STOP progression. Formal Verify FAIL on source9fcdced7; resolve V-01 review scope, V-02 role provenance, V-03 seeded task IDs, V-04 historical status-write admission through approved tooling-tests gpt-6-sol/high, regression-first; rerun required checks and fresh formal Verify before POST. READY_FOR_VERIFY: NO.
HUMAN_DECISION: NONE; D03 accepted; direct reply «да» authorized BLOCKED freeze recovery and fresh Astra/xhigh PRE.
READY_FOR_IMPLEMENTATION: YES; formal PRE PASS retained and receipt checkpoint2a6f8f96 PUBLISHED with exact remote SHA..
READY_FOR_ARCHIVE: NO.
Model matrix и feature-branch commit/push authorization приняты; конкретная общая policy/cadence/control scope принята D03.

## 2. Идентичность / scope

Direction/change: frade-standard-workflow.
Branch: codex/frade-standard-workflow.
Worktree: E:/dev/codex/frade-worktrees/frade-standard-workflow.
Git common: E:/dev/codex/frade/.git.
Original baseline/cumulative origin: 98f387f96b51b0ad139e3507c376ff1c3e8dec09.
Approved planning candidate: 9c974da812e7f120cace9defcdca69dd6154254b; current formal PRE PASS, plan raw hash501168ce..., production allowed only within W01 after receipt publication.
Current scope: approved own workflow contracts/tests/templates imported; foreign owners/product/lockfile/vendor/routing controls unchanged.
Public policy adoption: evidence/repository-audit.json has exact2 paths/hashes; no foreign uncommitted product/process transfer.

## 3. Roadmap этапов

| Stage                   | Result                                                                   | Phase / health                          | PRE / Verify / POST / archive              |
| ----------------------- | ------------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------ |
| W01                     | Общий стандарт, onboarding, validated templates/controls/CLI/publication | VERIFICATION/BLOCKED                    | PRE PASS; formal Verify FAIL; POST NOT_RUN |
| Existing-owner adoption | Separate Routing/UI/Repo Core consumer checkpoints                       | NOT_STARTED; outside W01                | Own future scope/gates                     |
| Main integration        | Explicit merged-candidate revalidation                                   | NOT_STARTED; outside current permission | No automatic merge                         |

STOP after W01; no next numbered change or owner migration automatically.

## 4. Активные задачи / шаги

| Task    | Role                                                               | Ordered work                                                                                | Status / evidence                                                                                                                                                                                                                                                  |
| ------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.1     | planning-architecture                                              | isolate -> audit -> public-policy adoption                                                  | COMPLETE; repository-audit.json/user-decisions.json                                                                                                                                                                                                                |
| 1.2     | planning-architecture                                              | consolidate -> specs/design/tasks -> standard/onboarding/status/manifest/adoption drafts    | COMPLETE; feedback-register.md and drafts                                                                                                                                                                                                                          |
| 1.3     | planning-architecture + independent-PRE pair for draft-only review | strict/checks -> independent draft-quality review -> checkpoint                             | COMPLETE; strict/integrity PASS; draft-01 BLOCKED, draft-02 FAIL retained; fresh draft-03 PASS on faf69d33                                                                                                                                                         |
| 1.4     | human material policy decision                                     | concrete proposal -> acceptance/reconciliation                                              | COMPLETE; policy-acceptance.json D03                                                                                                                                                                                                                               |
| 1.5     | independent-PRE                                                    | approved coherent plan -> actual formal PRE -> frozen checkpoint                            | COMPLETE; receipt checkpoint2a6f8f96 verified published; formal-pre-01-pass                                                                                                                                                                                        |
| 2.1     | tooling-tests                                                      | meaningful RED -> repair -> Windows GREEN -> import -> lint/format/strict/integrity         | COMPLETE; task21-completion-audit.json; actual35/35 PASS, lint/format/syntax/strict PASS; historical FAIL retained                                                                                                                                                 |
| 2.2     | tooling-tests                                                      | role RED9 -> Windows44 -> required gaps -> new RED6 -> owner GREEN50/lint/format/strict     | COMPLETE; task22-completion-audit.json; full old FAIL retained                                                                                                                                                                                                     |
| 2.3     | tooling-tests                                                      | Git RED -> exact grant/origin -> Windows portability repair -> owner GREEN/checkpoint       | COMPLETE; task23-completion-audit.json; actual Windows92/92, 76 unique + 3 extra binding assertions; strict all16/16, lint/format PASS; prior FAIL retained                                                                                                        |
| 2.4     | tooling-tests                                                      | RED -> eight sections/metrics/freeze/history/panel/checkpoint -> Windows GREEN              | COMPLETE; task24-completion-audit.json; Windows107/107 PASS (91 unique), scoped syntax/lint/format/strict PASS; historical FAIL retained                                                                                                                           |
| 2.5     | tooling-tests                                                      | RED -> wrapper/freeze/raw binding -> Windows GREEN -> actual focused PRE                    | COMPLETE; task25-runtime-20261004/completion.json. Native Windows146/146, focused37/37; scoped Astra/xhigh PASS, full raw reception PASS, exact-run termination and unchanged candidate verified, freeze RELEASED. Historical FAIL/BLOCKED retained                |
| 2.6     | tooling-tests                                                      | publication RED -> real Git/adversarial/native tests -> canonical W01 checkpoint/publish    | COMPLETE; Windows168/168,22 publication tests; lint/format/strict16/16/integrity PASS. Actual CHECKPOINTED/PUBLISHED882a9980; fresh exact remote SHA. Historical failures and RCA retained                                                                         |
| 2.7     | tooling-tests                                                      | RED -> root/scoped loader + applicability -> docs/package/CI -> Windows GREEN -> checkpoint | COMPLETE_SCOPED; PUBLISHED c6ae514350b46da67721126b4bd86fa04698c863; three complete exact Sol/high streams; Windows182/182, actual check:directions/scoped lint/format/strict16/16/general checks/owner root+nested read-only replay PASS; task27-runtime-20261005 |
| 3.1     | tooling-tests                                                      | cumulative applicable checks                                                                | COMPLETE; final193/193, scoped lint/format/content/frozen/manifest/link checks PASS; general cached20/20 each; boundary19/19+4                                                                                                                                     |
| 3.2     | tooling-tests                                                      | traceability, origin, examples, confinement, checkpoint                                     | COMPLETE_PUBLISHED; 18 requirements/46 scenarios, original23 publication assertions preserved, own replay and live discovery/canary PASS; task32-final-20261005                                                                                                    |
| 4.1–4.4 | Verify/POST + orchestration                                        | Verify -> POST -> release/archive/checkpoint                                                | 4.1 VALID_FAIL, incomplete; 4.2–4.4 NOT_RUN; formal-verify-20261005                                                                                                                                                                                                |

TASKS_COMPLETE/TOTAL/REMAINING: 14/18/4.
REQUIREMENTS_ACCEPTED/TOTAL/UNCOVERED: 0/18/18 (normative draft is not deployed acceptance).
46 BDD scenario declarations counted by actual planning audit; task2.1 behavioral controls actual Windows35/35 PASS; cumulative18-requirement acceptance remains incomplete.

## 5. Проверки / gates / качество

| Check                                                            | Applicability                                                   | Actual result                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frade ownership/registered isolated branch                       | REQUIRED                                                        | PASS                                                                                                                                                                                                                                                       |
| Shared CLI bundle discovery v1.1                                 | REQUIRED                                                        | AVAILABLE; separate from invocation/canary                                                                                                                                                                                                                 |
| Exact public-policy transfer                                     | REQUIRED                                                        | PASS2/2 raw hashes                                                                                                                                                                                                                                         |
| Inventory                                                        | REQUIRED                                                        | PASS20 package manifests; point-in-time owner process observations                                                                                                                                                                                         |
| openspec validate frade-standard-workflow --strict --json        | REQUIRED                                                        | PASS1/1, no issues                                                                                                                                                                                                                                         |
| Full planning content/hash/link/traceability and all-spec checks | REQUIRED                                                        | PASS; reconciled-planning-checks.json + final metadata check proof;18requirements/46scenarios/18tasks/8sections; product/control tree unchanged                                                                                                            |
| Independent draft-quality review                                 | REQUIRED for planning completion                                | draft-03 PASS on faf69d33;80 input hashes; prior BLOCKED/FAIL preserved; no implementation admission                                                                                                                                                       |
| Formal PRE/Verify/POST                                           | REQUIRED for implementation/closure                             | PRE PASS on9c974da8; formal Verify FAIL on9fcdced7 (V-01–V-04); POST NOT_RUN                                                                                                                                                                               |
| General lint/typecheck/boundary suites                           | REQUIRED                                                        | Actual current baseline PASS5 checks; original build FAIL retained; exact pinned resources restored, repeated build PASS                                                                                                                                   |
| New core schema/lifecycle/closure controls                       | REQUIRED                                                        | Meaningful Windows RED retained; 30+5 expanded GREEN35/35; owner post-format35/35 PASS; scoped lint repaired; current PASS                                                                                                                                 |
| Role resolver controls                                           | REQUIRED                                                        | Actual Windows50/50 PASS; format/scoped lint/strict PASS; meaningful RED6 and original layout/probe FAIL retained                                                                                                                                          |
| Bootstrap/status/review/publication controls                     | REQUIRED                                                        | Task2.3–2.5 complete; native Windows146/146 PASS; actual task2.5 focused PRE/reception PASS. Task2.6 publication PASS; task2.7 installed and local182/182 PASS, real check:directions PASS; historical capacity streams retained, fresh same-pair complete |
| Product suites                                                   | No product changes in current planning                          | NOT_RUN; no product PASS claimed                                                                                                                                                                                                                           |
| Human policy/visual acceptance                                   | Policy decision REQUIRED; product visuals outside current scope | Policy ACCEPTED_D03; no visual approval claim                                                                                                                                                                                                              |
| CI / branch protection                                           | Separate observable control                                     | REMOTE_NOT_RUN / NOT_CONFIGURED_OR_UNVERIFIED                                                                                                                                                                                                              |

Historical invocation/EOF/EOL/link-check/count failures and classified corrections retained. Draft review history: BLOCKED -> FAIL/SPEC_CONFLICT -> repaired fresh PASS; raw reports/events/exits/provenance are immutable. Fresh current strict and planning-integrity PASS; staged diff-check PASS. No existing Routing/UI FAIL waived.

## 6. Модели / исполнение

| Stage/role                | Approved exact model/effort | Authority                       | Invoked / actual                                                                                                                                                                      |
| ------------------------- | --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W01 planning-architecture | gpt-6-astra/high            | design4 + direct human decision | Current chat backend/effort NOT_CONFIRMED                                                                                                                                             |
| W01 tooling-tests         | gpt-6-sol/high              | design4 + direct human decision | initial task2.1 executed gpt-6-sol/high; all three core runs raw complete/input unchanged; actual Windows35/35 PASS; fresh lint repair same pair/canary; backend/effort NOT_CONFIRMED |
| W01 formal-Verify         | gpt-6-astra/high            | design4 + direct human decision | first run BLOCKED_CAPACITY; fresh exact-pair retry complete, valid FAIL. Source/index/HEAD/packet unchanged, complete final report binding; backend/effort NOT_CONFIRMED              |
| W01 independent-PRE       | gpt-6-astra/xhigh           | design4 + direct human decision | Exact pair invoked for accepted formal PRE and task2.5 focused PRE; current focused reviewer/reception PASS; actual backend/effort NOT_CONFIRMED                                      |
| W01 independent-POST      | gpt-6-astra/xhigh           | design4 + direct human decision | NOT_RUN                                                                                                                                                                               |

No model substitution, task override or silent current-chat switch. Common service is read-only reviewer transport; writer dispatch NOT_IMPLEMENTED.

## 7. Зависимости / решения / blockers

| ID                                        | Owner / scope          | State                                         | Decision / next action                                                                                                                                      |
| ----------------------------------------- | ---------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D01 models                                | W01                    | ACCEPTED                                      | Retain exact pairs and invocation provenance                                                                                                                |
| D02 remote/ref                            | W01                    | ACCEPTED                                      | Only origin refs/heads/codex/frade-standard-workflow                                                                                                        |
| D03 concrete common policy/cadence        | W01                    | ACCEPTED                                      | Direct reply and bound planning hashes retained; formal PRE PASS                                                                                            |
| Adoption Routing/UI/Repo Core             | Each consumer          | NOT_STARTED                                   | Do not block independent supplier or edit foreign workspace                                                                                                 |
| Reviewer CLI environment                  | W01                    | RESOLVED_CURRENT; historical BLOCKED retained | Task2.5 runtime required shell reading, no jq and no temporary-file heredocs. RCA and rejected streams retained; fresh exact Astra/xhigh PRE/reception PASS |
| Baseline general build                    | W01 applicable check   | RESOLVED_CURRENT; historical FAIL retained    | All2851 pinned resources exact; repeated build PASS; index entries/product tree unchanged                                                                   |
| Task2.1 core control gaps                 | W01                    | RESOLVED_CURRENT; new lint blocker            | Eight gaps and null options repaired, actual Windows RED/GREEN retained; six lint errors repaired without disabling rules; current checks PASS              |
| Task2.2 exact authority/portable fixtures | W01                    | RESOLVED_CURRENT; historical FAIL retained    | Actual raw-byte digests, portable immutable fixtures, malformed records and canonical ID repaired; Windows50 PASS                                           |
| Product writer dispatcher                 | W01 tooling capability | NOT_IMPLEMENTED                               | Guard remains explicit; separate session staging runtime v2 technically verified, initial probe BLOCKED retained                                            |

Task2.1–2.5 PUBLISHED; task2.5 complete: actual Windows146/146 and focused PRE/reception PASS. Restricted-sandbox136/146 FAIL, Linux21/22 limitation, rejected reviewer streams and authorization/RCA remain retained. Formal Verify/POST/archive NOT_RUN.

## 8. Git / публикация / evidence

SOURCE_CHECKPOINT_SHA: 1bfcc149d00e38c7a2a8efa482a160d65a84f8fc (diagnostic BLOCKER checkpoint; formal Verify FAIL refers to implementation source9fcdced7bfd3e1ae3e6895de050466417b19d8c1).
COMMIT_STATE: 1bfcc149d00e38c7a2a8efa482a160d65a84f8fc CHECKPOINTED/PUBLISHED; post-publication receipt/status refresh joins the next natural repair checkpoint, no receipt-only commit.
AUTHORIZED_REMOTE_REF: git@github.com:leonmaks/frade.git refs/heads/codex/frade-standard-workflow.
PUSH_STATE: PUBLISHED; canonical diagnostic checkpoint publish PASS; fresh exact remote SHA 1bfcc149d00e38c7a2a8efa482a160d65a84f8fc verified. Verify remains FAIL; publication does not grant POST/archive readiness.
VERIFIED_SOURCE_REMOTE_SHA: 1bfcc149d00e38c7a2a8efa482a160d65a84f8fc.
SOURCE_PUBLICATION_RECEIPT: E:/dev/codex/frade/.git/frade-workflow/publication/frade-standard-workflow/1bfcc149d00e38c7a2a8efa482a160d65a84f8fc.publish.json.
PRE_ADMISSION_PUBLICATION_RECEIPT: E:/dev/codex/frade/.git/frade-workflow/publications/frade-standard-workflow/formal-pre-admission-20261002.json; require PUBLISHED/sourceSha=live HEAD before first task2.1 owner code write.
Current task2.6 evidence: openspec/changes/frade-standard-workflow/evidence/task26-runtime-20261005/origins.json; final native command logs and all historical failed/blocked streams retained. Previous task2.5 publication receipt joins this natural implementation checkpoint. Complete raw run trees remain in canonical Git common.
Reviewable standard/onboarding/status/manifest/adoption: openspec/changes/frade-standard-workflow/drafts/.
Feedback register: openspec/changes/frade-standard-workflow/feedback-register.md.
PANEL_STATE: NOT_OPENED_THIS_SESSION; no panel-opening tool is available. Historical QUEUED state does not establish current visibility.
Task2.1–2.6 complete and published; task2.7 COMPLETE_SCOPED; PUBLISHED c6ae514350b46da67721126b4bd86fa04698c863. Native Windows182/182 PASS (168 historical +14 new),23 publication tests; remaining6 W01 tasks incomplete. Scoped task2.5 PASS grants no formal Verify, final POST, archive, foreign adoption, shared release publication or main merge.

Task2.7 historical capacity blocker evidence: openspec/changes/frade-standard-workflow/evidence/task27-blocker-20261005/blocker.json; full failed streams/probes/native logs/origins retained. Historical blocked runs made no admitted production changes. Fresh complete exact-pair streams and task27-runtime-20261005 resolve capacity/Git diagnostics/fsmonitor blockers within W01; no shared release, consumer adoption NOT_STARTED.

Current task2.7 evidence: openspec/changes/frade-standard-workflow/evidence/task27-runtime-20261005/completion.json and origins.json; publication stdout-only RED, active fsmonitor RED and nested read-only RED all GREEN. Root17/original scripts/dependencies/CI jobs/product/lockfile/vendor/routing unchanged. Actual general lint/typecheck/build20/20 are Turbo cache hits; boundaries19/19 and four boundary commands PASS. Formal Verify/POST/archive NOT_RUN; READY_FOR_VERIFY: NO.

Resume evidence: openspec/changes/frade-standard-workflow/evidence/task32-resume-20261005/checks.json and traceability-run-bindings.json; 18requirements/46scenarios mapped, 60 current assertion/run bindings, native189 events/173 unique titles plus separate owner replay. Initial broad/sandbox/CMD invocation failures preserved with classified correction; budget handoff path mismatch resolved by exact consumed-file hash. Synthetic numeric fixture proves common evidence controls only, no real consumer budget acceptance. Publication scanner benign Object.freeze false positive reproduced; no production publication repair imported yet. Exact Sol/high initial repair stream BLOCKED_CAPACITY; same-pair retry in isolated staging. Tasks3.1/3.2 remain unchecked; Verify/POST/archive NOT_RUN.

Final task3 checks: task32-final-20261005/completion.json and traceability-run-bindings.json. Native193/193 PASS (177 unique titles), publication27/27, owner replay1/1; exact Sol/high origin/budget/publication streams complete and source-bound. Publication scanner repair and11 new portable tests imported; original23 publication assertions AST-identical; root17/product/dependencies/CI/supplier unchanged. Full adversarial role events retain exact bytes in canonical private common with public origin hash/path pointer; sensitive guard unchanged for publication. Task3.1 complete; task3.2 audit complete, canonical checkpoint/push pending. Formal Verify/POST/archive NOT_RUN; READY_FOR_VERIFY: NO.

Task3.1–3.2 publication refresh 2026-10-05: final193/193 PASS, original23 publication tests retained and27 current PASS, boundary19/19+4, owner replay1/1, strict16/16, current source bindings verified. Checkpoint 9fcdced7bfd3e1ae3e6895de050466417b19d8c1 PUBLISHED; canonical receipt stored in task32-final-20261005/publication-result.json. Prior auto-review rejection retained outside candidate; user explicitly permitted this payload/destination. Verify starts only on the refreshed frozen packet; tasks4.1–4.4 remain incomplete, consumer adoption NOT_STARTED, shared v1.1 unchanged, writer dispatch NOT_IMPLEMENTED.

Formal Verify result 2026-10-05: RECEIVED_VALID_FAIL; all18 requirements and46 scenarios inspected, four correctness/coherence blockers V-01–V-04 prevent POST. Raw reports, events, exits and provenance are immutable and retained; stopped worker and unchanged source/index/HEAD/packet proven before freeze release. Public evidence: openspec/changes/frade-standard-workflow/evidence/formal-verify-20261005/receipt.json. Native193/193 remains actual historical GREEN and does not waive current semantic FAIL. Dashboard is an administrative BLOCKED update, not a generated source-bound projection; W-02 remains open until authenticated status-write repair. Tasks4.1–4.4 remain incomplete, no production repair, POST, archive or consumer adoption performed during this review.

Diagnostic publication refresh 2026-10-05: user explicitly permitted checkpoint 1bfcc149d00e38c7a2a8efa482a160d65a84f8fc and the exact remote/ref; canonical push and fresh remote SHA verification PASS. Formal Verify remains FAIL with V-01–V-04; progression stopped, tasks4.1–4.4 incomplete. Publication receipt retained in formal-verify-20261005/diagnostic-publication-result.json and joins the next natural repair checkpoint. READY_FOR_VERIFY: NO; POST/archive NOT_RUN.
