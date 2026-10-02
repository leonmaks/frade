# P01-B02-COLOR-CLOSURE-01 — proposed narrow scope addition

Status: PROPOSED / NOT_USER_ACCEPTED / NOT_PRE_PASS. The accepted revision 2 and its exceptions stay unchanged. Independent PRE PRE-P01-R2-20260930T182032Z remains FAIL and is preserved verbatim. Transport repair succeeded; this is an actual remaining UI planning conflict.

## Decision requested

Include the exact missing color properties below in design.md's closed consumer matrix, within the already approved new packages/ui-workspace/src/design/theme/theme-consumers.css. All selectors remain gated by html[data-frade-runtime="1"]. No feature CSS/source, generated tokens, dependencies, domain/routing API or behavior change; existing geometry, handlers, undo, selections, repository messages and saved bytes retain their accepted contract. No new legacy exception or inventory movement.

| Exact selector | Added property | Canonical roles | Required actual states |
| --- | --- | --- | --- |
| .metadata-preview | background-color, color | surface.panel, text.primary | existing repository Settings metadata check result, real loading/error/success path |
| .flow-manager | background-color, color, border-left-color | surface.panel, text.primary, border.subtle | empty/loading/error/populated/dirty/read-only panel, native and embedded placement |
| .flow-manager th, .flow-manager td | border-bottom-color | border.subtle | populated table and existing row actions; no cell/layout/selection behavior changes |
| .flow-manager tr:hover, .flow-manager tr:focus | background-color, color | surface.hover, text.primary | real pointer hover and existing keyboard row focus, outline remains existing approved focus adoption |
| .flow-warning | background-color, color | status.warningBg, status.warning | existing unsaved form guard, invalid membership, missing/no-longer-eligible flow, confirmation warning |
| .bundle-hint | background-color, color | status.infoBg, status.info | existing bundle-selection/system-endpoint hint, native and embedded consumers |
| .bundle-reconnect[role='menu'] | background-color, color, border-color | surface.overlay, text.primary, border.control | native existing bundle context menu; actions/focus/placement remain accepted contract |
| .bundle-reconnect[role='alertdialog'] | background-color, color, border-color | status.warningBg, status.warning, status.warning | existing native/embedded reconnect warning and cancel; no endpoint/routing/commit algorithm change |

This explicitly closes changed inherited foreground against the existing background/fallback; merely declaring --wb-bg would leave metadata/warning/hint/reconnect backgrounds wrong. .bundle-reconnect role='menu' is neutral UI, while role='alertdialog' uses warning semantics. Border width/layout/opacity stay unchanged. Forced-colors uses the same accepted final system mapping. Existing controls/focus/density rules from accepted revision 2 apply; this adds only the named properties, not a broad subtree or selector allowlist. The three temporary exceptions and their owners/expiry remain exactly as accepted.

## Actual-source anchors and static evidence

styles.css lines780–784: metadata background #1f1f1f; lines1162–1173: flow background var(--wb-bg,#202020), inherited foreground and #555 left border; lines1220–1235: table #555 separators and #333 hover/focus; lines1239–1243: #544623 warning; lines1263–1266: #25374a hint; lines1288–1297: #544623 reconnect/#d9b65e border. Actual Workbench metadata preview, FlowManager warning states, useBundleManager hint and FradeDiagramView/DiagramView menu/alertdialog roles are present. These are first-party UI, not authored diagram paint. Source files are inspected only, not edited.

A new dated analysis JSON records source hashes, exact property lines, original Light contrast 1.05–1.69:1 and all proposed foreground/background role ratios. These are static calculations, not screenshots or runtime PASS. Runtime inheritance/specificity/media/controls still require tests. Native and embedded owners retain original feature-internal placement under P01-OVERLAY-LEGACY-01; theming their colors does not declare their placement/accessibility migration complete.

## Exact planning additions after acceptance

- proposal Impact: name these inherited consumer color closures.
- design: append this exact table to the accepted consumer matrix; no other scope change.
- spec: add a scenario that metadata check result, flow panel/warnings/row hover-focus, hint and both reconnect roles pair canonical foreground/background across Light/Dark/HC, preserving domain actions and independently disclosed legacy placements.
- tasks 2.4/2.5: require real current metadata result and FlowManager empty/loading/error/dirty/warning/hover/focus/hint/reconnect fixtures in the existing P01 Electron tests, computed foreground/background/contrast across six theme/density states and forced media, visible focus and actual visual captures at existing approved viewports. Assert existing draft/membership/undo/document preservation. Report unavailable reproducible state BLOCKED, never fabricated PASS. Keep the ten tasks and all existing evidence/tests unchanged.

Save exact current four planning bytes before this addition, validate and freeze a fresh manifest; automatic gpt-6-astra/xhigh read-only focused+cumulative PRE must PASS before implementation. No P02 advancement. New screenshots remain a later human baseline decision.

## Why the human decision is necessary

Accepted design explicitly closes the selector/property set and requires review for expansion; AGENTS §19 requires approved scope and forbids silent contract reinterpretation. PRE identifies this exact missing scope as B02. This request is only the added color properties/states above, not a reapproval of revision 2, its exceptions, Codex transport or screenshot baselines.
