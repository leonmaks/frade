GATE_STATUS: PASS

Fresh focused planning PRE2 для **P01-LOWER-ORIGIN-POPUP-REFLOW-01**: блокеров плана и обязательных входных данных не обнаружено.

- **B01 предыдущего PRE устранён.** Свежая canary привязана к текущему invocation: Codex CLI 0.159.3, оба exit 0, packet read разрешён; внешние чтения, запись и сеть запрещены. SHA raw `77e3b3f1bea752e01230d9fa9ca172cd71c282563f57e445d31cdc4f1d662109`, plan/policy/orchestrator hashes и порядок публикации proof до freeze согласованы. Предыдущий PRE1 FAIL сохранён.
- **Authority согласована.** Separate acceptance подтверждает точный draft `6bdd2cfe1e48f1fb67122cdb35bceaba8e17bc333c4a01ce352b4bf2dfb58b17`. Proposal/design/spec/tasks адресно заменяют прежние unconditional placement/fit clauses, сохраняя исторические документы.
- **Назначение reviewer подтверждено:** owning popup stage / PRE / **gpt-6-astra / xhigh**. Подмены нет; actual backend/effort остаются **NOT_CONFIRMED**.
- **Граница реализации достаточна для regression-first ремонта.** Проверены полный pinned vendor source, table/CSS, HC inversion, bridge lifecycle и serialized fixture. Измеренные ширины `246.15625 + 277.65625 > 501` объясняют overlap. Разрешённые width/wrapping/position дают реализуемый путь коррекции; доказанной геометрической невозможности для сохранённых случаев не найдено. Итоговые вертикальные bounds, pointer targets и 4px clearance требуют фактического remeasure; невозможный fit означает STOP.
- **Регрессионная стратегия исполнима.** Serialized behavioral RED предшествует sole-bridge implementation; покрываются provenance/stale guards, точное восстановление inline value/priority/style presence и cancellation lease. Deferred vendor fit, повторные observer callbacks, pruning style-map и resize/media открытой цепочки проверяются без fitting-вызовов из bridge.
- **Целостность подтверждена:** 4366/4366 файлов соответствуют manifest; raw-before, production и выбранные tests сохранены. Strict/BDD95/UI26/contrast102 подтверждены сохранёнными logs. Matrix сохраняет **FAIL6/6: 990 observations, 90 geometry findings**; просмотренные финальные PNG согласуются с измерениями.

PASS разрешает только **новый meaningful serialized RED → ограниченную реализацию → обязательные проверки**. Matrix GREEN, fresh full root + controls, verify и automatic focused POST ещё предстоят. P01 остаётся **5/10**; FUI bindings, human visual approval, cumulative verify/POST/archive открыты. **STOP перед P02.**

Файлы не изменялись; тесты не запускались.