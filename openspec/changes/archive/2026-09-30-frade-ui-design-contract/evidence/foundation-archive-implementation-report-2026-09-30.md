# Foundation implementation — final candidate before independent POST

CHANGE: frade-ui-design-contract / approved FOUNDATION-ARCHIVE-01 repair.
IMPLEMENTED: canonical durable runtime BDD, both readers, actual archive/removal/canonical-negative regression tests, stable owner instructions, preserved old bindings and three new lifecycle bindings. Guide 1.0 / tokens 1.0.0 / CSS adoption revision 1 remain unchanged. Task 3.8 focused PRE PASS, 3.9 implementation and 4.3 fresh checks complete; total 19/21.

FILES CHANGED (this repair's closed implementation scope):

- docs/ui/bdd/ui-contracts.feature — new canonical copy with original 48 cases plus FUI-029/030/031.
- scripts/ui/traceability.mjs — sole canonical path; no active/archive search or fallback.
- scripts/ui/controls.mjs — canonical copy; explicit fixture resource base with trusted script execution; bigint root identity/containment and combined failure preservation.
- tests/ui-contract/archive.test.mjs — five real lifecycle/leakage/failure regressions in owned temporary fixtures.
- docs/ui/decisions/ui-contract-traceability.json — previous 48 entries unchanged; three real new bindings/source hash.
- openspec/changes/frade-ui-design-contract/bdd/ui-contracts.feature — coherent adapted SDD copy.
- docs/ui/decisions/branch-protection.md — byte-identical durable owner instructions; no policy change.
- docs/ui/adoption.md — durable links/provenance and actual adoption state.

Authored design, traceability-plan, tasks and execution-context record the implemented status; new dated evidence records PRE acceptance, RED, GREEN, provenance, full/standalone logs, verification and final candidate. No old evidence was overwritten. All existing input/feature/domain/routing/vendor/brand sources, CI/package/lockfile/generator/old tests, eight raw artifacts and exact root attributes remain frozen against the focused PRE candidate.

TESTS ADDED: five node lifecycle tests, first three bound to three added BDD IDs. RED exit1/0 passes retained before production edits; GREEN5/5. Archive/removal positives execute actual CLI and controls; negative canonical missing/malformed fails with historical copies still present; poison fixture scripts prove trusted tooling; explicit fixture-base negative catches production leakage; injected execution and cleanup failures remain failures/combined AggregateError. Verified OS-temp roots only, safe containment and inode/dev checks, production/history hashes unchanged.

COMMANDS EXECUTED: node --test tests/ui-contract/archive.test.mjs (RED then GREEN); pnpm install --frozen-lockfile; git diff --exit-code -- pnpm-lock.yaml; targeted eslint/Prettier; openspec status/instructions apply and strict validate; pnpm check:all with owned existing FRADE_DRAW_E2E_PORT; exact standalone desktop Playwright cascade command; final strict validation, git status/diff/diff --check and empty cached diff; actual raw hash/size/case/binding/source verification.

TEST RESULTS: all required post-repair local commands exit0. UI node26/26; named contrast102; legacy124 exact occurrences; trace28 foundation/23 future; ordinary controls [0,0,1,1,1,0,1]; EOL negative1 / positive0+102 / all eight raw LF hashes unchanged; Draw215; desktop41 including20 cascade; separate cascade20/20. Full lint/typecheck/unit/BDD/boundaries/build/retained regression checks pass with valid Turbo caches where stated in logs. Negative fixture FAIL is expected asserted behavior, not a production failure. Actual combined desktop suite contains 21 Electron cases plus 20 isolated Chromium CSS cases.

Applicable current rules: FDS-003/008/009/010 semantic token/data adoption and FDS-015–018 theme/extension governance; A11Y-001/002 named contrast and A11Y-008 forced-colors data/cascade. Full feature FDS/A11Y migration applicability remains mapped in evidence/audit.md, docs/ui/components.md and migration.md. Token/cascade PASS does not certify whole-app accessibility or implemented theme selection.

Screenshots: seven historical real Electron audit images under evidence/baseline remain unchanged. Infrastructure repair changes no feature screen or new visual baseline, so no new affected-screen screenshot is claimed. Migrated theme/density/focus/zoom/screen-reader evidence is NOT_RUN and belongs to P01/migration.

KNOWN BLOCKERS: no unresolved local implementation defect found; independent POST4.4 and real archive/post-archive verification4.5 remain unfinished mandatory checkpoints. Remote Actions LOCAL_ONLY/unobserved; Linux NOT_RUN; branch protection NOT_CONFIGURED by task/server unverified. Runtime resolver, density/settings, P02–P07 and all visual migration stages are not implemented. AI provider and executable VS Code compatibility are not promised; .frade-extension remains a fixture. Routing has no UI predecessor and no edits here.

READY_FOR_VERIFY: YES
READY_FOR_INDEPENDENT_POST: YES
READY_FOR_ARCHIVE: NO until actual independent POST approval.
