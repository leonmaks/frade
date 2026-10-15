# P01-MAIN-RESTORED-FRAME-PAINT-01

Status: PROPOSED / NOT_ACCEPTED / NOT_IMPLEMENTED. Bounded product-repair exception to the exact-transfer-only P01 main integration. P02–P07 remain paused; no acceptance of the separate shared snapshot-helper proposal is implied.

## Defect and authority conflict

Human reports `Интерфейс ожидает восстановления: Inactive editor paint bounds unavailable` on `pnpm dev:desktop`. The curtain prevents observing any restored tabs; do not require the human to infer hidden state.

On unchanged Main 85aead338cb52ae45295f1e46f5f580d112beb4b an isolated two-pinned-Draw.io restart failed the required matching-painted-revision assertion and reproduced the exact reported curtain text. Raw evidence/screenshot: `evidence/startup-inactive-frame-20261014-02/`. Preliminary ESM setup failure remains separately preserved. A fresh empty DEV renderer profile passed, which is not proof about the actual human profile. DEV diagnostic launcher failures remain separate raw evidence; the corrected direct-Vite reproduction is recorded independently.

Root cause of the exact reproduced curtain: Workbench restores all retained diagram tabs. An inactive connected iframe starts under hidden parking. DiagramView populates lastVisibleBounds only after a previous positive visible rectangle. The newly restored inactive frame has never been visible. Its required theme join reaches paintSurface and throws before painted ACK; recovery alone cannot supply absent prior geometry. Classification: STATE_TRANSITION / INTEGRATION in UI presentation lifecycle. No routing or persisted-document defect is established.

The accepted proposal states `No source repair ... is granted`; current design/manifest v4 freeze product/test outputs to exact supplier bytes. Existing painted-revision/atomicity/editor-preservation requirements already require correct startup, but changing frozen outputs needs this explicit exception. Original transfer manifest, supplier sources and failures remain immutable.

## Exact permitted paths and behavior

1. `packages/ui-workspace/src/Workbench.tsx`: provide a presentation-only anchor for the retained frame's owning editor group through existing `[data-diagram-group]` elements. Use existing visible target when present, otherwise a deterministic group containing that tab. Preserve tab activation, group structure, persisted layout, document loading and repository operations.
2. `packages/ui-workspace/src/DiagramView.tsx`: preserve the same connected iframe and current reversible parking lease. Prefer previously measured positive visible bounds. Only when no prior bounds exist, measure the actual connected owning group's content region through that anchor, excluding tab strip using real DOM rectangles. Require finite positive bounds and proven ownership; missing/detached/hidden/zero geometry still fails truthfully. Obtain the temporary inert paint lease only beneath the already painted neutral curtain. Restore hidden/style/inert on release, disposal and invalidation. No fixed invented viewport, unrelated/global window fallback, forced tab activation, frame replacement, exempt participant, fake ACK or deadline change.
3. New `packages/ui-workspace/src/design/theme/parkedFrameSurface.ts`: optional small private presentation helper for ownership/measurement/reversible lease, if needed for meaningful unit coverage. No public export, competing resolver, service/frame protocol or domain API change.
4. New `packages/ui-workspace/tests/ui-contract/parked-frame-surface.test.ts`: meaningful RED/GREEN for never-visible parked frame, retained previous bounds, valid owning measurement, invalid/missing/zero geometry refusal and exact restoration of pre-existing hidden/style/inert state. Original tests unchanged.
5. New `apps/desktop/tests/e2e/p01-main-startup-restoration.spec.ts`: preserve the exact failing revision assertion as a regression; test restored inactive Draw.io with active diagram and active KA, all retained required frames' painted revision, hidden barrier, original active tab/focus, authored XML and durable selection. Cover Light/Dark/HC × compact/comfortable plus System persistence/resolution, actual DEV and built startup. Test parked switching/preview/cancel/commit and preserved editor/undo state where applicable. Original P01 tests, assertions, deadlines and visual baselines unchanged.
6. Owning `openspec/changes/frade-p01-main-integration/**`, `docs/ui/P01-MAIN-INTEGRATION-STATUS.md` and `docs/ui/P01-MAIN-INTEGRATION-REPORT.md`: accepted decision; coherent proposal/design/tasks/spec mapping; immutable RED/GREEN/check/review/source provenance; narrow repair origin/output manifest and current status/report. No rewriting original193source baseline, old manifest/evidence, canonical capabilities or unrelated accepted risks.

Everything else is excluded: Main/preload/bootstrap, native protocol, vendor, dependencies, tokens/brand, domain/routing, shared review harness and foreign changes. A DEV defect requiring additional paths needs a separate concrete decision. Do not delete/alter actual user profiles/settings/documents; no remote/main/new-ref push authorization.

## Process and acceptance

Reconcile/strict validate after acceptance, then fresh automatic independent PRE **gpt-6-sol / xhigh**, the existing approved P01 main integration pair, before product edits. Implement in the existing isolated `C:/Users/NVISEN/.codex/worktrees/p01-main-integration/frade`; transfer only relevant public diagnostic source/evidence with exact hashes. No foreign uncommitted product or user profile is copied. Root/scoped AGENTS and guide1.0 remain mandatory: FDS003/004/006/008/009, A11Y001–003 for focus/keyboard/restored context and token-based existing curtain; no aesthetic baseline change is proposed.

Meaningful regression RED before GREEN. Run affected lint/type/unit/BDD/build/UI-compliance/boundary checks, unchanged participant/service/parked-frame regressions and new startup matrix on exact repaired inputs. Required new FAIL stops. Prove document/durable/editor/undo preservation, actual required painted ACKs and exact foreign/domain/vendor preservation. Historical evidence is reusable only after proving input equivalence. Never label incomplete commands PASS.

After verification, obtain fresh packet-confined independent POST **gpt-6-sol / xhigh**, with complete raw receipt and unchanged candidate/request/packet/control bindings; freeze status/HEAD/index during review. Only after PASS serialize the reviewed repair into Main, preserving other source/foreign bytes, rebuild and rerun exact failed startup plus applicable actual Main smoke and preservation checks. Maintain separate actual-user-profile confirmation from isolated proof.

Main's independent review preparation is currently BLOCKED by a preserved tracked deletion in the snapshot helper. Do not bypass it or present preparation-worktree POST as actual-Main POST. Its proposed control repair stays a separate unaccepted decision. Main cumulative POST/archive remains BLOCKED until that separate issue is resolved. A focused repair PASS is not cumulative closure.

## Selected strategy and forecast

Selected: narrow lifecycle repair in the existing isolated preparation worktree, incremental meaningful tests, then verified delivery. Forecast30–90minutes active implementation/checks plus reviews (previous PRE about4minutes;5–30minutes each review is judgment). Reassess after first RED/GREEN if actual geometry or invariants invalidate the approach. No time-based quality waiver.

Rejected: deleting restored tabs/profiles, excluding hidden frames, fake/fixed geometry or ACK, relaxing tests/timeouts, changing restore behavior/domain, full theme redesign, repeating135unchangedcases before targeted proof, or implementing the unaccepted shared-control repair. This scope authorizes only the listed lifecycle repair and necessary consumer evidence, not a general UI migration.
