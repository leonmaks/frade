# P01-OPENSPEC-STRUCTURE-01 — предложенная структурная правка

Статус: PROPOSED / NOT_ACCEPTED / NOT_APPLIED. Действующая спецификация не изменена.

Причина: установленный OpenSpec 1.14.1 завершает strict validation с 16 WARNING/FAIL для описаний ADDED requirements длиннее 500 символов. Исторический strict PASS сохранён. Не предлагается отключать strict или менять установленную версию ради PASS.

Изменяемый активный путь после решения: openspec/changes/frade-p01-theme-core/specs/theme-core/spec.md. Полный предлагаемый текст: spec.proposed.md; исходный: spec.before.md; обратимое соответствие: mapping.json.

Предложение: разделить 16 составных описаний на отдельные именованные требования по обязанностям. Все исходные родительские названия и сценарии сохраняются. Дополнительные блоки получают только релевантные существующие сценарии; их текст не переписывается. Все исходные предложения/части перечислений сохранены; для частей без буквального SHALL/MUST добавлена фраза «P01 MUST preserve these constraints: ». Это заявка на сохранение смысла, а не уже полученный PRE PASS.

Новые продуктовые возможности, исключения, тестовые изменения, routing/domain/vendor, сроки ожидания, reviewer model/effort, текущий production и visual acceptance не входят в правку. Копирование старых FAIL и изменение исходных evidence запрещены.

Порядок: конкретный draft и изолированная strict validation → решение по структурной правке утверждённого spec → автоматический независимый PRE по текущему stage plan → точное применение → strict validation и обратимость/контроль сценариев → текущие проверки/verify/POST. P01 остаётся 5/10; P02 не начинается.

Количество requirements: 24 → 47. Это декомпозиция уже существующих обязанностей; согласованность с proposal/design/tasks подлежит PRE.

Исходный SHA256: 6b71b33aa882e418c9a6fed347694bc5acc69eb4f71a599f2f8f4fbff7c402a0
Предлагаемый SHA256: 78b34deb77654aeab708050926876cc66ddb53ca98641be067cc95ebe6c12f80

| Исходное требование | Именованные обязанности после разделения |
| --- | --- |
| Presentation consumer isolation | Исходное название; Authenticated frame acknowledgements |
| Scoped durable presentation settings | Исходное название; Validated first paint |
| Observable transaction lifecycle | Исходное название; Bounded membership and recovery |
| Presentation Settings and contextual keyboard overlays | Исходное название; Managed overlays and frame forwarding |
| Explicit scoped consumer adoption and temporary exceptions | Исходное название; Retained shell geometry; Retained native chrome and portal placement; Exception limits and immutable assertions; Readonly evidence and visual acceptance |
| Accepted third compatibility fixture readiness | Исходное название; PRE and failure gates |
| Accepted SaveAs published-file readiness | Исходное название; Accepted authority and PRE |
| Complete owned lower frame chrome | Исходное название; Target geometry and semantic isolation; Regression-first evidence |
| Bounded lower frame keyboard accessibility | Исходное название; Context guards and teardown |
| Proven lower-origin popup keyboard ownership | Исходное название; Feasible placement and ownership failure |
| Bounded owned lower popup reflow | Исходное название; Text and mutation boundaries; Impossible bounds and restoration |
| Observable owned lower refusal after completed paint | Исходное название; Transaction isolation and diagnostic exclusions |
| Exact three upper toolbar glyph paint ownership | Исходное название; Unknown composition blocks closure |
| Exact accepted upper glyph applicability and FUI control revalidation | Исходное название; Source-bound FUI control refresh |
| Exact upper-three keyboard and proven popup ownership | Исходное название; Bounded successor and lower preservation |
| Accepted native resize fixture readiness preserves all invariants | Исходное название; Exact frozen-callback exception; Two named readiness insertion sites; Immutable tests and prohibited shortcuts |

Подтверждение требуется перед редактированием утверждённого артефакта: openspec-update-change/SKILL.md, шаг 5: “Show each proposed revision and why ... Write only after the user confirms.” Автоматический reviewer оценивает корректность, но не заменяет решение пользователя.
