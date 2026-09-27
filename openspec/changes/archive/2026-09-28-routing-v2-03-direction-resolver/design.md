# Design

## Context

See proposal.md for motivation and specs/routing-direction-resolver/spec.md for normative behavior. R02 is CLOSED at 2b6619627e3e744007b06251a05dad86e7bce634. R01 supplies invariant Point/Rect spaces, Direction, EPSILON and projection relations; R02 supplies boolean DirectionMask/PortConstraint and effectivePortConstraint. R02 fixed/floating APIs intentionally do not select directions.

The master physical tree puts DirectionResolver under orthogonal. Therefore only orthogonal/direction/** is new R03 production scope; sibling orthogonal code remains R04+. No existing barrel is edited. No new dependency or framework adapter is needed.

Observed reference: apps/desktop/vendor/drawio/mxgraph/src/view/mxEdgeStyle.js, OrthConnector, lines 1197–1233 (quadrant), 1251–1275 (fixed edges), 1289–1435 (signed gaps/preferences). SHA256: 8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d. W/N/S/E numeric masks inside draw.io are reference implementation details; public V2 masks remain R02 booleans.

## Goals / Non-Goals

Goals: a pure decision API, explicit reason/evidence, total allowed selection, stable tests and a gate that actually enforces R03 before product work.

Non-goals: route/jetty/pattern generation, actual perimeter changes, rotation/flip support, terminal identity lookup, self-loop routing, hints/editing, persistence and package-root exposure. Zero-size bounds can be classified but do not authorize degenerate perimeter projection.

## Decisions

### Ownership and public API

Use directory-local contracts.ts, relative.ts, preferences.ts, resolve.ts and index.ts under packages/draw/src/routing/orthogonal/direction/. Names can vary without changing contract or scope.

Proposed signature:

```typescript
resolveDirections<S extends CoordinateSpace>(
  sourceBounds: Rect<S>,
  targetBounds: Rect<NoInfer<S>>,
  options?: DirectionOptions<NoInfer<S>>,
): DirectionResolution
```

Options contain optional sourceMask/targetMask (R02 DirectionMask) and fixedSource/fixedTarget (Point<S>). Make coordinate-bearing options invariant through the existing invariant primitives and inference control. Also export a same-space relative-geometry classifier as useful pure input evidence. Result contains no coordinates belonging to another space and no generated points; numeric gaps are scalar distances in the input space. Compile negative calls with strict tsc; Vitest transpilation alone is insufficient.

Use existing portConstraint validation to copy masks and existing geometry validation/finite-result helpers. Missing masks mean ALL; explicit malformed values do not. Callers use effectivePortConstraint before R03, preserving R02 precedence. Alternative rejected: duplicate numeric-mask types or modifying terminal contracts to select directions.

### Geometric classification and numerical decisions

Compute validated edges/centers and finite signed gaps without quantization. Use R01 relation primitives for non-negative separation/overlap. The spec defines the explicit quadrant snap and gap zero band; do not modify EPSILON or R01 helpers to obtain this policy. There is no division by width/height, so zero extents remain valid.

Keep raw center/gap values available internally and report zero-banded signed gaps separately from non-negative separation. Gap sign controls ordering only after zero-banding. Negative zero in exposed zero gaps must become positive zero. Test abs(dx/dy) below, equal to and above EPSILON on each axis, signed gaps around both +/-EPSILON, overflow at every derived stage and sub-grid geometry.

Fixed points are optional already-resolved coordinates; a matching routing-bounds side supplies evidence without projection. Span checks prevent an outside anchor on an infinite edge line being misclassified. Corners use vertical precedence. Ellipse diagonal anchors need not lie on a bounding-box side and therefore use geometric preferences.

### Preference selection and intentional reference adaptations

Follow the delta's ordered branch rules; implement explicit direction arrays instead of the reference's byte-packed bit arithmetic. A locked endpoint's initial order is empty; geometric ordering branches assign both rows as stated. The caller's masks remain authoritative and singleton overrides always win.

Selection stages:

1. Validate/copy every input and derive geometry.
2. Detect fixed-side candidates; lock only allowed candidates for non-singleton masks. Singleton masks do not create an early fixed lock: keep them unlocked during paired preference-row construction. Retain evidence even for a conflicting fixed candidate.
3. Compute raw H/V preferences from signed gaps and opposite target preferences; flip unavailable axis preferences only for unlocked endpoints.
4. Build the paired preference rows using the specified source-H/target-V, source-V/target-H, V/V, H/H or overlap default branch.
5. For each unlocked endpoint collect the four specified paired-row entries, deduplicate preserving order, filter its mask; append fixed WEST,NORTH,EAST,SOUTH fallback candidates only if the allowed list is otherwise empty.
6. Apply singleton selection as the FINAL override after paired preference rows are complete, then return new readonly evidence and assert membership. A direct fixture must distinguish this policy from an early singleton lock; the full 900 reference matrix must reject that alternative.

Evidence per endpoint contains fixedCandidate (if any), fixedDisposition (absent/not-on-side/allowed/filtered), raw horizontal/vertical, adjusted horizontal/vertical, orderedAllowedDirections, and selectedReason (singleton/fixed/preference/fallback). A global orderingBranch uses a closed explicit vocabulary. For singleton/fixed results orderedAllowedDirections includes the selected direction first; preserve enough geometric evidence to explain what was overridden.

Reference adaptations are explicit: model-space EPSILON replaces the one-pixel fixed-side test; span checks reject unrelated supporting lines; zero-banding aligns with R01 overlap; disallowed fixed sides never defeat masks; degenerate bounds do not divide by extent. Otherwise preserve pinned source-role preference ordering. Alternative rejected: generic nearest-side scoring, which loses draw.io branch behavior.

### Symmetry is conditioned, not unconditional

Reference ordering tries source-horizontal/target-vertical before the exchanged alternative. Thus arbitrary source/target exchange is not a direction-pair exchange law. Direct reverse-role fixtures document both outputs, especially diagonal arrangements. Single-axis-separated default-mask and forced-singleton examples can assert exchange where it is true.

Reflect BOTH geometries, fixed points and masks without exchanging roles. Non-tie conditioned reflection preserves selected cardinal signs. Axis sign ties, opposing-gap ties and ambiguous fixed corners are deliberately outside that property domain and covered directly, not silently discarded. At identical bounds an equivariant single-direction choice is mathematically impossible under both reflections; the specified NORTH/SOUTH fallback remains deterministic.

Safe common translation uses bounded integers/even extents as specified; arbitrary finite cancellation is a direct limitation fixture. No relaxation of EPSILON or result assertions is needed.

### Independent reference fixtures and test architecture

All new tooling/tests/configuration lives under tests/routing-v2/direction/. Proposed layout: unit/, property/, types/, fixtures/, reference/, vitest.config.ts. Vitest's existing package config discovers tests/unit, so add a direction-local config with Node environment and explicit direction includes. Strict types/tsconfig.json extends the package config with ES2022 lib, types:[], and explicit *.type-test.ts includes.

Create reference fixtures BEFORE production implementation. A test-local generator reads the pinned vendor source and evaluates only the direction determination context in an isolated Node VM with minimal reference constants/reversePortConstraints, stopping before route pattern selection. It must not import any V2 preference/selection helper. Vendor remains read-only. Record the source SHA, input data, reference domain and expected outputs in versioned fixtures. Review the extraction boundaries and missing stubs before trusting goldens; generator fails on source-hash/marker mismatch. Bit conversions remain test-local.

900 base fixtures: source bounds (0,0,10,10); targets (-30,-30,10,10),(30,-30,10,10),(30,30,10,10),(-30,30,10,10); all 15 boolean masks on both endpoints, no fixed points or jetty buffers. Assert each pair and membership. Also create axis/overlap/containment/asymmetric-size/role-exchange/fixed-side goldens in the shared reference domain; intentional adaptations use direct approved expected values instead of pretending exact oracle parity.

Six generated core properties use the existing dependency-free runConditionedProperty harness from packages/draw/tests/routing-v2/perimeter/support/generated.ts as a read-only test dependency, with explicit seed 0xFAD003 and >=5000 accepted cases each. Its seededRandom/integer helpers are available without adding dependencies. A direction-local wrapper may label R03 reports and select replay cases; it must preserve raw/accepted/rejected accounting, exhaustion failures and concrete counterexamples. No manifests, lockfiles or earlier test helpers change. Report attempted, accepted, rejected independently; preconditions must be narrow documented numeric-domain predicates, not checks of actual output. On failure stop and retain a deterministic replay fixture. Reference parity/property failures are blockers, not permission to rewrite expectations.

### Executable mutation testing (master specification §74)

DirectionResolver must achieve mutation score >=90% before formal verification. No new repository dependency is needed: create a test-local Node runner at packages/draw/tests/routing-v2/direction/mutation/run.mjs using the installed TypeScript AST and Vitest. Enumerate all applicable direction-source comparison boundary operators (<, <=, >, >=, ==, ===, !=, !==), logical &&/||, boolean negation and cardinal/opposite selection substitutions. Record the complete operator inventory and locations; do not cherry-pick mutants that tests kill.

Run mutants in a validated isolated temporary source tree preserving relative paths and read-only lower-layer copies. A direction-local Vitest resolve plugin must redirect direction imports to the mutant tree; verify that the edited module was loaded, and validate this mechanism with known killed and surviving mutations. Never mutate the repository production tree. The original unit/reference suite must pass first.

For every compile-valid mutant run the actual unit/reference suite and report location, edit, outcome and totals. Score = killed / (killed + survived + timeout) * 100. Compiler-invalid mutants are separately reported; timeouts do not count as kills, infrastructure errors abort, and surviving mutants cannot be silently labelled equivalent or removed. Require >=90% with a nonempty inventory. Test the runner's score calculation, known killed/surviving controls, timeout/error handling and import redirection before relying on its output. An unmet target is a STOP condition: strengthen meaningful tests under the approved contract, never weaken semantics or manipulate the denominator.

### Machine gate and planning baseline

Retain changedFiles' independent NUL-safe union and HEAD/INDEX/WORKTREE source inspection. Add R03 exact scope and previous-R02 CLOSED/archived/PASS control checks. Permit only R03 planning artifacts, CURRENT_CHANGE, gate and the previously requested workflow reference as planning control.

Direction imports may reach terminal/perimeter/geometry/model or peers in orthogonal/direction only. Prior inward dependency limits remain in force. Reverse imports, orthogonal siblings, later layers, framework/browser/legacy and cycles reject. Product writes during PLANNING reject.

After independent PRE PASS, persist the actual report at evidence/pre-implementation-gate-pass.md and its linked evidence/pre-implementation-review.json. The JSON schemaVersion=1 records change, gateType=PRE_IMPLEMENTATION, gateStatus=PASS, baseline=R02 closing SHA, reviewerContext=fresh-read-only, reportPath, SHA256 reportSha256 and the exact artifacts map produced by planningReviewFingerprint(). The reviewer must include that fingerprint in their read-only report. This is an integrity binding to review evidence, not cryptographic authentication of reviewer identity.

The saved report must contain exactly one REVIEWED_ARTIFACTS_JSON_BEGIN / REVIEWED_ARTIFACTS_JSON_END block, whose body is the pretty JSON emitted by the reviewer command (JSON.stringify(map, null, 2)). The gate extracts this block, rejects missing/duplicate markers, malformed JSON, duplicate keys, incorrect path coverage or hashes, and compares each reported hash with both proof.artifacts and the canonical checkpoint blob. The execution agent copies the artifact map from that saved reviewer block; it must never regenerate it to accommodate later planning edits. Any reviewed content change requires a new independent review. Formatting is deliberately explicit so the fingerprint cannot be ambiguously selected from a report containing several JSON blocks.

Set PRE_IMPLEMENTATION_GATE: PASS and PRE_IMPLEMENTATION_GATE_EVIDENCE to the review JSON path before committing the approved planning/control paths. Pin that SHA for implementation. Gate requires committed approval and PASS report, exact reviewed artifact hashes and a linear planning-only history from R02 closure to the checkpoint; forbidden edits reverted before checkpoint still fail. Canonical hashing normalizes CRLF, excludes only PRE_IMPLEMENTATION_GATE/PRE_IMPLEMENTATION_GATE_EVIDENCE/PRE_REVALIDATION_REQUIRED fields in CURRENT_CHANGE, and normalizes task checkbox marks; every other reviewed byte remains binding. Thus record task 1.1 before review; after review only approval metadata and checkbox completion may change before checkpoint.

Frozen controls, reviewed plans, review JSON and report must match the checkpoint independently in HEAD, INDEX and WORKTREE. CURRENT_CHANGE remains mutable process state, but its approved contents are fingerprinted in the checkpoint. Regular types, merge state and Git modes are checked. On POSIX, the actual WORKTREE owner executable bit must match Git mode even if core.filemode=false. Windows NTFS cannot represent that POSIX bit: require core.filemode=false and enforce exact approved/HEAD/INDEX Git modes plus regular WORKTREE file and canonical content. Explicit platform probes test both policies; do not claim a native POSIX chmod test ran on Windows. Preserve all R01/R02 adversarial regressions and add R03 missing/failed approval, stale hash, forbidden checkpoint/history, frozen-control cancellation and mode regressions.

## Requirement traceability

Every delta requirement maps to tests before implementation and implementation/verification tasks.

| Requirement                                         | Tests / evidence                                                | Tasks                           |
| --------------------------------------------------- | --------------------------------------------------------------- | ------------------------------- |
| Space safe direction input and result               | types/space.type-test.ts, unit/contracts.test.ts                | 2.1, 2.2, 3.1, 3.4, 4.2         |
| Finite validated geometry without quantization      | unit/validation.test.ts, unit/relative.test.ts                  | 2.2, 2.3, 3.1, 3.2, 4.1         |
| Relative quadrant and separation evidence           | unit/relative.test.ts                                           | 2.3, 3.2, 4.1                   |
| Complete constrained preference selection           | fixtures/mask-matrix.json, unit/masks.test.ts                   | 2.4, 2.5, 3.3, 4.1              |
| Fixed side evidence without relocating endpoints    | unit/fixed.test.ts                                              | 2.6, 3.3, 4.1                   |
| Pinned preference branch order and explicit ties    | reference fixtures, unit/preferences.test.ts                    | 2.4, 2.5, 2.6, 3.3, 4.1         |
| Inspectable preference evidence and immutability    | unit/evidence.test.ts, property/non-mutation                    | 2.7, 2.8, 3.4, 4.1              |
| Conditioned metamorphic and reproducible properties | property/core.property.test.ts                                  | 2.8, 3.4, 4.3                   |
| Direct exhaustive and reference verification        | 900 fixtures + direct branch/adaptation cases                   | 2.3–2.8, 3.3, 4.1, 4.3          |
| R03 isolation and frozen machine gate               | gate self-tests, dependency/typecheck checks, independent gates | 1.1–1.3, 3.5, 4.2, 4.4, 5.1–5.4 |

Master §74 verification obligation: mutation inventory, isolated runner controls and score >=90% map to tasks 2.9 and 4.5, with per-mutant evidence under this change. This supplements the delta traceability above without altering the product contract.

## Risks / Trade-offs

- Pinned algorithm contains role/tie asymmetry -> exact fixtures and explicit conditional properties; do not promise universal mirroring at ties.
- Broad finite inputs can overflow or cancel -> finite-result errors and bounded metamorphic generation plus separate counterexamples.
- Reference extraction can accidentally include route logic or share V2 decisions -> reviewed narrow source boundaries, independent constants, source hash and golden inputs.
- A weak gate can miss staged changes -> retain all existing cancellation, rename/copy, NUL-filename and multi-snapshot self-tests.
- R01/R02 extension could be discovered -> stop implementation and classify DEPENDENCY_EXTENSION_REQUIRED in planning; never patch earlier layers opportunistically.

## Migration Plan

There is no runtime migration in R03. New pure directory-local APIs remain unused by legacy/editor code. R04 will explicitly consume them after R03 archive and closure. Rollback is omission of R03 consumer adoption; existing package behavior remains unaffected.

No contract-level open questions remain for implementation; independent PRE review may find blockers that must return to planning.
