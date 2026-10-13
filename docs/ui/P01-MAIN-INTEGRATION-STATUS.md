# P01 → основное приложение: статус

Обновлено: 2026-10-13T21:18:05.054Z. Фаза: BLOCKED_SPEC_STRUCTURE_DECISION. Это текущий прогресс, не approval или историческое evidence.

- Ветка: codex/frade-p01-main-integration; worktree: C:/Users/NVISEN/.codex/worktrees/p01-main-integration/frade.
- Change: frade-p01-main-integration; main baseline: 98f387f96b51b0ad139e3507c376ff1c3e8dec09.
- Завершённый источник P01: d876a773282700abf515c9c4fbc14a0b219359af; P02 исключён.
- P02–P07 и широкие UI миграции: PAUSED, сохранены в7991938e77548bb5344681600db6632b45924666.
- Независимые PRE/POST: gpt-6-sol / xhigh, прямое назначение пользователя для этого этапа.

| Этап | Статус | Фактический результат / оставшееся |
| --- | --- | --- |
| Аудит и изоляция | DONE | Main856локальных изменений не затронуты; EOL806нового checkout восстановлены из HEAD |
| План | CREATED | Proposal/design/tasks/пять specs;193точных source/fixture/authority пути,4475555байт |
| Strict validation активного плана | FAIL | Три унаследованных описания длиннее500символов; иных issues в отчёте нет |
| Проект структурной правки | READY_FOR_DECISION | P01-MAIN-SPEC-STRUCTURE-01, все старые условия/scenarios сохранены; isolated strict PASS |
| Автоматический PRE | NOT_RUN | Заблокирован активной strict validation; после принятия правки и revalidation |
| Перенос live кода | NOT_STARTED | Только после PRE PASS; production пока baseline-identical |
| Тесты / реальные экраны | NOT_RUN | Static/root/BDD/UI/Electron/screen evidence |
| Verify / POST | NOT_RUN | После фактических checks |
| Применение в main | NOT_STARTED | Проверенный кандидат и сохранение чужих локальных изменений |
| Archive / публикация | NOT_STARTED | Новый remote ref пока не разрешён |

## Текущие задачи

- DONE: точный исходный набор и dependency audit; добавлена совместимая hardware fixture без правки исходного теста.
- DONE: immutable supplier records, shared policy и user authority; SHA193копий повторно проверены.
- DONE: подготовлен точный структурный draft трёх requirements; активный spec и supplier originals не изменены.
- WAITING_DECISION: [точное предложение](../../openspec/changes/frade-p01-main-integration/decisions/p01-main-spec-structure-01/proposal.md), SHA256 9f74a218c88555cffdf94037970c648d75cb5ed35322fa9ad7dcc913fc22f141.
- NEXT: принять scope → exact reconciliation → strict → automatic PRE → exact adoption → проверки → POST → main delivery.

## Проверки и ограничения

- Active strict FAIL: openspec/changes/frade-p01-main-integration/evidence/planning-validation-20261013T211511505Z/strict.stdout.json.
- Proposed isolated strict PASS: openspec/changes/frade-p01-main-integration/decisions/p01-main-spec-structure-01/fixture-execution.json.
- Hash/requirement preservation checks выполнены; новая production реализация и runtime НЕ проверялись.
- Три исторических P01 дефекта остаются OPEN_ACCEPTED_DEFERRED, исходные FAIL не становятся PASS. Новые/изменившиеся контексты требуют собственного решения.
- Full history91kfiles/10.65GB остаётся в supplier commit; переносится необходимое с точными hashes. Никаких P02 installer/backend изменений.
- Оценка8–16активных часов остаётся прогнозом, не сроком готовности; пауза ожидания решения в неё не включена.
- Commit: planning checkpoint готовится; push NOT_RUN, разрешение нового ref не получено. READY_FOR_VERIFY: NO.
