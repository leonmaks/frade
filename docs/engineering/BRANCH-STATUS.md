# Frade standard workflow — статус

UPDATED_AT_UTC: 2026-10-04T18:23:13.753Z
POLICY_VERSION: v1.1 / a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0
Это собственный dashboard нового направления; общий стандарт ACCEPTED_FOR_IMPLEMENTATION, ещё не deployed.

## 1. Решение / следующий шаг

STAGE: W01 | PHASE: IMPLEMENTATION | HEALTH: RUNNING
NEXT_PERMITTED_ACTION: task2.6 publication controls, beginning with meaningful temporary-Git RED. Task2.5 focused PRE and complete reception PASS; local-only. Formal Verify/POST/archive remain pending.
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

| Stage | Result | Phase / health | PRE / Verify / POST / archive |
|---|---|---|---|
| W01 | Общий стандарт, onboarding, validated templates/controls/CLI/publication | IMPLEMENTATION/RUNNING | PRE PASS; Verify/POST NOT_RUN |
| Existing-owner adoption | Separate Routing/UI/Repo Core consumer checkpoints | NOT_STARTED; outside W01 | Own future scope/gates |
| Main integration | Explicit merged-candidate revalidation | NOT_STARTED; outside current permission | No automatic merge |

STOP after W01; no next numbered change or owner migration automatically.

## 4. Активные задачи / шаги

| Task | Role | Ordered work | Status / evidence |
|---|---|---|---|
| 1.1 | planning-architecture | isolate -> audit -> public-policy adoption | COMPLETE; repository-audit.json/user-decisions.json |
| 1.2 | planning-architecture | consolidate -> specs/design/tasks -> standard/onboarding/status/manifest/adoption drafts | COMPLETE; feedback-register.md and drafts |
| 1.3 | planning-architecture + independent-PRE pair for draft-only review | strict/checks -> independent draft-quality review -> checkpoint | COMPLETE; strict/integrity PASS; draft-01 BLOCKED, draft-02 FAIL retained; fresh draft-03 PASS on faf69d33 |
| 1.4 | human material policy decision | concrete proposal -> acceptance/reconciliation | COMPLETE; policy-acceptance.json D03 |
| 1.5 | independent-PRE | approved coherent plan -> actual formal PRE -> frozen checkpoint | COMPLETE; receipt checkpoint2a6f8f96 verified published; formal-pre-01-pass |
| 2.1 | tooling-tests | meaningful RED -> repair -> Windows GREEN -> import -> lint/format/strict/integrity | COMPLETE; task21-completion-audit.json; actual35/35 PASS, lint/format/syntax/strict PASS; historical FAIL retained |
| 2.2 | tooling-tests | role RED9 -> Windows44 -> required gaps -> new RED6 -> owner GREEN50/lint/format/strict | COMPLETE; task22-completion-audit.json; full old FAIL retained |
| 2.3 | tooling-tests | Git RED -> exact grant/origin -> Windows portability repair -> owner GREEN/checkpoint | COMPLETE; task23-completion-audit.json; actual Windows92/92, 76 unique + 3 extra binding assertions; strict all16/16, lint/format PASS; prior FAIL retained |
| 2.4 | tooling-tests | RED -> eight sections/metrics/freeze/history/panel/checkpoint -> Windows GREEN | COMPLETE; task24-completion-audit.json; Windows107/107 PASS (91 unique), scoped syntax/lint/format/strict PASS; historical FAIL retained |
| 2.5 | tooling-tests | RED -> wrapper/freeze/raw binding -> Windows GREEN -> actual focused PRE | COMPLETE; task25-runtime-20261004/completion.json. Native Windows146/146, focused37/37; scoped Astra/xhigh PASS, full raw reception PASS, exact-run termination and unchanged candidate verified, freeze RELEASED. Historical FAIL/BLOCKED retained |
| 2.6–2.7 | tooling-tests | publication/inheritance/docs/CI | NOT_STARTED |
| 3.1–3.2 | tooling-tests | cumulative applicable checks + integrity audit | NOT_RUN |
| 4.1–4.4 | Verify/POST + orchestration | Verify -> POST -> release/archive/checkpoint | NOT_RUN |

