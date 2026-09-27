# Routing V2 — этапы, команды и модели

Памятка для запуска R01–R10 без поиска по истории чата.

Источник матрицы моделей: [implementation-playbook.md](implementation-playbook.md), разделы 2–3 и раздел соответствующего change. Эта памятка не изменяет архитектурные контракты, scope или критерии gates. При расхождении сначала сверить AGENTS.md, scoped AGENTS.md, [CURRENT_CHANGE.md](CURRENT_CHANGE.md) и активные OpenSpec artifacts; конфликт разрешать через planning.

## Модели по numbered change

Названия ниже относятся к GPT-6. `high`, `xhigh`, `medium` — уровень reasoning. Выбирайте модель и уровень перед запуском соответствующего шага в Codex.

| Change | Implementation | Test / Fix | Независимый Architecture Gate |
|---|---|---|---|
| R01 Geometry Kernel | Sol medium/high | Luna high | Sol high |
| R02 Terminal / Perimeter | Sol high | Luna high | Sol high |
| R03 Direction Resolver | Sol high | Luna high | Astra high |
| R04 Orthogonal Router | Astra high/xhigh | Sol high | Astra xhigh |
| R05 Segment Router | Sol high | Luna / Sol | Sol high |
| R06 Segment Editor | Sol high | Luna high | Sol high |
| R07 Preview / Commit | Sol high | Luna / Sol | Astra high |
| R08 Self-loop | Sol high | Luna high | Sol high |
| R09 Draw.io Differential Harness | Astra high | Sol / Luna | Astra xhigh |
| R10 X6 Integration | Sol high | Sol high | Astra high |

Для строк Luna / Sol уровень выбирается по сложности задачи; рабочая рекомендация — high. При сложной интеграции R10 playbook допускает Astra high для implementation.

