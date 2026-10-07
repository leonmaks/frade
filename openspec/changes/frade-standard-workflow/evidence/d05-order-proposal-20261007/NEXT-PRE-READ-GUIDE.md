# Complete bounded inspections for the next fresh PRE

This guide changes no contract, verdict or historical evidence. A fresh reviewer must independently evaluate the entire approved amended scope. Previous truncation and missing-input limitations remain recorded. A corrected command in the same run does not erase a failed or truncated required inspection.

Before each shell call, bound stdout and stderr. Use at least 4096 output tokens, but print no more than 6000 UTF-8 bytes per call. Inspect long documents in consecutive ranges; report inspected ranges. Do not concatenate complete documents, manifests, receipts, searches or inventories. Do not pipe to `head` or discard required results. Print counts, hashes and selected fields rather than entire large JSON arrays, then inspect every required entry in bounded batches. An ordinary zero exit does not prove that the tool returned complete output.

For source inspection, this read-only Python expression provides a bounded slice and fails explicitly if the requested slice is too large. Supply one known regular packet path, a zero-based start and a modest line count. No temporary files, here-documents or writes are necessary:

```text
python3 -c 'from pathlib import Path; import json; p=Path("EXACT_PACKET_PATH"); a=p.read_text().splitlines(); start=0; count=40; end=min(start+count,len(a)); text="\n".join(f"{i+1}: {a[i]}" for i in range(start,end)); result=json.dumps({"path":str(p),"start":start+1,"end":end,"totalLines":len(a),"text":text},ensure_ascii=False); assert len(result.encode())<=6000,"slice too large"; print(result)'
```

Choose conservative ranges before running. If even one line is long, inspect the selected JSON fields or bounded character ranges instead; do not execute the above with a known oversized slice. Treat an unexpected nonzero inspection as a limitation, not a negative control. An intentionally failing synthetic child is allowed only inside an explicitly declared harness that asserts the expected denial/failure and itself exits zero; its purpose must be stated before execution.

Independently verify the current strict selected-change and strict-all receipts, exact overlay input hashes/toolchain/applicability, all artifact/decision bindings, old and new authority sequence, preserved historical test assertions and additive current tests, complete event/final report binding and unchanged packet. Historical raw output may contain words such as `truncated` or expected failing test logs; identify those as historical content, without treating them as current successful inspection evidence.

If required input is absent, an actual command/output is incomplete, or the runtime cannot support the approved transition, report the limitation. Do not emit clean PASS. Keep exactly one unambiguous final GATE_STATUS PASS or FAIL and separately explain any BLOCKED admission limitation. This guide grants no implementation, approval, write, permission expansion, foreign adoption, main merge or next numbered-stage advancement.
