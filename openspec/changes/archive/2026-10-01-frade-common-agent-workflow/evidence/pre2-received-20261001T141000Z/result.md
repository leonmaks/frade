Повторный PRE: **блокеров в исправленном плане не обнаружено**. B01 устранён на уровне design/tasks; реализация и её проверки ещё предстоят. Ограниченная установка общего workflow технически выполнима в разрешённом scope.

**Покрытие входов и целостность.** Прочитаны proposal/design/spec/tasks, user authority, точный фрагмент §20, root AGENTS, общие контракты, dashboard, B01 repair, исходники и 15 тестов v3, probe/provenance, planning evidence и полученный первый FAIL.

- 28/28 артефактов совпадают по размеру и SHA-256 до и после анализа. Лишних, отсутствующих файлов и symlink-путей не выявлено.
- 7/7 origin-записей подтверждены; исходные модули и probe совпадают также с первым review record.
- Первый raw FAIL и record совпадают с receipt; фрагмент §20 соответствует audit.
- SHA-256 manifest: `10336d64cd52c77ac5ffd503ad71ed4028fca704f5053ff5c3c513834b8954a3`.

Оригинальные worktrees, полный candidate fingerprint и внешние журналы первого запуска повторно не проверялись: они вне разрешённого packet. Это ограничение проверки provenance, а не подтверждение их текущего состояния.

**B01 — ALGORITHM / INVARIANT: ремонт плана достаточен.** [Design:29](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/common-workflow-pre2-20261001T135940Z-prepared/packet/openspec/changes/frade-common-agent-workflow/design.md:29) требует независимый внешний receipt: exit 0, корректную завершённую последовательность событий, единственную точную строку verdict и все integrity proofs. Оба обнаруженных дефекта явно отвергаются; предусмотрен допустимый stream без `turn.started`. Исторический parser больше не является достаточным основанием для progression. RED/GREEN закреплены в tasks; raw templates сохранены.

Генерализация manifest authority/selection и текущая supplier-проекция dashboard учтены. Новая all-Frade авторизация достаточна; повторное UI-only разрешение не требуется.

**Обязательные следующие проверки:**

1. Повторить strict validation исправленного плана перед реализацией: приложенный exit 0 датирован до B01 repair.
2. Выполнить meaningful RED/GREEN внешнего receipt, worktree/common-dir binding и точных template replacements; сохранить все 15 inherited controls.
3. На pinned CLI 0.159.3 подтвердить действие `project_doc_max_bytes=0`, `project_doc_fallback_filenames=[]`, `--ignore-rules` и свежую contextual confinement из UI/Routing. Старый probe новых guards не доказывает; несоответствие означает BLOCKED.
4. После scoped checks и supplier verify получить независимый POST через существующий transport. Затем — точная публикация, проверка release hashes, сохранение прежних байтов passive-primary AGENTS, installation checks и archive/checkpoint.

**Сохранённые gates.** Активный Routing checkout остаётся неприкосновенным; adoption, cumulative history и frozen fingerprints принадлежат Routing owner. Supplier не ждёт его продуктовых gates. P01 popup остаётся **NOT_USER_ACCEPTED**; P01/P02/Routing progression и visual acceptance не предоставляются. Branch status обновляется владельцем вне freeze; stale chats требуют явного handoff.

Выполнены только чтение и вычисление хешей. Reviewer tests/build/CLI probes/validation — **NOT_RUN**. Requested model/effort: `gpt-6-astra/xhigh`; фактический backend/effort независимо не подтверждён.

GATE_STATUS: PASS