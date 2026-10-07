# Proposal

## Why

Frade already requires SDD/BDD/TDD and independent reviews, but direction bootstrap, exact role assignments, publication cadence and dashboards differ between owners. The user's 2 October 2026 request prioritizes product quality, then minimal human intervention, and requires one familiar process for every existing and future direction.

## What Changes

- Adopt the user-facing term **direction** (направление), containing stages, tasks and ordered steps; keep legacy R/P identifiers and evidence.
- Define one lifecycle from intake, research and requirements through planning, PRE, RED, implementation, checks, Verify, POST, archive and separately controlled integration.
- Specify one versioned direction manifest, role-resolution contract and fixed status layout. Stage/type assignments resolve to one exact model/effort; explicit task exceptions take priority and are reviewed, never guessed.
- Define a single natural-language entry command, future executable bootstrap/check/status/review/publication commands, safe isolated Git creation and approved upstream/ref.
- Require checkpoint commits and pushes consistently: completed tested task, accepted planning/gate outcome, stage closure and reproducible blocker; publication does not grant product approval.
- Provide a newcomer guide, reusable templates, repository-wide ownership/check-applicability inventory and migration protocol.
- Preserve common packet-confined independent reviews, immutable history, frozen origin, scoped architecture contracts and human visual/spec decisions.
- Introduce automated validators and adversarial tests before deploying stronger controls. Publishing a new common release is gated; existing immutable v1.1 is never edited.
- Existing owners adopt in their own workspaces; this change cannot rewrite or unfreeze Routing/UI and does not merge their uncommitted work.

## Capabilities

### New Capabilities
- `engineering-direction-lifecycle`: auditable isolated ownership, intake/research/requirements, standard sequential stage barriers, adoption and integration.
- `engineering-role-dispatch`: exact approved model/effort resolution, independent review confinement and executor/reviewer provenance.
- `engineering-progress-publication`: uniform status, traceable quality metrics, durable evidence and authorized verified checkpoint publication.

### Modified Capabilities
None. Existing foundation-quality-gates and product specifications remain mandatory and unchanged; these new process contracts add controls rather than replace those guarantees.

## Impact

Target implementation paths: `docs/engineering/**`, a narrow additive root AGENTS section, `scripts/directions/**`, `tests/directions/**`, explicit workflow CI/package-script entries, and this change's artifacts/evidence. Existing shared runner is consumed by verified release/hash; a new release may be proposed only through its own reviewed publication protocol. Product packages, dependency versions/lockfile, Routing controls, UI tokens, vendor assets and unrelated OpenSpec changes are excluded.

The planning package contains reviewable draft standard, onboarding and templates. They are not yet installed or enforced. One active change W01 completes the standard/control implementation; per-owner migrations and future directions are separately authorized checkpoints.

## D05 — proposed bounded automation amendment

Статус: PROPOSED_NOT_APPROVED. Это расширение планирования W01, не deployed service и не approval. POST 2026-10-07 FAIL сохраняется; task 4.2 incomplete. Исторический formal Verify PASS противоречит retained failed inspections и не устанавливает current clean admission. D03/D04, raw receipts, failures и исходные hashes остаются immutable history.

Delivered scope D05: regression-first reception repair и один repository control plane, который автоматически запускается/присоединяется на submit/resume из уже допущенного Windows host broker и проводит intake/bootstrap, draft owner roles/checks/rights, exact-role dispatch, confined execution либо staging/adoption, required checks, fresh independent packet-confined PRE/POST, formal Verify, verified checkpoints и automatic evidence/status ingestion. Пользователь не настраивает отдельные direction sessions/profiles/configs и не запускает workers вручную. On-demand reusable process достаточен; OS service installation не требуется.

