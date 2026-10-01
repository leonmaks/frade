В пределах transport smoke блокеров не выявлено. Все 12 файлов прочитаны; размеры и SHA-256 совпадают с манифестом при двух проверках. Пакет не изменился. Проверки функций runner в памяти прошли.

Фактически вычисленные SHA-256:
```text
REVIEW-PACKET-MANIFEST.json     0ee699fdcf09e6bac69f29c8c61cff2766bdde7aec1f0de83e9409fb8012690b
AGENTS.md                      b4bdf1fc26f891cfba79855b607a2508373692dea4d164c99fab7e7750633055
agent-workflow.md              167feb7fb3e1026885d65c55889d8850ba2dcd62d772a7459dca6d0b253e6022
core.mjs                       3e4f56161445b6ebaba56d5a300ddf3e5e7647af54335e38960829343bf8d8c6
cli.mjs                        60caddbcaad3d8be34752c21f27f8066ddcb6addaf6b1d5941dbba9b2d8001bd
bundle.json                    ae9c03c3e5dc40ee2f12af645f331bded640a2ddf3e7f9d90879767f7e595705
user-authorization.json        b2ec4eb2f5dcb52b9e20f8d0c7439a93481865c8622cf8b19d73626e7ab5b7d3
contextual-probes-green.json   c945e23ea4db3e783fcff091fd9c8f0eff0b97d79fe72d0d8a3fcad4deba83b0
scoped-checks.json             f3ac7dcd3db49fb8a87d92a20a43248db877cfbe6c48ee87ca7d12db9dbfa5fc
publish.mjs                    9752ef33806b0fde958cd3a7f262435273026b177511eb27d8662c6a549501fa
workflow.test.mjs              8effa9c4dd9f11c17e8e1a1e6576de07b9ae5118e4926abc1431acf701dc8f4a
publication-regression-red.json 385aa273c4c3a8dce2d1b7569c4d9708be2df2303b2f986b0eec8b2ebedbd6ff
final-scoped-executions.json   0323325ef5174faa78e4ac980fbde3ef9b3ba6deacbb3aca9860ca5ebf43a9aa
```

Пределы: два успешных canary относятся к сохранённому release `038e87b7…`; результат 8/8 взят из записи исполнения. Canary и полный набор тестов повторно не запускались. Полный release, исходный candidate и итоговый внешний receipt не удостоверялись. Совокупная корректность поставщика, продукт, Routing, POST и визуальная приёмка вне проверки.

Запрошено `gpt-6-astra/xhigh`; фактические backend/effort — `NOT_CONFIRMED`. Записей, сетевых обращений, доступа к исходному checkout/auth/settings и перехода фаз не было.

GATE_STATUS: PASS