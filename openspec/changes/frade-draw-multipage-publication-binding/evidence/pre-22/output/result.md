GATE_STATUS: FAIL

The proposed 12 Main hunks and two native test hunks apply uniquely, reverse to their pinned predecessors, and match supplement SHA `4ee7e11e…`. I found no ownership-state defect in those hunks.

The packet omits `tests/ui-contract/.gitattributes`. The current source closure requires that file, and the real Git checkout test reads it. Without its baseline bytes, I cannot verify the promised exact filename rule; those checks would fail in this packet. Include the rule and its raw hash in a fresh packet, or reconcile the plan first if it is absent from the owning checkout. No production fix or test run was performed.