Initial target: existing explicit host writable roots, pinned Codex 0.159.3 в WSL Ubuntu-22.04_E, isolated exact OpenSpec 1.14.0 и неизменяемый shared reviewer v1.1. Capabilities вычисляются из verified registration ∩ approved phase/task scope ∩ existing host grant с дополнительными rules/lease/freeze ограничениями. Runtime preflight и actual Windows/WSL confinement canaries обязательны. Неподдерживаемое ограничение даёт concrete BLOCKED, без self-elevation, global config expansion или canary waiver.

Матрица W01 неизменна: planning-architecture gpt-6-astra/high; tooling-tests gpt-6-sol/high; formal-Verify gpt-6-astra/high; independent-PRE и independent-POST gpt-6-astra/xhigh. Approved/requested/invoked pairs должны совпадать; explicit unavailable/unsupported pair, substitution или failed launch блокируют исполнение. Actual backend/effort остаются NOT_CONFIRMED без независимого подтверждения. Отсутствие attestation само по себе не блокирует W01/fixtures; более строгий own approved owner plan может требовать её явно. Universal model defaults/fallback отсутствуют.

Дополнительные controls: protected admission/preflight receipts, one-writer lease/fencing/freeze, isolated runtime namespaces, crash/cancel/recovery, configurable bounded file/stdin transport без сокращения original request/packet, versioned source adapters и typed credential-separated serialized Git broker. Два actual independent disposable direction E2E — новый bootstrap и stale-owner adoption — обязательны; mocks/library-only/manual status JSON их не заменяют. D05 явно предоставляет этим двум fixtures ограниченный test profile с пятью W01 pairs и local bare remotes, без production publication или foreign adoption.

Original D05 acceptance и exact eleven-artifact package сохраняются immutable. Материальная коррекция порядка требует отдельного human decision на точные corrected package/design hashes и historical-test mapping design D05.3; decision хранится отдельно от хешируемого пакета и supersedes только прежнее future adoption timing. Draft labels исходного пакета не отменяют accepted record. После принятия коррекции и fresh clean 1.7 corrected immutable D05 overlay является implementation scope authority, а live D03 operational files/role bindings/rule pins сохраняются через 2.8/2.9 и 2.10. Task 2.9 требует полного D03-installed control GREEN плюс reception regressions. Только 2.11 после meaningful RED атомарно устанавливает все одиннадцать exact corrected artifacts и мигрирует current authority; historical constants остаются неизменными и executable в точно связанном D03 fixture, с отдельными additive current D05 controls. Каждый worker receipt связывает operational source и approved scope отдельно. Supported adapter/worker/migration route должен быть доказан; иначе BLOCKED без pin swap, guard bypass или ранней 2.11. Unchanged pairs, fixture grants, scope, permissions и bounded policy сохраняются.

Порядок: 1.6 amendment/approval → 1.7 fresh PRE → 2.8 reception RED/RCA → 2.9 repair → 2.10 automation RED → 2.11 service/admission/lease/recovery → 2.12 transport → 2.13 ingestion/broker → 3.3 два actual E2E → 3.4 cumulative checks → переоткрытая после D05 4.1 fresh clean Verify → существующая 4.2 fresh cumulative POST. Все 18 исторических task IDs сохраняются; новые IDs decimal. Normative additions — FWE-019–025 и FWE-011-S04–S07.

Scope остаётся W01 control/docs/tests и необходимыми точными package/CI/additive root-rule entries. Product/lockfile/vendor/foreign owners/global settings и shared reviewer v1.1 исключены. Existing commit/push authorization на git@github.com:leonmaks/frade.git refs/heads/codex/frade-standard-workflow сохраняется. Tasks 4.3/4.4 остаются неактивными до всех mandatory current gates и required decisions в рамках existing bounded closure authorization. D05 не разрешает main merge, foreign-owner adoption, OS privilege expansion или следующий numbered change.

Оценки: reception repair 6–12 ч; automation 48–96 ч; planning/PRE 8–20 ч; cumulative checks 4–8 ч; fresh Verify/POST 8–16 ч; всего 74–152 ч без внешнего ожидания, повторных repair cycles и поздних closure tasks. Это estimates, не обещание реализации или PASS.
