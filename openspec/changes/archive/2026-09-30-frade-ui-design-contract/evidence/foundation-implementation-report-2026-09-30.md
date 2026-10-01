# Foundation implementation report — 30 September 2026

CHANGE: frade-ui-design-contract; schema spec-driven; 14/17 formal tasks complete. This is an executor report, not an independent POST gate.
IMPLEMENTED: canonical UI guide/checklist/themes specification, additive AGENTS §19, native component/migration contracts, static semantic tokens and Node generation/contrast/drift/literal/traceability controls, exact legacy exceptions, additive pnpm/CI definitions.
FILES CHANGED: [complete implementation path list](foundation-changed-paths-2026-09-30.txt), [status and commands](foundation-final-status-2026-09-30.json). Four tracked product/control files changed: root AGENTS.md, package.json, packages/ui-workspace/package.json, .github/workflows/ci.yml. Remaining foundation artifacts are new paths or active change tracking.
TESTS ADDED: 15 node:test contracts and 20 standalone browser cases. No regression test weakened, skipped or removed; no snapshots regenerated.
COMMANDS EXECUTED: listed below with real results and log hashes in foundation-final-status-2026-09-30.json.
TEST RESULTS: final full local suite PASS with an isolated Draw server; first full run FAIL retained.
KNOWN BLOCKERS: FOUNDATION-EOL-01 requires a reviewed scope addition for .gitattributes; verify/independent POST/archive not executed.
READY_FOR_VERIFY: NO

Workspace: C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade. Branch codex/frade-ui-design-contract. Base/current HEAD 98f387f96b51b0ad139e3507c376ff1c3e8dec09; no commit, push or archive performed. Guide v1.0; token version 1.0.0; separate CSS adoption revision 1. PRE-20260930T091121Z PASS accepted; reviewer backend/effort NOT_CONFIRMED. Historical received PRE FAIL remains unchanged.

## Implementation and applicable rules

Canonical docs: docs/ui/Frade-UI-Style-Guide.md, QA-Checklist.md, Themes-and-Plugins-Spec.md. Byte-exact provenance and the single accepted CSS selector exception are recorded in docs/ui/decisions/provenance.json and docs/ui/adoption.md. Package-recommended paths and mockup functions are explicitly distinguished from actual implementation.

AGENTS §§1–18 are preserved; §19 adopts mandatory UI rule/state/evidence mapping for new changes. WB-001 replacement acceptance is preserved, with pilot sync/archive consumer ownership. Old visual baselines are not automatically approved by token checks.

Foundation applies FDS-003/008/009/010/015–018 and A11Y-001/002/008 to semantic token data and forced-colors cascade. The complete code/rule inventory remains in [audit](audit.md). Component contracts describe native anatomy, variants, density/states, keyboard/semantics/tokens/examples and the architectural-workshop direction. Those descriptions are adoption obligations, not claims of migrated components.

The JSON source generates CSS and typed readonly data in the existing ui-workspace layer; narrow exports create no new dependency edge or UI library. All Light/Dark/HC palettes are present together in static data. Exact byte oracle allows only the one accepted automatic-Dark specificity correction; generated CSS SHA256 is 6a6b47b12f5090a66231ee2541387ada31a2435d76f245c6631ad4285ac784a4.

124 current literals have exact occurrence/span/value/context hashes, classification, reason and closing stage. New/changed/moved literals fail even in inventoried files. Theme/domain data boundaries have positive/negative tests; generated exclusions name only the two checked output files. 22 foundation BDD bindings include every browser outline row; 23 future cases identify owners and do not claim execution.

No app imports the generated tokens yet. P01 owns the sole runtime resolver/registry, atomic preview/rollback, persistent settings, root/portal/native/iframe adapters and independent density. Theme switching in the running workbench is not implemented. Existing brand assets, domain paint, persisted semantics, routing/source/tests/controls and pilot/main specs are unchanged. UI has no routing prerequisite.

