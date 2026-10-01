PRE ограничен двумя принятыми дельтами. Ветка `codex/frade-ui-design-contract`, baseline `98f387f96b51b0ad139e3507c376ff1c3e8dec09` и оба SHA принятия согласованы. Проверены proposal/design/tasks/spec, AGENTS, UI guide/themes spec, BDD и traceability. Все 1328 файлов соответствуют манифесту; 64 перенесённых артефакта соответствуют provenance. Однако необходимый vendor-контекст неполон.

**Блокер — INPUT_COMPLETENESS / ARCHITECTURE / TEST.**  
В `openspec/changes/frade-p01-theme-core/evidence/p01-lower-vendor-excerpts-20261001T110109Z.json` отсутствуют полные реализации `createTab`, `createTabForPage`, завершение `updateTabContainer` и связанная логика обновления компоновки. Доступный `createControlTab` показывает div с click-handler; диагностические строки не содержат `tabIndex` или подтверждения keyboard-пути.

Между тем `openspec/changes/frade-p01-theme-core/design.md:195` требует доступного различимого focus и сохранения viewport при запрете изменений DOM-семантики. Без указанных фрагментов нельзя установить выполнимость этого контракта исключительно разрешёнными средствами. Нужны точные дополнительные выдержки pinned JS с provenance и данные фактических focus/keyboard-свойств нижних контролов. Это недостаток входов для PRE, не утверждение о необходимости vendor-правки.

**SaveAs: блокеров не обнаружено.** В двух новых путях `existsSync` служит корректным предусловием чтения: `atomicJson` выполняет write → sync → close → rename. Исходные JSON-проверки, roots/order/identity, относительные пути, reopen, SaveAll и dirty Remove/Cancel сохраняются. ENOENT и успешный неизменённый повтор представлены отдельно.

Неблокирующие рекомендации для запланированного RED:

- В `apps/desktop/tests/e2e/ui-contract-theme.spec.ts` расширить также классификацию `control` и выборку text-zoom: добавления div в основной selector недостаточно.
- Проверять наличие обязательных потребителей, clipping/occlusion и реальный keyboard-focus; для иконок `background-image` одного computed `color` недостаточно.
- При изменении геометрии отдельно доказать rollback/disposal и сохранение scale/translate, XML, authored paint, undo, selection, identities и preferences.

Сохранённый полный прогон подтверждает Draw215/desktop71, exit0. Диагностический FAIL6/6 — предмет принятого ремонта, самостоятельным провалом планирования его не считаю. После устранения блокера нужны повторный PRE, постоянный unit/Electron RED до ремонта, затем целевые проверки и свежий полный regression.

Рецензент сборки и тесты не запускал: **NOT_RUN**. Три прежних исключения и consumer-owned readonly inspection сохраняются; routing не становится предпосылкой. Tasks остаются 5/10, visual approval — NOT_APPROVED; full verification, cumulative POST и archive — NOT_RUN. Переход к P02 не разрешён.

GATE_STATUS: FAIL