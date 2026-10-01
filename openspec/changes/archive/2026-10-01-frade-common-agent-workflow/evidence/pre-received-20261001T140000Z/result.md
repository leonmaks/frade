PRE выявил **один блокер в проверке результата review**. Предложенная общая установка технически выполнима в заявленных границах; дополнительных препятствий по полномочиям или владению feature-worktrees не обнаружено.

**Покрытие входов.** Прочитаны proposal/design/spec/tasks, авторизация, точный фрагмент §20, root AGENTS, общие контракты, текущий dashboard, исходники и 15 тестов v3, probe/provenance и planning evidence.

Проверка сырых байтов до и после анализа:

- 24/24 артефакта: размеры и SHA-256 совпадают; лишних и отсутствующих файлов нет.
- 7/7 записей origin provenance совпадают; хеш фрагмента §20 соответствует audit.
- SHA-256 manifest: `4218c1e0e211521ce83a10721e32d9851cd944d114083300f5ce877d5a8aff65`.
- Сохранённый strict OpenSpec validation сообщает exit 0. Самостоятельно validation, тесты и сборка **NOT_RUN**.

Проверены байты packet. Оригинальные worktrees и полный candidate fingerprint повторно не проверялись: это обязанность внешнего harness.

**B01 — ALGORITHM / INVARIANT: выбранный механизм приёма допускает недействительный результат.**

В [policy.mjs:12](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/common-workflow-pre-20261001T134609Z-prepared/packet/openspec/changes/frade-common-agent-workflow/evidence/transport-v3-origin/policy.mjs:12):

- `\s*` после двоеточия допускает перенос строки. Поэтому текст `GATE_STATUS:\nPASS\n` принимается, хотя обязательной самостоятельной строки verdict нет.
- Наличие любого `turn.completed` считается достаточным. Последовательность `turn.completed` → `turn.started` без завершения последнего turn также проходит эту проверку при exit 0.

Это статические выводы из кода, не результаты запущенных тестов. Существующие тесты этих случаев не покрывают.

[Design:21](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/common-workflow-pre-20261001T134609Z-prepared/packet/openspec/changes/frade-common-agent-workflow/design.md:21) сохраняет остальную transport-логику byte-equivalent, но дополнительную строгую проверку результата не определяет. Это расходится с требованием complete stream и exactly one standalone verdict в design:29. Проблема относится к выбранному механизму повторного использования; отсутствие готовой generic implementation само по себе блокером не является.

**Минимальный ремонт:** уточнить design/tasks: новая оболочка независимо проверяет точную строку verdict и завершённость последовательности событий до выдачи принимаемого receipt. Некорректный результат получает BLOCKED независимо от статуса внутреннего v3 runner. Добавить meaningful RED/GREEN для приведённых случаев и допустимого фактического CLI stream. Исторические templates, raw evidence и все 15 исходных controls сохранить неизменными.

**Неблокирующие рекомендации:**

- При генерализации учесть оставшуюся UI-specific строку `selection` в manifest: метаданные Routing-пакета должны описывать действительный источник. Замена должна быть столь же ограниченной и проверяемой.
- В задаче status/handoff обновить верхнюю текущую проекцию UI dashboard на supplier: сейчас supplier отражён в конце, а верхний «текущий шаг» всё ещё описывает P01. Исторические записи сохранить.

**Сохранённые ограничения.** Новая all-Frade авторизация достаточна; повторное старое UI-only egress approval не требуется. Routing adoption и fingerprints остаются ответственностью Routing owner, его исторические FAIL не блокируют независимого supplier. P01 popup остаётся **NOT_USER_ACCEPTED**; P01/P02/Routing progression не предоставляется. Human visual/spec decisions, numbered checkpoints, freeze и запрет записи в активный Routing сохраняются.

Следующий шаг — ограниченное уточнение плана по B01 и повторный PRE. Затем остаётся установленная последовательность: RED/GREEN, все inherited controls и свежие contextual probes, supplier verify, независимый POST через существующий transport, точная публикация, проверка установки и archive/checkpoint. Requested model/effort — `gpt-6-astra/xhigh`; фактический backend/effort независимо не подтверждён.

GATE_STATUS: FAIL