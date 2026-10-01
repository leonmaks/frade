# Frade UI foundation — final EOL implementation state

CHANGE: frade-ui-design-contract, FOUNDATION-EOL-01. Workspace C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade; branch codex/frade-ui-design-contract; HEAD 98f387f96b51b0ad139e3507c376ff1c3e8dec09. Guide 1.0, tokens 1.0.0, CSS adoption revision 1. Independent EOL PRE received byte-for-byte and accepted only after all 4879 manifest entries matched. No commit/staging/archive/PR/P01 or routing source write.

IMPLEMENTED: exact eight LF rules, verified temporary fresh Git checkout negative/positive control, bigint inode/device identity checks and safe cleanup, unavailable-Git/cleanup-failure tests, additive package/CI check, FUI-026/027/028 real bindings. All prior generator/color/traceability source implementations and raw protected artifacts are unchanged. The proposed archive repair below is not implementation.

FILES CHANGED in this EOL execution: .gitattributes; scripts/ui/checkout.mjs; tests/ui-contract/checkout.test.mjs; package.json; .github/workflows/ci.yml; docs/ui/decisions/ui-contract-traceability.json; docs/ui/adoption.md; active change proposal/design/tasks/execution-context/bdd feature/traceability-plan; new immutable evidence files. docs/ui/decisions/bdd-archive-scope-proposal.md is a new proposed planning document only. Earlier foundation files (canonical docs/tokens/components/AGENTS/CI/cascade/assertions) remain part of the overall branch diff and are preserved by the focused PRE manifest, not newly reimplemented here.

TESTS ADDED: six EOL node tests. RED root-configuration assertion retained before attributes; intermediate integration/test defects classified and fixed without weakening assertions. Twenty-one total node UI tests now pass. Tests reject missing/extra/wildcard/CRLF-target/self-rule scope, accept root configuration CRLF separators, prove all eight actual artifact hashes, execute unchanged CLI 1→0/102, preserve cleanup failures and reject wrong root identities. No token/artifact normalization or skip.

COMMANDS EXECUTED / TEST RESULTS:

| Command/check | Actual result | New evidence |
| --- | --- | --- |
| Initial node --test checkout.test.mjs | expected RED: exit 1 before attributes | foundation-eol-red-2026-09-30.txt + record |
| Targeted checkout tests | PASS, 6/6 | foundation-eol-targeted-green-2026-09-30.txt |
| pnpm install --frozen-lockfile | PASS, exit 0; lock unchanged | foundation-eol-frozen-install-2026-09-30.txt.json |
| pnpm --filter @frade/draw exec playwright install chromium | PASS, exit 0 | foundation-eol-chromium-install-2026-09-30.txt.json |
| pnpm ui:checkout:check | PASS: physical negative 1; accepted positive 0/102; eight raw hashes/LF; removed temp | foundation-eol-checkout-cli-2026-09-30.txt.json |
| pnpm ui:compliance | PASS: 21/21; 102 named pairs; 124 exact legacy occurrences; 25 bindings/23 future; all ordinary negative/positive controls | foundation-eol-ci-compliance-2026-09-30.txt.json |
| pnpm --filter @frade/desktop exec playwright test tests/e2e/ui-contract-token-cascade.spec.ts | PASS, 20/20 actual media/root/child states | foundation-eol-ci-cascade-2026-09-30.txt.json |
| pnpm check:all | PASS, exit 0; lint/typecheck/unit/BDD/19 boundaries/build; Draw 215/215; desktop 41/41, using a fresh own Draw port | foundation-eol-check-all-2026-09-30.txt.json |
| openspec validate --strict, eslint, targeted Prettier, tokens/traceability, diff --check, lock diff | PASS, exits 0 | foundation-eol-final-validation-2026-09-30.txt |
| Final controls + frozen source comparison | PASS for current controls; 10 authorized current-file transitions; all other 4869 original artifacts unchanged | foundation-eol-final-controls-2026-09-30.json; final manifest |
| Actual archive-path probe in verified OS-temp fixture | FAIL for required lifecycle: active exit 0 → archived exit 1 ENOENT; safe cleanup | foundation-archive-path-reproduction-2026-09-30.json |
| Executor OpenSpec verification | BLOCKED: archive correctness defect and two incomplete checkpoints | foundation-eol-verification-2026-09-30.md |
| Independent POST / archive | NOT_RUN, blocked | execution-context.json |
| Remote Actions / Linux execution / branch protection | LOCAL_ONLY / NOT_RUN / NOT_CONFIGURED by this task, remote state unverified | owner instructions retained |

