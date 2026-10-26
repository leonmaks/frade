# Светлый редактор диаграмм — статус

Обновлено: 26 октября 2026 (MSK); machine timestamps — в evidence.
Ветка: `codex/frade-light-diagram-editor`
Worktree: `E:/dev/codex/frade-worktrees/light-diagram-editor`
Change: `frade-light-diagram-editor`
Исходный commit: `4244e5668e50f74b9b536c2f0ffc44c56279e945`
Git common: `E:/dev/codex/frade/.git`
Guide: v1.0; общий workflow v1.1 / release `a6829c6d731b73a23dce8ada25f89d4aa2fb37a1a75e568314e956fa647b3da5`.

## Текущая фаза

BLOCKED_SCOPE_DECISION — LDE-REFUSAL-INTENT-01. Предыдущий exact one-line scope остаётся исторически ACCEPTED, но не реализован и доказанно непригоден для cancel. LDE-PRE-RECONCILIATION-01 остаётся ACCEPTED. Три автоматических PRE завершились FAIL; product implementation не начат. Активный change синтаксически valid, но correctness/scope blockers открыты. Реализация НЕ начата; READY_FOR_VERIFY: NO. Флаг OpenSpec isPlanningComplete/isComplete означает наличие planning artifacts, а не готовность продукта или прохождение PRE.

Пользователь подтвердил единый светлый редактор Draw.io/Frade, сохранение авторских цветов и приоритет Windows forced colors. PRE/POST этого этапа: **gpt-6-sol / xhigh**. Внешний workbench сохраняет выбранную тему; локальные панели/меню/диалоги редакторов используют общий светлый контракт. Новые visual baselines ещё не приняты.

## Этапы

| Этап | Статус | Доказательство / следующий результат |
|---|---|---|
| Изоляция ветки и read-only inventory | DONE | 50 источников с raw hashes; tracked production diff пуст |
| Proposal / четыре delta specs / design / tasks | DONE | Все planning artifacts на месте |
| BDD и стратегия / промпты PRE/POST | DONE_PLANNING | 9 определений Gherkin; bindings NOT_IMPLEMENTED |
| Strict validation / связность scenarios | ACTIVE_NOT_COHERENT; DRAFT_PASS | Active delta syntax PASS, но merged reference description FAIL и native scenario конфликтуют; 4 неприменённых drafts + все 4 merged specs strict PASS в fixture |
| Независимый автоматический PRE | FAIL_01 / FAIL_02 / FAIL_03 | PRE03 закрыл прежние три finding, но выявил точный refusal-fixture conflict и недостающие workload inputs |
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

Tracked task progress: 1/13; 1.2 переоткрыта из-за воспроизведённого fixture state-transition конфликта. PRE 1.3 не завершена; production не начат.

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

## Точное решение принято

Пользователь утвердил LDE-PRE-RECONCILIATION-01 и четыре drafts с manifest `19f50fa30b53341932701d07fc22ce204e8da08d82504e03fc3124714144f5a8`. Проверены исходные hashes, применены только четыре planning drafts; acceptance.json сохранён. Два дополнительных origin-control пути теперь входят в разрешённый scope; код этих controls пока НЕ менялся. Исторические PRE 01/02 FAIL сохраняются. Текущий следующий шаг — fresh PRE 03 gpt-6-sol/xhigh с baseline picker и полным согласованным планом; до PASS production запрещён. Во время review status заморожен.

## PRE 03 — фактический результат и новое точное решение

FAIL, candidate/packet unchanged; model requested gpt-6-sol/xhigh, actual backend/effort NOT_CONFIRMED. Dispatch 05:05:32Z после 04:59:52Z (примерно 5 минут 40 секунд, измерено). Result SHA256 `ab78ed12bd98bc9e934d8cfdb1a95c6e5bd494e077c3846e137d4dfce5fe25ff`, raw evidence/pre-03-received-20261026. Прежние три PRE02 findings устранены.

Открыто: один существующий refusal-helper перехватывает prepare только при snapshot.kind dark, тогда как принятая локальная проекция должна посылать light. Текущий scope разрешает visual expectations, но не эту тестовую predicate-правку. Подготовлен [LDE-REFUSAL-FIXTURE-01](../../openspec/changes/frade-light-diagram-editor/decisions/lde-refusal-fixture-01/proposal.md), SHA256 `7e913c69ddd51efbfe016ec82070d8b25fe22ac8e151ee5d42a5437a1c7056aa`, manifest `260587d9d3ee547c56a9d7127305c47dccf4df8a2b6ae61224caebaabc622ce6`. Статус PROPOSED_NOT_ACCEPTED. Одна строка guard dark -> light, остальные bytes/assertions/actions/deadlines сохранены; синтаксис draft PASS и точный reverse восстанавливает pre-LDE source SHA. Design draft не применён, live тест не изменён.

