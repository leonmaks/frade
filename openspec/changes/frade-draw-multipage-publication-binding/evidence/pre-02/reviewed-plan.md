# Design

## Context

Authority: human27October2026 explicitly requests repair of clean Git-snapshot evidence binding, PRE/POST gpt-6-sol/high, then publishing multipage commits to origin/main; retain WIP and do not weaken tests. Baseline515f58871acab477b24bed8199c3224832d3fa14, main at E:/dev/codex/frade, common E:/dev/codex/frade/.git. Historical closure713 includes57 untracked inputs; HEAD closure656. Deterministic unchanged verifier fails CURRENT_CLOSURE_SET on committed names before body checks (prior ignored probe retained). RCA: INTEGRATION / ABSTRACTION_BOUNDARY: a working-copy observation was promoted as publication evidence. No routing implementation defect is being repaired.

## Goals / Non-Goals

Prove actual clean committed-source behavior independently of user WIP; maintain equally strict working-copy verification and immutable historical archive. Product, UI, domain, routing, dependencies, assertions, thresholds, tracing, warmups/samples, geometry and runtime behavior remain unchanged. Routing owner gates do not become dependencies. New proof/control inputs are explicitly reviewed; no WIP source bodies are staged/published. No force push or rewriting history.

## Decisions

### Exact independently executed profiles

Add permanent engineering proof under docs/engineering/evidence/frade-draw-multipage-publication-20261027/profiles/{clean,working}. Each uses the existing manifest schema/change/baseline, full currentInputs and seven execution roles plus desktop build. The logical evidence prefix stays openspec/changes/frade-draw-multipage/evidence/; an explicit profile reader maps only that prefix to the selected new profile. All source reads stay live. Each profile has the unchanged presentation plan copied byte-for-byte. The original1977-file archived change and its713-input proof remain immutable history, never edited/relabelled as clean PASS.

A new tests/ui-contract/drawing-pages-publication.mjs selects exactly one independently pinned manifest by equality of the ENTIRE currentInputFiles(root) set and verifies every input with existing verifyInputBytes. No git-ignore filter, tracked-only enumerator, broad allowlist, union/blended profile, unknown-input fallback, or old-proof-as-current fallback. Inputs include new controls and tests as normal. Pins are appended to the existing separately reviewed excluded bootstrap drawing-pages-adoption-pin.ts, retaining its original manifest pin unchanged. This avoids self-digest recursion without excluding new helpers/tests. Profile hashes and pinned bootstrap are reviewed together. Path reads use existing safeBytes (symlinks/escape rejected); source EOL forms retain exact existing restrictions.

The current binding fixture resolves the published profile and then calls the unchanged verifyDrawingPagesCurrent algorithm. Keep all existing meaningful assertions, case inventories and tamper negatives. Add focused selection tests for clean/working positive, missing/extra/path drift, semantic/mixed-EOL drift, ambiguous profiles, pin/manifest tamper and cross-profile mixing. Actual publication tests verify the whole current proof. Historical manifest pin, original archive hashes and legacy assertion text remain independently checked.

### Historical lockfile origin compatibility

The clean root lockfile lacks the user fast-check importer addition and differs from the archived19-origin adopted form. Preserve all19 rows and original files. Extend only the root lockfile compatibility path in readDrawingPagesOrigin using the fully pinned/closure-validated selected publication profile. The generic origin reader may receive an explicitly verified publication input for exactly pnpm-lock.yaml; it verifies that form and canonical equivalence before exposing the same immutable originalSha256 bytes. Existing legacy forms and primitive tests remain unchanged. Unknown/sibling/deeper files and undeclared drift still fail; no apps/packages-wide exemption. Add independent regressions for exactly clean lock acceptance, tamper, wrong path/form and unchanged immutable origin. General LDE11 historical assertions must pass in both snapshots.

### Snapshot execution and publication

Capture a fresh WIP audit from the previously preserved5 tracked paths/deletion +849 untracked files. Make a detached clean Git worktree under .worktrees; transfer only this change's explicit owned source/control/plan/evidence paths with recorded hashes. Its root package.json/lock and source start from HEAD, excluding all user WIP. Install from the existing pnpm cache with frozen lockfile; probe once, reassess cache/network/environment failure. Never use workspace symlinks pointing at main product sources. Source closure before/after every role must be identical. Reuse existing producer logic through separately owned scripts with explicit physical/logical mapping and captured tool hashes; original producer files remain unchanged.

