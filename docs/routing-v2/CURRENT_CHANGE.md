# Routing Engine V2 — Current Change

PROGRAM: Routing Engine V2
ACTIVE_CHANGE: routing-v2-03-direction-resolver
PREVIOUS_CHANGE: routing-v2-02-terminal-perimeter
SEQUENCE_POSITION: R03_OF_10
PHASE: VERIFICATION

APPROVED_PLANNING_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c
BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c
PREVIOUS_CHANGE_STATUS: CLOSED
PREVIOUS_CHANGE_ARCHIVED: true
PREVIOUS_CHANGE_POST_IMPLEMENTATION_GATE: PASS

PRE_IMPLEMENTATION_GATE: PASS
PRE_IMPLEMENTATION_GATE_EVIDENCE: openspec/changes/routing-v2-03-direction-resolver/evidence/pre-implementation-review.json
PRE_REVALIDATION_REQUIRED: false
MACHINE_ARCHITECTURE_GATE: PASS
IMPLEMENTATION_STATUS: COMPLETE
IMPLEMENTATION_TESTS: PASS
MUTATION_TESTING: PASS
VERIFICATION_STATUS: PASS
VERIFICATION_EVIDENCE: openspec/changes/routing-v2-03-direction-resolver/evidence/openspec-typed-timeout-verification.md
PROPERTY_DOMAIN_CONFORMANCE: PASS
VERIFICATION_REPAIR_EVIDENCE: openspec/changes/routing-v2-03-direction-resolver/evidence/mutation-typed-timeout-repair.md
ACTIVE_VERIFICATION_BLOCKER: NONE
POST_IMPLEMENTATION_GATE: PASS
POST_IMPLEMENTATION_GATE_EVIDENCE: openspec/changes/routing-v2-03-direction-resolver/evidence/post-implementation-gate-pass.md
ARCHIVE_ALLOWED: true
ARCHIVE_PREREQUISITE: complete task 5.3 implementation-commit checkpoint
NEXT_CHANGE: routing-v2-04-orthogonal-router
NEXT_CHANGE_ALLOWED: false

OBJECTIVE:
Specify deterministic framework-independent quadrant and relative-geometry
classification, mask-filtered direction preferences, and source/target
direction selection for the Routing V2 pipeline without constructing routes.

## IMPLEMENTATION_SCOPE

```text
packages/draw/src/routing/orthogonal/direction/**
packages/draw/tests/routing-v2/direction/**
```

These are prospective implementation paths, not permission to write product
code or tests during PLANNING.

## PROCESS_CONTROL_SCOPE

```text
openspec/changes/routing-v2-03-direction-resolver/**
docs/routing-v2/CURRENT_CHANGE.md
scripts/routing-v2-architecture-gate.mjs
docs/routing-v2/workflow-models.md
```

The workflow reference was separately requested before R03 and will be included
in the approved planning checkpoint. Gate and workflow edits are PLANNING-only;
after approval they must match the approved planning commit in every Git layer.

## READ_ONLY_DEPENDENCIES

```text
packages/draw/src/routing/model/**
packages/draw/src/routing/geometry/**
packages/draw/src/routing/terminal/**
packages/draw/src/routing/perimeter/**
packages/draw/tests/routing-v2/geometry/**
packages/draw/tests/routing-v2/terminal/**
packages/draw/tests/routing-v2/perimeter/**
openspec/specs/routing-geometry-kernel/**
openspec/specs/routing-terminal-perimeter/**
```

R03 builds on R01/R02. An extension need is a planning blocker, not permission
to opportunistically change an earlier layer.

## Frozen during implementation

- docs/routing-v2/drawio-routing-master-spec.md
- docs/routing-v2/implementation-playbook.md
- docs/routing-v2/legacy-boundary.md
- scripts/routing-v2-architecture-gate.mjs
- docs/routing-v2/workflow-models.md
- AGENTS.md
- packages/draw/src/routing/AGENTS.md

If implementation requires a frozen-file edit, STOP IMPLEMENTATION, classify
SPEC_CONFLICT or ARCHITECTURE_CONFLICT (or PROCESS_CONTROL_DEFECT for a gate
defect), return to PLANNING, and rerun independent PRE revalidation. Never move
BASE_COMMIT to hide a failing diff.

## Next checkpoint

The previous mutation rerun reported 85 candidates, 67 killed and 18
compiler-invalid, but independent POST review invalidated that score as
required evidence: classifyRun treats unrecognized nonzero child exits as
kills, including Vitest test timeouts and infrastructure failures. Child
outputs were not retained for independent exclusion of false kills. Preserve
the old reports as historical evidence; do not use their score for approval.

