# Светлый редактор диаграмм — статус

Обновлено: 26 октября 2026 (MSK); machine timestamps — в evidence.
Ветка: `codex/frade-light-diagram-editor`
Worktree: `E:/dev/codex/frade-worktrees/light-diagram-editor`
Change: `frade-light-diagram-editor`
Исходный commit: `4244e5668e50f74b9b536c2f0ffc44c56279e945`
Git common: `E:/dev/codex/frade/.git`
Guide: v1.0; общий workflow v1.1 / release `a6829c6d731b73a23dce8ada25f89d4aa2fb37a1a75e568314e956fa647b3da5`.

## Текущая фаза

BLOCKED_SCOPE_DECISION — LDE-PRE-RECONCILIATION-01. Два автоматических PRE завершились FAIL; product implementation не начат. Активный change синтаксически valid, но correctness/scope blockers открыты. Реализация НЕ начата; READY_FOR_VERIFY: NO. Флаг OpenSpec isPlanningComplete/isComplete означает наличие planning artifacts, а не готовность продукта или прохождение PRE.

Пользователь подтвердил единый светлый редактор Draw.io/Frade, сохранение авторских цветов и приоритет Windows forced colors. PRE/POST этого этапа: **gpt-6-sol / xhigh**. Внешний workbench сохраняет выбранную тему; локальные панели/меню/диалоги редакторов используют общий светлый контракт. Новые visual baselines ещё не приняты.

## Этапы

| Этап | Статус | Доказательство / следующий результат |
|---|---|---|
| Изоляция ветки и read-only inventory | DONE | 50 источников с raw hashes; tracked production diff пуст |
| Proposal / четыре delta specs / design / tasks | DONE | Все planning artifacts на месте |
| BDD и стратегия / промпты PRE/POST | DONE_PLANNING | 9 определений Gherkin; bindings NOT_IMPLEMENTED |
| Strict validation / связность scenarios | ACTIVE_NOT_COHERENT; DRAFT_PASS | Active delta syntax PASS, но merged reference description FAIL и native scenario конфликтуют; 4 неприменённых drafts + все 4 merged specs strict PASS в fixture |
| Независимый автоматический PRE | FAIL_01 / FAIL_02 | Чистые immutable receipts; production не менялся. Требуется решение по двум origin-control путям |
| Meaningful RED / shared scope / native adapter | NOT_RUN | Группа 2 tasks.md |
| Draw.io / overlays / authored parity | NOT_RUN | Группа 3 tasks.md |
| Общие проверки / runtime / screenshots | NOT_RUN | verification.md, финальные исходники |
| Новое визуальное принятие | NOT_RUN | Нужна отдельная фактическая галерея обоих движков |
| Verify / независимый POST | NOT_RUN | Только после выполнения требований и проверок |
| Archive / перенос в Main / push | NOT_STARTED | Отдельный проверенный checkpoint |

## Детализация текущего этапа

- [x] Отделить feature от Main/P02/Routing и сохранить исходный commit.
- [x] Найти существующие participants, X6 view projection, Draw.io private bridge, retained roots, overlays и тестовые контроли.
- [x] Создать change установленным OpenSpec CLI.
- [x] Зафиксировать принятую границу и exact PRE/POST model/effort.
- [x] Описать общий Light scope, авторские цвета/подложки и Windows forced colors.
- [x] Записать явные delta к Theme Core, reference geometry и bundled-theme fidelity; исторические main specs не изменять в planning.
- [x] Описать allowed paths, meaningful RED, матрицу и неизменность domain/routing/persistence.
- [x] Сохранить 9 BDD сценариев, strict validation и source/policy hashes.
- [x] Зафиксировать planning checkpoint локальным commit.
- [x] Автоматически получить и сохранить PRE 01/02 FAIL с полным raw evidence.
- [x] Подготовить точное LDE-PRE-RECONCILIATION-01 и проверить drafts/merged specs в fixture.
- [ ] Получить решение по расширению scope двумя историческими origin controls.
- [ ] После нового запроса на выполнение — подготовить immutable packet и автоматически выполнить PRE.

Tracked task progress: 1/13; 1.2 переоткрыта из-за доказанных planning blockers. PRE 1.3 не завершена; implementation tasks не выполнены.

## Проверки и ограничения

- PASS: `openspec validate frade-light-diagram-editor --strict --json`, один change, zero issues.
- PASS: Gherkin 35.1.0 разобрал 9 определений / уникальных LDE IDs. Использован read-only установленный parser из Main; executable bindings и продуктовые тесты не запускались.
- PASS: четыре MODIFIED требования сохраняют все исходные scenario names; отдельный final-scenario-integrity.json доказывает сохранение трёх полных logical bodies и ровно два принятых изменения ожидаемого editor scope. Два новых сценария добавлены.
- PASS: общий runner status AVAILABLE, policy release/hash записаны. Это НЕ PRE PASS, НЕ model/backend attestation и НЕ доказательство working canary.
- Исправлено: первый `git diff --cached --check` отметил Markdown hard-break пробелы и пустую строку EOF; отдельный форматный delta устраняет их без изменения требований.
- NOT_RUN: typecheck/lint/unit/runtime/a11y/screenshots/PRE/POST — planning не меняет исходники и не заявляет эти проверки пройденными.
- NOT_VERIFIED: remote CI/branch protection. Новых настроек защиты веток нет.