## Actual checks

| Command / check | Result | Evidence / limit |
|---|---|---|
| pnpm install --frozen-lockfile | PASS, exit 0 | [log](foundation-install-2026-09-30.txt); no dependency/lock update |
| pnpm check:all, first run | FAIL, exit 1 | [immutable log](foundation-check-all-2026-09-30.txt); Draw 214/215, localhost module connection failure before test API ready |
| unchanged floating-placement.spec.ts with fresh server | PASS, 4/4 | [diagnostic log](foundation-draw-environment-recheck-2026-09-30.txt) |
| pnpm check:all with fresh FRADE_DRAW_E2E_PORT | PASS, exit 0 | [full log](foundation-check-all-isolated-server-2026-09-30.txt); retains original commands/config/tests; Turbo caches used |
| lint / typecheck / unit / BDD / build / boundaries | PASS within full suite | 20 build tasks, 19 boundary tests; existing package graph retained |
| pnpm ui:compliance, exact new CI command | PASS, exit 0 | [log](foundation-ci-compliance-2026-09-30.txt); 15/15 node tests, 102 named pairs, 124 exact exceptions, 22 bindings |
| standalone new Windows CI cascade command | PASS, 20/20 | [log](foundation-ci-cascade-2026-09-30.txt); media explicitly asserted, all 31 root/child roles |
| Draw full browser regression | PASS, 215/215 on final run | current full log; first FAIL preserved |
| desktop full browser/Electron regression | PASS, 41/41 | includes 20 standalone CSS cases; current full log |
| additional tooling/browser-test eslint | PASS, exit 0 | actual tool chunk 84e9a1; initial unused import/unsafe finally failures fixed |
| authored source Prettier check | PASS, exit 0 | actual tool chunk 0ec47c; generated/source-byte copies deliberately not reformatted |
| git diff --check / lockfile diff | PASS, exit 0 | no lock changes; actual tool chunk c26826 |
| strict OpenSpec validation | PASS, exit 0 | actual tool chunk 141948; syntax validation is not implementation verify or POST |
| provenance/history/scope | PASS for recorded scope | [audit](foundation-scope-provenance-2026-09-30.json); 139/145 old hashes unchanged, six explicitly authorized transitions, ten local links valid |
| positive/negative OS-temp CLI controls | PASS: three exit-0 positives, four expected exit-1 negatives | drift/contrast/literal/missing binding, fixture hashes in compliance log; temp root removed |
| fresh Windows Git checkout | BLOCKED for production closure | isolated fresh checkout fails exit 1; scoped LF attributes give exit 0; attributes not in approved scope |
| remote CI / merge protection | LOCAL_ONLY / NOT_CONFIGURED, remote state unverified | workflow exists locally; gh/admin tools absent; owner instructions retained |
| formal OpenSpec verification / independent POST | NOT_RUN | blocked by FOUNDATION-EOL-01; no self-issued gate |
| archive / P01 advancement | NOT_RUN | checkpoint remains open |

Named pair contrast and standalone CSS assertions do not certify application WCAG compliance. Real migrated theme/density, focus/keyboard, target, zoom/reflow, screen-reader and visual baselines remain NOT_RUN for their owning stages.

## RED and environment evidence

Actual RED/GREEN outputs are preserved in foundation-command-records-2026-09-30/. The upstream browser CSS gave 19 pass / 1 fail at automatic Dark + forced-colors + absent attribute; its screenshot/trace are in foundation-cascade-red-2026-09-30/. Token/literal/traceability fixtures fail before implementation and pass afterwards.

The first full suite failure screenshot and trace are in foundation-check-all-failure-2026-09-30/. Trace contains net::ERR_CONNECTION_FAILED for http://127.0.0.1:5173/src/visual/api.ts and a blank document; geometry assertions had not started. Existing config supports FRADE_DRAW_E2E_PORT and disables reused servers when supplied. Targeted and full fresh-server runs passed without source/config/test edits. First FAIL is not relabelled PASS.