TASKS_COMPLETE/TOTAL/REMAINING: 10/18/8.
REQUIREMENTS_ACCEPTED/TOTAL/UNCOVERED: 0/18/18 (normative draft is not deployed acceptance).
46 BDD scenario declarations counted by actual planning audit; task2.1 behavioral controls actual Windows35/35 PASS; cumulative18-requirement acceptance remains incomplete.

## 5. Проверки / gates / качество

| Check | Applicability | Actual result |
|---|---|---|
| Frade ownership/registered isolated branch | REQUIRED | PASS |
| Shared CLI bundle discovery v1.1 | REQUIRED | AVAILABLE; separate from invocation/canary |
| Exact public-policy transfer | REQUIRED | PASS2/2 raw hashes |
| Inventory | REQUIRED | PASS20 package manifests; point-in-time owner process observations |
| openspec validate frade-standard-workflow --strict --json | REQUIRED | PASS1/1, no issues |
| Full planning content/hash/link/traceability and all-spec checks | REQUIRED | PASS; reconciled-planning-checks.json + final metadata check proof;18requirements/46scenarios/18tasks/8sections; product/control tree unchanged |
| Independent draft-quality review | REQUIRED for planning completion | draft-03 PASS on faf69d33;80 input hashes; prior BLOCKED/FAIL preserved; no implementation admission |
| Formal PRE/Verify/POST | REQUIRED for implementation/closure | PRE PASS on9c974da8; Verify/POST NOT_RUN |
| General lint/typecheck/boundary suites | REQUIRED | Actual current baseline PASS5 checks; original build FAIL retained; exact pinned resources restored, repeated build PASS |
| New core schema/lifecycle/closure controls | REQUIRED | Meaningful Windows RED retained; 30+5 expanded GREEN35/35; owner post-format35/35 PASS; scoped lint repaired; current PASS |
| Role resolver controls | REQUIRED | Actual Windows50/50 PASS; format/scoped lint/strict PASS; meaningful RED6 and original layout/probe FAIL retained |
| Bootstrap/status/review/publication controls | REQUIRED | Task2.3–2.5 complete; native Windows146/146 PASS; actual task2.5 focused PRE/reception PASS. Publication/integration2.6–2.7 NOT_STARTED |
| Product suites | No product changes in current planning | NOT_RUN; no product PASS claimed |
| Human policy/visual acceptance | Policy decision REQUIRED; product visuals outside current scope | Policy ACCEPTED_D03; no visual approval claim |
| CI / branch protection | Separate observable control | REMOTE_NOT_RUN / NOT_CONFIGURED_OR_UNVERIFIED |

Historical invocation/EOF/EOL/link-check/count failures and classified corrections retained. Draft review history: BLOCKED -> FAIL/SPEC_CONFLICT -> repaired fresh PASS; raw reports/events/exits/provenance are immutable. Fresh current strict and planning-integrity PASS; staged diff-check PASS. No existing Routing/UI FAIL waived.

## 6. Модели / исполнение

| Stage/role | Approved exact model/effort | Authority | Invoked / actual |
|---|---|---|---|
| W01 planning-architecture | gpt-6-astra/high | design4 + direct human decision | Current chat backend/effort NOT_CONFIRMED |
| W01 tooling-tests | gpt-6-sol/high | design4 + direct human decision | initial task2.1 executed gpt-6-sol/high; all three core runs raw complete/input unchanged; actual Windows35/35 PASS; fresh lint repair same pair/canary; backend/effort NOT_CONFIRMED |
| W01 formal-Verify | gpt-6-astra/high | design4 + direct human decision | NOT_RUN |
| W01 independent-PRE | gpt-6-astra/xhigh | design4 + direct human decision | Exact pair invoked for accepted formal PRE and task2.5 focused PRE; current focused reviewer/reception PASS; actual backend/effort NOT_CONFIRMED |
| W01 independent-POST | gpt-6-astra/xhigh | design4 + direct human decision | NOT_RUN |

No model substitution, task override or silent current-chat switch. Common service is read-only reviewer transport; writer dispatch NOT_IMPLEMENTED.

