# Единый рабочий процесс Frade — проект стандарта 2.0

Статус: ACCEPTED_FOR_IMPLEMENTATION, NOT_DEPLOYED. Пользователь принял проект; обязательные PRE/RED/checks/Verify/POST предшествуют внедрению. Действующая общая политика — v1.1; документ не выдаёт внедрение или миграцию за завершённые. Источник: proposal/design/specs change frade-standard-workflow.

## 1. Общая структура

**Репозиторий Frade → направление → этап → задача → упорядоченные шаги.**

Направление — самостоятельная инженерная цель. Один пакет может участвовать в нескольких направлениях; одно направление может затрагивать несколько пакетов. Пользовательский термин — «направление». Старые R01–R10, P01–P07, requirements, origin и исторические документы не переименовываются.

Направление содержит цель, владельца, исходный commit, ветку/worktree, roadmap, правила, критерии качества, зависимости, реестр решений и статус. Этап — проверяемый объём с собственным OpenSpec change/явным legacy mapping и PRE/POST. Задача имеет стабильный ID, тип, зависимости, критерий приёмки, model/effort и evidence. Шаг задаёт исполнимое действие, входы, результат и условие перехода.

Фаза показывает деятельность; health показывает наличие blockers. Нельзя путать «задачи выполнены», «тесты PASS», «POST PASS», «этап CLOSED» и «merged/published».

## 2. Открытие нового направления

Команда человеку: **«Открой направление <название>: <цель и ожидаемый результат>».**

Агент:
1. Проверяет настоящий Git common, текущие branches/worktrees, общую policy/runtime и выбранный committed baseline.
2. Готовит preview: ID, branch codex/<id>, отдельный worktree, папки, target remote/ref, правила и неизвестные решения.
3. Создаёт отдельную ветку/worktree без копирования чужого uncommitted product-кода.
4. Создаёт intake, research, requirements, roadmap, direction manifest, внутренние правила, статус и реестр решений.
5. Формирует этапы и task types; предлагает точные model/effort для всех ролей. Незаполненное назначение не маскируется default.
6. Автоматически запускает безопасное исследование и подготовку artifacts. Существенные product/spec/destination решения выносит человеку с конкретными вариантами.
7. Сохраняет и публикует разрешённый planning checkpoint с честным состоянием.

Пример будущей структуры:
```text
docs/engineering/directions/<id>/
  direction.json
  INTAKE.md
  RESEARCH.md
  REQUIREMENTS.md
  ROADMAP.md
  AGENTS.md
  DIRECTION-STATUS.md
  decisions/
openspec/changes/<stage-change>/
  proposal.md
  specs/
  design.md
  tasks.md
  evidence/
```

Legacy status сохраняет существующий путь, но получает одинаковую внешнюю структуру после собственной adoption-проверки. Локальный AGENTS не снижает root/scoped controls. Создавать пустые product packages ради roadmap нельзя.

## 3. Стандартный каркас каждого этапа

| Фаза | Действия | Обязательный выход |
|---|---|---|
| INTAKE | Проблема, пользователи, цель, scope/non-goals, baseline, ограничения | Понятная цель и явно отмеченные решения |
| RESEARCH | Локальный код/контракты, первичные источники, текущее поведение, альтернативы, риски | Датированное исследование, воспроизводимые gaps, неизвестные |
| REQUIREMENTS | IDs, поведение, invariants, acceptance, совместимость, измеримые лимиты | Проверяемые требования и human boundaries |
| PLANNING | Proposal/spec/design/tasks, task dependencies, role matrix, control applicability | Согласованный утверждённый пакет |
| PRE_REVIEW | Strict validation, freeze, независимый read-only review | Текущий PRE PASS и owning checkpoint |
| BDD_TDD | Meaningful RED, fixtures, positive/negative/boundary controls | Доказательство воспроизведения и правильного oracle |
| IMPLEMENTATION | Изменения в разрешённом scope и ответственном слое | Реализация с traceability |
| CHECKS | Targeted → обязательный полный regression, type/build/boundaries/owner gates | Все applicable required checks PASS |
| VERIFICATION | Formal OpenSpec Verify по требованиям, сценариям, tasks и evidence | Нет correctness blockers или required gaps |
| POST_REVIEW | Свежий независимый review полного candidate | Текущий POST PASS |
| ARCHIVE | Sync/archive, итоговые проверки и checkpoints | Archived + закрытый этап |
| CLOSED | Публикация closure; следующий номер не начинается автоматически | STOP и точный next permitted action |

Новый scope или существенная правка contracts проходит reconciliation/strict и новую применимую PRE revalidation. Старый PASS не разрешает изменённый candidate. Небольшая feature использует тот же каркас с небольшими artifacts, а не отдельный ослабленный процесс.

