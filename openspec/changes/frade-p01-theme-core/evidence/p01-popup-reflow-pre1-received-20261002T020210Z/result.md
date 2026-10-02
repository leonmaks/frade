GATE_STATUS: FAIL

**B01 — ENVIRONMENT / недостающий обязательный input:** во frozen packet нет свежего confinement/version canary, привязанного к текущему запуску `2026-10-02T01-51-34-546Z-de713e6b-7cac-41db-9719-d2173c4beb40`. Найденные canary относятся к предыдущим invocation. Это не доказывает неисправность sandbox, но не позволяет подтвердить обязательное условие PRE из [policy1.1, строки 11–13](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-02T01-51-34-546Z-de713e6b-7cac-41db-9719-d2173c4beb40/prepared/packet/docs/engineering/agent-workflow.md:11).

Минимальный ремонт входных данных: владельцу transport предоставить обезличенные raw result/exit/version свежего shared canary с привязкой к invocation, применённой политике и выбранной паре; затем повторить focused PRE. Credentials и доступ reviewer к authenticated harness не нужны. Изменений production или расширения scope этот blocker не требует.

По содержанию плана других блокеров не обнаружено:

- Acceptance подтверждает точный draft SHA `6bdd2cfe1e48f1fb67122cdb35bceaba8e17bc333c4a01ce352b4bf2dfb58b17`. Исторический PROPOSED не отменяет отдельное принятие. Proposal/design/spec/tasks согласованы; прежние unconditional placement/fit clauses адресно заменены.
- Семантическое назначение **P01-LOWER-ORIGIN-POPUP-KEYBOARD-01 / PRE / gpt-6-astra / xhigh** подтверждено acceptance и design:247/274. SHA design соответствует `167a57705bd977063a9000327b8ef4950a1fa9ec51faa9e718eb78629be9189b`. Actual backend/effort остаётся **NOT_CONFIRMED**.
- Проверены реальные vendor DOM/table, fitting, CSS, HC ancestor inversion, bridge ownership/lifecycle и serialized fixture. Разрешённая граница остаётся в sole bridge. Сохранённые размеры показывают горизонтальный конфликт, но не доказывают невозможность исправления разрешёнными ширинами/wrapping; фактическое выполнение bounds после remeasure ещё предстоит проверить.
- Последовательность serialized RED → implementation → actual matrix/compatibility → fresh full root → verify → focused POST исполнима. Существующий matrix FAIL6/6 остаётся необходимым RED и **не является причиной этого отказа**.
- Все **4342/4342** файла совпали с manifest по размеру/SHA. Raw-before, draft и выбранные production/tests сохранены. Подтверждены 990 observations/90 geometry findings; просмотрены финальные PNG. Strict/BDD95/UI26/contrast102 подтверждаются сохранёнными logs, заново не запускались.

Неблокирующее уточнение RED: явно воспроизвести отложенный vendor `fit`, повторные observer callbacks без новых writes, pruning table/cell style-map и resize/media при уже открытой цепочке.

Файлы не изменялись; тесты не запускались. Этот результат не разрешает regression-first implementation до успешного свежего PRE. P01 остаётся **5/10**; matrix GREEN, full root, FUI bindings, human visual approval, cumulative verify/POST/archive открыты. **STOP перед P02.**