## 7. Зависимости / решения / blockers

| ID | Owner / scope | State | Decision / next action |
|---|---|---|---|
| D01 models | W01 | ACCEPTED | Retain exact pairs and invocation provenance |
| D02 remote/ref | W01 | ACCEPTED | Only origin refs/heads/codex/frade-standard-workflow |
| D03 concrete common policy/cadence | W01 | ACCEPTED | Direct reply and bound planning hashes retained; formal PRE PASS |
| Adoption Routing/UI/Repo Core | Each consumer | NOT_STARTED | Do not block independent supplier or edit foreign workspace |
| Reviewer CLI environment | W01 | RESOLVED_CURRENT; historical BLOCKED retained | Task2.5 runtime required shell reading, no jq and no temporary-file heredocs. RCA and rejected streams retained; fresh exact Astra/xhigh PRE/reception PASS |
| Baseline general build | W01 applicable check | RESOLVED_CURRENT; historical FAIL retained | All2851 pinned resources exact; repeated build PASS; index entries/product tree unchanged |
| Task2.1 core control gaps | W01 | RESOLVED_CURRENT; new lint blocker | Eight gaps and null options repaired, actual Windows RED/GREEN retained; six lint errors repaired without disabling rules; current checks PASS |
| Task2.2 exact authority/portable fixtures | W01 | RESOLVED_CURRENT; historical FAIL retained | Actual raw-byte digests, portable immutable fixtures, malformed records and canonical ID repaired; Windows50 PASS |
| Product writer dispatcher | W01 tooling capability | NOT_IMPLEMENTED | Guard remains explicit; separate session staging runtime v2 technically verified, initial probe BLOCKED retained |

Task2.1–2.4 PUBLISHED; task2.5 complete locally: actual Windows146/146 and focused PRE/reception PASS. Restricted-sandbox136/146 FAIL, Linux21/22 limitation, rejected reviewer streams and authorization/RCA remain retained. Formal Verify/POST/archive NOT_RUN.

## 8. Git / публикация / evidence

SOURCE_CHECKPOINT_SHA: 1fdc112018cae58305204f9fffed6bd8f7fdc90c (reviewed task2.5 source; accepted candidate snapshot c7003b3e97414dc5bef917bf8bc657242432970245606bb34d5b56e894bf99cf; W01 administrative progress 10/18).
COMMIT_STATE: reviewed source1fdc1120 COMMITTED_LOCAL; task2.5 accepted receipt and recovery history form the following local checkpoint. No push attempted while publication is deferred by the user.
AUTHORIZED_REMOTE_REF: git@github.com:leonmaks/frade.git refs/heads/codex/frade-standard-workflow.
PUSH_STATE: DEFERRED_BY_USER; SSH access restoration in progress; continue locally, no push attempted. Remote SHA UNAVAILABLE.
VERIFIED_SOURCE_REMOTE_SHA: UNAVAILABLE.
SOURCE_PUBLICATION_RECEIPT: openspec/changes/frade-standard-workflow/evidence/publication/source-faf69d33-20261002.json.
PRE_ADMISSION_PUBLICATION_RECEIPT: E:/dev/codex/frade/.git/frade-workflow/publications/frade-standard-workflow/formal-pre-admission-20261002.json; require PUBLISHED/sourceSha=live HEAD before first task2.1 owner code write.
Current evidence: openspec/changes/frade-standard-workflow/evidence/task25-runtime-20261004/completion.json; origins.json binds143 exact copied artifacts. Complete raw run trees remain in canonical Git common.
Reviewable standard/onboarding/status/manifest/adoption: openspec/changes/frade-standard-workflow/drafts/.
Feedback register: openspec/changes/frade-standard-workflow/feedback-register.md.
PANEL_STATE: NOT_OPENED_THIS_SESSION; no panel-opening tool is available. Historical QUEUED state does not establish current visibility.
Task2.1–2.5 complete; full current native Windows suite146/146 PASS. Remaining8 W01 tasks incomplete. Scoped task2.5 PASS grants no formal Verify, final POST, archive, foreign adoption, shared release publication or main merge.