Tool warnings NO_COLOR/FORCE_COLOR and existing DEP0190 did not fail the final commands. The initial sandbox browser permission error executed no assertions and is retained separately from UI defects.

FOUNDATION-EOL-01: local core.autocrlf=true, no text/eol attributes. An OS-temp fresh Git checkout converts LF to CRLF and breaks the immutable fixture hash. [Reproduction](foundation-eol-reproduction-2026-09-30.json) records actual exit 1 and scoped-fix exit 0. The isolated repository was removed; production root attributes absent. Initial probe retained existing files, so the successful diagnostic explicitly reproduced a fresh checkout.

A reviewable [scope proposal](../../../../docs/ui/decisions/token-eol-scope-proposal.md) and [eight-line attributes draft](../../../../docs/ui/decisions/token-eol.gitattributes.proposed) preserve only canonical docs/data/generated token files, with no wildcard or global Git setting. The four token entries were proved in OS-temp; other four preserve byte-exact guide/schema copies. All eight current files have zero CRLF sequences. User acceptance and focused independent PRE are required before adding the unlisted root path.

## Task status

| Task | Status |
|---|---|
| 1.1 audit, baseline/screenshots and FDS/A11Y mapping | DONE |
| 1.2 accepted WB-001 replacement and ownership | DONE |
| 1.3 independent UI workspace / routing consumer handoff | DONE |
| 1.4 independent repeat PRE PASS | DONE |
| 2.1 canonical docs, provenance and links | DONE |
| 2.2 additive AGENTS fragment | DONE |
| 2.3 component contracts, inventory and boundaries | DONE |
| 3.1 meaningful RED/GREEN and browser matrix | DONE |
| 3.2 Node generator, CSS/TS registry and 102 pairs | DONE |
| 3.3 literal checks, exact exceptions/data boundaries | DONE |
| 3.4 full BDD per-example traceability | DONE |
| 3.5 real OS-temp negative/positive controls and cleanup | DONE |
| 4.1 CI/pnpm enforcement, clean-checkout closure | BLOCKED: LF scope addition |
| 4.2 owner branch-protection instructions / honest remote status | DONE with NOT_CONFIGURED/unverified fallback |
| 4.3 project and applicable browser/Electron checks | DONE; final PASS, first ENVIRONMENT FAIL retained |
| 4.4 OpenSpec verify then independent POST | NOT_RUN, blocker remains |
| 4.5 archive/close | NOT_RUN, checkpoint remains |

P01 resolver/preview → P02 transactional installer → P03 VS Code theme import → P04 icon registries → P05 isolated browser host → P06 native contributions → P07 registry/profiles/policy: planning artifacts exist, implementation NOT_STARTED. No executable VS Code API compatibility or working .frade-extension installer is claimed.

Later migrations shell/basic controls → tree/tabs → forms/tables/LoV → Draw/flow manager → AI are NOT_STARTED. Each retains approved scope, PRE, BDD/TDD, checks, independent POST and archive checkpoint; current legacy gaps remain in docs/ui/migration.md.

## Screenshots and unchanged surfaces

No feature screen was visually migrated in foundation. These are the seven original real runtime audit screenshots, retained without regeneration: [welcome](baseline/welcome.png), [commands](baseline/commands.png), [repository card](baseline/repository-card.png), [repository settings](baseline/repository-settings.png), [embedded Draw.io](baseline/embedded-drawio.png), [native Draw](baseline/native-draw.png), [synthetic Draw.io objects](baseline/drawio-synthetic-objects.png). They are historical baseline evidence, not current new-theme visual approval. Current full Electron regression passed; new guide screenshots belong to P01/migration.

The only remaining current foundation implementation blocker is LF-preserving clean-checkout enforcement through the exact proposed scope repair. Independent verification/POST and archive remain required after its resolution. Routing is not a predecessor.
