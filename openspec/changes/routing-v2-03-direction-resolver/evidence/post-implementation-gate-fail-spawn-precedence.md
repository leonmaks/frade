# Independent R03 POST FAIL — spawn-timeout precedence

CHANGE: routing-v2-03-direction-resolver
GATE_TYPE: POST_IMPLEMENTATION
GATE_STATUS: FAIL
ARCHIVE_ALLOWED: NO
SOURCE: Independent review report supplied by the user on 2026-09-28.
BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c

## Required blocker

At packages/draw/tests/routing-v2/direction/mutation/run.mjs:50, spawn ETIMEDOUT
returns timeout before unknown structured errors are checked. Independent
controls cloned a retained failed child, preserved valid assertion evidence,
added an unknown TypeError and a Test timeout diagnostic, and supplied spawn
ETIMEDOUT.

| Unknown-error location | Without spawn timeout | With spawn timeout | Required |
| --- | --- | --- | --- |
| Test | abort | timeout | abort |
| Suite | abort | timeout | abort |
| Module | abort | timeout | abort |
| Global | abort | abort | abort |

This violates unknown-failure abort precedence. The controls are composed
classifier probes, not evidence that saved inventory children had these failures.
Repair must preserve ordinary spawn-timeout handling while rejecting available
unknown failure evidence. Regression controls, complete mutation execution,
fresh formal Verify and independent POST must follow.

## Other independent review findings supplied by the user

No resolver correctness defect was found. Reported independent checks:

- Scope: NUL union baseline-to-HEAD 0, staged 0, unstaged 2, untracked 679,
  total 681 authorized paths; final hashes/status unchanged.
- Inward direction dependencies, no reverse imports.
- 100,000 contract probes for masks, fixed sides, FINAL singleton override,
  paired rows, overlaps, deterministic ties and source-role ordering.
- 52 numeric boundary rejection checks; copied deeply frozen evidence.
- All 900 unique reference expectations and nine direct cases recomputed
  against hash-pinned vendor extraction and matched.
- Six properties replayed: seed 0xFAD003, raw 5106 / accepted 5000 / rejected
  106, zero domain violations; replay94 rejected; reflected identical bounds
  remained NORTH/SOUTH, quadrant 2.
- Mutation raw/aggregate equality, all 86 child hashes, all executable
  classifications and complete AST inventory checked: 85 candidates, 67 killed,
  18 compiler-invalid, zero survivors/timeouts, denominator 67, score 100%.
  All 18 diagnostic sets independently reproduced in memory.
- All 32 previous formal classifier controls passed, including installed
  numeric timeout producers and domain-origin binding. Their coverage missed
  this spawn-timeout composition.
- Fresh R01/R02/R03 compiler fixtures, Draw typecheck, scoped lint, strict
  validation and diff check passed. Retained runtime totals: R03 118, R01 92,
  R02 126. Full filesystem-writing runs were not repeated by the reviewer.
- Installed gate passed; 14 planning fingerprints, 39 frozen snapshots,
  approval records/modes and 62 additional read-only adversarial checks
  verified. Filesystem self-tests were inspected using retained evidence.
- Legacy/vendor/package exports/R01/R02 dependencies unchanged; no R04+
  implementation. Tasks 5.2–5.4 are future sequential checkpoints.

These findings are attributed to the supplied independent report, not newly
claimed as executions by the receiving agent.

## Receiver's direct read-only reproduction

The actual current classifier was extracted in memory without running main().
A retained killed child from the final aggregate was cloned for each location.
Unknown TypeError was added beside its existing assertion evidence and a
Test timed out in 1e-7ms diagnostic. Eight with/without-ETIMEDOUT controls
reproduced the exact matrix above. Ordinary spawn ETIMEDOUT without a report
still returned timeout. Node exited 0. Actual outputs are retained in
post-implementation-spawn-timeout-precedence-controls.json.

No harness, regression-test or production file changed during this reproduction.
The approved SHA was read with git rev-parse HEAD and remains unchanged.

## Root-cause analysis before further repair

FAILED_INVARIANT: Available unknown/global/infrastructure failure evidence must
abort before every outcome-return branch, including spawn ETIMEDOUT.
RESPONSIBLE_LAYER: R03 test-local mutation classifier.
FAILURE_CLASS: TEST / ABSTRACTION_BOUNDARY.
ROOT_CAUSE: Fatal-evidence validation is split across branches. Global/textual
infrastructure failures are checked first, but test/suite/module unknown errors
are validated only after the early spawn-timeout return.
WHY_PREVIOUS_FIXES_FAILED: Controls checked plain spawn timeout and unknown
errors combined with Vitest timeout separately, without composing unknown
structured errors and spawn ETIMEDOUT at each error location.
SPEC_CHANGE_REQUIRED: NO.

The next repair must define a common fatal-evidence preflight for available
structured errors before accepting any timeout/kill/survival outcome. Ordinary
spawn timeout may lack a completed audit or standard report; do not require a
completed run merely to preserve that outcome. Available partial error evidence
must not be discarded. Preserve typed assertion/domain-origin handling and
infrastructure/global abort precedence.

Before another fix, add failing controls for test/suite/module/global unknown
errors with and without spawn ETIMEDOUT, plus plain spawn-timeout positive
controls with absent/incomplete reports. Inspect all outcome-return paths,
rather than adding one more local exception. Then run controls and the complete
inventory, fresh formal Verify, and fresh independent POST in that order.

## Process consequences

The prior formal PASS is superseded for progression by this POST FAIL.
Reopen tasks 4.5 and 5.1. Keep production/tests frozen until the authorized
repair checkpoint; all production changes remain forbidden. Archive and R04
remain blocked. Do not start a new planning cycle or move BASE_COMMIT.

MODEL_CHECKPOINT: Switch to Sol high for the narrowly scoped harness/control
repair. This receiving turn records evidence and stops without editing code.