Formal OpenSpec Verify found two test-evidence gaps: the seeded property
generator accepted fixed-point cases outside [-100000,100000], and no direct
fixture covered reflected identical bounds. The Luna high test-only repair is
complete. Property generators now stay within
the declared coordinate domain, including reflected bounds; the direct
identical-bounds tie fixture asserts the NORTH/SOUTH policy. R03, R01, and R02
test suites, Draw typecheck, scoped lint, full mutation run, strict OpenSpec
validation, architecture gate, and diff check all passed. See
evidence/test-only-repair-results.md.

Task 4.3 remains complete. Tasks 4.5 and 5.1 are reopened because the required
mutation evidence is invalid. The earlier Sol Verify PASS is superseded for
progression by independent POST FAIL; preserve its report as historical
evidence. No resolver correctness defect was found by the independent review.

The Luna high test-harness-only repair is complete. Classifier regression
controls pass; the complete 85-candidate inventory reports 67 killed,
18 compiler-invalid, zero survivors/timeouts and 100% score. All 67 executable
child stdout/stderr and Vitest JSON reports are retained individually and
SHA-256 linked; the passing 116-test baseline and all compiler diagnostics are
also retained. See evidence/mutation-results-classifier-repair.json and its
childResultsDirectory. A first attempt aborted on a too-strict Vitest suite
count check; that attempt did not produce a score and remains separately
auditable.

The later POST review identified two timeout diagnostics missed by the
integer-only matcher: `Hook timed out in 5ms.` and `Test timed out in 0.5ms.`.
The harness-only repair adds controls for both and requires a valid failed
Vitest run plus failed assertions before returning timeout. The complete
85-candidate inventory has now been rerun successfully: 67 killed,
18 compiler-invalid, zero survivors/timeouts, score 100%, baseline 116/116.
Task 4.5 is complete again; task 5.1 is open until fresh formal Verify. Every
baseline/candidate child result is retained for audit. See
evidence/mutation-timeout-diagnostic-repair-results.md. The prior formal Verify
PASS and POST FAIL remain historical until fresh formal Sol high Verify and
independent Astra high POST review complete. Keep production frozen. Do not
commit/archive/start R04. BASE_COMMIT remains the approved planning SHA.

## Frozen during verification

The historical Sol high Verify reproduced scientific-notation timeout
misclassification; its FAIL report remains at
evidence/openspec-timeout-diagnostic-reverification.md. The authorized harness-only
repair now records typed test/suite errors, recognizes timeout markers without
parsing durations, rejects unknown/global/infrastructure failures, and binds the
known resolver membership-guard exception to its actual isolated source origin.
Actual Vitest regression controls and the complete 85-candidate rerun passed:
67 killed, 18 compiler-invalid, zero survivors/timeouts, score 100%. All 86
child hashes and 67 executable classifications were checked; the AST inventory
matched exactly. The production SHA-256 snapshot is unchanged. Task 4.5 is
complete; formal Sol high Verify passed and task 5.1 is complete. The next
checkpoint is fresh independent Astra high POST. See evidence/mutation-structured-error-repair.md
and evidence/mutation-structured-error-audit.json. Prior formal/post results are
historical, not fresh approval. Do not commit/archive/start R04. BASE_COMMIT is
unchanged.

The following R03 production and test trees are frozen for formal verification:

Latest formal Verify: evidence/openspec-final-mutation-verification.md, with
the actual 32-control classifier/retained-inventory audit linked alongside it.
The formal PASS is historical and superseded for progression by a new independent
POST FAIL: spawn ETIMEDOUT bypasses available unknown test/suite/module errors.
See evidence/post-implementation-gate-fail-spawn-precedence.md and the linked
direct eight-control reproduction. Tasks 4.5 and 5.1 are reopened. Root cause
is split fatal-evidence validation before outcome returns; no specification
change or production modification is required. Stop at the model checkpoint:
Sol high for authorized harness/control repair, then complete inventory, fresh
formal Verify and independent POST. Archive, commit and R04 remain blocked.

The authorized Sol high harness-only repair is now complete. Available unknown
structured failures are checked in the common fatal-evidence preflight before
spawn timeout or any other outcome. New regression controls first reproduced
the defect; self-tests, the complete 85-candidate rerun and retained-child audit
passed: 67 killed, 18 compiler-invalid, no survivors/timeouts, 100% score.
All 86 child hashes and 29 production hashes were verified. See
evidence/mutation-spawn-precedence-repair.md. Task 4.5 is complete; fresh formal
Verify and independent Astra high POST remain mandatory. BASE_COMMIT is unchanged.

