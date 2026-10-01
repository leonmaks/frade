# Read-only product audit — 30 September 2026 Europe/Moscow

Guide input: v1.0 / tokens 1.0.0; input hashes in baseline/input-hashes.json. This report records the existing implementation. Source-package validation reports and the guide's mockup do not describe implemented Frade functionality.

## Baseline and authority

- Initial HEAD: `98f387f96b51b0ad139e3507c376ff1c3e8dec09`; not moved. Initial tracked dirty files: docs/routing-v2/CURRENT_CHANGE.md, packages/draw/package.json, pnpm-lock.yaml. Numerous existing untracked R04 files/evidence and the supplied ` _input/` directory existed before this task. baseline/preexisting.patch and worktree-status.txt retain the observed state.
- Actual input directory has a leading space: ` _input/frade-ui-style-guide-v1/`. Recommended `packages/ui`/Storybook paths in the package are not existing project layers.
- Applicable root AGENTS and nested packages/draw/src/routing/AGENTS were inspected. No other repository AGENTS was discovered by hidden-file inventory excluding dependencies/vendor. Routing master/playbook/current/workflow controls and Repo Core ADR/requirements remain authoritative; no routing algorithm or domain repair is in this scope.
- Root/nested OpenSpec config use spec-driven. CLI 1.13.2 reports nearest root E:/dev/codex/frade. `openspec list --specs` contains foundation-quality-gates, monorepo-workspace, reusable-draw-package, and R01–R03 routing specs. Pilot, diagrams, flows, runtime and domain changes still have their own artifacts; completed task counts are not proof of independent approval/archive.
- Related accepted contracts inspected: pinned VS Code pilot WB-001–007/parity; reusable Draw source regression; Electron isolated renderer/IPC ADR; Repository Core source/command/diagram-independence ADR; repository diagrams split (.frade X6 / native embedded .drawio); flow manager standalone/bound ownership. R04 remains active and its controls explicitly freeze AGENTS.
- R04 CURRENT_CHANGE already records implementation tests FAIL and pending fresh PRE/control checkpoint. It contains inconsistent historical/current approval fields; this audit does not repair them or infer permission from a historical PASS. Repo Core tasks remain incomplete. Neither program is closed by this UI task.
- All discovered project package manifests were read into baseline/manifests.json: 21 workspace projects plus root metadata as discovered. Existing UI dependencies are React 18.3.1, TypeScript 5.9.3, Vitest 3.2.7, Testing Library/jsdom; Draw uses X6 3.1.8. No full UI framework or general theme/extension service was found.

## Existing inventory

