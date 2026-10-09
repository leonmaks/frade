Focused PRE passes solely for the [repaired v2 diagnostic/test/evidence plan](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-02T15-17-22-385Z-2589a513-76aa-4675-8efe-d1cf8083d7a3/prepared/packet/openspec/changes/frade-p01-theme-core/evidence/p01-final-coverage-pre-repair-20261002T151542Z/execution-plan-v2.md). No blocker to executing that bounded diagnostic was identified.

Verified facts:

- All **2,908 packet entries** match their sizes/hashes, including final recheck.
- Audit2 reproduced **543 current source files, 1,971 artifacts, 1,044 B02 observations, 40,731 contrast checks, minimum 5.039825, and 303 passed named cases**. Reproduction fixed the evidence-directory pointer and suppressed the output write; assertions remained unchanged.
- The full raw inventory reproduces **original → insertion → formatter → current**, preserving all **122 other entries**. Final source hash matches the formatter receipt. Audit1’s TEST failure remains preserved.
- Compatibility-test diffs contain only accepted readiness additions. Existing assertions/tolerances and supplied old test prefixes are preserved.
- Original PRE FAIL, **101 events and 17 received artifacts**, remain intact. Existing focused FUI POST PASS is preserved.
- Fresh strict-validation receipt records exit0. Same-run canary hash, invocation binding, selection, policy and dispatcher match; CLI0.159.3/version/probe exits succeed, with external reads, writes and network denied.

The measurement design is conservative and reviewable: fixed source-alpha masks, every core pixel, verified uniform backdrop, actual screenshot RGB, and independently checked action/menu capability. Unknown mappings, unsupported composition or zero-core masks must remain `NOT_MEASURED/BLOCKED`. Positive and negative measurement fixtures must pass before runtime results are trusted.

**Actual toolbar glyph contrast remains unmeasured.** I inspected the HC screenshot and pinned asset handling. Upper controls use embedded SVG images; vendor CSS specifies 18px backgrounds for commonly 24px resources and includes opacity/filter rules. Those conditions cannot silently bypass v2’s scale/composition restrictions. Unsupported cases require an explicit diagnostic extension before closure. Existing CSS/effective-text contrast results do not prove these glyph pixels, and the screenshot alone does not establish an enabled-control defect.

All **372 baseline PNGs** match manifest `a0940ab0631e762e12752b005a190d071548cb1177d05a5247f45616fd766706`; human acceptance remains `NOT_APPROVED`. Full P01 completion, cumulative POST, archive and P02 remain blocked/open. Product repair outside the accepted boundary requires a separate material human decision. This PRE requires no human prompt relay or renewed approval of existing obligations.

The selection digest remains preliminary metadata; final request/control identity belongs to the same-run shared input/receipt. Actual backend/effort: `NOT_CONFIRMED`. No files changed.

GATE_STATUS: PASS