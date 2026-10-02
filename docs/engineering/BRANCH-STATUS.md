# Frade standard workflow — статус

UPDATED_AT_UTC: 2026-10-02T18:00:44.896Z
POLICY_VERSION: v1.1 / a3ac63b52187e1f45f08b6d0beffcd67425c491d8ae1ac5d0d0efd3832e73fd0
Это собственный dashboard нового направления; общий шаблон пока PROPOSED, не deployed.

## 1. Решение / следующий шаг

STAGE: W01 | PHASE: PLANNING | HEALTH: RUNNING
NEXT_PERMITTED_ACTION: actual planning checks -> independent draft-quality review -> publish planning checkpoint -> concrete policy decision.
HUMAN_DECISION: принять/скорректировать проект policy, cadence и control scope после чтения artifacts.
READY_FOR_IMPLEMENTATION: NO (concrete policy decision and formal PRE/checkpoint NOT_RUN).
READY_FOR_ARCHIVE: NO.
Model matrix и feature-branch commit/push authorization приняты; весь proposed policy ещё не утверждён.

## 2. Идентичность / scope

Direction/change: frade-standard-workflow.
Branch: codex/frade-standard-workflow.
Worktree: E:/dev/codex/frade-worktrees/frade-standard-workflow.
Git common: E:/dev/codex/frade/.git.
Original baseline/cumulative origin: 98f387f96b51b0ad139e3507c376ff1c3e8dec09.
Approved implementation checkpoint: NONE.
Current scope: own planning/drafts/process evidence/dashboard; production/foreign owners/lockfile/vendor/routing controls unchanged.
Public policy adoption: evidence/repository-audit.json has exact2 paths/hashes; no foreign uncommitted product/process transfer.

## 3. Roadmap этапов

| Stage | Result | Phase / health | PRE / Verify / POST / archive |
|---|---|---|---|
| W01 | Общий стандарт, onboarding, validated templates/controls/CLI/publication | PLANNING/RUNNING | Formal gates NOT_RUN |
| Existing-owner adoption | Separate Routing/UI/Repo Core consumer checkpoints | NOT_STARTED; outside W01 | Own future scope/gates |
| Main integration | Explicit merged-candidate revalidation | NOT_STARTED; outside current permission | No automatic merge |

STOP after W01; no next numbered change or owner migration automatically.

## 4. Активные задачи / шаги

| Task | Role | Ordered work | Status / evidence |
|---|---|---|---|
| 1.1 | planning-architecture | isolate -> audit -> public-policy adoption | COMPLETE; repository-audit.json/user-decisions.json |
| 1.2 | planning-architecture | consolidate -> specs/design/tasks -> standard/onboarding/status/manifest/adoption drafts | COMPLETE; feedback-register.md and drafts |
| 1.3 | planning-architecture + independent-PRE pair for draft-only review | strict/checks -> independent draft-quality review -> checkpoint | IN_PROGRESS; strict change PASS, review NOT_RUN |
| 1.4 | human material policy decision | concrete proposal -> acceptance/reconciliation | OPEN |
| 1.5 | independent-PRE | approved coherent plan -> actual formal PRE -> frozen checkpoint | OPEN |
| 2.1–2.7 | tooling-tests | meaningful RED -> controls/docs/CLI -> GREEN | NOT_STARTED |
| 3.1–3.2 | tooling-tests | cumulative applicable checks + integrity audit | NOT_RUN |
| 4.1–4.4 | Verify/POST + orchestration | Verify -> POST -> release/archive/checkpoint | NOT_RUN |

TASKS_COMPLETE/TOTAL/REMAINING: 2/18/16.
REQUIREMENTS_ACCEPTED/TOTAL/UNCOVERED: 0/18/18 (normative draft is not deployed acceptance).
44 BDD scenario declarations counted by actual planning audit; product/control behavioral tests NOT_RUN.

## 5. Проверки / gates / качество

