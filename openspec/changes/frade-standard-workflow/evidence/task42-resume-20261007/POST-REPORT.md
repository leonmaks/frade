<!-- Readable derived report; exact original bytes preserved in adjacent raw-base64.json. -->
**The candidate has a reproduced review-reception blocker. Task 4.2 must remain incomplete.**

Reviewed checkpoint: `62b9e0fbfd55f8b2e99f8ea210786fc6c9f01fd0`; implementation: `eadd32026c0f71a82ce3981ae3e6cdd16f924e26`; baseline: `98f387f96b51b0ad139e3507c376ff1c3e8dec09`.

D03 and the accepted design support **gpt-6-astra/xhigh** for W01 POST. `actualBackend` and `actualEffort` remain **NOT_CONFIRMED**.

**Blocking findings**

1. **P1 — Failed inspection commands can accompany an accepted PASS.**
   [review.mjs:824](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-07T19-22-39-503Z-16212eee-b623-4301-a1e7-d8e390d1407c/prepared/packet/scripts/directions/review.mjs:824) requires a terminal command’s exit code to be an integer, but does not reject nonzero values. I independently reproduced `verifyRawReview()` returning `PASS` for otherwise complete streams containing command exits **1 and 2**.

   The validator cannot distinguish an intentional negative control from a failed required inspection. This violates the mandated clean-execution invariant and undermines FWE-011. The reproduction establishes a validator defect; it does **not** establish an end-to-end bypass of the immutable shared runner’s additional checks.

2. **P1 — Current formal Verify admission conflicts with its retained inspection failures.**
   `formal-verify-req-repair-20261005/receipt.json:3` claims `RECEIVED_VALID_PASS`, while [VERIFY-REPORT.json:10991](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-07T19-22-39-503Z-16212eee-b623-4301-a1e7-d8e390d1407c/prepared/packet/openspec/changes/frade-standard-workflow/evidence/formal-verify-req-repair-20261005/VERIFY-REPORT.json:10991) explicitly records failed inspection commands with exits **2 and 1**. The receipt points to external raw streams unavailable inside this packet.

   Under the required no-inspection-error rule, the receipt’s status cannot resolve this contradiction. Clean formal Verify reception remains unestablished for this gate.

3. **P1 — This inspection also fails the requested clean-inspection condition.**
   Several tool outputs were truncated. Two audit programs initially reported false mismatches because of newline handling and full-versus-abbreviated Git hashes; corrected audits resolved those mismatches. These mistakes remain in the record. All executed shell commands returned zero, but I cannot certify this as a clean, exhaustive inspection or erase its limitations through successful follow-ups.

**Requirement and scenario reconciliation**

All **18 requirements / 46 scenarios** match the formal matrix. I checked **83 distinct assertion bindings** and **788 assertion samples** against current source.

| Requirements | Scenarios | Assessment |
|---|---:|---|
| FWE-001 | 4 | Ownership and exact closure controls supported; actual closure inactive |
| FWE-002 | 2 | Intake controls supported; human research boundary retained |
| FWE-003 | 2 | Bootstrap recovery/collision controls supported |
| FWE-004 | 2 | Reciprocity repair supported; budget controls remain independent |
| FWE-005 | 3 | Lifecycle controls present; current Verify reception unresolved |
| FWE-006 | 2 | RCA and historical failures retained |
| FWE-007 | 2 | Applicability and preservation evidence supported |
| FWE-008 | 3 | Two approved future boundaries; conservative legacy closure |
| FWE-009 | 3 | Exact role and approval/source bindings supported |
| FWE-010 | 3 | Confinement/preflight evidence supported within recorded limits |
| FWE-011 | 3 | **Reception blocker above** |
| FWE-012 | 2 | Unattested backend and unavailable writer remain explicit |
| FWE-013 | 2 | Eight sections and truthful counts retained |
| FWE-014 | 3 | Requirement/task acceptance repairs supported |
| FWE-015 | 2 | Freeze/staleness controls supported |
| FWE-016 | 3 | Checkpoint, blocker and publication-loop controls supported |
| FWE-017 | 3 | Destination/divergence/remote-SHA controls supported |
| FWE-018 | 2 | Onboarding and human boundaries supported within CLI/library limits |

**Checks and prior findings**

- All **277 packet artifacts**, **72 current source bindings**, and **29 required-check artifact hashes** match.
- Decoded cumulative diff: **776,324 bytes**, SHA256 `9e53eefdf5f526e4abb887fbe80ec905aa7f90581cedca40b9f9df88ed702b02`; all **75 final blob bindings** match.
- Actual local read-only tests: **35/35**, zero skipped, Linux Node18.19.1.
- Supplied native evidence: **221/221**, **204 unique titles**, zero skipped; targeted **35/35**; owner replay **1/1**.
- All **24 historical JavaScript test/helper files** remain byte-identical. The unused-binding removal reconstructs exactly; original lint failure and both RED generations remain retained.
- Each required-check record’s **57 present source bindings** matches. Two explicitly excluded historical Linux logs could not be rehashed here.
- General lint/type/build report **20/20 cached** each. No uncached product `check:all`, native temporary-Git rerun, remote CI, or branch-protection verification is claimed.

The admitted requirement-reciprocity FAIL remains valid history; its metrics defect is supported as repaired. The eight orphan-task regressions remain passing. V01–V04 and documentation finding W01 remain supported as resolved. D04 preserves separate historical/current assertions.

W02’s current projection digest and metrics reproduce; **exact rendered bytes do not**, with differences confined to table formatting. W03 remains a permissible phase limitation: planning declarations yield zero accepted/executed metrics and visible gaps, rather than fabricated proof. Earlier unadmitted reviews and the predispatch failure grant no approval.

**Required closure conditions**

Resolve the reception defect through an authorized regression-first change, reconcile the formal Verify admission conflict, and obtain current required checks, clean formal Verify and a fresh cumulative POST. Preserve every failed stream and existing assertion; no guard or specification weakening.

Tasks 4.3/4.4 remain later barriers: reviewed control adoption/discovery, exact three-spec synchronization, W01-only archive, and verified reference/origin relocation. No writes, repairs, task completion, adoption, archive, or merge occurred.

GATE_STATUS: FAIL