Sync/archive разрешает только заранее перечисленные spec destinations и датированную папку собственного change после всех owning barriers. Относительные ссылки и актуальные role-source bindings переносятся явно; immutable исторические receipts сохраняют исходные hashes/paths и получают отдельную карту переноса. Чужие specs/archives и frozen controls не входят в closure allowance.

Merge/integration — отдельный явно разрешённый checkpoint: target SHA, конфликты, итоговый merged-tree diff, applicable tests/control revalidation и review. Feature POST не одобряет новый конфликтующий merge tree.

## 4. Типы задач и модели

Для каждого этапа план точно назначает:
- research/requirements/planning-architecture;
- implementation;
- tooling-tests/test-fix;
- formal-Verify;
- independent-PRE;
- independent-POST.

Порядок разрешения: **утверждённое исключение конкретной задачи/роли → утверждённая stage/type assignment → BLOCKED**. Никакого «high/xhigh», «Sol/Luna», «выбрать позже» при dispatch.

Каждое назначение содержит model ID, один effort, stage/task/role, source path, raw SHA-256, точную цитату и revision. Исключение содержит причину, собственное разрешение и необходимые проверки. Reviewer assignment отдельно от executor assignment; исполнитель не получает независимый PASS от самого себя.

Для текущего направления W01 пользователь утвердил:
| Роль | Модель | Effort |
|---|---|---|
| Planning/architecture, включая этот стандарт | gpt-6-astra | high |
| Tooling/tests | gpt-6-sol | high |
| Formal Verify | gpt-6-astra | high |
| Independent PRE | gpt-6-astra | xhigh |
| Independent POST | gpt-6-astra | xhigh |

Эта таблица не становится универсальной для будущих направлений. Будущая матрица готовится по сложности/риску и утверждается как часть плана. Routine deterministic Git/status orchestration не требует отдельной LLM-роль-модели.

## 5. Жёсткие правила качества

- Реализация следует спецификации. Findings review не меняют specification сами по себе.
- Дефект: reproduction → failing fixture/test → RCA → fix → targeted GREEN → full regression.
- Required FAIL, typecheck/validation/gate/parity/invariant failure, conflict или вернувшаяся регрессия останавливают владельца.
- После двух неудачных fixes одного deterministic defect новая production-правка запрещена до классифицированного RCA.
- Нельзя ослаблять meaningful assertions, tolerances, seeds/quotas, пропускать tests, удалять regressions или слепо менять snapshots.
- Fix находится в ответственном слое. Core детерминирован; производное состояние сохраняется только по явному контракту.
- Порог качества и numerical budget утверждается до измерения. Нельзя подгонять бюджет под неудачный результат.
- General/subsystem checks перечисляются до исполнения с scope/contract reason. Required unavailable check — BLOCKED, не N/A и не PASS.
- Проверки process/docs scope должны доказать unchanged product tree и действительную корректность controls. Они не дают права объявлять неисполненный product suite зелёным.
- Visual acceptance, brand/usability/spec решения остаются человеческими, когда этого требует контракт.
- Этот процесс повышает проверяемость качества; он не доказывает отсутствие всех возможных дефектов.

## 6. Автоматизация и независимые проверки

Агент сам готовит пакет/prompt, вызывает reviewer, получает result, сохраняет evidence, обновляет статус после unfreeze и публикует разрешённые checkpoints. Человек не переносит тексты между режимами.

Действующий CLI умеет запрашивать точную пару model/effort отдельного reviewer запуска. Это не подтверждает переключение модели текущего чата и не доказывает actual backend. В provenance отдельно:
1. approved assignment;
2. invoked model/effort;
3. confirmed backend/effort или NOT_CONFIRMED.

Reviewer работает в технически проверенном read-only packet confinement. Credentials остаются в launcher, вне reviewer. Нет доступа к checkout, другим worktrees, секретам/global settings, записи, сети/apps. Проверяется runtime и canary перед каждым запуском.

Во время review candidate/status/index/HEAD заморожены. Полный raw event stream, exit/report и hashes сохраняются до интерпретации. Неполный stream, timeout, mutation, ambiguous verdict — BLOCKED. Reviewer выдаёт ровно один GATE_STATUS PASS/FAIL. Machine gate не заменяет независимое approval.

Автоматический writer dispatch — отдельная capability, сейчас общей службой не реализована. Новый runner должен либо подтвердить exact worker/runtime/scope, либо показать NOT_IMPLEMENTED/BLOCKED. Нельзя выдавать read-only reviewer service за безопасного production writer.

## 7. Коммиты и push — предлагаемый единый режим

**Коммит и push после каждой завершённой проверенной задачи, а также значимого planning/review/stage/blocker checkpoint.**

