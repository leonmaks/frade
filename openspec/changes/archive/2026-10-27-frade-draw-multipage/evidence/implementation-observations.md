# Implementation observations, 27 October2026

The approved shared overlay ownership decision is implemented through a structural
pageOverlays adapter in Draw. FradeDiagramView supplies its existing ThemeController
mountHost registry and editor appearance lease, without a Draw→Workbench dependency.
Actual hosted browser RED19 showed Rename absent from that registry; GREEN20 proved
registration, host containment, non-top-layer modality, ancestor inert enforcement,
Escape cleanup and opener restoration. The desktop regression additionally checks
actual Frade host containment and absence of a native top-layer modal. Theme/overlay
service production code remains unchanged.

Rendered comparison revealed a close-button defect that outer dialog bounds did not
detect. RCA ABSTRACTION_BOUNDARY: Draw.io sets position:absolute inline, while its
ordinary .geButton CSS is relative; scoped generated CSS outranked our adapter's
non-important position. RED22/diagnostic23 retain the wrong computed relative position
and x484/y409 versus source x776/y306. GREEN24 retains exact internal control bounds
after source absolute positioning is preserved. No assertions/tolerances weakened.
Rename outer348×128 stays exact; AA minimum input24vs21 moves actions3px; close24vs20
keeps original corner and glyph center. Source active options20vs native24 means +4
active-tab width; an earlier attachment caption saying22 was corrected. Every inactive
tab/glyph text range remains exact in the source comparison.

Closed origin publication accepts only three explicitly registered raw forms:
observed candidate, LF publication, CRLF checkout. Only after exact raw SHA acceptance
does it verify the shared canonical SHA. Mixed/unknown EOL and semantic changes fail;
immutable original snapshots are never normalized. Each fresh execution separately
retains observed before/after raw hashes and source set, stdout/stderr/report/exit.
Equivalent future checkout bytes are portability metadata, never a claim of execution.
The bootstrap manifest pin is explicitly excluded from its own source digest and is
reviewed as trusted control code. The fresh closure currently contains637 files.

Coordinate proof02 supersedes coordinates only, after verifying working inventory
bytes exactly equal proof01's adopted hash. Proof01 remains unchanged. Both originate
from the same exact baseline inventory and source snapshots; all124 literal values,
contexts/owners/classification/reason/stage remain unchanged,19 spans moved. Root color
gate PASS; full negative/root checks remain pending until actually executed.

Latest bounded direct execution: Draw237, Runtime Node21, workspace direct319 tests
PASS. The11 historical LDE evidence cases are deliberately separate from direct
execution to avoid circularly requiring the final adoption manifest before generating
its reports. Their full original assertions run again in the final complete workspace
and root checks. Nothing is skipped/removed from those final commands.
