One correctness blocker remains.

**B01 — Conflicting effort overrides pass strict reception.** [core.mjs:152](/mnt/c/Users/NVISEN/.codex/review-automation/packet-v1-20261001T061101Z/stage-policy-post-20261001T164941495Z-prepared/packet/scripts/agent-review/core.mjs:152) counts only arguments beginning with `model_reasoning_effort=`. It overlooks the supported `--config=model_reasoning_effort=…` form, violating design’s exactly-once requirement.

Reproduction from the packet root:

```sh
node --input-type=module -e '
import assert from "node:assert/strict";
import {verifyRequestedPolicy} from "./scripts/agent-review/core.mjs";
const selection = {
  stage:"fixture", phase:"POST",
  model:"gpt-6-sol", reasoningEffort:"high"
};
const record = {
  phase:"POST", requestedModel:"gpt-6-sol", requestedEffort:"high",
  cli:{args:["--model","gpt-6-sol",
    "-c","model_reasoning_effort=\"high\"",
    "--config=model_reasoning_effort=\"xhigh\""]}
};
assert.throws(() => verifyRequestedPolicy(record, selection),
  /INVOKED_POLICY_MISMATCH/);
'
```

Executed result: **exit 1, “Missing expected exception.”** The pinned CLI accepted this argument form during help parsing. The validator must reject conflicting/duplicate overrides across supported spellings; add regression coverage before repeating POST.

Other review results:

- All **57 artifact hashes**, **16 public bundle files**, and audited baseline control/handoff hashes matched; packet remained unchanged.
- Bundle SHA-256: `628e62cfc3ee0c00e2d5d14c16d12bf2a961446850dba5566e81abe9357339aa`.
- Six selected read-only tests passed; 11 modules parsed. In-memory generation verified both pairs, literal substitutions, retained flags, provenance and rejection of missing selection.
- Supplied evidence records **14/14 functional tests**, **15/15 original controls**, RED/CLI-negative, strict/general checks and contextual probes. Full suites and live canaries were not rerun here; external preservation relies on packet evidence.

The narrow v1.1 supersession preserves the Routing handoff. Installation, append-only primary clarification, two-requirement canonical sync and closure remain pending.

Requested assignment: **common-policy-repair / POST / gpt-6-astra / xhigh**. Actual backend and effort: **NOT_CONFIRMED**. No files modified.

GATE_STATUS: FAIL