Fresh desktop build and all7 roles in EACH profile, keeping every historical named case (new tests may add cases), all50 presentation cases, original150ms limit,20 warmups/100 samples/tracing/opacity/revision/durable assertions. Capture raw outputs/reports/exits/observed inputs/bundle hashes; publish manifest only after successful complete roles. Run focused selection/origin tests, pnpm check on exact clean and working snapshots, strict OpenSpec validation and implementation verification. Missing/failing checks stop closure. Runtime binary outputs are evidence; no copied WIP bodies. Final clean candidate must be the exact published source canonical closure, not merely a prior worktree commit. Verify original archived Git OIDs and raw bytes, user paths/hashes and empty staging before/after commits/push. Normal push HEAD:refs/heads/main only after POST PASS; fetch/check ancestry and verify actual remote SHA.

## Strategy and cost

Existing approach (reuse dirty713 proof for clean656) is invalid: observed deterministic mismatch. Publishing WIP violates authority. Filtering untracked files or editing archived expectations would weaken proof and is rejected. Isolated clean-only execution is cheaper (~10-15min runtime plus gate) but leaves the preserved main working copy unable to pass strict current checks; explicit two profiles selected. Safe reuse is limited to unchanged historical evidence/origin bytes, assertion inventories and producer algorithm, not current execution PASS. Algorithmic product changes are unnecessary. Incremental focused guards precede full runs; build once per exact source profile, reuse that build only within its matching roles, serialize benchmark work to avoid self-induced CPU contention. No parallel review writers.

Forecast:20-30min for two complete runtime batches,15-25min for two gates/reviews, plus installation/implementation uncertainty; these are forecasts, not timeouts or measured success probabilities. Historical runtime batch9-12min and root2-3min, reviews5-7min. Packet uses relevant sources/contracts/tests, manifests/records and prior PRE/POST provenance, avoiding duplicate screenshot bodies where unchanged geometry is outside repair scope. Review token cost scales with selected text; no fabricated estimate. Bounded initial probes: fresh policy availability, deterministic old closure failure (already measured), then post-PRE selection RED and one clean install. Reassess at PRE, first install/targeted result and first exact-source performance execution. Preserve failed/interrupted evidence. Two deterministic unsuccessful fixes trigger fresh RCA; no favourable benchmark rerun loop.

## Reviews and authority

Publication-binding stage: PRE: gpt-6-sol / high; POST: gpt-6-sol / high. Explicit human assignment from latest request, not a universal default. Automatic independent packet-confined read-only shared runner, policyv1.1 releasea6829c6d731b73a23dce8ada25f89d4aa2fb37a1a75e568314e956fa647b3da5, SHA2566c6cf78fccfc4dac9e53c859715850db127f897e7eb79aa94957134bd1c1ffeb. Record plan raw hash/excerpt. Actual backend/effort NOT_CONFIRMED. PRE after strict plan validation before control implementation. POST after exact required tests/OpenSpec verify, frozen candidate, complete raw events/result/receipt/control/packet integrity, exactly one GATE_STATUS. Historical PRE/POST preserved, not substituted. Dashboard updated outside freeze; review unavailable/mutated/truncated/ambiguous is BLOCKED, not PASS.

## Risks / Trade-offs

- Two profiles can conceal scope mixing → complete path equality plus per-input forms, separate manifests/pins/executions and cross-mix negatives; no merging entries.
- Bootstrap circular proof → only existing explicit bootstrap exclusion retained, exact pin/control diff reviewed independently.
- Clean dependencies may be uncached → one bounded frozen-install probe then reassess, no lockfile edits.
- Current workload may fail150ms → preserve failure and investigate, do not weaken/retry opportunistically.
- Working-profile metadata references WIP → publish only hashes/execution facts as prior proof already did; never stage user source/dependency/process edits.
- Extra control edits after execution invalidate closure → redo affected exact profile executions; documentation outside enumerated closure may update without relabelling source PASS.

## Migration Plan

Validated plan/PRE → meaningful RED → narrow adapter/GREEN → clean isolation and exact transfer audit → both fresh runtime proofs → both general gates/verification → POST → tracked local checkpoint → user-authorized normal push/remote-SHA and preservation checks. This follow-up may remain an explicit completed active tooling change; original feature archive is already final and stays immutable. No later numbered feature started. No UI change: prior visual acceptance retained; no new visual PASS claimed.
