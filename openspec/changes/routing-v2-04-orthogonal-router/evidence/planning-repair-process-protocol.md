# Required R04 repair isolation and approval protocol

Applicability: historical first repair epoch, ORDINARY_DIRECTION_CONSTRUCTION,
approved at da22452d7e9c35f28f4004d9826432b12bf6a521. The active second epoch is
MUTATION_RUNTIME_INVALID_OUTCOME. Its normative entry, immutable fixture bundle,
schema-3 approval/report paths and checkpoint rules are in gate-profile.md,
"Active second repair epoch: mutation runtime-invalid outcome". The schema-2
paths below remain historical and cannot authorize the second epoch.

Status: normative protocol implemented by task 1.6's repair-specific gate profile.
Actual validation results are recorded separately in process-control-repair-validation.md.
Do not suppress a FAIL, temporarily pretend IMPLEMENTATION or lower existing
checks to get a PASS. Machine validation is not independent PRE approval.

## Immutable repair entry

The user authorized planning repair on 2026-09-28 after SPEC_CONFLICT. Original
approved R04 commit O is cf424e247490fdfae2c4efc9f7e7377b6d5b6e11. Preserve O and
the old PRE report/manifest. Snapshot planning-repair-entry-snapshot.json covers
all four R04 product/test roots and both metadata files, including untracked
files. It records independent HEAD/INDEX entries (mode, object, stage), complete
WORKTREE file set with raw-byte SHA-256/size, and entry HEAD O. Its immutable
raw-byte SHA-256 is:

```text
1a306ca7ec1df199e41351e750fd74942cf8c2c98aa1f00de899eb320d1e3a71
```

Pin that exact path/hash and O in the exact R04 repair profile; a self-reported
replacement manifest or CURRENT hash is not authority. Keep the original snapshot
unchanged. Scope roots are exact, not manifest-controlled extensible permissions.
Verify hash before interpreting content, canonical JSON/schema, duplicate/unknown
keys, normalized safe relative paths, fixed roots and complete entry sets. Reject
symlinks/junction ancestors, nonregular files, unmerged index stages and Git mode
changes; obey core.filemode semantics for Windows worktree executable bits only.

In repair PLANNING, independently compare current HEAD, INDEX and WORKTREE
product/test/metadata snapshots with their corresponding entry records. Do not
compare layers only to each other. Detect modifications, additions, deletions,
staging an untracked retained file, renames (old+new), copies, mode changes and
staged/unstaged or committed/worktree cancellation. A byte-identical staged file
still changes the recorded INDEX set and fails repair isolation. Enumerate the
whole fixed roots, not only paths reported by changedFiles; ignored new files
inside them must not silently evade the complete WORKTREE set comparison.

This exception permits only unchanged pre-existing product work. Initial R04
planning still forbids any product/tests/dependencies. Four-source NUL-safe
discovery and all dependency, metadata, protected-layer and source inspection
checks remain active in both profiles. Repairs may modify only the existing
process-control scope. No production/test/metadata writes are permitted until
the renewed approved checkpoint and explicit IMPLEMENTATION transition.

## Renewed independent approval

Keep historical pre-implementation-gate-pass.md and pre-implementation-review.json
byte-for-byte. The old PASS is superseded for new contract wording; never overwrite
it or use it as new authorization. New report/manifest paths are respectively
evidence/pre-implementation-revalidation-pass.md and
evidence/pre-implementation-revalidation-review.json, created only from an actual
fresh independent read-only Astra xhigh PASS after task 1.6 checks pass.

Define schemaVersion 2 for the repair manifest: change/gateType/gateStatus,
reviewerContext, baseline O, originalApprovedPlanningCommit O, repairEntrySnapshot
as {"path": "<exact entry path>", "sha256": "<pinned raw hash>"},
reportPath/reportSha256 and exact reviewed artifacts. Preserve the
existing strict duplicate-field/canonical-text/report-fingerprint checks. Require
one unambiguous PASS, BLOCKERS NONE, MACHINE_GATE_INTEGRITY PASS and
READY_FOR_IMPLEMENTATION YES. Extend fingerprints with this protocol, immutable
entry snapshot, ordinary-direction decision/diagnostic evidence and its probe;
retain every original planning/control fingerprint, including CURRENT and gate.
Include the revised prompt, design, delta, master, playbook and task wording.
Checkbox normalization must not hide new or altered task requirements.

