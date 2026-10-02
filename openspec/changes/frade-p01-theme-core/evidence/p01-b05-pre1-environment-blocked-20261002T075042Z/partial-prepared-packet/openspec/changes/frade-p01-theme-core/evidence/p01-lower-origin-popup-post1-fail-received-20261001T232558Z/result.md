Найдены четыре блокера focused POST. Сам отдельный checkpoint разрешён принятым планом; причиной отказа являются реализация и применимое покрытие, а не открытые cumulative задачи.

1. **B01 — STATE_TRANSITION: потеря cancellation owner между prepare и apply.**  
   [drawio-theme-bridge.ts:820](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-01T23-09-54-343Z-d1f0eccd-011b-46f8-9c4c-8a60a4e10c52/prepared/packet/apps/desktop/src/main/drawio-theme-bridge.ts:820).  
   Воспроизведение: открыть lower popup → получить `prepare` следующей generation → нажать Enter → выполнить соответствующий `apply`. `currentPresentation()` возвращает false; `forgetPopup()` снимает проекцию и уничтожает сохранённый hide handle. Последующий `forgetPopup(true)` в apply уже ничего не закрывает. Меню остаётся подключённым без keyboard ownership. Проверка извлечённых функций в памяти дала `hides:0`, `popupConnected:true`, `ownershipLost:true`.  
   Минимальный ремонт: сохранить отдельное доказательство владения для отмены при apply/disposal, одновременно запрещая stale activation. Добавить объединённый regression: существующие тесты проверяют эти переходы раздельно.

2. **B02 — STATE_TRANSITION: отсутствует обязательный Escape из lower navigation.**  
   [drawio-theme-bridge.ts:886](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-01T23-09-54-343Z-d1f0eccd-011b-46f8-9c4c-8a60a4e10c52/prepared/packet/apps/desktop/src/main/drawio-theme-bridge.ts:886).  
   Воспроизведение: idle canvas → F6 → Escape без открытого popup. Ветка lower обрабатывает F6, стрелки, Home/End и Enter/Space, но пропускает Escape. Фокус не возвращается на запомненный canvas, как требует принятый keyboard proposal, строка 27. Проверка control flow дала `handled:false`, `focusCalls:0`.  
   Минимальный ремонт: добавить guarded Escape-return с сохранением приоритета popup/dialog/IME/presentation и проверкой подключённого допустимого focus target; закрепить generated-unit и Electron regression.

3. **B03 — INVARIANT: стрелочная навигация может увести фокус за обрезанную область страниц.**  
   [drawio-theme-bridge.ts:678](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-01T23-09-54-343Z-d1f0eccd-011b-46f8-9c4c-8a60a4e10c52/prepared/packet/apps/desktop/src/main/drawio-theme-bridge.ts:678).  
   Детерминированный сценарий: создать исходными действиями достаточно страниц для горизонтального overflow, оставить scroller слева и стрелками перейти к странице за его правой границей. `visible()` проверяет CSS visibility, но не clipping; `moveFocus()` выбирает такой span, а `focus({preventScroll:true})` запрещает раскрыть его прокруткой. Vendor `.geTabScroller` имеет `overflow:hidden; overflow-x:auto`; его scroll-into-view зарегистрирован на click, которого focus-only navigation не вызывает.  
   Минимальный ремонт: обеспечить видимость сфокусированного target локальной DOM-прокруткой lower scroller, сохранив graph viewport и semantic state. Нужен overflow regression с проверкой target и focus-ring bounds.

4. **B04 — TEST: обязательная focused visual coverage неполна.**  
   [ui-contract-theme.spec.ts:2730](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-01T23-09-54-343Z-d1f0eccd-011b-46f8-9c4c-8a60a4e10c52/prepared/packet/apps/desktop/tests/e2e/ui-contract-theme.spec.ts:2730).  
   Все шесть current matrix records измеряют только один page popup с одинаковыми тремя строками: duplicate/remove/rename. Подменю в matrix не открываются. `outlineColor` сохраняется, но oracle проверяет лишь наличие focus-visible, толщину outline и отсутствие mask; actual icon paint проверяется отдельно только для checkmark в dark/comfortable workload. Следовательно, 90 observations / 60 PNG / violations0 не доказывают требуемые submenu bounds и полный lower/popup focus/icon/state contract по принятой media/theme/density matrix.  
   Минимальный ремонт: дополнить существующие тесты реальными Pages/submenu состояниями, hover/focus и effective paint/contrast/bounds oracles, затем сохранить source-bound результаты. Это применимое требование данного POST, независимо от последующей human visual acceptance.

Целостность packet подтверждена: **3465/3465** размеров/SHA совпали. Exact proposal и design hashes соответствуют указанным; PRE2 receipt/result/events согласованы. SaveAs содержит ровно разрешённые три добавления, CRLF сохранён. Current raw `check:all` действительно завершён exit0: Draw215/desktop79, bridge20, targeted11; before/after source lists635 совпадают. Performance evidence содержит 20 warmups/100 requests, p95 **118.19999998807907 ms** на записанном i9-9880H Windows. Эти результаты не покрывают найденные переходы.

Review выполнен без writes/network/Git и запуска write-producing тестов. Новые проверки были чтением, hash-аудитом и изолированной проверкой control flow в памяти; полноценный Electron rerun не заявляется. Назначение **gpt-6-astra/xhigh** подтверждено принятым owning plan; actual backend/effort — **NOT_CONFIRMED**.

P01 остаётся **6/10**; tasks2.4/2.5/3.2/3.3 открыты, full verification INCOMPLETE, FUI005–009 не закрыты, visual baseline NOT_APPROVED. Cumulative closure/archive не предоставлены.

GATE_STATUS: FAIL