Первый managed-worktree checkout: FAIL_ENVIRONMENT из-за длинных путей Windows. Отдельный обычный Git worktree создан с per-command `core.longpaths=true`; глобальные настройки не менялись. App attachment BLOCKED: этот checkout не managed worktree; продолжение использует явный путь. Текущие planning/scope blockers перечислены в PRE 02; исходный код не изменён.

Правая панель: OPEN_REQUEST_QUEUED, видимость NOT_CONFIRMED. Dashboard — текущая проекция, не approval и не замена исторического evidence.

## Следующее действие и публикация

В этом запросе автоматически выполнены PRE 01/02, оба FAIL. Текущий следующий шаг — решение по LDE-PRE-RECONCILIATION-01; после принятия применить ровно drafts и выполнить fresh PRE. До PRE PASS production запрещён. Пользователь не переносит review-промпты/результаты вручную.

Planning checkpoint: LOCAL_COMMITTED `d375eac895688879334702f931c29b61147a2376`; последующее обновление статуса фиксируется отдельным локальным commit. Push: NOT_RUN; новая remote-ветка не авторизована. Main, P02 и Routing не изменены. Архивы Foundation/P01/P01 Main/VS Code Dark 2026 сохраняют свой отдельный статус; их PASS не является PASS этого change.

Материалы: [proposal](../../openspec/changes/frade-light-diagram-editor/proposal.md), [design](../../openspec/changes/frade-light-diagram-editor/design.md), [tasks](../../openspec/changes/frade-light-diagram-editor/tasks.md), [verification](../../openspec/changes/frade-light-diagram-editor/verification.md), [planning evidence](../../openspec/changes/frade-light-diagram-editor/evidence/planning/).

## Возобновление 26 октября 2026

Текущий checkpoint до PRE: `948cf36bf370f6cecd8e0a3ba0198b3a8c842279`. Пользователь разрешил PRE и реализацию после PASS. Обнаруженные 50 исходников совпадают с planning inventory. Стратегия сохранена: общий derived scope, короткий bounded RED/native/frame/portal probe, затем финальные обязательные прогоны; повтор полного historical volume не планируется. PRE запускается автоматически; до получения чистого PASS production не меняется. Во время freeze dashboard не изменяется.

## PRE 01 — фактический результат

FAIL: отсутствовали baseline color/reference/checkout controls и native schema/graph adapter. Receipt подтвердил candidateUnchanged/packetUnchanged и точную requested пару gpt-6-sol/xhigh; actual backend/effort NOT_CONFIRMED. Raw evidence сохранено в evidence/pre-01-received-20261026. Подготовка 94 файлов заняла примерно 86 секунд, весь dispatch 6 минут 14 секунд; это измеренные интервалы, не прогноз следующего review.

При аудите недостающих controls найден raw-byte запрет изменения Guide/Checklist/Themes Spec. План уточнён в пределах существующего docs/ui/diagram-editor-presentation.md: companion и deltas документируют принятую политику, все восемь защищённых файлов/оракул остаются неизменными. Product scope и модель/effort не меняются. Native page/image/gradient отсутствуют в схеме: это существующая UNSUPPORTED capability, не обещание новой функции. Следующий шаг — полный исправленный packet и fresh PRE 02, без production до PASS.

## PRE 02 и точный следующий шаг

PRE 02 gpt-6-sol/xhigh: FAIL, source/packet unchanged. Raw result SHA256 `6db97365a6d9a9284f01ce746a9a5d7152af39e95b8f5d186c633e4afa46c840`; evidence/pre-02-received-20261026. Requested model/effort подтверждены controls, actual backend/effort NOT_CONFIRMED. Полный dispatch — 7 минут 27 секунд (измерено).

Blockers: добавить read-only baseline ThemePicker.tsx/picker.test.tsx в следующий packet; исправить невозможный native page/image scenario; разрешить ровно два origin-control файла, без которых изменение уже разрешённого E2E visual ожидания нарушает обязательную source replay цепочку. Отдельно Temp-probe доказал active merged workbench spec FAIL >500 chars и PASS после удаления только новой дублирующей фразы.

[Точный scope и четыре drafts](../../openspec/changes/frade-light-diagram-editor/decisions/lde-pre-reconciliation-01/proposal.md), proposal SHA256 `daa3d62400f26e78f7cdf736385e39abf327cd7dee614ebcb73fa9f4733029a1`, manifest SHA256 `19f50fa30b53341932701d07fc22ce204e8da08d82504e03fc3124714144f5a8`. Статус PROPOSED_NOT_ACCEPTED. Draft change + четыре merged main specs strict PASS (5/5) в изолированной fixture. Активные design/spec drafts НЕ применены; source/control code НЕ менялся. Новый PRE не запускается до решения, чтобы не повторять дорогое review известного blocker.

Почему требуется человек: AGENTS §2 и текущий design §6 прямо запрещают два дополнительных control пути. Независимая модель не вправе расширить эту границу; автоматические reviews уже выполняются без ручной передачи. После принятия — применить ровно drafts, strict, fresh PRE gpt-6-sol/xhigh и только после PASS meaningful RED/implementation.

## Checkpoint ожидания решения

Локальный checkpoint: `fdbcfdcf596220b74765bbf4e5b53f253e71f550`. Полный diff от baseline ограничен этим change и dashboard; 50 baseline source hashes повторно совпали. Новая remote-ветка не публиковалась. Запрошено точное решение через UI; статусы FAIL не сняты. Правая панель повторно OPEN_REQUEST_QUEUED, видимость NOT_CONFIRMED. READY_FOR_VERIFY: NO.
