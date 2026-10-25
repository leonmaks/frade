# Scope accepted / fresh PRE preparing

2026-10-25T17:45:48.697Z: user accepted exact six drafts. Active plan reconciled; old controls not applied. Final token-corrected runtime6/6PASS. Strict and fresh PREgpt-6-sol/xhigh next; dashboard freezes during review.5/10tasks; old4FAIL remain open. No Main/push.

# VS Code Dark 2026 — текущий статус

Обновлено: 2026-10-25T17:44:55.641Z. **BLOCKED: решение по старым селекторам. 5/10 задач закрыто.**

Ветка: codex/vscode-dark-2026. Worktree: E:/dev/codex/frade-worktrees/vscode-dark-2026. Change: frade-vscode-dark-2026. Baseline:90710ac784ee6af2788fe96f7e6d2bbe67e1bf0d. Git-common:E:/dev/codex/frade/.git. Guide1.0.

| Этап | Фактический статус |
|---|---|
|1.1 Аудит/источник/решения|DONE|
|1.2 План/strict/независимый PRE|DONE; PRE3PASS, прежние PRE1/2FAIL сохранены|
|2.1 Meaningful RED|DONE;3 поведенческих FAIL до кода|
|2.2 Полный источник/генератор/negative controls|DONE;4JSONC+MIT;7/7 controls|
|2.3 Registry/Main/bootstrap/preset/preview|DONE; core3/injected4 сохранены, новое приложение4+System; unit и реальный restart/cancel PASS|
|2.4 Визуальная/A11Y матрица|IN_PROGRESS; выбранные экраны/две плотности/media/контраст PASS; общая приёмка не завершена|
|3.1 Общие/исторические проверки|BLOCKED:4 старых runtime FAIL из-за неоднозначного /Dark/|
|3.2 Screenshots/визуальное решение|Новые реальные screenshots готовы; human acceptance NOT_APPROVED|
|3.3 Verify/POST|BLOCKED до закрытия applicable FAIL; POST NOT_RUN|
|3.4 Main/archive/push|NOT_RUN; Main ещё без новой темы; push нового ref/Main NOT_AUTHORIZED|

## Текущий blocker и решение

[Точное предложение](../../openspec/changes/frade-vscode-dark-2026/decisions/vscode-dark-2026-legacy-selectors-01/proposal.md): VSCODE-DARK-2026-LEGACY-SELECTORS-01, SHA5aaf9a614cfe6e2b576bb58c577b640b1fdf841d1e3f00178b7ba655b21d28ec. Шесть drafts, manifestc4b1ae4b4aa3110969802a5822960581171844495b7c106ba997885fdff62637. Четыре option selectors +один alternating selector; assertions/таймауты/допуски/исторические отчёты сохраняются. Новая привязка live/origin не выдаёт старое выполнение за новое. Draft-only positive1/negative3 smoke PASS; это не PRE и не принятие scope. Вопрос отправлен; старые файлы не изменены.

## Проверки

UI unit253/253, desktop unit128/128, UI BDD132/132, UI build и general boundary tests PASS до финального косметического снятия рамки. Последние typecheck/lint desktop PASS. Новый unit7/7, source controls7/7, ui:compliance и boundaries PASS. Последняя полная новая Electron matrix6/6PASS включала actual AA и reference p95110.2ms; после отказа scanner на transparent сделана токенизированная эквивалентная рамка и запущен привязанный повтор шести случаев — результат в token-corrected-runtime-20261025. Не переносить прежний PASS на новый вход без чтения execution.json.

Первые checkout/build и5 исторических unit hash FAIL были ENVIRONMENT: core.autocrlf. Восстановлены только точные исходные Git-blob байты, ожидаемые hash и vendor manifest не менялись. Четыре текущих /Dark/ runtime FAIL — отдельный TEST/INTEGRATION blocker. Все предыдущие FAIL/evidence сохранены. Raw traces со сторонним KA fixture удерживаются вне checkout/packet с hash-locator; в новых screenshots только synthetic9 objects.

## Следующий шаг

Дождаться scope-решения; затем согласовать план, strict и автоматический независимый PRE **gpt-6-sol/xhigh**, применить только после PASS, закрыть прежние сценарии и source-bound controls, verify/POST, конкретная визуальная приёмка, затем перенос в Main. P02 остаётся отдельным заблокированным направлением; его scope/roadmap не возобновлялись.

## Git/панель

Локальный implementation checkpoint готовится с честным BLOCKED. Push не выполняется. Dashboard открыт в правую панель ранее как QUEUED; видимость не подтверждена.