Ordinary positive/negative actual outcomes:

| positive tokens | 0 | 0 |
| positive exact legacy occurrence | 0 | 0 |
| negative generated drift | 1 | 1 |
| negative contrast | 1 | 1 |
| negative new literal beside legacy | 1 | 1 |
| positive complete traceability | 0 | 0 |
| negative missing traceability | 1 | 1 |

Applicable rules: FDS-003/008/009/010 token/component/governance foundation; FDS-018 explicit compatibility boundaries. FDS-004 state role/component contract documentation only. A11Y-001/002 named contrast pairs and A11Y-008 isolated forced-colors execution verified; this is not full application accessibility. Runtime Light/Dark/HC/System resolver, density persistence, hot preview, keyboard/targets/zoom/screen-reader/new component interactions remain P01/migration scope. No actual AI/provider/installer/import/icon/host/native extension integration is claimed.

Screenshots: feature UI did not change or import the generated tokens; no new affected feature-screen screenshot is claimed. Seven real historical baseline images are preserved unchanged: [welcome](baseline/welcome.png), [commands](baseline/commands.png), [repository card](baseline/repository-card.png), [settings](baseline/repository-settings.png), [native Draw](baseline/native-draw.png), [embedded Draw.io](baseline/embedded-drawio.png), [synthetic objects](baseline/drawio-synthetic-objects.png). These are not newly approved guide baselines.

Remaining mismatches: 124 legacy literal exceptions still await their migration owners; current screens retain prior presentation; all runtime theme/density/accessibility/visual migration work is future. CI definition exists but required merge checks are unverified. EOL local defect is closed; durable archive compliance is not fixed.

Current full foundation task list — 17/19:

