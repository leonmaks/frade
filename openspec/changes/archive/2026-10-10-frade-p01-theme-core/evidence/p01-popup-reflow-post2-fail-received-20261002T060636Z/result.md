Найден один блокер текущего focused POST.

**B05 — INTEGRATION / STATE_TRANSITION: impossible-fit отказ теряется после завершённого apply.**  
В [drawio-theme-bridge.ts:672](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-02T05-53-39-186Z-25b27252-dbc4-4dc1-b89e-54291c2929c7/prepared/packet/apps/desktop/src/main/drawio-theme-bridge.ts:672) `refuse()` отправляет `REFUSED` через `active.request` и сохраняет layout как settled. Однако [frameParticipant.ts:215](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-02T05-53-39-186Z-25b27252-dbc4-4dc1-b89e-54291c2929c7/prepared/packet/packages/ui-workspace/src/design/theme/frameParticipant.ts:215) принимает отказ только для ожидающего запроса.

Воспроизведение: завершить apply/PAINTED → открыть меню в условиях существующей impossible-fit фикстуры → получить `LOWER_MENU_REFLOW_UNAVAILABLE`. Ожидание apply уже удалено, поэтому parent молча отбрасывает сообщение. В bridge отказ также не прерывает успешный путь adoption/focus. Тест проверяет наличие исходящего сообщения, но не его обработку.

Проверка извлечённого текущего parent-handler в памяти подтвердила: после последовательности PAINTED → REFUSED остаются `resolved:1`, `rejected:0`, `invalidated:0`, `waiting:0`. Это не выполняет требование наблюдаемого blocker/STOP при невозможном размещении.

Минимальный ответственный ремонт: явно различать успешный и отказанный результат reflow, прекращать успешную адаптацию при отказе и доставлять диагностику реально обрабатываемому получателю. Нужна регрессия bridge→parent **после завершения транзакции**. Если решение требует изменения parent/DTO, это выходит за разрешённый sole-bridge scope и требует отдельного решения; review его не предоставляет.

Остальные проверенные результаты:

- Ремонты B01–B03 подтверждаются кодом и сохранёнными регрессиями. Расширенная B04-матрица содержит 990 observations без violations; просмотрены representative 850/text200/forced PNG и прежний FAIL.
- Коррекции pointer, deferred resize и forced-generation фикстур обоснованы source diff, trace и исходным vendor lifecycle; оснований считать их ослаблением контракта не обнаружено.
- Совпали размеры/SHA всех **7564** файлов packet и **42** raw-log копий. Fresh canary и invocation binding согласованы. PRE1 FAIL и BLOCKED preparation сохранены.
- Raw `check:all`: exit 0, Draw215/desktop81. Пересчитанный nearest-rank p95: **110,8 ms**.

Review выполнен чтением packet и проверкой обработчика в памяти; write-producing тесты не запускались. Requested assignment — **gpt-6-astra/xhigh**, actual backend/effort — **NOT_CONFIRMED**.

P01 остаётся **INCOMPLETE 6/10**; full FUI closure, human visual approval, cumulative verify/POST и archive не предоставлены. STOP перед P02.

GATE_STATUS: FAIL