| Concern | Actual implementation | Observed limit / proposed owner |
|---|---|---|
| Root mounting | apps/desktop/src/renderer/main.tsx imports ui-workspace/styles.css and mounts Workbench with named preload clients | no theme/density initialization |
| Shared presentation | packages/ui-workspace/src/styles.css, Workbench.tsx | fixed Dark Modern local --bg/--side/--accent; new shared tokens belong here, no second full UI library |
| Icons | ui-workspace/src/codicon.ttf, CSS glyph mappings, THIRD-PARTY-NOTICES.md | accepted Codicons asset/license retained; some inspector/diagram commands use text arrows/symbols; no icon contribution registry |
| Brand | Workbench frade-mark textual F and Frade title; scoped CSS | no separate authoritative brand pack/logo spec discovered; preserve current assets, do not invent logo/colors |
| Overlays | Workbench inline modal backdrops/file menu/palette, Navigator context menu, Inspector reference picker, FlowManager UI, DiagramView/FradeDiagramView createPortal | portals park/move editor containers, not a unified overlay host; one theme transaction must span root and actual containers/iframe |
| Commands/shortcuts | Workbench window keydown handles Ctrl/Cmd+S/W/B/Tab, F1, Ctrl+Shift+P, Escape and modal Tab; local handlers in child components | no context-aware shared shortcut registry or theme chord/Extensions command; do not advertise nonexistent commands |
| Persistence/layout | state.ts and Workbench localStorage frade.layout/frade.editors/frade.selection, elementAppearance v1; host workspace profiles | theme/density persistence absent; element appearance is separate semantic/document visualization data |
| Density | CSS explorer rows 22 px, fixed shell dimensions | compact/comfortable setting absent; guide compact rows/controls minimum 28, comfortable 36 |
| Tree | packages/ui-navigator/src/Navigator.tsx: types/sources/root projection, search, selected/focused rows, arrows/Home/End/Enter, context actions | relevant keyboard exists; new guide typeahead/targets/comprehensive accessibility need stage evidence |
| Tabs/groups | Workbench tablist, separate close button, preview/pinned/dirty/shared drafts, split/group interactions; state.ts tests | Ctrl+Tab currently array order, not documented MRU behavior; keyboard Move to group contract needs migration |
| Forms/LoV | packages/ui-inspector/src/Inspector.tsx metadata recursive fields, single reference picker/listbox/search/50-item increment, errors/read-only/reverse refs | no common component library; source/interaction audit does not prove full multi-reference table picker contract |
| Tables/flow manager | ui-workspace/src/FlowManager.tsx, useBundleManager, flowContracts, 45 existing bundle BDD scenarios | actual flows/filter/paging/repository/local ownership exist; retain exclude vs repository deletion semantics |
| Native rendering | FradeDiagramView → @frade/draw DiagramEditor/X6, graph/doc serializers, repository refs/events | UI tokens must not overwrite domain appearance, endpoints/constraints/route algorithms or stored paint |
| Embedded rendering | DiagramView iframe frade://drawio + main drawio bridges; createPortal/editor parking | independent editor chrome/light canvas; requires prepare/rollback adapter before claiming atomic hot theme |
| Theme/package data | supplied tokens/schema/light/dark JSON and ZIP fixture only | none imported into runtime; ZIP engines target Frade 1.x whereas app currently 0.1.0 |
| AI/Projects/extensions | no corresponding working screen/provider/installer/extension host found in desktop UI | mockup does not imply implementation; future contributions need approved scope |
| CI | .github/workflows/ci.yml: foundation Ubuntu pnpm check; draw-chromium-windows browser/Electron checks | no ui-compliance job/token/literal gate yet; branch protection unverified, gh missing |

## Rule mapping

These are applicable targets and gaps, not a compliance PASS for old UI.

| Rules | Current code / evidence | Remaining requirement |
|---|---|---|
| FDS-001,002,006 | Workbench layout/root metadata/editor groups/status; runtime screenshots | preserve composition/context while adopting own visual foundation |
| FDS-003,008,009,010 | styles.css/renderer imports; no resolver or UI gate | canonical semantic tokens, all themes/densities, one shared service and CI |
| FDS-004,005,012 | Navigator state/focus, Workbench commands, diagram selection | distinct accessible states, context registry, drag alternatives, no geometry changes |
| FDS-007,011 | Workbench drafts/layout/state; existing state/persistence tests | theme transactions must preserve actual content and lifecycle; restoration/signature behavior covered by stages |
| FDS-013,014 | save/dirty messages, inspector and diagram screenshots | factual feedback and accepted per-stage Frade visual baselines |
| FDS-015,016,017,018 | supplied Themes-and-Plugins-Spec only | P01–P07; no running installer/API/marketplace claimed |
| A11Y-001,002 | named pair checker passes input palette; legacy UI has its own colors | actual state/background contrast checks remain NOT_RUN for guide migration |
| A11Y-003 | styles.css focus 1px / offset -1, Workbench modal handlers | guide minimum focus ring 2 with offset2 and no occlusion; migration gap |
| A11Y-004 | explorer row22, icon controls current CSS | row/target/coarse44 checks and specific exceptions; no broad certification |
| A11Y-005,006 | tree keyboard/window handlers/separator arrows | registry/overlay focus and keyboard drag alternatives still require coverage |
| A11Y-007,009 | roles/names/field labels/errors/status in Navigator/Inspector/Workbench | screen-reader review and full label/error association across states NOT_RUN |
| A11Y-008 | fixed layout/media CSS | full 200% text/reflow/forced-colors/coarse/reduced-motion matrix NOT_RUN |
| A11Y-010 | diagram refs/card navigation and actual X6/iframe rendering | functional keyboard object/edge alternative and selection/route evidence remain stage scope |

## Runtime screenshots and environment

Build command `pnpm --filter @frade/desktop build` passed, including desktop typecheck/build:utility and asset check. Windows, Node v24.18.0, pnpm12.6.0, Python3.9.13, Electron44.4.5/Chromium152, Segoe UI13, DPR1, 1280×850 content viewport. Capture scripts use production `frade://app/index.html` and isolated synthetic scripts/flow-fixtures.mjs with nine objects. No external KA is copied or embedded in these screenshots.

