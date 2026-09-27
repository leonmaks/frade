# R03 test-only repair blocked by runtime contract failure

REPAIR_SCOPE: TEST_ONLY
PRODUCTION_EDITS_IN_THIS_REPAIR: NONE
TARGETED_ADDED_FIXED_AND_PREFERENCE_CASES: PASS (41/41)
CONTRACT_SUITE: FAIL (one case: array options are accepted)
FULL_MUTATION_RUN: NOT_RUN
READY_FOR_VERIFY: NO

The requested tests were strengthened for the 12 original survivors: inclusive
fixed-side/span boundaries, equal horizontal-gap raw preference, complete ordered
and deduplicated evidence, malformed options, and target fixed disposition.

The malformed-options regression passes null, number and string checks but finds
that [] is accepted. The OpenSpec requires malformed options to throw TypeError;
the current implementation checks null/non-object values but does not reject an
array. This is an implementation defect, and the unchanged production-scope
instruction prevents repairing it in this test-only task. The mutation runner
requires a passing complete unit/reference baseline, so running it with this
failure would produce no valid mutation score. Do not remove the array case,
exclude its test, or call the failure a killed mutant.

The auto-review rejected an edit that would have removed [] from the invalid
options fixture because it would weaken the test. The fixture remains intact.
The production implementation task 3.1 is reopened pending a separately
authorized production repair. BASE_COMMIT remains ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c.
