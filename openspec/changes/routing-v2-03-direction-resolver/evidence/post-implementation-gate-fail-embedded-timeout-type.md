# Independent R03 POST FAIL — unknown error with embedded timeout marker

CHANGE: routing-v2-03-direction-resolver
GATE_TYPE: POST_IMPLEMENTATION
GATE_STATUS: FAIL
ARCHIVE_ALLOWED: NO
SOURCE: Independent read-only POST review supplied by the user on 2026-09-28.
BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c

## Required blocker

In packages/draw/tests/routing-v2/direction/mutation/run.mjs,
assertKnownFailureKinds accepts any structured error whose message contains a
Vitest timeout marker, regardless of the preserved error kind. The independent
review passed this actual schema-2 reporter output to the current classifier:

```text
type: TypeError
name: TypeError
message: adapter failure while handling: Test timed out in 5ms.
```

Together with retained valid assertion evidence, a Hook timeout diagnostic
and spawn ETIMEDOUT, unknown test/suite/module errors were misclassified as
timeout rather than abort; global errors still aborted. Complete audits also
misclassified test/suite/module errors without spawn ETIMEDOUT. This is a
composed classifier counterexample, not evidence that retained inventory
children encountered such errors. The independent review checked all 86 child
hashes, exact 85-candidate AST inventory, 67 executable reclassifications,
18 compiler-invalid diagnostic sets, raw/report/progress consistency, and
recorded 67 killed, 18 invalid, zero survivors/timeouts, 100% score. Harness
integrity is nevertheless blocked until the classifier is repaired and the
full inventory rerun. No product correctness defect was reported.

Our read-only replay extracted the current classifier and cloned a saved
failed child from the latest complete inventory. It exercised test, suite,
module and global locations, complete/partial audits, and spawn on/off:
9/16 outcomes were wrong, all in test/suite/module; global errors aborted.
The exact observed matrix is in post-implementation-embedded-timeout-controls.json.
No repository source/test file changed during this replay.

## Root cause before another fix

FAILED_INVARIANT: Unknown structured failure kinds must abort even when their
message embeds timeout diagnostic text; no timeout/kill/survival outcome may
be returned first.

RESPONSIBLE_LAYER: R03 test-local mutation classifier.

FAILURE_CLASS: TEST / ABSTRACTION_BOUNDARY.

ROOT_CAUSE: assertKnownFailureKinds uses vitestTimeoutDiagnostic.test(error.message)
as a sufficient exception, without checking the error's structured type/name.
The preceding common preflight runs, but cannot reject the TypeError because
the message-based exception labels it known.

WHY_PREVIOUS_FIXES_FAILED: Previous controls tested unknown TypeErrors whose
messages lacked timeout markers and valid Vitest timeout errors separately.
Their compositions did not include an unknown typed error containing a marker.

SPEC_CHANGE_REQUIRED: NO. Production and OpenSpec product specification are
unchanged. Preserve the previously approved numeric timeout formats, ordinary
spawn timeout handling and exact first-frame domain-origin rule.

## Required repair and process state

First add permanent failing controls for typed unknown errors with embedded
timeout markers at test/suite/module/global, completed and partial evidence,
with/without spawn timeout. Use the actual schema-2 reporter and installed
Vitest timeout producer to distinguish real timeout kinds from unknown ones.
Then repair only the classifier/control paths; retain all known positives.
Run the complete inventory and audit every child, perform fresh formal Verify,
then obtain a new independent POST review. The current historical inventory
score does not authorize progression.

Reopen tasks 4.5 and 5.1. Keep BASE_COMMIT unchanged, POST FAIL,
ARCHIVE_ALLOWED false and R04 blocked. This is not a new planning cycle.
MODEL_CHECKPOINT: Switch to Sol high for the complex harness/control repair;
this turn records and reproduces the failure but does not edit the harness or
production.
