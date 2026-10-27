# Pure document facade — focused PRE plan

Objective: keep the native dirty comparator pure and satisfy actual source boundaries
without loading React/X6 or changing dependencies, package exports, bundler behavior,
archived evidence, old assertions or routing. Product behavior remains unchanged.

Observed actual evidence: boundaries01 rejects @frade/draw/document; temporary import
through the allowed root barrel makes boundaries02 PASS, but workspace-direct run
2026-10-27T02-35-10-412Z fails two suites before execution with X6 exports-is-not-defined
ESM error (307 existing assertions pass; affected suites unexecuted). Earlier exact
pure-facade workspace runs passed319. Keep both failures, no claim of current PASS.
RCA ABSTRACTION_BOUNDARY: current rule recognizes only the UI barrel; that barrel
initializes DiagramEditor/X6. Pure serialize.ts→drawing.ts/schema.ts already exists as
the public ./document export and is already used by Runtime Node. Importing it is the
correct inward dependency, not a new package or backend privilege.

Alternatives (judgment forecasts): retaining UI root and changing test dependency
transpilation10–30min masks the pure/UI coupling and changes unrelated packaging;
lazy-loading/restructuring root UI exports30–90min broadens behavior and API; copying
codec into workspace or injecting it from the renderer is a wrong domain boundary;
relative-private imports/wildcards weaken protection and are forbidden. Select an
explicit exact-public-facade source permission: implementation/test1–3min plus focused
review forecast4–8min. No success probability measured. General suite costs remain
mandatory; uniform exact-source binding means final source changes invalidate earlier
all-input records. Repeating bounded237/21/319 suites (~6–18s) and Draw232 (~128s) costs
less and is safer than inventing another per-role proof system during closure.

After PRE PASS only:
1. In inspectWorkbenchSource add @frade/draw/document only for ui-workspace. Do not add
it to workbenchPolicies, package dependencies, other packages or a prefix allowlist.
2. Restore comparator import to that facade; remove unnecessary temporary root helper
export. Keep every semantic comparator assertion and all previous source guards.
3. Positive contract fixture plus private/unknown/deeper/escape/privileged/dependency
negatives prove the exact grant. Verify existing ./document target is unchanged and
its three pure source files contain no UI/DOM imports. No test skip/tolerance change.
4. Run actual boundary and workspace direct suites, then fresh full required closure,
full source binding/OpenSpec verification/POST. Any new deterministic failure stops.

Authorized additional paths: scripts/check-workbench-boundaries.mjs and its existing
tests/contract/workbench-boundaries.test.mjs, plus already-owned comparator/root index
and change planning/evidence/dashboard. This supersedes only the earlier prohibition
on necessary unplanned checker edits by explicitly specifying this narrow contract;
it does not authorize a broader bypass. No production policy change yet. The added
test-only positive/negative fixture is prepared for deterministic RED before PRE.
Existing exact assigned PRE/POST gpt-6-sol/high remains authoritative in design.md.
