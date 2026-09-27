# R03 reviewer-report fingerprint binding repair

CHANGE: routing-v2-03-direction-resolver
REPAIR_TYPE: PROCESS_CONTROL
ROOT_CAUSE_CLASSIFICATION: STATE_TRANSITION
PHASE: PLANNING
BASE_COMMIT: 2b6619627e3e744007b06251a05dad86e7bce634
INDEPENDENT_PRE_GATE: FAIL — fresh revalidation required
READY_FOR_IMPLEMENTATION: NO

## Root cause and repair

The prior verifier separately validated report bytes/status and manifest-to-checkpoint hashes. It omitted the equality between the reviewer-returned fingerprint embedded in the report and the manifest. An unchanged old report could therefore accompany recomputed hashes of unreviewed content.

The saved report now must contain exactly one named REVIEWED_ARTIFACTS_JSON_BEGIN / REVIEWED_ARTIFACTS_JSON_END block. Its canonical pretty JSON must contain the exact 14 artifact paths and SHA256 hashes. Extraction rejects missing/duplicate markers, malformed JSON, duplicate keys and ambiguous/noncanonical serialization. Gate requires each report hash to equal both the linked manifest and the canonical approved checkpoint artifact. The original report SHA, approval metadata, ancestry, forbidden planning history and frozen HEAD/INDEX/WORKTREE checks remain required.

Design, task 1.2 and independent review prompt specify copying hashes from the actual report, never regenerating them after review. The reviewer command emits the precise marker/JSON format. Proposal and product delta are unchanged.

## Regression-first evidence

Before implementation of the binding, the new executable Git fixtures incorrectly accepted all five negative cases:

- missing report fingerprint;
- duplicate report fingerprint;
- malformed report fingerprint;
- duplicate JSON key;
- design changed, manifest recomputed, original report retained.

The last fixture explicitly verifies unchanged saved report bytes. Its reportSha256 is calculated from those same unchanged bytes; only design content and the manifest's design hash differ. Matching report/manifest/checkpoint remains the positive control. The separate seven-control frozen fixture also now includes an actual fingerprint in its positive report.

The original independent revalidation FAIL is preserved verbatim in pre-implementation-revalidation-fail.md. Earlier repair evidence is marked superseded for readiness, with historical command results retained.

## Actual checks

| Command                                                             | Result                                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| node --check scripts/routing-v2-architecture-gate.mjs               | PASS                                                                                     |
| node scripts/routing-v2-architecture-gate.mjs --self-test           | PASS — 451 assertions                                                                    |
| pnpm exec eslint scripts/routing-v2-architecture-gate.mjs           | PASS                                                                                     |
| openspec validate routing-v2-03-direction-resolver --strict         | PASS                                                                                     |
| pnpm run routing:v2:arch-gate                                       | PASS — PLANNING; HEAD/INDEX/WORKTREE source snapshots; 56 V2 source/test files inspected |
| reviewReportFingerprint smoke: matching / missing / duplicate block | PASS                                                                                     |
| git diff --check                                                    | PASS                                                                                     |
| git status --short and protected scope audit                        | Authorized planning/control paths only                                                   |

R01/R02 production/tests, main specs/archives, AGENTS, master spec, playbook,
legacy boundary, vendor source, dependency manifests and R03 production/tests
are unchanged. The four independent changed-path sources and source snapshots
are unchanged. No R03 implementation suite is claimed executed.
No commit was created and BASE_COMMIT/HEAD remain the R02 closing commit.

## Required next step

Stop for GPT-6 Astra high in a fresh read-only review using
pre-implementation-gate-prompt.md. Obtain a real independent PRE PASS with the
report fingerprint before creating a planning checkpoint or implementing R03.
Machine PLANNING PASS is not that independent approval.
