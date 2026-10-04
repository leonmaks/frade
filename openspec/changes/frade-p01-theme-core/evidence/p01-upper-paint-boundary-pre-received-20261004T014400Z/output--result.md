One correctness blocker. Excluding Fullscreen/Format from this comparison fits the accepted three-resource scope, but filtering alone is insufficient.

**High — cached source identity does not prove retained projection ownership.**  
`openspec/changes/frade-p01-theme-core/evidence/p01-upper-paint-boundary-planning-20261004T012000Z/repair-plan.md:8` proposes comparing cache-positive sources. However, `apps/desktop/src/main/drawio-theme-bridge.ts:273` revokes ownership when projected properties or the marker change. It can then rediscover the same node, original URL and bytes at `:261`.

For example, reapplying an admitted node’s original background URL between paint frames revokes its mask projection while preserving that entire comparison tuple. The positive cache still contains those bytes, so the comparison at `:1685` can permit PAINTED. The proposed filter retains this existing false-acknowledgement path.

The plan needs explicit final validation of retained ownership, marker and owned properties, plus meaningful RED for **same-node/same-URL/same-bytes projection loss** alongside the planned resource/replacement cases. Refuse that operation without adding a repaint, retry or digest. Revalidate the coherent plan and obtain fresh PRE before production.

All 1,430 packet entries match. Same-run canary version/exits/confinement, binding, and exact tasks SHA/excerpt verify the requested **gpt-6-astra/xhigh** selection; actual backend/effort remain **NOT_CONFIRMED**. Diagnostic restoration and readiness/control reverse proofs verify. Runtime reports were inspected; tests were not rerun and files were unchanged.

B02 remains FAIL; separate focus/FUI passes grant no closure. The outer receipt must still establish unchanged candidate/packet/request/plan and complete execution stream.

GATE_STATUS: FAIL