| Check | Applicability | Actual result |
|---|---|---|
| Frade ownership/registered isolated branch | REQUIRED | PASS |
| Shared CLI bundle discovery v1.1 | REQUIRED | AVAILABLE; separate from invocation/canary |
| Exact public-policy transfer | REQUIRED | PASS2/2 raw hashes |
| Inventory | REQUIRED | PASS20 package manifests; point-in-time owner process observations |
| openspec validate frade-standard-workflow --strict --json | REQUIRED | PASS1/1, no issues |
| Full planning content/hash/link/traceability and all-spec checks | REQUIRED | PASS; planning-checks.json,18requirements/44scenarios/18tasks/8sections; product/control tree unchanged |
| Independent draft-quality review | REQUIRED for planning checkpoint | NOT_RUN; does not grant production admission |
| Formal PRE/Verify/POST | REQUIRED for implementation/closure | NOT_RUN |
| New validator/bootstrap/publication control suites | REQUIRED after approved plan | NOT_IMPLEMENTED/NOT_RUN |
| Product suites | No product changes in current planning | NOT_RUN; no product PASS claimed |
| Human policy/visual acceptance | Policy decision REQUIRED; product visuals outside current scope | Policy PENDING; no visual approval claim |
| CI / branch protection | Separate observable control | REMOTE_NOT_RUN / NOT_CONFIGURED_OR_UNVERIFIED |

Historical failures kept separate; no existing Routing/UI FAIL waived.

## 6. Модели / исполнение

| Stage/role | Approved exact model/effort | Authority | Invoked / actual |
|---|---|---|---|
| W01 planning-architecture | gpt-6-astra/high | design4 + direct human decision | Current chat backend/effort NOT_CONFIRMED |
| W01 tooling-tests | gpt-6-sol/high | design4 + direct human decision | NOT_RUN |
| W01 formal-Verify | gpt-6-astra/high | design4 + direct human decision | NOT_RUN |
| W01 independent-PRE | gpt-6-astra/xhigh | design4 + direct human decision | NOT_RUN |
| W01 independent-POST | gpt-6-astra/xhigh | design4 + direct human decision | NOT_RUN |

No model substitution, task override or silent current-chat switch. Common service is read-only reviewer transport; writer dispatch NOT_IMPLEMENTED.

## 7. Зависимости / решения / blockers

| ID | Owner / scope | State | Decision / next action |
|---|---|---|---|
| D01 models | W01 | ACCEPTED | Retain exact pairs and invocation provenance |
| D02 remote/ref | W01 | ACCEPTED | Only origin refs/heads/codex/frade-standard-workflow |
| D03 concrete common policy/cadence | W01 | PENDING | Read drafts/standard-workflow.md; approve or revise |
| Adoption Routing/UI/Repo Core | Each consumer | NOT_STARTED | Do not block independent supplier or edit foreign workspace |
| Unknown writable-worker runtime | W01 tooling capability | NOT_IMPLEMENTED | Implement explicit honest capability/guard, no false dispatch |

No active production fix attempts; RCA rule retained.

## 8. Git / публикация / evidence

SOURCE_CHECKPOINT_SHA: baseline98f387f; planning checkpoint PENDING.
COMMIT_STATE: draft planning checkpoint preparing; explicit scoped stage/commit below; not approved implementation baseline.
AUTHORIZED_REMOTE_REF: git@github.com:leonmaks/frade.git refs/heads/codex/frade-standard-workflow.
PUSH_STATE: PENDING.
VERIFIED_REMOTE_SHA: NOT_RUN.
Current evidence: openspec/changes/frade-standard-workflow/evidence/.
Reviewable standard/onboarding/status/manifest/adoption: openspec/changes/frade-standard-workflow/drafts/.
Feedback register: openspec/changes/frade-standard-workflow/feedback-register.md.
PANEL_STATE: QUEUED by open_in_codex; visibility unconfirmed.
No production implementation, owner migration, archive, shared release mutation or main merge claimed.