IDs моделей: `gpt-6-luna`, `gpt-6-sol`, `gpt-6-astra`. Доступность проверять в текущем выборе моделей Codex. Роли подтверждаются [официальным каталогом OpenAI](https://developers.openai.com/api/docs/models): Sol — баланс качества и стоимости, Luna — ограниченные повторяемые задачи, Astra — наиболее сложные задачи. Конкретное распределение по R01–R10 является рекомендацией нашего playbook, а не гарантией OpenAI.

## Порядок внутри каждого change

`<change>` ниже заменять точным ACTIVE_CHANGE из CURRENT_CHANGE.md. Команды `$openspec-…` — prompts skills в Codex; `git`, `pnpm`, `openspec` — команды терминала из корня репозитория.

| Шаг | Что запустить / поручить | Модель / reasoning | Условие перехода |
|---|---|---|---|
| 1. Bootstrap | Прочитать contracts, CURRENT_CHANGE, master spec, playbook, legacy boundary, зависимости; проверить Git state | Sol high | Состояние согласовано; выбран только разрешённый change |
| 2. Planning | `$openspec-new-change <change>`, затем `$openspec-continue-change <change>` до proposal/specs/design/tasks | Sol high; для сложной архитектуры R04/R09 — Astra high | Полный согласованный planning package, без implementation |
| 3. Planning validation | `openspec validate <change> --strict`; machine gate по правилам активной фазы | Исполнитель planning | Validation и предусмотренные planning checks PASS |
| 4. Независимый PRE gate | Свежая read-only задача: проверить planning, scope, численные контракты, test plan и целостность machine gate | Модель Architecture Gate из таблицы выше | PRE_IMPLEMENTATION PASS, READY_FOR_IMPLEMENTATION YES |
| 5. Planning checkpoint | Commit только явно разрешённых planning/control paths; записать SHA как APPROVED_PLANNING_COMMIT и BASE_COMMIT; перейти в IMPLEMENTATION и зафиксировать frozen paths | Sol high | Baseline сохранён; `pnpm run routing:v2:arch-gate` PASS |
| 6. BDD / TDD | Сначала deterministic fixtures и meaningful failing tests по требованиям; для compiler-контрактов запускать tsc | Модель Test / Fix из таблицы | Тесты проверяют утверждённые контракты; исходный FAIL объяснён |
| 7. Implementation | `$openspec-apply-change <change>`; реализация строго внутри scope | Модель Implementation из таблицы | Tasks выполнены и подтверждены evidence |
| 8. Tests и machine gate | Targeted tests → полная требуемая unit/property/regression suite → typecheck/compiler fixtures → scoped lint → architecture gate → strict validation → diff check | Исполнитель; Test / Fix для ограниченного repair | Все обязательные проверки PASS; прошлые layers без регрессий |
| 9. OpenSpec Verify | Перейти в VERIFICATION, заморозить production; `$openspec-verify-change <change>` | Sol high; для сложных R04/R09 — Astra high | Нет неразрешённых correctness blockers и required evidence gaps |
| 10. Независимый POST gate | Свежая read-only задача после OpenSpec Verify; проверить весь diff относительно approved baseline и реальное evidence | Модель Architecture Gate из таблицы | POST_IMPLEMENTATION PASS; archive разрешён |
| 11. Implementation commit | Зафиксировать финальный process-state и tasks; process-check; stage явных scope paths; commit implementation; сохранить SHA | Sol high | Staged scope/checks PASS; BASE_COMMIT не сдвинут |
| 12. Archive | `$openspec-archive-change <change>`; затем `openspec validate --all --strict`, `git diff --check`, `git status --short` | Sol high | Capability синхронизирована в main specs; archive успешен |
| 13. Close checkpoint | Отдельно commit archive; затем CLOSED state и отдельный transition commit | Sol high | Change закрыт; следующий numbered change не запускается автоматически |

Если change уже существует, на шаге 2 читать и продолжать существующие artifacts, не создавать дубликат. Если в репозитории есть утверждённые gate prompts, использовать их; не заменять подробные критерии кратким описанием этой таблицы.

## Команды проверки

Из `E:\dev\codex\frade`:

```powershell
git status --short --branch
git diff --check
openspec status --change <change>
openspec validate <change> --strict
pnpm run routing:v2:arch-gate
```

Конкретные test commands, configs, property counts и seeds брать из tasks/design активного change и package scripts. Наличие зелёного machine gate не заменяет независимый review. При CLOSED / ACTIVE_CHANGE NONE gate активного change не запускать как доказательство нового change.

## Правила экономии и остановки

- Luna: ограниченные fixtures, formatting и простые repairs по ясному контракту. Не назначать окончательным архитектурным reviewer для сложных routing algorithms.
- Sol: основной planning/development/verification worker; Astra: сложные архитектурные решения и gates, указанные в таблице.
- PRE и POST review выполнять в отдельном свежем read-only контексте. Исполнитель не выдаёт себе независимый PASS.
- При required test/typecheck/validation/gate FAIL остановить переходы и устранить blocker в правильном слое. Не ослаблять assertions, tolerances, seeds, property counts или gates.
- После двух неудачных fixes одного deterministic defect остановить patch loop и выполнить root-cause analysis перед новой production правкой.
- Frozen contract или scope conflict требует planning repair и соответствующей PRE revalidation. Не передвигать BASE_COMMIT ради PASS.
- Предыдущие layers — read-only dependencies, если изменение явно не обосновано и не утверждено planning.
- Новый numbered change начинать только по отдельному поручению пользователя после закрытия предыдущего.

## Точка входа после R02

Снимок на 2026-09-27: R01 и R02 закрыты; R03 не начат. Актуальное состояние всегда читать из CURRENT_CHANGE.md, а не из этого снимка.

Следующий change: `routing-v2-03-direction-resolver`.

R02 closing commit: `2b6619627e3e744007b06251a05dad86e7bce634`. При отдельном поручении начать R03 его planning checkpoint должен явно выбрать этот closing commit как baseline согласно CURRENT_CHANGE.md.

Для R03: planning/implementation — **GPT-6 Sol high**; test/fix — **GPT-6 Luna high**; независимые PRE/POST gates — **GPT-6 Astra high**.

Стартовый prompt для новой задачи:

> Прочитай docs/routing-v2/workflow-models.md и обязательные contracts. Определи активный change и разрешённую фазу по CURRENT_CHANGE.md. Выполни только порученный шаг внутри утверждённого scope. Не начинай следующий numbered change автоматически.
