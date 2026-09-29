# Independent PRE revalidation after checkpoint formatting repair

Use Astra xhigh in a fresh read-only task.

Read and follow the complete existing PRE instruction:
`openspec/changes/routing-v2-04-orthogonal-router/evidence/pre-implementation-gate-prompt.md`.
All its criteria and the active schema-3 protocol in `evidence/gate-profile.md`
remain mandatory. This supplement adds context; it does not replace or narrow
the architecture review.

CHANGE: routing-v2-04-orthogonal-router
GATE_TYPE: PRE_IMPLEMENTATION_REVALIDATION

The latest actual independent PRE gave PASS for all 38 artifacts at HEAD
4ff5c4deea4f5f6804bb01f92f955813c617d765. Prospective checkpoint staging then
failed `git diff --cached --check` because six historical-report lines contained
Markdown trailing spaces. The calling workflow stopped without committing.

Read `evidence/checkpoint-whitespace-repair-2026-09-30.md` and
`evidence/checkpoint-whitespace-repair-originals-2026-09-30.json`. Decode the
base64 originals in memory and verify their exact hashes. Compare each original
with its current report: the only change must be removal of two trailing spaces
from lines 3, 4 and 5 in each of the two named historical FAIL reports. Their
findings and verdicts must remain unchanged.

Verify that the current 38-artifact producer differs from the preserved
second-epoch PRE fingerprints at exactly those two paths. Check all 66 retained
product/test/tooling bytes and Git layers against the immutable entry. Confirm
the gate, fixture bundle, specification and production/test implementation are
unchanged by this repair.

The previous schema-3 report/manifest are deliberately preserved as actual
historical evidence, not current approval. Do not accept their old hashes, amend
their fingerprints, or treat the reopened task 1.9 as completed. The live PRE is
pending, PHASE is PLANNING, implementation remains paused and no new checkpoint
exists. This is the expected pre-review state.

Retain all original PRE checks: specification and scope, reference policies,
numerical contracts, mutation runtime-invalid binding and ownership, fatal
precedence, scoring, independent self-test fixtures, approval history, four-source
discovery and frozen Git-layer integrity. Distinguish executed commands from
retained execution evidence. Product correctness and remaining tasks 2.7/2.8 are
future implementation obligations, not certified by a planning PASS.

Run installed gate, strict OpenSpec validation, syntax and read-only diff/status
checks. Inspect the recorded successful prospective staged diff-check; also audit
the prospective control-file contents directly for whitespace defects, including
untracked files, without writing the real index. Do not modify repository files,
commit, implement, archive or start R05.

Return the complete fields required by the original PRE prompt, exactly one
unambiguous PASS or FAIL, and current canonical JSON from
`node scripts/routing-v2-architecture-gate.mjs --review-fingerprint` between the
exact REVIEWED_ARTIFACTS_JSON_BEGIN/END marker lines. Keep machine field names and
JSON plain text without Markdown-escaped underscores. The calling workflow must
preserve this actual fresh report separately from the superseded one before
writing any new schema-3 binding.