| Task | Status | Step |
| --- | --- | --- |
| 1.1 | DONE | Inspect actual AGENTS, manifests, OpenSpec/CI, approved UI/domain/routing contracts and input package; preserve HEAD/worktree/hash/screenshots evidence and map FDS/A11Y to real modules in evidence/audit.md. |
| 1.2 | DONE | Record the user's explicit acceptance of the complete WB-001 replacement text in decisions/visual-contract.md and decisions/wb001-acceptance-2026-09-30.md, with successor ownership and pilot archive/sync consumer handoff; preserve historical parity evidence. Foundation PRE and individual migrated baselines remain separate approvals. |
| 1.3 | DONE | Establish an isolated UI worktree and UI-owned scope/gate applicability under AGENTS §18; verify transfer hashes, own baseline and preserved original routing work, with no foreign R04 source/tests/metadata. Routing control adoption is its consumer task, not a UI predecessor. |
| 1.4 | DONE | Obtain independent repeat PRE PASS after strict validation of the accepted PRE-01 single-selector exception and standalone browser-test scope; use a fresh manifest and record reviewer, artifact hashes, baseline and READY_FOR_IMPLEMENTATION. Preserve received FAIL; executor cannot self-approve. |
| 2.1 | DONE | Copy guide v1.0/checklist/themes specification to chosen docs/ui paths with provenance/hash and a separate current adoption note including accepted CSS adoption revision 1 and its exact source-byte exception; verify actual links and do not claim source-package checks describe Frade runtime. |
| 2.2 | DONE | Add adapted UI fragment to root AGENTS without deleting rules, only after task 1.3; verify additive diff and retained routing/core gates. |
| 2.3 | DONE | Document native primitives/component anatomy/state/keyboard/token contracts and legacy exception inventory; verify narrow exports do not create navigator/inspector/workspace cycles through boundary tests. |
| 3.1 | DONE | Add meaningful failing node:test fixtures for palette role closure, contrast boundaries, exact single-deviation equivalence/drift and malformed tokens; retain RED before adapting generator/checker. Add RED standalone browser cascade for automatic Dark + forced-colors with absent attribute and all explicit-theme positive controls; verify actual media state, every role and root/child inheritance across 20 states. |
| 3.2 | DONE | Adapt JSON pipeline to Node, generate CSS/TS registry and expose checks via actual pnpm scripts; verify byte equivalence to source CSS plus only the exact accepted selector replacement (one source occurrence), preserve all other bytes/roles/palettes/token version and all 102 contrast pairs; keep adoption revision metadata separate from CSS and document commands. |
| 3.3 | DONE | Add failing feature-literal controls plus positive theme/domain/generated boundaries; implement exact occurrence exceptions and verify new/changed colors fail without whole-file exemptions. |
| 3.4 | DONE | Implement traceability for adapted bdd/ui-contracts.feature, including both PRE-01 browser outlines and every example: fail missing/unknown/duplicate mappings and assertions; preserve approved future AI/LoV/Draw boundaries without skipped tests masquerading as coverage. |
| 3.5 | DONE | Run isolated OS-temp negative literal/drift/contrast controls and positive controls with actual exit results; remove only verified temporary roots and retain hashes/reports outside production. |
| 3.6 | DONE | Obtain focused independent PRE PASS for the user-accepted FOUNDATION-EOL-01 scope addition: root .gitattributes with exactly eight accepted logical entries, existing tooling-root fresh-checkout regression/control, unchanged raw artifact/CSS oracles and no routing prerequisite. Record fresh manifest/reviewer/hash and preserve original PRE and implementation evidence; executor cannot self-approve. |
| 3.7 | DONE | After task 3.6 PASS, add meaningful RED for absent/missing/broadened attributes before production .gitattributes; implement only the eight accepted rules and OS-temp fresh-Git-checkout control using existing Node/Git. Prove no-attribute CRLF drift exits 1, accepted entries preserve all eight raw hashes and exit 0/102 pairs, safe cleanup and no source/input/history mutation. Adapt BDD/bindings and wire the check into ui:compliance; no global Git config or token normalization. |
| 4.1 | DONE | Add ui-compliance to existing CI and pnpm check, retaining original jobs/checks and adding the standalone CSS cascade test to the existing Windows UI check; include the accepted fresh-checkout check after focused PRE, execute exact commands locally and document remote state separately. |
| 4.2 | DONE | Deliver owner required-check instructions and verify actual GitHub rules if authenticated tooling is available; otherwise retain NOT_CONFIGURED/unverified enforcement. |
| 4.3 | DONE | Re-run after the LF repair: project typecheck/lint/unit/BDD/boundaries/build and applicable browser/Electron checks, including actual standalone 20-state generated-CSS cascade execution, with new logs; preserve baseline hashes and the pre-repair full PASS / first ENVIRONMENT FAIL, and separate environment errors from UI defects. |
| 4.4 | BLOCKED / NOT_DONE | Perform OpenSpec verification then independent POST over diff/evidence and git status/diff; no code edits during review; required NOT_RUN/BLOCKED prohibits PASS/archive. |
| 4.5 | BLOCKED / NOT_DONE | Archive/close only after required checks and POST PASS using project workflow; stop at checkpoint. P01 owns runtime resolver, not a competing foundation service. |

P01–P07 have planning artifacts only: resolver/preview (0/10), transactional installer (0/9), VS Code data-theme import (0/8), icon registries (0/8), isolated browser host (0/9), native contributions (0/9), registry/profiles/policy (0/9). Sequential visual migration stages shell/controls → tree/tabs → forms/tables/LoV → Draw/flows → AI have no migrated implementation/scope/PRE approval. They are not started automatically. Routing consumer adoption remains routing-owned; UI has no routing predecessor.

KNOWN BLOCKERS: FOUNDATION-ARCHIVE-01 (INTEGRATION), actual CLI failure after archived fixture relocation. Proposed repair is [bdd-archive-scope-proposal](../../../../docs/ui/decisions/bdd-archive-scope-proposal.md); its complete file/task/spec delta is reviewable and NOT_ACCEPTED/NOT_IMPLEMENTED. EOL PRE approval is not broadened to that delta.

READY_FOR_VERIFY: NO
