# R03 PRE_IMPLEMENTATION gate — independent read-only prompt

## Second revalidation: report-to-fingerprint content binding

Read evidence/pre-implementation-revalidation-fail.md. The previous revalidation found one remaining blocker: design could change and proof.artifacts could be recomputed while the old report and its reportSha256 stayed unchanged. No new product-semantic blocker was found.

Inspect the installed extraction of one unambiguous fingerprint from the actual saved report. Require exact equality report fingerprint = manifest artifacts = canonical checkpoint hashes. Verify matching positive, missing fingerprint, duplicate/malformed fingerprint, duplicate JSON keys and changed-design/recomputed-manifest regressions. In the stale-report regression confirm the saved report bytes and its SHA remain unchanged. Replacing the report's fingerprint is a new review, not an execution-agent repair of old approval.

Preserve all previous scope, numerical, reference, mutation-plan and four-source/snapshot gate criteria. Do not accept machine PLANNING PASS as independent approval.

## Earlier repair criteria retained

The product specification is unchanged. Inspect evidence/pre-implementation-gate-fail.md and the actual repairs; do not accept the execution agent's conclusions. The prior PRE found four blockers:

- unapproved planning checkpoints could enter implementation, without a linked independent PASS or reviewed artifact fingerprint, and could hide forbidden baseline changes;
- fast-check was claimed installed but is absent;
- actual POSIX WORKTREE executable mode was not enforced;
- master §74 mutation score >=90% had no executable plan.

Verify committed PRE PASS, actual report and exact reviewed artifact hashes, provenance from R02 closing commit through every intervening planning commit, and rejection of reverted forbidden history. Verify all HEAD/INDEX/WORKTREE records and platform-specific mode policy, including the executable negative POSIX probe on Windows. Inspect missing/failed/stale evidence regressions and their positive controls.

Verify existing R02 conditioned-property harness availability, explicit R03 seed/count/replay policy, no dependency-manifest edits, and the test-local mutation runner plan with complete inventory and honest score calculation. Require the FINAL singleton override to remain unlocked during paired preference-row construction. Inspect TAB/LF NUL-parser regressions; native filenames are required only where the platform permits them.

If PASS, include the exact artifact fingerprint JSON in the report, computed at the END of review without writing any files:

```powershell
node --input-type=module -e "import {planningReviewFingerprint} from './scripts/routing-v2-architecture-gate.mjs'; console.log('REVIEWED_ARTIFACTS_JSON_BEGIN'); console.log(JSON.stringify(planningReviewFingerprint(), null, 2)); console.log('REVIEWED_ARTIFACTS_JSON_END')"
```

Include those two marker lines exactly once as plain lines surrounding the unmodified pretty JSON body. Do not duplicate keys, escape the JSON into a string or reformat it. If the review fails, no fingerprint is required.

Use one-line CHANGE/GATE_TYPE/GATE_STATUS/READY_FOR_IMPLEMENTATION fields, each exactly once. Do not claim cryptographic reviewer authentication: the manifest binds a saved review to reviewed content. This execution agent must still persist your actual report and returned hashes before checkpoint; no implementation is authorized by a machine PLANNING PASS.

You are the independent reviewer for routing-v2-03-direction-resolver.
Use GPT-6 Astra with high reasoning in a fresh READ-ONLY context.
Do not rely on the execution agent's reasoning or merely trust checkboxes/reports.
Do not modify production, tests, planning artifacts or controls during this review.

Read root AGENTS.md, packages/draw/src/routing/AGENTS.md, CURRENT_CHANGE.md,
master spec, playbook, legacy boundary, workflow-models.md, the complete active
proposal/spec/design/tasks, and both archived main capability specs.
Inspect actual R01/R02 APIs, pinned draw.io direction source, installed gate,
all gate self-tests and actual Git state.

CHANGE: routing-v2-03-direction-resolver
GATE_TYPE: PRE_IMPLEMENTATION
EXPECTED_PHASE: PLANNING
EXPECTED_BASE_COMMIT: 2b6619627e3e744007b06251a05dad86e7bce634

