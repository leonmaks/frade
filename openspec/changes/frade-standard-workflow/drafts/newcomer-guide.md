# Новый участник Frade: как начать направление или feature

Статус: проект инструкции, соответствует standard-workflow.md. Будущий direction CLI ещё не реализован; приведённые user commands уже понятны агенту, исполнимые CLI команды помечены как планируемые.

## 1. Быстрый старт

Скажите агенту:
> Открой направление «<название>»: <проблема>, <кому нужно>, <ожидаемый результат>. Ограничения: <известные ограничения>. Сохрани совместимость <контракты>. Подготовь план и список решений.

Не нужно заранее придумывать packages, model IDs или полный test plan. Агент исследует существующее, предложит минимальный scope, stages и точные назначения. Существенные нерешённые условия он принесёт вам в конкретном виде.

Если это небольшая feature существующего направления:
> В направлении <ID> добавь <поведение>. Определи owning stage/change и покажи необходимую scope revalidation.

Не изменяйте чужую активную ветку ради быстрого старта. Ветка/worktree должны принадлежать выбранному направлению.

## 2. Что подготовит агент

Intake/research/requirements, isolated branch/worktree, общий policy contract, local rules, roadmap, OpenSpec package, matrix roles/model/effort и единый статус. Укажите/подтвердите remote/ref для публикации один раз. Одна approval не разрешает main merge или другой destination.

Без утверждённых acceptance и exact model pair нельзя начать dependent implementation. Safe research выполняется без ручного переноса prompts.

## 3. Что читать сначала

1. Первый блок status: следующий шаг и human decision.
2. Цель/scope/non-goals и критерии приёмки.
3. Roadmap и активные задачи, их зависимости.
4. Required checks/gates и нерешённые blockers.
5. Модели/provenance и Git publication по необходимости.

Root/scoped AGENTS и принятые product contracts обязательны. Исторический отчёт не означает, что нынешний candidate прошёл gate.

## 4. Ваши решения

Подтвердите существенные требования/ограничения и предложенные точные role assignments. Для UI отдельно смотрите реальные screenshot candidates, если нужно human visual approval. При существенном scope/spec change агент покажет доказательства и варианты.

Не требуется вручную пересылать review prompts/results, менять settings для каждой ветки, повторно разрешать каждый review или обычный push в заранее разрешённую feature-ветку.

Качество контролируйте по required checks, непокрытым requirements, invariants, source-bound evidence и blockers. Task percentage — только прогресс. PASS отдельной задачи не равен ready-to-merge.

## 5. Работа и исправления

План/strict → PRE → BDD/RED → implementation → GREEN/full checks → Verify → POST → archive/STOP. Для дефекта сначала воспроизведение и failing regression, затем RCA/fix. После двух неудачных fixes нужен RCA до новой production-правки. Не просите «просто обновить expected» ради зелёного результата.

Если выполнение остановилось:
> Покажи первый failing invariant/контракт, воспроизведение, RCA и следующий разрешённый шаг.

Продолжение:
> Продолжи направление <ID> с текущего checkpoint. Проверь owner/baseline/policy, статус и gate applicability; не начинай следующий numbered stage.

## 6. Сохранение и merge

Проверенная task или значимый checkpoint коммитится и пушится в разрешённую ветку. Diagnostic FAIL checkpoint публикуется честно как incomplete. Фактический remote SHA должен совпасть с local source SHA. Ни force push, ни main merge автоматически не выполняются.

После закрытого этапа:
> Покажи closure, Verify/POST/evidence, adoption status и предложи следующий checkpoint.

Интеграция:
> Подготовь интеграцию <branch> в <target> с conflict review и проверками merged candidate. Не выполняй merge до разрешения.

## 7. Техническое окружение

Frade — pnpm/Turbo monorepo. Committed baseline этой работы требует Node 24.x, pnpm 12.6.0, Git; browser/Electron checks имеют собственные prerequisites. Используйте versions owning checkout, frozen lockfile и actual runtime evidence. Общий review runtime pinned отдельно от product Node runtime.

```powershell
git status --short --branch
git rev-parse --path-format=absolute --git-common-dir
openspec status --change <change>
openspec validate <change> --strict
```

Запуск product checks определяется applicability plan. pnpm check:all — существующая comprehensive product команда, не доказательство без фактического исполнения. Никогда не обновляйте visual baselines обычной verification-командой.

Планируемый CLI стандарта:
```text
node scripts/directions/cli.mjs plan <request.json>
node scripts/directions/cli.mjs create <approved-request.json>
node scripts/directions/cli.mjs check <direction.json>
node scripts/directions/cli.mjs status <direction.json>
node scripts/directions/cli.mjs review <direction.json> PRE|POST
node scripts/directions/cli.mjs checkpoint <direction.json> <event>
node scripts/directions/cli.mjs publish <receipt>
```
До внедрения эти команды NOT_IMPLEMENTED. Рабочий common review CLI v1.1 обнаруживается через Git-common frade-workflow/current.json; он поддерживает status/probe/run/publish только для своего review/release протокола.

## 8. Карта Frade

- Metamodel: чистые definitions/relations/composition/configuration.
- Repository: domain/ports/application, actual YAML/SQL/Git/API adapters и diagram bridge.
- Runtime: contracts/node/electron и изолированные host processes.
- UI: workspace/navigator/inspector, theme/accessibility/preservation.
- Draw: самостоятельный editor; Routing V2 имеет собственную dependency chain и numerical contracts.
- Engineering: общий workflow/controls и per-owner adoption.

Полный актуальный inventory и mapping находится в adoption-map.md рядом с этим проектом; он не утверждает автоматическое закрытие исторических changes.
