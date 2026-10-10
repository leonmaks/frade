# P02-INTEGRATION-SCOPE-01 — proposed exact path amendment

Status: PROPOSED; NOT_ACCEPTED/NOT_IMPLEMENTED. Baseline d876a773282700abf515c9c4fbc14a0b219359af. Governs only frade-p02-transactional-installer. This amendment concretizes existing installer goals after actual P01 closure; it does not implement or waive a gate.

## Requested decision

Accept the following exact additive integration paths and purposes so current proposal/design/tasks/spec can be made coherent before independent PRE. PRE/POST model and reasoning require a separate exact stage assignment; no default is proposed by this path amendment.

### Existing planned paths retained

- packages/extension-contracts/**: new platform-neutral DTO/schema package; no Node/Electron/UI/domain imports.
- packages/extension-service/**: injected native-package validation, journal, recovery, lifecycle and actual-temp-filesystem tests. Node/filesystem adapters stay on service side; no domain or repository journals.
- packages/ui-workspace/src/extensions/** and corresponding tests: shared token-based Extensions UI/client ports.
- apps/desktop/src/main/extension-installer.ts, apps/desktop/src/preload/extension-bridge.ts, apps/desktop/src/renderer/extension-bootstrap.ts: new named host/preload/renderer adapters with sender/session/generation/revision validation.
- packages/runtime-contracts/src/extensions.ts and corresponding tests: named transport DTO/parser API; no privileged objects.

### Exact existing integration files added

- apps/desktop/src/main/index.ts: wire local file-picker/userData/extensions service, recovery before window show and named extension IPC; keep existing domain/routing/security sender rules.
- apps/desktop/src/main/presentation-settings.ts: inject committed enabled-theme registry into boot resolution and coordinate active-theme fallback through existing durable P01 settings protocol. No weakening of revision/generation/reconcile or authorizing another sender.
- apps/desktop/src/preload/index.ts and apps/desktop/src/renderer/main.tsx: expose/use named extension client, attach provider and dispose subscriptions; no exposed fs/Node/Electron/raw IPC or workspace path writes.
- apps/desktop/src/renderer/presentation-bootstrap.ts: load exact committed extension registry before first-paint ready handshake; preserve P01 session/revision/paint readiness.
- packages/runtime-contracts/src/index.ts: export the new portable extension transport.
- packages/ui-workspace/src/Workbench.tsx and src/index.ts: bounded Extensions navigation/sidebar/details slot and injected client prop/export, Ctrl+Shift+X via existing shortcut registry; preserve mounted editor identity, dirty tabs and repository commands. No mass shell/tree/forms/Draw/AI migration.
- packages/ui-workspace/src/design/theme/index.ts, registry.ts and types.ts: explicit revisioned registry prepare/commit/rollback/adoption needed by P02; preserve sole resolver, built-ins, current preview transaction and ownership. No second registry or theme service.
- packages/ui-workspace/src/design/theme/ThemePicker.tsx: show newly committed enabled choices and compatibility diagnostics through existing picker; no selection after install without explicit user action.

### Exact build/check/test/docs integration

- packages/ui-workspace/package.json, packages/runtime-contracts/package.json, apps/desktop/package.json, root package.json and pnpm-lock.yaml: explicit required workspace leaf dependencies/exports/scripts and root BDD wiring for new packages. No app version bump, routing package/dependency edits, new complete UI library or unreviewed ZIP/semver dependency. Select/pin the actual ZIP and semver parsers through the refreshed plan before PRE.
- scripts/check-runtime-boundaries.mjs and scripts/check-workbench-boundaries.mjs; new scripts/check-extension-boundaries.mjs and tests/contract/extension-boundaries.test.mjs: only exact extension-contracts/new UI API leaf/service boundary rules, preserve all existing prohibitions, no broad allowlist. Root boundary script includes the new checker.
- New packages/ui-workspace/tests/ui-contract/p02*.test.ts[x], apps/desktop/tests/unit/extension*.test.ts and p02*.test.ts, apps/desktop/tests/e2e/ui-contract-extension.spec.ts and associated approved per-test screenshot directory: installer/UI tests; all original P01 callbacks/fixtures/assertions/pins and raw screenshots stay unchanged. New negative cases must demonstrate real rejection causes and real byte limits; no skip/tolerance weakening.
- docs/ui/extension-installer.md; docs/ui/bdd/p02-extension-installer.feature; docs/ui/decisions/p02-extension-traceability.json; docs/ui/UI-DESIGN-CONTRACT-STATUS.md; owning P02 proposal/design/tasks/spec/evidence/decisions: explicit mappings/commands/limits and branch-local progress. Canonical spec sync only after verify/POST at archive.

## Invariants preserved

- No production or test implementation before approved coherent plan, strict validation and fresh exact-model independent PRE PASS. This path decision alone is not PRE. No P03–P07 implementation.
- Frade runtime0.1.0/API1.0.0 stays; original ZIP incompatible and byte-identical. Declarative theme-only v1 does not execute JS; browser/commands/icons/custom-editors/runtime contributions are unsupported or lifecycle veto ports until their owning stage, not advertised as working. Full schema contribution/fallback policy is explicit in the refreshed plan.
- Exact50MiB/200MiB/10000entries/ratio100/depth32 limits plus adversarial archive validation, real decompressed-byte counting and safe staging root; hashes are integrity, not trust. File chooser remains Main-only.
- Serialized versioned staging, durable journal old/new snapshots and committed generation, P01 coordinated fallback rollback and crash recovery before window show; old registry/version/presentation survive every failed phase. Windows locked cleanup has an honest pending state. No nontransactional removal side channel.
- Main/renderer recovery must not expose a mixed registry/presentation generation; stale/out-of-order replies and failed participant/persistence ACKs block/rollback, never falsely confirm. Preview is cancelled/coordinated before destructive lifecycle.
- packages/draw/**, routing-v2 controls/specs/baselines, repository/domain APIs and implementation, Main drawio bridges/vendor, semantic diagram data, original P01 tests/traceability/raw evidence, guide/tokens/brand/CI/shared-review policy remain outside repair scope. No supplier waits for Routing gate. Add consumer compatibility assertions.
- Three P01 accepted minor defects stay open and raw historical FAIL unchanged. This proposal grants no new P02 test waiver. Actual applicable root check:all remains required; any fresh applicable FAIL stops its owner. New affected Extensions UI requires full relevant Light/Dark/HC×compact/comfortable keyboard/media/reflow/state evidence and separate human visual acceptance.

## Follow-up after acceptance

Save exact decision/hash, refresh only current P02 planning artifacts with actual baseline/allowed path table/API/journal/test mappings and approved PRE/POST model-role assignment; strict validation → automatic fresh packet-confined PRE → BDD RED → implementation → required checks/verify/POST/visual decision/archive/publication → STOP before P03. Do not alter historical P01 evidence.
