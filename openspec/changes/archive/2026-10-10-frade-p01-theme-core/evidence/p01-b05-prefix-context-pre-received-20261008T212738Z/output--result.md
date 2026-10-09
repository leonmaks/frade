One integrity blocker remains: **B4 is not fully closed.**

**Missing assertion-time evidence can still return exit 0.** In [completion-finalizer-v2.mjs:10](openspec/changes/frade-p01-theme-core/evidence/p01-b05-prefix-context-plan-20261008T202830Z/completion-finalizer-v2.mjs:10), absent `b05-observations.json` becomes `null`. Neither `captureComplete` nor the diagnosis requires it. A read-only, in-memory check using the actual capture predicate and completion policy returned `NOT_REPRODUCED_ROOT_CAUSE_NOT_PROVEN`, exit **0**, with that mandatory artifact missing.

Smallest correction: require and validate the original assertion-time observation artifact before declaring B05 evidence complete. Missing or malformed observations must block causal interpretation while retaining the actual test result separately. Add negative controls for both cases; no app rerun is needed to validate this correction.

The other repairs hold on inspection:

- B1’s historical selections and corresponding request hashes match.
- B2 binds reviewed artifacts and the executing runner before writes; V3 binds both the binary alias and actual ignored binary to the received manifest.
- B3 prevents a new receipt from resetting the consumed plan identity.
- All **331 packet hashes** match; the historical **272 artifacts** remain exact. Candidate SHA, original **279,962-byte prefix**, 21 reversible statements and passive helper match.

The supplied 15-control, strict, TypeScript and ESLint PASS records were inspected. I independently ran syntax and read-only guard checks; unavailable dependencies and app execution were not rerun.

No scope conflict or assertion weakening found. The accepted design supports `gpt-6-astra/xhigh`; actual backend/effort remain **NOT_CONFIRMED**. Runtime budget remains **0/1**. Earlier failures, P01 closure and visual restrictions remain open.

GATE_STATUS: FAIL