Add these exact repair artifacts to the existing complete reviewed-file set:
evidence/planning-repair-process-protocol.md,
evidence/planning-repair-entry-snapshot.json,
evidence/planning-repair-decision.md,
evidence/check-planning-repair-entry.mjs,
evidence/ordinary-direction-spec-conflict.md,
evidence/ordinary-direction-diagnostic.mjs,
evidence/ordinary-direction-diagnostic.json,
evidence/ordinary-channel-planning-probe.mjs and
evidence/ordinary-channel-planning-probe.json,
evidence/planning-repair-fixture-files.json and evidence/.gitattributes
(all relative to this change).
Do not omit an old reviewed path when adding the repair artifacts. Raw immutable
snapshot hash is checked separately from canonical planning-text fingerprints.

The fixture bundle captures the 58 immutable entry files as base64 raw bytes,
plus the original snapshot text, so temporary regression repositories remain
independent of later authorized product changes. Its pinned raw SHA-256 is
6514b317fd714497cf3b3bbb1efacbda7cded63882600735cccee55122c574d8.
Validate the bundle's exact file set, byte sizes and every entry hash. The local
.gitattributes marks the snapshot and bundle -text so checkout preserves bytes.
No fixture report is independent approval of the real change.

Retain the original metadata fingerprint paths, but hash their committed O
contents: metadata must not enter the control-only P checkpoint. The exact
retained WORKTREE addition is separately bound by the immutable snapshot and
layer comparisons; the original parsed-content narrow exception also remains.

## Separate approval checkpoint from cumulative implementation origin

Before renewed approval, BASE_COMMIT and APPROVED_PLANNING_COMMIT stay O; status
is PLANNING, IN_PROGRESS but explicitly paused, PRE PENDING (old PASS separately marked superseded), archive
and next change false. Do not falsify NOT_STARTED for retained work.

After real PRE PASS, create a linear repair checkpoint P descended from O that
contains only explicitly staged planning/control changes and real new review
evidence. Exclude every product/test/dependency file; their recorded Git-layer
states remain equal to entry. Audit every commit O..P for control-only edits,
including an edit followed by a revert. Preserve the original chain back to R03
closure and its historical approval; do not rewrite it.

At resumption set APPROVED_PLANNING_COMMIT=P and retain BASE_COMMIT=O. Add/pin
IMPLEMENTATION_ORIGIN_COMMIT=O in the repair CURRENT contract. This is an explicit
repair-profile exception to the initial BASE==APPROVED rule: P freezes the revised
control contract, O is the cumulative product-diff origin. Require P to be the
active change's schema-2-approved repair checkpoint with entry snapshot binding,
and require O ancestor of P ancestor of HEAD. A random pair of differing SHAs
must fail. Freeze revised controls and actual approval/report at P across
HEAD/INDEX/WORKTREE. Only the explicitly authorized process fields may change.

Changed-path discovery continues union(O..HEAD, staged, unstaged, untracked), so
neither retained untracked implementation nor later committed work disappears.
Do not replace it with P..HEAD. The entry snapshot records what was retained at
planning time; after authorized resumption it is historical evidence, not a ban
on the BDD/implementation changes allowed by the new contract.

## Required executable adversarial controls

In isolated temporary Git fixtures, retain the entire old suite and add:

- Valid initial planning and initial approval still pass; premature product edits fail.
- Valid repair with unchanged retained untracked source/tests and exact metadata passes.
- Missing/changed snapshot, changed hash claim, wrong roots/baseline/phase/status or
  historical schema-1 approval offered as schema-2 approval fails.
- Independently exercise HEAD/INDEX/WORKTREE edits, additions/deletions, old+new
  rename, copy destination, mode/symlink, unmerged stage and complete-set changes.
- Staged forbidden edit plus inverse worktree, committed edit plus inverse worktree,
  staged deletion/recreation and ignored new files are discovered and fail.
- NUL-safe unusual filenames and positive unchanged-manifest cases prove discovery,
  not merely the existence of some unrelated failure.
- Editing both a retained file and manifest, while updating the CURRENT hash, fails.
- A real synthetic schema-2 fixture binds a canonical new report and fingerprints;
  stale/duplicate/altered reports, mutable wording, modes or fingerprint substitutions fail.
- Revised checkpoint is control-only; a product edit/revert anywhere O..P fails.
- O/P mismatch, unrelated ancestry, using P as cumulative origin and rebasing away
  retained implementation fail. A committed product edit after P is still inspected.
- Implementation after a valid repair checkpoint permits exact R04 scope while
  R01-R03, legacy/vendor, exports and R05+ remain forbidden in all Git layers.

Run focused repair controls, the full existing self-test suite, installed gate,
strict OpenSpec validation and diff check. Record actual counts, not a projected
number. Only then is the revised package ready for independent PRE revalidation.
