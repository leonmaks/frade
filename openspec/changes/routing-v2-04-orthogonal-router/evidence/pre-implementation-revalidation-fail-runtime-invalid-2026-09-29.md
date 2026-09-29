# R04 PRE revalidation failure: runtime-invalid contract repair

Change: `routing-v2-04-orthogonal-router`
Gate type: `PRE_IMPLEMENTATION_REVALIDATION`
Gate status: `FAIL`
Date: 2026-09-29

This report is retained as the independent blocker. No production, R04 test,
frozen control, commit, or archive action is authorized by this result.

## Findings incorporated into planning

1. The retained candidate 82 is a mixed audit: three exact R01 finite-validation
   RangeErrors and four test-owned AssertionErrors. The contract may not filter
   the assertions. A bounded runtime-invalid result therefore requires complete
   schema-3 audit/report correspondence, exact test-level ownership for
   affirmative assertions, and retention of all seven failures.
2. The classifier must receive the complete candidate record. The admissible
   rule is bound only to `enumerateConnectors` in
   `orthogonal/router/channel.ts`, span 4808..4809, `<` to `<=`, candidate id
   `8bd1221e9eef34a5d48b396f2d65f64e5f7b3b3e1928e6260f1ae8d17270fa73`, the
   recorded source and mutated hashes, and the lower-layer
   `model/validation.ts` hash. The symmetric `>` rule and unindexed sites are
   deferred.
3. The actual ternary produces only `horizontal step.x` and `vertical step.y`
   messages. The previous four-way cross-product claim is removed.
4. Fatal evidence is preflighted before timeout selection. Signals, unknown or
   infrastructure evidence, malformed/partial ownership and runtime-invalid
   plus timeout abort. Spawn `ETIMEDOUT` is a timeout only for known-only
   timeout evidence.
5. Scoring is explicit and disjoint: `effectiveKilled = cardinality(rawKilled
   union runtimeInvalid)`, with duplicate candidates counted once; compiler-valid
   survivors/timeouts remain in the denominator; compiler-invalid candidates are
   excluded; incomplete/aborted inventories have no score.
6. Permanent controls must cover metadata/site/hash binding, mixed evidence,
   ownership levels, nested/aggregate errors, timeout/signal precedence,
   duplicate-union scoring and exact child/audit/report/progress correspondence.

## Required next step

Update the harness contract and regression plan as specified in `design.md`
section 6a and `tasks.md` tasks 1.9, 2.7 and 4.2. Then obtain a fresh
independent PRE revalidation bound to the live fingerprints. Do not implement
or run the complete inventory before that approval.

PLANNING_REPAIR_STATUS: SPECIFIED_PENDING_PRE_REVALIDATION
READY_FOR_IMPLEMENTATION: NO
