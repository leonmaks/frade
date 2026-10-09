# P01-NATIVE-RESIZE-SETTLEMENT-FIXTURE-01

Status: PROPOSED, NOT_ACCEPTED. Only readiness of two existing Electron fixtures. No production, vendor, routing, domain, tolerance or persisted-state change.

## Observed blocker

On unchanged e5edd771 source, full pnpm check:all exited1: Draw215PASS, desktop116PASS/13FAIL. All3478 source hashes unchanged. Raw result: evidence/p01-upper-focus-full-root-20261003T200130Z.

Unchanged targeted control at evidence/p01-upper-focus-full-failure-control-20261003T205400Z reproduced both original lower-matrix light compact and open-chain reflow failures; the new body-focus light compact case passed. That PASS does not waive its earlier full-run failure or explain the remaining failures.

The reflow raw open-chain-observations.json records zero owned style writes, exact owned styles/nodes/identities, and viewport translation [1,234,258] -> [1,465,258]. Actual stacks separate native windowResized/sizeDidChange from later native toggleShapesPanel -> refresh -> sizeDidChange. The pinned vendor toggleShapesPanel uses a later transition timer and fires shapesPanelChanged at completion. Existing fixture waits for the first view event and six stable RAFs, which can precede completion of that native transition. Lower-matrix repeats a viewport dx change after the current readiness boundary; its full call-chain attribution remains to be established before repair.

## Exact proposed authority

Permit changes only in apps/desktop/tests/e2e/ui-contract-theme.spec.ts:

1. Readiness preparation inside the original P01-LOWER-matrix callback, before its existing baseline capture following intentional viewport changes.
2. Readiness preparation inside the original P01-REFLOW actual open chain callback, before its existing observation interval following intentional viewport/media changes.
3. A shared read-only helper in the new appended tail only if both fixtures need the same bounded observation.

No test change until a coherent accepted plan, strict validation and fresh stage-assigned independent PRE PASS. First retain exact original bytes/callback hashes and deterministic RED. Prove actual native transition completion from observed events, current sidebar transition/transform/geometry and graph/viewport stability. Do not assume one view event or six early frames means completion. Listener cleanup and bounded failure must be explicit. Do not force native state, call layout/domain methods, disable animation, replace callbacks, add arbitrary sleeps, retry whole assertions, swallow errors or merely move a baseline to accommodate an unexplained mutation.

Keep every original semantic/file/XML/view preservation, focus/geometry/contrast/zero-write/node-identity assertion and every action exact. Keep original numerical thresholds and all screenshots/evidence. Outside the specifically accepted readiness additions, all frozen prefix bytes/callbacks remain exact. Record a reverse-delta proof restoring the complete original bytes; the old origin is never silently moved or rebaselined. The authorized exception is limited to readiness in these two callbacks, not their expectations or any other old test.

The new readiness boundary must separate the intentional native resize from later operations being checked. Source evidence must establish that no bridge-caused mutation is hidden. If it cannot, STOP and classify the responsible integration/production issue; this proposal authorizes no production fix.

## Verification and limits

Reproduce both failures and prove causal transition timing before implementation; run both original fixtures, all six lower theme-density states, open-chain/media cases, original upper actions/V6/focus tests, final-source FUI12 before the existing permitted source-binding literal refresh, exact positive/negative controls, affected lint/typecheck/BDD and fresh full root. Original remaining B02/focus failures stay open until individually explained and resolved. Verify and fresh automatic independent POST use the exact role/model/effort from the accepted owning stage plan; this decision changes no review model.

No current P01 checkbox closes by this decision. Human visuals, cumulative P01 POST/archive and P02 stay open. Routing V2 is independent and receives no changes.

## Why a human decision is required

The accepted P01-UPPER-FOCUS-UNCLIPPED-PROJECTION-01 says: "Test writes remain only the two already-new unit/Electron tails." These two older callbacks are inside the frozen186048-byte E2E prefix. This narrowly named exception requires explicit approval before reconciling the effective plan and requesting PRE.