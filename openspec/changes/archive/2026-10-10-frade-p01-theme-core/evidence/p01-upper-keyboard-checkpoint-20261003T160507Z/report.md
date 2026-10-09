# UI keyboard checkpoint — incomplete

CHANGE: frade-p01-theme-core, P01 upper-three keyboard;5/10 overall. Guide1.0/tokens1.0.0.

IMPLEMENTED: exact View/Insert/Freehand keyboard/ARIA and original action ownership; bounded native popup navigation/cancellation; event-order-safe adoption; nested shortcut canonical foreground; private toolbar focus projection retaining original opacity/geometry.

FILES CHANGED: apps/desktop/src/main/drawio-theme-bridge.ts (sole production); apps/desktop/tests/unit/drawio-theme.test.ts; apps/desktop/tests/e2e/ui-contract-theme.spec.ts (new tails only); docs/ui/UI-DESIGN-CONTRACT-STATUS.md; execution-context.json; dated p01-upper-* evidence; separate unaccepted focus proposal. No vendor/routing/domain/token/dependency changes.

TESTS ADDED: ten keyboard/focus unit scenarios after permanent RED; six actual keyboard paths; six popup text/focus raster cases. Existing actual original-action and expanded raster assertions retained; helper changes follow accepted visible/hidden state contract. TEST RCA retains comfortable28x36 and native tabindex0 evidence. All old43044/186048byte prefixes and31/25callbacks exact.

COMMANDS EXECUTED: actual command arrays, UTC/exits/source pins in cited run receipts; pnpm --filter @frade/desktop exec vitest run tests/unit/drawio-theme.test.ts; desktop build/typecheck/lint; Playwright original-actions, keyboard, expanded raster and popup/focus suites; pnpm ui:compliance; pnpm check:boundaries; node scripts/check-drawio-assets.mjs; openspec validate frade-p01-theme-core --strict --json; git diff --check with explicit CRLF-aware whitespace classification.

TEST RESULTS:

- Independent PRE PASS17raw/165events under accepted6087da74; requested gpt-6-astra/xhigh, actual backend NOT_CONFIRMED. First timed-out PRE retained BLOCKED.
- Current58/58bridge units PASS; build/typecheck/lint PASS. Compliance/boundaries/assets/strict PASS. Raw default diff check FAIL for CR bytes retained; CRLF-aware check PASS with normal whitespace rules unchanged.
- Original actions/lifecycle6cases and keyboard paths6cases PASS in source-bound earlier runs.
- Expanded V6 glyph raster6cases/312proofs PASS, min4.797672908386502:1, PNG hashes verified. This precedes later popup-text/focus changes and is not final-source closure.
- Popup shortcut text actual Light/Dark RED → canonical inheritance repair → six-case PASS; source-bound before focus repair. Latest focus run has no text assertion failures.
- Current focus/popup suite2PASS/4FAIL: Light/Dark compact pass; comfortable top/bottom clipped in all themes; HC compact adjacent yellow/white ratio1.0738392309265699<3. Six exact semantic/file/identity preservation comparisons PASS. Source/binary unchanged during run. Historical FAIL/RED retained. Directory green names do not override actual FAIL receipts.

KNOWN BLOCKERS: exact focus projection scope decision; original popup checkmark/submenu arrows and further popup focus contrast/state coverage open; final-source expanded/actions/keyboard/FUI12 then one-control-literal/BDD111/two-positive/14-negative/current root check:all NOT_RUN; verify/POST/archive blocked. Other target/coarse/reflow/disabled/unsupported composition and human visual acceptance remain open. Screenshots NOT_APPROVED. Branch protection LOCAL_ONLY/NOT_CONFIGURED. No P02.

READY_FOR_VERIFY: NO

Decision: [P01-UPPER-FOCUS-UNCLIPPED-PROJECTION-01](../../decisions/p01-upper-focus-unclipped-projection.proposed.md), exactSHA32ddae6f2896fe57bbdb506337fd70199d477f7ea7992e7739a5bae563d47f0b. NOT_ACCEPTED. Proposes one inert focus-only decoration outside toolbar clipping plus canonical backing at most1px around stroke, without changing original target/layout/opacity. New coherent-plan/PRE after approval.

Applicable: FDS-003/004/005/007/008/009/010; A11Y-001/002/003/005/007/008. Geometry/coarse requirements stay applicable and unresolved, not waived. Routing independent.

Screenshots: real unedited PNGs in p01-upper-focus-green-20261003T160030Z/artifacts, including ui-contract-theme-P01-UPPE-22c56--focus-raster-light-compact/viewPanels-focus.png and ui-contract-theme-P01-UPPE-87060-us-raster-light-comfortable/viewPanels-focus.png; all other earlier raw screenshots retained.

Publication pending at creation. Existing HEADb02795e2 push was BLOCKED_ENVIRONMENT/SSH timeout; no successful remote claim. A separate receipt records the actual checkpoint commit/push.