Fresh formal Sol high Verify now passed after the spawn-timeout precedence
repair: evidence/openspec-spawn-precedence-verification.md. Read-only composed
controls, retained inventory/hash/raw/progress audits and strict compiler
fixtures passed; product/scenario mappings remain coherent. Task 5.1 is complete
and progress is 23/26. Production and tests remain frozen. The next checkpoint
is fresh independent Astra high POST using evidence/post-implementation-gate-prompt.md.
Historical POST FAIL is retained until a new independent result; archive,
implementation commit and R04 remain blocked. BASE_COMMIT is unchanged.

- packages/draw/src/routing/orthogonal/direction/**
- packages/draw/tests/routing-v2/direction/**

Only active-change process evidence and CURRENT_CHANGE.md may be updated during
verification. If verification finds a correctness defect, record the blocker
and return to the authorized repair phase before modifying production or tests.

The new independent Astra high POST review found a further classifier defect:
assertKnownFailureKinds treats a timeout marker inside an unknown TypeError as
sufficient timeout evidence. Completed and partial test/suite/module errors can
therefore return timeout; global errors still abort. Read-only replay reproduced
9 wrong outcomes in a 16-case composed matrix. See
evidence/post-implementation-gate-fail-embedded-timeout-type.md and the JSON
controls. The previous Sol formal PASS is historical and superseded for
progression. Tasks 4.5 and 5.1 are reopened (21/26 complete); mutation and
verification evidence are FAIL. The prior 100% inventory cannot authorize
archive. No product defect, specification conflict or baseline change is
required. Stop at the model checkpoint: Sol high for regression-first harness
repair, complete inventory, fresh formal Verify and independent POST. Do not
commit/archive/start R04.

The authorized Sol high typed-timeout harness repair is complete. New
regression-first controls failed before the fix and pass now; the actual
schema-2 reporter preserves the unknown TypeError kind. The complete fresh
85-candidate inventory reports 67 killed, 18 compiler-invalid, zero
survivors/timeouts and 100% score. Every child hash, executable outcome,
AST candidate and raw/progress count was checked. See
evidence/mutation-typed-timeout-repair.md. Task 4.5 is complete again. Fresh
formal Verify and independent Astra high POST remain mandatory; the earlier
Verify PASS is historical. BASE_COMMIT is unchanged. No commit/archive/R04.

Fresh formal Sol high Verify has now passed after typed-timeout repair:
evidence/openspec-typed-timeout-verification.md. The 16-cell retained-child
matrix explicitly aborts unknown errors, and all 86 child hashes, 67
executable outcomes, AST inventory, raw/progress evidence and 25 frozen
source/test hashes were checked. Task 5.1 is complete (23/26 overall).
Production and tests remain frozen. A new independent Astra high POST must
review this exact evidence; historical POST FAIL cannot authorize archive,
commit or R04. BASE_COMMIT is unchanged.

The latest independent Astra high POST found a workspace scope blocker: six
unrelated untracked Frade Brand v1 input files under literal ` _input/` (with
a leading space) caused the installed architecture gate to fail. These six
files have been preserved outside the checkout at `E:\dev\codex\frade-brand-v1`;
relative paths and SHA-256 hashes all match. Fresh installed gate PASS now
covers 875 authorized paths, and strict validation/diff check pass. See
evidence/post-implementation-gate-fail-workspace-scope.md. Formal Verify
remains PASS because its 25 source/test hashes are unchanged. POST remains
FAIL pending a fresh independent read-only review; task 5.2, archive, commit
and R04 remain blocked. BASE_COMMIT is unchanged.

The fresh independent Astra high POST review supplied by the user passed with
no blockers. Its actual report is preserved in evidence/post-implementation-gate-pass.md.
Task 5.2 is complete and progress is 24/26. Earlier POST FAIL reports remain
historical; the current POST status is PASS. Formal Verify and the unchanged
25-file frozen snapshot remain valid. Archive permission is conditional on
first completing task 5.3: final process/staged checks and the implementation
commit. Tasks 5.3 and 5.4 are still open; production/tests remain frozen.
No commit, archive or R04 work has been performed in this recording step.
BASE_COMMIT remains the approved planning SHA and NEXT_CHANGE_ALLOWED is false.