Production scope is ONLY packages/draw/src/routing/orthogonal/direction/**.
Tests scope is ONLY packages/draw/tests/routing-v2/direction/**.
Product source/tests must not already exist as R03 changes during planning.
R01/R02 source, tests, main specs and archives remain read-only.
The separately requested workflow-models.md is an explicit planning control
path, included in the checkpoint and frozen after approval.

Review all of the following without weakening criteria:

1. Proposal/spec/design/tasks describe one coherent routing-direction-resolver
   capability. Every requirement/scenario has meaningful test/implementation tasks.
   No unresolved numerical/domain decision is deferred to implementation.
2. Validate quadrant numbering, EPSILON zero bands, signed vs non-negative gaps,
   overlap/containment/zero extents, finite arithmetic errors and no quantization.
3. Validate every non-empty mask pair is total; singleton precedence, fixed-side
   filtering, R02 effective-mask precedence, target outward semantics and corners.
4. Compare the exact preference branches with pinned mxEdgeStyle OrthConnector.
   Actively construct counterexamples with fixed endpoints, differing masks,
   overlap, axes, identical centers, differing sizes and source/target exchange.
   Determine whether proposed intentional adaptations preserve the master contract.
5. Test unconditional symmetry claims for impossibility. Verify that conditioned
   mirror/translation domains are defined independently of production output and
   retain direct excluded-tie/cancellation fixtures. Source-role priority must be
   explicit, not accidentally hidden by a false universal exchange property.
6. Require the 4 x 15 x 15 matrix with independent reference-derived expected
   pairs, plus direct edge cases, strict tsc negative fixtures and six generated
   properties with >=5000 accepted cases each and reproducible seed/accounting.
   Inspect reference extraction feasibility and independence from V2 helpers.
7. Inspect actual gate code and self-tests. Discovery must independently union
   BASELINE_TO_HEAD, STAGED, UNSTAGED, UNTRACKED, with NUL-safe path parsing.
   Require executable cancellation/deletion-recreation, committed forbidden
   changes, rename old+new, copy destination, allowed positive controls and unusual
   filenames. Inspect source HEAD/INDEX/WORKTREE independently.
8. R03 scope/state/dependency rules must reject archived layers, sibling
   orthogonal/jetty/route work, later layers, reverse imports, framework/browser/
   legacy imports, cycles and product writes in PLANNING. Freeze checks must bind
   approved planning BASE_COMMIT and HEAD/INDEX/WORKTREE control content/modes.
   Do not accept merely because the installed gate returns PASS.
9. No implementation baseline is approved yet. PRE PASS precedes checkpoint
   commit; that new SHA must become the implementation baseline. Frozen control
   changes require PLANNING/PRE revalidation, never a baseline move to hide defects.

Run read-only checks from repository root:

```powershell
git status --short --branch
git diff --check
openspec validate routing-v2-03-direction-resolver --strict
node scripts/routing-v2-architecture-gate.mjs --self-test
pnpm run routing:v2:arch-gate
```

The self-test command creates and removes only isolated temporary Git fixtures.
R03 unit/property/compiler implementation suites are future tasks, not evidence
that can be claimed as executed during PLANNING.

Return exactly one unambiguous gate status with concrete repository evidence:

CHANGE: routing-v2-03-direction-resolver
GATE_TYPE: PRE_IMPLEMENTATION
GATE_STATUS: PASS | FAIL
BLOCKERS:
SPEC_ALIGNMENT:
SCOPE_ALIGNMENT:
ARCHITECTURE_ALIGNMENT:
TEST_COVERAGE_ALIGNMENT:
NUMERICAL_CONTRACT_ALIGNMENT:
REFERENCE_ALIGNMENT:
MACHINE_GATE_INTEGRITY: PASS | FAIL
LEGACY_ISOLATION:
NON_BLOCKING_RECOMMENDATIONS:
READY_FOR_IMPLEMENTATION: YES | NO

Any semantic conflict, correctness/architecture issue, missing essential
test contract or machine-gate integrity defect is a blocker and means FAIL.
Do not mark implementation ready from syntax validation alone.
