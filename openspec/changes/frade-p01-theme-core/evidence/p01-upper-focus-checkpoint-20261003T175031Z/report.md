# P01 focus checkpoint

CHANGE: frade-p01-theme-core / P01-UPPER-FOCUS-UNCLIPPED-PROJECTION-01, exact accepted SHA32ddae6f2896fe57bbdb506337fd70199d477f7ea7992e7739a5bae563d47f0b. Guide1.0, tokens1.0.0. Overall5/10; no P02.

IMPLEMENTED: one owned inert pointer-transparent focus decoration in frame body for the exact original View/Insert/Freehand controls. Canonical2px/offset2px contour; canonical panel backing within5px vertical/4px horizontal paint bounds. Private horizontal backing clip avoids the original adjacent target gap. Current menu/dialog/frame blur/invalid ownership removes it; prepare/release/rollback/disposal preserve existing lease rules. Native targets, layout, opacity, SVG bytes, callbacks and domain/routing/persistence unchanged.

FILES CHANGED: apps/desktop/src/main/drawio-theme-bridge.ts; new tails only in apps/desktop/tests/unit/drawio-theme.test.ts and apps/desktop/tests/e2e/ui-contract-theme.spec.ts; docs/ui/UI-DESIGN-CONTRACT-STATUS.md; owning execution-context.json and docs/ui/decisions/p01-theme-traceability.json; dated evidence. No vendor/generated tokens/dependency/routing/feature source changes.

TESTS ADDED: permanent P030/P032 unit ownership/bounds/media-cascade regression; P031 six actual theme-density cases including1280/1600/850, text200, forced/coarse/reduced, original narrow absence/restoration, neighbors and real parent modal. Complete contour oracle checks every pixel/channel including rounded corners against all256 rendered same-Electron underlay values. All opaque canonical ring pixels are contrasted against all opaque backing pixels, alongside actual four-side adjacency checks.12positive and36intended negative controls (missing stroke, clipped top, one rounded-corner pixel). No favorable-pixel sampling or screenshot edits. Original prefixes43044/186048bytes,31/25callbacks and V6 retained.

COMMANDS EXECUTED: desktop vitest drawio-theme unit; desktop build/typecheck/lint; actual Playwright P028/P031; same-Electron standalone contour analysis; ui:compliance including real isolated drift/color/contrast negatives and fixture cleanup; check:boundaries; check-drawio-assets; OpenSpec validate --strict; git status/diff/CRLF-aware diff check. Exact commands/raw exits are in the referenced run records.

TEST RESULTS:60/60bridge units PASS; build/typecheck/lint PASS. Earlier P028/P031 combined12/12PASS. Final permanent P031 source33d7edf644a0b69cafdb122bfd8e0bfac3c101b14421714aa2aaa11ed1e859c1:6/6PASS,96/96complete contours,96PNG hashes verified,12positive/36expected-negative FAIL controls verified; minimum5.491222267455491:1. Actual media/neighbor/modal cases and36semantic/file/identity comparisons pass. Separate earlier analyzer96/96PASS retained. Strict/compliance/boundaries/assets PASS before final documentation refresh; revalidation remains explicit. PRE PASS83events/17raw, requested gpt-6-astra/xhigh; actual backend NOT_CONFIRMED. Machine raster checks are not independent POST.

KNOWN BLOCKERS: final-source V6/actions/FUI12/one-control-literal/BDD111/14negative/full-root, remaining popup indicator/state coverage, scope verification and independent POST are still open. Human visual NOT_APPROVED; cumulative/archive BLOCKED. Branch protection LOCAL_ONLY/NOT_CONFIGURED. Original clipping/HC, private-backing overlap/forced-color FAIL and raw source/screenshots preserved. Permanent oracle first run timed out900s without full report; TEST RCA repaired reporter overhead using equivalent bounds/alpha/PNG-filter guards in focus-only helpers. Production and original V6 unchanged; same-case retest38s PASS and remaining5PASS. Auto-permission review timed out for several writes; no policy rejection or expanded permission was inferred. Later bounded writes succeeded. Prior Git publication SSH failure remains unverified until a new remote receipt.

READY_FOR_VERIFY: NO

Evidence: permanent-runtime-audit.json; ../p01-upper-focus-permanent-retest-20261003T185222Z; ../p01-upper-focus-permanent-five-20261003T190444Z; ../p01-upper-focus-expanded2-20261003T174121Z; ../p01-upper-focus-contour-20261003T174530Z; ../p01-upper-focus-permanent-20261003T181745Z/throughput-rca.json. No historical FAIL was rewritten.

Screenshots (actual, NOT_APPROVED):
- [Light compact focus](../p01-upper-focus-permanent-retest-20261003T185222Z/artifacts/ui-contract-theme-P01-UPPE-251c3-ors-and-modal-light-compact/baseline-insert.png)
- [Dark comfortable focus](../p01-upper-focus-permanent-five-20261003T190444Z/artifacts/ui-contract-theme-P01-UPPE-23d2b--and-modal-dark-comfortable/baseline-insert.png)
- [HC forced/coarse/text200](../p01-upper-focus-permanent-five-20261003T190444Z/artifacts/ui-contract-theme-P01-UPPE-1ec64-l-high-contrast-comfortable/forced-coarse-reduced-text200-viewPanels.png)

Git at report creation: local HEADd2ce150464f0c5bbb8ae6ea52908709343fda662; new checkpoint not yet committed/published. Publication receipts will be separate immutable artifacts.
