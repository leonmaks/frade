# G0 discovery — 2026-09-24

Repository: `E:/dev/codex/frade`, branch `master`. Existing workspace files are untracked; no commits, staging, resets or user-data operations performed.

Installed: Node 24.18.0, pnpm 12.6.0, OpenSpec 1.13.2. Local `spec-driven` workflow reports planning complete and 0/19 implementation tasks. This is artifact presence, not implementation acceptance.

## Actual architecture and reuse

- `metamodel-domain`: public JSON/reference types, schema decoder, inheritance analysis, attribute/default validation, endpoint/duplicate/cardinality validation of a complete prospective snapshot. Reuse these APIs; no corporate schema is built into them.
- `metamodel-compiler`: source imports/extensions, immutable compiled model, exact model binding, fingerprint and migration preview. Reuse binding and compilation; source/hash functions are injected.
- `draw`: standalone React/AntV X6 editor with document JSON round trip and browser regression suites. No repository dependency. Preserve geometry/style ownership and visual baselines.
- `runtime-contracts`, `runtime-node`, `runtime-electron`, `apps/desktop`: validated health protocol, Electron process isolation and lifecycle. Repository operations are not yet exposed.
- No repository domain/application/storage/index/versioning/bridge packages, SQL migrations, PostgreSQL test DB, repository HTTP service or Designer package were found.
- Strict TypeScript ES2022, ESLint, Vitest 3.2.7, fast-check 4.10.2, Cucumber parser 35.1.0; browser/Electron testing uses Playwright. Turbo provides dependency-aware builds. Public consumer tests avoid host ambient types.
- `openspec/config.yaml` selects spec-driven with no extra archive rules. Existing change plans a smaller memory-adapter-only stage. User's 2026-09-24 master prompt explicitly expands the requested implementation and authorizes archive only after all applicable gates.

## Compatibility risks

Metamodel snapshot validation rejects extra entity fields: repository DTOs require explicit projection. Defaults must be materialized only for changed entities. Existing model has no computed attribute evaluator or automatic migration executor; do not invent either. A snapshot guard must include relation/model changes, not only target revision. Native filesystem rename cannot prevent an uncooperative external process from racing between revision check and replacement; capabilities must state this limitation. Closed external schema and credentials are unavailable. Existing Graph/Draw and runtime public APIs must remain compatible.

## Checks

Read workspace manifests, configs, public metamodel/runtime APIs, boundary policies, existing planning artifacts and OpenSpec apply instructions. Baseline `pnpm check` was invoked; its completion is not asserted here until its result is captured. No AGENTS.md was found by the repository search or ancestor checks performed in this session.