Один согласованный checkpoint может включать связанные события одного candidate. Нет push после каждой команды/edit; нет empty commits. Незавершённый diagnostic/RED/RCA checkpoint публикуется только с явным FAIL/BLOCKED/non-ready, не как GREEN.

Один раз при открытии направления фиксируются разрешённые remote/ref. Дальше routine publication автоматическая. Эта ветка разрешена только на origin git@github.com:leonmaks/frade.git, refs/heads/codex/frade-standard-workflow.

До commit: конкретные allowed staging paths, статус/diff, prohibited/secret scan и check evidence. До push: branch/ref/remote authorization и remote divergence. После push: свежий ls-remote должен совпасть с local checkpoint SHA.

Без force, изменения main/чужих refs, reset/clean, потери user edits. Push failure/divergence — publication BLOCKED, работа остаётся локально. Постпубликационный receipt относится к предшествующему source SHA и входит в следующий естественный checkpoint, без бесконечной цепочки commits.

## 8. Одинаковый статус для каждого направления

Всегда восемь главных блоков в одном порядке:
1. **Решение / следующий шаг** — phase/health, следующий разрешённый шаг, human decision или NONE.
2. **Идентичность / scope** — direction/stage/change, branch/worktree, origin/checkpoint, policy.
3. **Roadmap этапов** — цели, зависимости, phase/health, gate state.
4. **Активные задачи / шаги** — IDs/type/order, complete/total, blockers, evidence.
5. **Проверки / gates / качество** — applicability, фактический результат, command/run/source/environment/лимиты.
6. **Модели / исполнение** — approved/invoked/confirmed, overrides, runtime.
7. **Зависимости / решения / blockers** — consumer owner, ожидаемое решение, RCA/fix attempts, возраст blocker.
8. **Git / публикация / evidence** — checkpoint SHA, commit/push state, verified remote SHA, raw history.

Верх документа короткий и актуальный. История отдельно; legacy tail не переписывается. Статус обновляется по событию и на resume; во freeze updates откладываются. Открытие панели queued не выдаётся за visible.

## 9. Метрики, которые контролирует человек

| Метрика | Что означает |
|---|---|
| Requirements accepted / total / uncovered | Приёмка требований с действительным evidence |
| Tasks complete / total / blocked | Административный прогресс, не показатель качества |
| Required checks PASS/FAIL/BLOCKED/NOT_RUN | Реальные gate barriers и причина остановки |
| Scenario traceability и negative/boundary controls | Что доказано тестами, какие ошибки умеют ловить controls |
| Invariant/regression violations | Какая гарантия нарушена и в каком слое |
| Contract budgets: timing/memory/geometry/security | Измерения против заранее утверждённых лимитов |
| Evidence freshness и source/control hashes | Относится ли результат к текущему candidate |
| Open decisions/blocker age/fix attempts | Где нужна коррекция или RCA |
| PRE/Verify/POST + human visuals | Какие approval ещё отсутствуют |
| Commit/push/remote SHA/adoption/merge state | Что сохранено, опубликовано и принято consumer |

Не вводится один «quality score». 100% tasks не закрывают отсутствующий POST или human visual. Непомеренное остаётся NOT_MEASURED. Нельзя одним общим coverage percentage заменить проверку рисков/invariants.

## 10. Независимость и принятие стандарта

Направления работают отдельно, shared-file merges сериализуются. Зависимость существует при реальном потреблении API/artifact/behavior. Consumer отвечает за adoption/integration; supplier не ждёт его gate.

Routing, UI и Repo Core принимают общий стандарт через собственные checkpoints. Их frozen contracts и исторические reviews не перезаписываются. Future unclear model rows превращаются в явные planning blockers, а не auto assignment. Архивы не переоткрываются ради косметического единообразия.

Действующий immutable shared release не редактируется. Новый public release — после собственных checks/Verify/POST и publish verification. Документ без исполнимого runner и CI не является технически enforced controls. Remote CI/branch protection сообщаются отдельно.

## 11. Когда человек действительно нужен

Конкретный goal/scope, существенный contract change, нерешённые UX/brand/visual baselines, новые authorization/destination или blocked environment choices. Агент приносит конкретные artifacts, evidence и варианты решения.

Routine research/read/validation/test/transport/status/разрешённый checkpoint publication агент выполняет сам. Модель worker выбирается автоматически по approved assignment, когда runtime действительно поддерживает нужную capability.

## 12. Порядок внедрения

Текущий change W01: audit + конкретный стандарт → решение по policy → fresh formal PRE → RED/controls/docs/CLI → cumulative checks → Verify → POST → release/archive/closure.

После W01 — отдельно выбранные owner migrations и main integration. Пока они не выполнены, adoption = NOT_STARTED. Новый стандарт не объявляется применённым ко всем направлениям только потому, что этот проект опубликован.
