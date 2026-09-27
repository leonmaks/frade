# Fresh read-only R03 POST gate — Astra high

Perform the independent POST_IMPLEMENTATION Architecture Gate for
routing-v2-03-direction-resolver in a fresh read-only context after formal
OpenSpec Verify passes against the repaired mutation harness. The previous
POST review returned FAIL; its blocker is recorded in
evidence/post-implementation-gate-fail.md. Current repair evidence is in
evidence/mutation-typed-timeout-repair.md, with completed inventory at
evidence/mutation-results-2026-09-27T22-22-04-681Z-22644.json. Latest formal
Verify: evidence/openspec-typed-timeout-verification.md; fresh controls and
retained-run audit: evidence/openspec-typed-timeout-verification-audit.json.
The latest historical POST workspace-scope FAIL is in
evidence/post-implementation-gate-fail-workspace-scope.md. Six unrelated
brand input files were moved, with SHA-256 verification, to the sibling
`E:\dev\codex\frade-brand-v1` directory. Recheck NUL-safe scope discovery and
the installed gate independently; do not infer POST PASS from the executor's
gate result. The prior typed-timeout FAIL remains in
evidence/post-implementation-gate-fail-embedded-timeout-type.md. Do not run POST before that
fresh Verify passes. Do not modify any repository file, production or test.

Read AGENTS.md, packages/draw/src/routing/AGENTS.md,
docs/routing-v2/CURRENT_CHANGE.md, workflow-models.md, master specification,
implementation playbook, legacy boundary and all active proposal/spec/design/
tasks. Read evidence/openspec-reverification.md as historical pre-POST-repair
Verify evidence, original failed Verify, POST FAIL report, latest Sol
re-verification report if present, classifier repair, latest mutation
raw/results and implementation evidence. Do not accept a historical Verify
PASS as current.

Specifically inspect the final schema 2 reporter, test/suite/module/global errors,
permanent regression controls and fresh formal Verify control outcomes.
Independently compose unknown typed errors at each of those four locations with
valid assertion evidence, Vitest timeout diagnostics AND spawn ETIMEDOUT: all
must abort. Test partial available audits as well as completed ones. Preserve
ordinary spawn timeout with no/partial known-only reports as timeout, never
kill. Verify that the shared fatal-evidence preflight precedes EVERY outcome.
Construct unknown TypeErrors, adapter-prefixed generic Errors with embedded
timeout text, and mismatched AssertionError type/name at test/suite/module/
global in complete and partial audits, with and without spawn ETIMEDOUT and
separate Hook/Test diagnostics. They must abort specifically as unknown errors.
Inspect the actual schema-2 reporter's preserved error kinds. Real installed
Vitest Test/Hook timeout errors must still classify timeout for integer,
decimal, scientific and subnormal durations; ordinary spawn timeout must
remain timeout when reporters are absent or partial.
Independently reproduce integer, decimal,
scientific/subnormal Test and Hook timeout handling using the installed Vitest
producer; timeout must never count as kill. Verify infrastructure/global/unknown
failures abort even beside valid assertions or timeout diagnostics. Inspect the
one supported mask-membership domain exception: its exact message/type must
originate in the FIRST evidence/resolve.ts frame under the actual runner-bound
isolated source root. Missing/different roots or a matching later frame must
abort; this must not become a generic Error exemption. Check all retained child
hashes/classifications and complete inventory against the actual current code.

BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c

Inspect independently the union of baseline-to-HEAD, staged, unstaged and
untracked paths, using NUL-safe parsing; inspect HEAD, INDEX and WORKTREE
where relevant. Untracked implementation must not be omitted. Never accept
the implementation solely because installed machine gate returns PASS.
Verify unchanged approved planning fingerprints, frozen controls, gate
self-tests, R01/R02 read-only dependencies, legacy/vendor/package exports,
and no R04+ work.

Actively construct counterexamples for complete mask filtering, fixed-edge
span/EPSILON/corner/degenerate policy, FINAL singleton override, paired rows,
deterministic ties, overlap, source-role ordering and allowed membership.
Review all 900 independent expected pairs and reference extraction provenance.
Review coordinate-space compiler negatives, finite derived failures, copied
readonly evidence and dependency direction. No route, jetty or UI behavior.

Check conditioned mirror/translation domains rather than assuming universal
symmetry. Recheck fixed-coordinate/reflected-origin bounds, accepted/rejected
accounting and replay94 rejection; directly check reflected identical-bounds
NORTH/SOUTH ties. Do not weaken numerical thresholds, assertions or quotas.
Inspect complete actual mutation run: 85 inventory, 67 killed, 18 compiler-
invalid, zero survivors/timeouts, 100% score; validate raw/report integrity,
isolation/import redirection, inventory completeness and denominator rules.
Check actual R03 and unchanged R01/R02 regression/compiler/lint evidence.

Run read-only validation/gate checks as useful; report any environment failure
separately from correctness. No independent approval may be inferred from
executor reports. Tasks 5.2–5.4 are sequential future lifecycle checkpoints;
do not require implementation commit/archive before this POST review.

Return CHANGE, GATE_TYPE: POST_IMPLEMENTATION, exactly one GATE_STATUS:
PASS or FAIL, BLOCKERS, SCOPE, DEPENDENCY_DIRECTION, DOMAIN_MODEL,
NUMERICAL_CONTRACTS, REFERENCE_PARITY, PROPERTY_TEST_INTEGRITY,
MUTATION_TEST_INTEGRITY, TEST_INTEGRITY, MACHINE_GATE_INTEGRITY,
LEGACY_ISOLATION, R03_R04_BOUNDARY, NON_BLOCKING_RECOMMENDATIONS,
ARCHIVE_ALLOWED: YES or NO. Every correctness or required-evidence blocker
means FAIL. This task authorizes review only; do not commit/archive/start R04.
