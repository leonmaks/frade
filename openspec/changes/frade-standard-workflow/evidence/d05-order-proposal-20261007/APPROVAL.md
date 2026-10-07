# D05-T01 — техническая поправка порядка перехода D03 → D05

Статус: PROPOSED_NOT_APPROVED. D05 уже принят и остаётся неизменной историей. Эта поправка нужна из-за воспроизведённого конфликта: установка D05 сразу после PRE ломает историческую V-02 и операционные проверки D03 до задачи2.9, а переход полномочий стоит позднее, в2.11. Код реализации и текущие11файлов не менялись.

Предлагается утвердить только следующую техническую поправку:

1. После нового чистого PRE утверждённый неизменяемый пакет D05-T01 задаёт scope и порядок работ; текущие операционные файлы и привязки D03 сохраняются до окончания2.10. В каждом receipt отдельно фиксируются оба источника полномочий.
2. Задача2.9 обязана пройти весь актуальный набор D03, включая исходные V-01/V-02, и новые reception-regressions. Исключение старых failures или N/A для получения GREEN запрещено.
3. Внутри2.11 после RED admission закрывается; все11плановых файлов и их текущие consumers переключаются согласованно. До полного подтверждения нового состояния execution не открывается; crash/mixed state остаётся BLOCKED. Исторические D03 hashes/receipts сохраняются.
4. Исторические V-01/V-02 выполняются с исходными байтами в точно отображённом контексте D03 из8файлов. При этом полный текущий D05 suite с новыми проверками scope/role/approval/drift также обязателен. Старые assertions не ослабляются и не заменяют новые.

Пять моделей/effort, нумерация и порядок задач,28tasks,25requirements,83scenarios, ограничения/права/публикация и STOP между нумерованными этапами сохранены. Автоматическое назначение исполнителей, моделей, прав и проверок без ручных Codex-сеансов остаётся обязательным; эта поправка не сокращает D05.

Фактически выполнено: exact planning role gpt-6-astra/high с complete stream/exit0/unchanged inputs; новая isolated OpenSpec1.14.0 strict selected/all PASS для именно этого corrected package; исторический replay2/2PASS, zero skip, исходные test/module bytes сохранены. Historical replay не является проверкой registered current-owner READY; она обязательна отдельно. Fresh independent PRE для поправки ещё NOT_RUN.

Текущий PRE2026-10-07 остаётся FAIL: его усечения и отсутствие strict-all в тогдашнем packet не исправляются задним числом. Полные исходные данные сохранены в ../d05-pre-20261007/.

Package SHA256: 945d306d4404565f0533cbda901d57cbe1df13b45c7885e9b455f00b58df6466

Design SHA256: 305f277c7ab835c583e627707780789696e6cdd6a9a3745d66c59f471e8836e6

Точный текст всех11targets находится в artifacts/; изменения — ORDER-EDITS.json; план — ORDER-AMENDMENT.md; checks и хеши — draft-audit.json; точное отображение тестового контекста и его ограничения — historical-replay-mapping.json. Отдельный accepted decision будет создан только по ответу человека, вне хешируемого им пакета.

Фактический runtime preflight: existing host adapter запустил gpt-6-sol/high; одна команда внутри confined staging завершилась exit0. Разрешены собственные staging read/write, оригинал/common/чужой checkout/auth/settings и произвольная сеть недоступны. Полный stream, exact pair, неизменность inputs и границы operational source/proposed scope сохранены в dual-binding-route-preflight.json и tooling-preflight-*.json. Actual backend/effort остаются NOT_CONFIRMED. Это preflight, не реализация, PRE или готовность сервиса.
