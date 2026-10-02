# Frade standard workflow — статус

UPDATED_AT_UTC: 2026-10-02T21:38:14.759Z
POLICY_VERSION: v1.1 / a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0
Это собственный dashboard нового направления; общий стандарт ACCEPTED_FOR_IMPLEMENTATION, ещё не deployed.

## 1. Решение / следующий шаг

STAGE: W01 | PHASE: IMPLEMENTATION | HEALTH: RUNNING
NEXT_PERMITTED_ACTION: publish completed task2.2 checkpoint -> same W01 task2.3 safe bootstrap RED/implementation/checks; no next OpenSpec change.
HUMAN_DECISION: NONE; D03 accepted by direct reply «Принято. Продолжай.».
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
| 2.3–2.7 | tooling-tests | meaningful RED -> remaining controls/docs/CLI -> GREEN | NOT_STARTED |
| 3.1–3.2 | tooling-tests | cumulative applicable checks + integrity audit | NOT_RUN |
| 4.1–4.4 | Verify/POST + orchestration | Verify -> POST -> release/archive/checkpoint | NOT_RUN |

TASKS_COMPLETE/TOTAL/REMAINING: 7/18/11.
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
| Bootstrap/status/review/publication controls | REQUIRED | Tasks2.3–2.7 NOT_IMPLEMENTED/NOT_RUN |
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
| W01 independent-PRE | gpt-6-astra/xhigh | design4 + direct human decision | Requested exact pair for draft BLOCKED/FAIL/PASS and fresh formal PRE PASS; actual backend/effort NOT_CONFIRMED |
| W01 independent-POST | gpt-6-astra/xhigh | design4 + direct human decision | NOT_RUN |

No model substitution, task override or silent current-chat switch. Common service is read-only reviewer transport; writer dispatch NOT_IMPLEMENTED.

## 7. Зависимости / решения / blockers

| ID | Owner / scope | State | Decision / next action |
|---|---|---|---|
| D01 models | W01 | ACCEPTED | Retain exact pairs and invocation provenance |
| D02 remote/ref | W01 | ACCEPTED | Only origin refs/heads/codex/frade-standard-workflow |
| D03 concrete common policy/cadence | W01 | ACCEPTED | Direct reply and bound planning hashes retained; formal PRE PASS |
| Adoption Routing/UI/Repo Core | Each consumer | NOT_STARTED | Do not block independent supplier or edit foreign workspace |
| Reviewer CLI environment | W01 | RESOLVED_CURRENT; historical BLOCKED retained | Exact retries completed with FAIL then PASS; no model substitution or quota/reset claim |
| Baseline general build | W01 applicable check | RESOLVED_CURRENT; historical FAIL retained | All2851 pinned resources exact; repeated build PASS; index entries/product tree unchanged |
| Task2.1 core control gaps | W01 | RESOLVED_CURRENT; new lint blocker | Eight gaps and null options repaired, actual Windows RED/GREEN retained; six lint errors repaired without disabling rules; current checks PASS |
| Task2.2 exact authority/portable fixtures | W01 | RESOLVED_CURRENT; historical FAIL retained | Actual raw-byte digests, portable immutable fixtures, malformed records and canonical ID repaired; Windows50 PASS |
| Product writer dispatcher | W01 tooling capability | NOT_IMPLEMENTED | Guard remains explicit; separate session staging runtime v2 technically verified, initial probe BLOCKED retained |

Task2.1 checks complete; task2.2 checks complete; prior actual FAIL/RED and runtime ENVIRONMENT RCA retained; no test weakening.

## 8. Git / публикация / evidence

SOURCE_CHECKPOINT_SHA: faf69d339b338173158d2f31465c2aa4f0b4108d (independent draft-quality PASS, not implementation admission).
COMMIT_STATE: completed task2.1 checkpoint5b0e5592 committed; status refresh retained for next natural checkpoint.
AUTHORIZED_REMOTE_REF: git@github.com:leonmaks/frade.git refs/heads/codex/frade-standard-workflow.
PUSH_STATE: PUBLISHED 5b0e5592de9575e4b37f709618598d8a3b39bb09; actual fresh remote SHA matched.
VERIFIED_SOURCE_REMOTE_SHA: 5b0e5592de9575e4b37f709618598d8a3b39bb09.
SOURCE_PUBLICATION_RECEIPT: openspec/changes/frade-standard-workflow/evidence/publication/source-faf69d33-20261002.json.
PRE_ADMISSION_PUBLICATION_RECEIPT: E:/dev/codex/frade/.git/frade-workflow/publications/frade-standard-workflow/formal-pre-admission-20261002.json; require PUBLISHED/sourceSha=live HEAD before first task2.1 owner code write.
Current evidence: openspec/changes/frade-standard-workflow/evidence/.
Reviewable standard/onboarding/status/manifest/adoption: openspec/changes/frade-standard-workflow/drafts/.
Feedback register: openspec/changes/frade-standard-workflow/feedback-register.md.
PANEL_STATE: QUEUED by open_in_codex; visibility unconfirmed.
Task2.1 core complete with35 tests and required scoped checks PASS; remaining11 W01 tasks incomplete. No owner migration, archive, shared release mutation or main merge claimed.
