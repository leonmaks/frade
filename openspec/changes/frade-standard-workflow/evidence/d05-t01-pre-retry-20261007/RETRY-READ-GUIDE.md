# Operational preparation for a fresh full PRE

This preparation changes no approved package, model, effort, right, historical result, required inspection or gate. The prior failed PRE remains FAIL/BLOCKED. Do not reuse its verdict as the next gate. The helper is public read-only preparation evidence, not production code or the automatic service implementation.

Use direct shell execution calls. Avoid orchestration code that can fail before launching a command. Read using the attached `packet-read.py` with `python3`; it needs only Python standard libraries and makes no writes. Its stdout automatically fits 4800 UTF-8 bytes per invocation. Long lines, long paths and large JSON fields are paginated without a size assertion that aborts a legitimate inspection. Retain adequate tool output budget (4096 tokens recommended); the requirement is complete, untruncated returned output, not an arbitrary token-count minimum. A real error or truncated inspection still prevents clean PRE, even if retried successfully later.

Commands (substitute exact packet-relative file and helper paths):

```text
python3 HELPER text FILE 0
python3 HELPER json FILE /checks/3/stdout/!/items 0
python3 HELPER inventory REVIEW-PACKET-MANIFEST.json 0
python3 HELPER verify-inputs VALIDATION-BUNDLE 0
```

After each result, continue from its exact `next` cursor until `eof:true`. The cursor is in Unicode characters; line metadata helps track coverage. Every page includes the entire source file SHA256. The JSON command uses `/!` to parse a JSON string field; e.g. strict receipt stdout. `inventory` omits encoded data bytes from display; `verify-inputs` independently decodes and verifies every input's byte count/hash, checks duplicates and pages all overlay bindings. It does not substitute for reading contracts, all required artifacts or assessing architecture.

Independently review the full accepted 11-artifact D05-T01 scope, all8 exact historical mapping entries and original D05 acceptance; keep D03 operational through2.10 and atomic adoption inside2.11. Check all existing and additive obligations, all174 strict input bindings, receipts, toolchain and applicable test/gate sequence. No production before a new full clean PASS. Do not execute expected failing children as failed inspections; a declared negative control needs an asserting zero-exit harness.

Distinguish immutable earlier preparation receipts from current invocation evidence. Request/launch/freeze/termination and final candidate/packet invariance are additionally bound by the host after reception; they cannot recursively contain their own final hashes before launch. A historical 169-file preparation is not the final172-file invocation. Request metadata alone is not plan approval. Exact approved source and direct decision remain mandatory. Actual backend/effort may stay NOT_CONFIRMED under the accepted policy; no substitution.

End with exactly one standalone GATE_STATUS PASS or FAIL, state actual limitations and inspected coverage. Host reception separately rejects incomplete/failed inspection execution, stream/final mismatch, drift or missing termination. Numbered STOP checkpoints remain mandatory.
