# R03 options-array boundary repair

User authorization: "разрешаю. Sol high" for the narrow production validation fix.

Classification: DOMAIN_MODEL / boundary validation.
Root cause: JavaScript typeof [] is object, so the existing null/non-object guard
accepted array options. The retained deterministic fixture reproduced the defect
before the fix. resolve.ts now additionally rejects Array.isArray(options) with
the same operation-specific TypeError. No assertion, expected value, tolerance,
contract, prior layer or frozen control was changed for the repair.

Validation executed after the fix:

- Targeted contracts.test.ts: PASS, 21 tests.
- Direction complete unit/reference suite: PASS, 8 files / 106 tests, including
  all 900 reference matrix cases and the retained array regression.
- Direction property suite within the combined config run: PASS, six core
  properties each raw=5000 / accepted=5000 / rejected=0, seed 0xFAD003.
- Combined unit+property config initially exceeded the existing mutation-harness
  test's 5000ms timeout (5281ms) under concurrent typecheck/gate/property load.
  No timeout was changed. With the approved unit command run separately after
  other work completed, the harness passed in 3889ms. No test was skipped.
- Isolated R03 strict compiler fixture: PASS.
- Full @frade/draw typecheck: PASS.
- Scoped source/test ESLint: PASS.
- Installed architecture gate: PASS, HEAD INDEX WORKTREE; 33 changed paths and
  76 V2 source/test files.
- OpenSpec strict validation: PASS.
- git diff --check: PASS.

Production change in this repair: resolve.ts options guard only.
Task 3.1 can be checked again. Task 4.5 remains open. The prior 81.82% mutation
result is historical and does not establish a score for the repaired source/new
tests. The full runner must re-enumerate every applicable mutant, including the
new logical operator in the authorized options guard. No inventory filtering or
denominator manipulation is permitted. Continue that Test/Fix checkpoint with
GPT-6 Luna high before declaring READY_FOR_VERIFY.


## Fresh complete mutation rerun

The full rerun processed 85 candidates: 59 killed, 8 survived, 18 compiler-invalid, 0 timeouts; score 88.06%, below 90%. See mutation-rerun-review.md. Task 4.5 remains blocked; do not advance to formal verification.
