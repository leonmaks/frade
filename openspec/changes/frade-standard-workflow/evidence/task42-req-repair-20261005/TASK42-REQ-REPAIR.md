# W01 task 4.2 requirement reconciliation repair

CHANGE: Repair acceptance counting for unassignable structural trace gaps while retaining acceptance for an independently valid identified requirement.

IMPLEMENTED: `acceptedRequirementCount` now lives beside authoritative trace validation in `contracts.mjs`. It classifies validation findings by requirement owner. An orphan or ambiguous record bars acceptance globally; a defect with a unique owner blocks that requirement. Each accepted requirement still needs a stable unique ID, complete reciprocal scenario and task mapping, valid critical controls, executable assertions and current trusted run proof. Human and future scenarios remain pending. `status.mjs` delegates the count and handles malformed rows without crediting proof.

FILES CHANGED: `scripts/directions/contracts.mjs`, `scripts/directions/status.mjs`. Tests added: 0. Tests changed: 0. The original seeded production is retained in `TASK42-ORIGINALS`.

RCA: `RCA.json` was written before production changes. Classification: INVARIANT / ABSTRACTION_BOUNDARY. The earlier global validation gate erased a valid identified requirement; the seeded handwritten status predicate then lost the unknown-owner guard. The old fixture removes S2 and its assertion and leaves completed task 2.2 with empty or omitted scenario links. The new fixture keeps S2 assigned to defective REQ-001 while reciprocal REQ-002 has its own proof. Both expectations coexist without changing either test or spec.

COMMANDS EXECUTED: Separate direct Node 18.19.1 invocations of the unchanged old task gap, new reciprocity, contracts, status, budget and repair tests; `node --check` on both production files; disposable guard probe; scoped byte audit. The parent-supplied Windows Node 24.18.0 native RED is preserved as input, not claimed as execution here.

TEST RESULTS: Before editing, native Windows 35 cases had 33 pass, 2 fail, 0 skipped, exit 1, with 59/59 source hashes matching the seed. The unchanged Linux seed reproduced old 6/8 with exit 1; new 13/13 and contracts 14/14 passed. Final Linux runs: old 8/8, new 13/13, contracts 14/14, status 19/19, budget 4/4, repair 5/5; all exits 0 and zero skipped. Both syntax checks, disposable guard probe and scope audit exited 0. Raw outputs and exit files remain under `TASK42-RAW`.

KNOWN BLOCKERS: None within the required staged repair checks. The staged `check-applicability` attempt returned BLOCKED/exit 2 because this packet has no owning Git metadata. Prettier is unavailable. These do not attest owner checks. The parent must run native full regression and current owner checks after binding and scope reception.

READY_FOR_VERIFY: YES, for the staged repair only. Owner adoption, formal Verify and new POST are NOT_RUN. The admitted POST remains FAIL; task 4.1 is not complete, archive and gate remain inactive, product writer is NOT_IMPLEMENTED, and foreign adoption is NOT_STARTED.
