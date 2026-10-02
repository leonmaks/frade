# <Direction> — статус

UPDATED_AT_UTC: <timestamp>
PROJECTION_SOURCE_SHA256: <structured-input hash>
POLICY_VERSION: <version/hash>

## 1. Решение / следующий шаг

STAGE: <id> | PHASE: <phase> | HEALTH: <health>
NEXT_PERMITTED_ACTION: <concrete action and prerequisites>
HUMAN_DECISION: NONE | <decision ID, options, blocking scope>
READY_FOR_IMPLEMENTATION: NO | <current PRE/checkpoint evidence>
READY_FOR_ARCHIVE: NO | <all required closure evidence>

## 2. Идентичность / scope

| Direction / change | Branch / worktree / Git common | Original origin | Approved checkpoint | Scope / exclusions / rules |
|---|---|---|---|---|
| <IDs> | <actual verified owner> | <immutable SHA> | <SHA/evidence> | <paths/contracts> |

## 3. Roadmap этапов

| Stage | Goal / OpenSpec change | Dependencies | Phase / health | PRE / Verify / POST / archive |
|---|---|---|---|---|
| <id> | <bounded outcome> | <consumer dependencies> | <actual> | <receipts or NOT_RUN> |

## 4. Активные задачи / шаги

| Task / type | Required ordered steps | Acceptance | Status | Source-bound evidence |
|---|---|---|---|---|
| <stable ID/type> | <order> | <contract> | <complete/open/blocked> | <run/paths/hashes> |

TASKS_COMPLETE/TOTAL/REMAINING: <derived counts>
REQUIREMENTS_ACCEPTED/TOTAL/UNCOVERED: <evidence-derived counts>

## 5. Проверки / gates / качество

| Check / contract | Applicability + reason | Result | Command / run / source / environment | Limit / actual / gaps |
|---|---|---|---|---|
| <ID> | REQUIRED or justified N/A | PASS/FAIL/BLOCKED/NOT_RUN | <actual bindings> | <approved budget/measurement> |

Invariant/regression failures, negative/boundary controls, stale evidence and human visuals listed explicitly. No inferred quality score.

## 6. Модели / исполнение

| Stage / task / role | Approved exact pair | Authority path/hash/excerpt | Invoked pair/runtime | Actual backend/effort | Override |
|---|---|---|---|---|---|
| <role> | <ID + one effort> | <approved source> | <actual or NOT_RUN> | NOT_CONFIRMED unless attested | NONE or approved record |

## 7. Зависимости / решения / blockers

| ID | Consumer owner / affected scope | State / age | Evidence / fix attempts / RCA | Required decision / next action |
|---|---|---|---|---|
| <ID> | <owner/scope> | <actual> | <raw history> | <concrete> |

## 8. Git / публикация / evidence

SOURCE_CHECKPOINT_SHA: <SHA or NONE>
COMMIT_STATE: <actual>
AUTHORIZED_REMOTE_REF: <decision-bound exact remote/ref or BLOCKED>
PUSH_STATE: LOCAL_ONLY/PENDING/BLOCKED/PUBLISHED
VERIFIED_REMOTE_SHA: <actual fresh remote result or NOT_RUN>
CURRENT_EVIDENCE: <dated links>
PANEL_STATE: QUEUED/VISIBLE/NOT_OPENED with evidence
HISTORICAL_EVIDENCE: <unchanged links/legacy tail boundary>

<!-- Any preserved legacy dated history begins below; never reinterpret it as current authority. -->
