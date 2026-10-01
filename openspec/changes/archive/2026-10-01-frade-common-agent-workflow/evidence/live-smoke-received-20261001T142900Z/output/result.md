Ограниченный transport smoke пройден. Все 8 файлов прочитаны; размеры и SHA-256 совпали с манифестом при начальной и заключительной проверках. Синтаксис core/CLI корректен; оба записанных canary прошли валидатор runner, связи release/policy согласованы.

Фактически вычисленные SHA-256, имена сокращены:

```text
REVIEW-PACKET-MANIFEST.json  56746d32145f4eb0f597102080a40f175285a75213830932691a5965c640b58e
AGENTS.md                   b4bdf1fc26f891cfba79855b607a2508373692dea4d164c99fab7e7750633055
agent-workflow.md           167feb7fb3e1026885d65c55889d8850ba2dcd62d772a7459dca6d0b253e6022
core.mjs                    db25bcc1654ae436d4dd526d1b9b98e1383fe8bf7687697682257f3141e99e11
cli.mjs                     60caddbcaad3d8be34752c21f27f8066ddcb6addaf6b1d5941dbba9b2d8001bd
bundle.json                 038e87b798b8a7bfa087e9e641fd1a918fee5a64fadade2e23359efc1bfa1163
user-authorization.json     b2ec4eb2f5dcb52b9e20f8d0c7439a93481865c8622cf8b19d73626e7ab5b7d3
contextual-probes-green.json c945e23ea4db3e783fcff091fd9c8f0eff0b97d79fe72d0d8a3fcad4deba83b0
scoped-checks.json          f3ac7dcd3db49fb8a87d92a20a43248db877cfbe6c48ee87ca7d12db9dbfa5fc
```

Пределы: проверены выбранные свидетельства; canary заново не запускался, оригиналы логов, candidate digest и невыбранные части bundle не проверялись. Итоговый receipt текущего запуска ещё требует внешней проверки. Полная корректность поставщика, POST, продукт и визуальная приёмка этим вердиктом не подтверждаются.

Запрошено `gpt-6-astra/xhigh`; фактические backend/effort — `NOT_CONFIRMED`. Сеть, оригинальные исходники, auth и глобальные настройки не использовались. Файлы не изменены, фаза не продвинута.

GATE_STATUS: PASS