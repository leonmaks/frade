**Focused PRE2: блокеров correctness, architecture, spec coherence или input completeness не обнаружено.** Принятый amendment закрывает popup-boundary B01 на уровне плана без ослабления требований. Файлы не изменялись.

Назначение подтверждено по принятому owning plan, включая tasks1.2/3.2: [design.md:247](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-01T19-49-24-642Z-9d994cd4-0c38-4244-8264-410757920ff5/prepared/packet/openspec/changes/frade-p01-theme-core/design.md:247), SHA256 `3c9874e95c86b2dc7e66e55d2424546ba78b5e0154d9aa0e1be23174289b3216`:

`| P01-LOWER-ORIGIN-POPUP-KEYBOARD-01 | PRE | gpt-6-astra | xhigh |`

Это назначение конкретного этапа. Actual backend/effort — **NOT_CONFIRMED**.

Целостность подтверждена повторно в конце review: **1448/1448** selected files совпали по размерам/SHA256, лишних файлов нет. Проверены provenance обоих prior PRE, завершённые events и соответствие final messages raw results; также 64 перенесённых runtime artifacts, raw-before, полные pinned vendor JS/CSS и сохранённые диапазоны. Четыре planned source/test paths побайтно совпадают с raw-before. Между PRE1 и PRE2 среди прежних selected files изменились только dashboard и execution-context.

Недостающий в PRE1 полный [lower-keyboard verdict](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-01T19-49-24-642Z-9d994cd4-0c38-4244-8264-410757920ff5/prepared/packet/openspec/changes/frade-p01-theme-core/evidence/p01-lower-keyboard-pre-received-20261001T130510Z/result.md:13) теперь присутствует с точным SHA256 `6736062c8e23b3218a6afd4d42094ca9db265d44816f01fcdb5430b836b4b0de`. Его единственный blocker — ownership popup/submenu вне `.geTabContainer`. Proposal/design/spec/tasks согласованно реализуют принятую границу: eligible connected opener, current participant/generation, captured menu instance и реальные row/submenu relationships. Исторические proposed headers и FAIL сохранены; частичные положительные выводы PRE1 не использованы вместо полноценной проверки.

Реализуемость подтверждается actual vendor lifecycle: lower handlers устанавливают `currentMenu`; строки имеют исходные gesture listeners и связи submenu; доступны original hide lifecycle и vendor fitting. Существующий bridge уже получает UI instance. Поэтому адаптация укладывается в единственный production source без новых prototype monkeypatch, замены nodes/factory/action/hide callbacks, новых файлов или прямых semantic API. Требуются точный выбор зарегистрированного event family и учёт bubbling, чтобы действие выполнялось один раз. Runtime/private-marker styling сохраняет canonical roles, размеры и полный focus/contrast/icon/bounds/media contract без четвёртого исключения. Необходимость адаптации постороннего меню или dialog body остаётся STOP.

SaveAs сохраняет ровно `existsSync` import и два preconditions. Исходный writer выполняет write → sync → close → rename; оба fixture targets новые. Original workload, assertions и tolerances сохранены.

После этого focused PRE обязательны:

- Permanent unit/Electron **RED до production**, включая generated serialized bridge, полный original menu/submenu workload, hidden/disabled/checkable states, exactly-once, Escape/Tab/mouse exit, idle `mxTypingShim` против editing/IME, stale ownership, recreation/disposal и transaction priority.
- Preservation/isolation oracles для XML/model/file/prefs/undo/selection/paint/viewport/identities при presentation/navigation/cancel. Deliberate activation проверяется по ожидаемым original action effects; downstream dialogs сохраняют keyboard capability.
- GREEN, applicable regressions/compliance с controls, свежий полный `check:all`, фактические шесть theme/density состояний, forced/coarse/reduced, 200% text, три viewport и screenshots.

В этом review выполнены чтение, статический анализ и hash audits; runtime/tests — **NOT_RUN**. Strict, BDD95/95 и UI26/26 с controls остаются planning evidence; BDD008/009/010 — runtime-pending. Исторические fullroot PASS/source538, palette FAIL6/6 и focus0/60 сохранены. P01 остаётся **5/10**; human visual acceptance, full verify, cumulative POST и archive открыты. Routing не prerequisite и не разрешён к изменению; STOP перед P02.

GATE_STATUS: PASS