Actual screenshots: [welcome](baseline/welcome.png), [commands](baseline/commands.png), [repository card](baseline/repository-card.png), [repository settings](baseline/repository-settings.png), [embedded editor](baseline/embedded-drawio.png), [native Draw](baseline/native-draw.png), [Draw.io with synthetic objects](baseline/drawio-synthetic-objects.png). Capture-result/native-result JSON contains actual timestamps/operations/environment; no renderer pageerrors were observed. These are historical baseline evidence, not new Frade theme approval or a screenshot regression assertion.

Visual inspection: workbench retains Explorer/card/settings layout; native Draw and embedded Draw.io have light canvases inside Dark shell; native Draw toolbar has English labels and a distinct shape palette. Synthetic diagrams show dirty indicators on initial opening; no claim is made that loading preserves serialized bytes in this capture smoke path. No routes/edges were created or compared, so routing correctness and flow-manager screenshots are NOT_RUN. No current AI screen exists to capture. Status geometry initially queried a nonexistent `.wb-status` selector and is null in the preserved report; `.wb-statusbar` source is 22px. Measured title35/sidebar300/tabs35/breadcrumb26 are actual runtime values.

Environment/tool limitations are distinct from UI findings:

- First sandbox attempt could not create evidence directories, so that attempt did not run the build. Authorized scoped write retry succeeded. No UI defect inferred.
- Auto-review rejected the original external-KA screenshot script due to potentially sensitive external content being copied into versioned evidence. That script was not executed; the safe synthetic path then succeeded. External-KA capture remains BLOCKED without separate permission.
- Capture emitted Node DEP0190 from the existing Playwright/Electron child launch; command completed successfully. This is tool/runtime warning evidence, not a UI defect or a reason to alter production.
- gh is not installed; no authenticated remote branch-protection state established. Owner instructions prepared; no remote protection claim.

## Actual audit checks and limits

| Check | Result | Evidence |
|---|---|---|
| Desktop build | PASS | baseline/desktop-build.txt |
| Four UI/desktop package typechecks | PASS | baseline/typecheck.txt, ui-check-results.json |
| Four package lint | PASS | baseline/lint.txt |
| Existing UI/desktop tests | PASS: navigator1 + inspector2 + workspace69 + desktop11 = 83 | baseline/test.txt; includes 45 existing bundle BDD cases |
| Current package architecture boundaries | PASS | baseline/boundaries.txt |
| Current R04 machine gate | FAIL,exit1: input/new UI planning paths outside exact R04 scope | baseline/routing-gate.txt; gate not modified |
| Input checker positive | PASS,102 pairs | baseline/input-controls-result.json |
| Input checker drift negative | expected FAIL,exit1 | same report; canonical outputs untouched |
| Input checker bad contrast negative | expected FAIL,exit1 | same report; temp fixtures removed |
| Foundation + P01–P07 strict validation | PASS,8 exits0 | baseline/planning-validation-results.json |
| Real runtime capture smoke | PASS,7 screenshots; no pageerrors | baseline/capture*-result.json |
| New feature literal enforcement | NOT_RUN / NOT_IMPLEMENTED | foundation implementation blocked |
| App WCAG/a11y/theme-density/visual regression | NOT_RUN | no guide migration; baseline screenshots are not these checks |
| Full pnpm check:all / remote CI | NOT_RUN | audit focused checks only; no product implementation |

## Allowed current work and blockers

Current writes: new foundation and requested P01–P07 planning/evidence only. Proposed post-PRE paths are explicitly listed in design.md; they are not approved implementation scope. Existing root AGENTS, CI, source/styles/manifests/lockfile/brand/routing files remain untouched by this task. Strict syntax validation is not a PRE approval.

Blocking contract decisions: exact pilot WB-001 versus guide palette/geometry; missing accepted visual supersession/ownership; frozen root AGENTS under R04 and current restrictive gate; missing independent PRE PASS. See decisions/visual-contract.md and evidence/pre-review.md. Foundation tokens/docs/mandatory AGENTS/CI adoption, runtime resolver and all feature migration remain NOT_IMPLEMENTED. No archive or next-phase implementation occurred.