Второй finding — недостающие scripts/ka-fixtures.mjs, scripts/flow-fixtures.mjs и benchmark hardware JSON. Вместо ручного списка выполнен bounded AST import/file preflight: 204 существующих файла / 2,370,747 bytes, все named inputs включены. Три unresolved — создаваемые negative fixtures, две external declarations — недоступные review внешние корни, не копируются. Подробности packet-dependency-preflight.json и packet-preflight-notes.md. Это не PRE PASS и не runtime certification.

Следующее действие: получить точное решение по одной fixture predicate; затем применить только design draft, составить полный packet по closure и выполнить fresh PRE gpt-6-sol/xhigh. Саму fixture-правку и production — только после PRE PASS и meaningful RED. Новый дорогой PRE не запускается на заведомо запрещённой predicate. Глобальные настройки, Main/P02/Routing, source/controls и все 50 baseline hashes сохраняются. READY_FOR_VERIFY: NO.

## LDE-REFUSAL-FIXTURE-01 принято

Пользователь утвердил точную fixture-правку и design draft. Proposal/manifest hashes проверены; применён только design `67de08fd4f868da84041eeab2e291e0d93ede567a9c86be4f5b8fd43f5d1508c`. Live E2E source остаётся `3535fd97bbb5ad514abd7cc896e2dab750042a757afde459cd4be71984e367e9`; guard и production не меняются до PRE PASS/RED. Fresh PRE 04 gpt-6-sol/xhigh использует bounded transitive dependency packet; raw предыдущих FAIL сохранены. Во время dispatch status заморожен.

## PRE04 и точная environment-restoration

FAIL: benchmark source pin ожидал `1bcd2e...`, checkout имел `47badb...`. RCA ENVIRONMENT: baseline Git blob LF = exact existing pin `1bcd2e294f145a7e18629bca4113f3d9f0f510a3e5a00f047e05313070135781`; checkout CRLF, logical source equal. Восстановлен только точный Git blob baseline; Git diff по benchmark EMPTY, pin/assertions/workload/timeouts/budget НЕ менялись. Raw before/canonical/provenance сохранены в evidence/benchmark-checkout-restoration-20261026; старый inventory/FAIL не переписаны. Другие источники не нормализуются.

PRE04 raw result `6b15430cf929305e1c529eed730f080af40d2ade57fcd2a183c61f70a2f0639e`, source/packet unchanged, requested gpt-6-sol/xhigh, actual backend/effort NOT_CONFIRMED. Следующий PRE05 проверит те же контракты с exact canonical benchmark bytes; production и live refusal guard ещё не менялись.

## PRE05 readiness

Exact canonical benchmark bytes восстановлены без Git source diff и без изменения pin. Оригинальные origin/pin tests реально выполнены: 6/6 PASS (Vitest 1.43s). Offline frozen install: 336 cache packages, 0 downloads, 7.1s; lockfile/production unchanged. Исходный raw inventory сохранён: 49 raw sources совпадают, один benchmark восстановлен byte-for-byte из Git baseline с явной provenance и portable base64 before/after. Следующий fresh PRE05 получает эту доказательную цепочку; прежние FAIL сохраняются. Во время review status frozen.

## PRE05 — FAIL и проверенное intent-bound предложение

PRE05 status FAIL; packet/candidate unchanged. Raw result SHA256 `39b5ea73c8894a6e623f475a18ae2bb744d1a49e353e0dbb1eb38f1bd372b98a`. Reviewer подтвердил устранение PRE04 benchmark mismatch, но нашёл ошибку владельца в предложенной one-line fixture: она отказывает cancel, поскольку оба снимка editor Light. Исходный live fixture не менялся. RCA: STATE_TRANSITION / ABSTRACTION_BOUNDARY.

На полном исходном callback детерминированно воспроизведён cancel FAIL старого предложения и проверен новый request-bound draft: 9/9 checks PASS, включая повторный отказ того же intent и успешный cancel с новым requestId, rearm и disarm. Первый probe ERROR (отсутствовал mock performance.now) сохранён отдельно; actual Electron/runtime NOT_RUN. Все изменения draft точно обратимы к pre-LDE3535..., все assertions/actions/deadlines вне двух mapped edits byte-identical.

[Точный LDE-REFUSAL-INTENT-01](../../openspec/changes/frade-light-diagram-editor/decisions/lde-refusal-intent-01/proposal.md), proposal SHA256 `5113e9c9e6ae259729c6dcea7b6fd03d7baa598a176db123c0377a7592162fde`, manifest `b75fb70e391ff79f8aca0ae4ba0991d4783ba0909931bb99ca69adc1608f2405`. PROPOSED_NOT_ACCEPTED; заменяет только ещё не реализованную one-line fixture policy. Ни design draft, ни live TS draft не применены. Нужен человек: AGENTS §6 и принятый точный scope разрешают лишь прежнюю одну строку, а новый initializer/request latch выходит за неё. После принятия — только design, fresh PRE gpt-6-sol/xhigh, meaningful RED/implementation после PASS. До решения не запускаем очередной review заведомо неверного плана. READY_FOR_VERIFY: NO.
