# Independent R03 POST FAIL — unrelated brand input in checkout

CHANGE: routing-v2-03-direction-resolver
GATE_TYPE: POST_IMPLEMENTATION
GATE_STATUS: FAIL
ARCHIVE_ALLOWED: NO
SOURCE: Independent read-only review supplied by the user on 2026-09-28.
BASE_COMMIT: ecadcc0a0e0d88b9e9b8af382431ddfebe960b8c

The independent reviewer found six unrelated untracked Frade Brand v1 input
files under the literal repository directory ` _input/frade-brand-v1/` (the
directory name begins with a space). The installed architecture gate correctly
rejected these paths. This was a workspace/scope blocker, not a resolver or
mutation-classifier defect. The reviewer reported no repository writes, and
its 25-file frozen R03 snapshot and retained mutation evidence passed audit.

The six files were preserved by moving only that brand input directory to
`E:\dev\codex\frade-brand-v1`, a sibling of the Git checkout. Before the move,
the source resolved inside the repository, the destination resolved beneath
`E:\dev\codex`, the destination did not exist, and exactly six files were
enumerated. After the move, every relative path and SHA-256 hash matched;
the source directory no longer existed. No R03 production, test, OpenSpec
planning artifact, frozen control or prior R01/R02 file was changed.

| Brand input file | Verified SHA-256 |
| --- | --- |
| CODEX-HANDOFF.md | 627a631dfaebd1b29d68d8a0778003004d71ab8f2825afa5ed0216bda0a71c01 |
| README.md | d434ec599f42eb0debac981d71b3a572221484a4dd9185242a87ea092c1c7835 |
| SHA256SUMS.txt | 647c5c1670557c375688faee49f774156f8659069b707ac99a96c68ae1d9e6b7 |
| input-manifest.json | c1c54a3679452734c1a659e137c7bccbb257b5f80b0658d48e3fd3c96d7bb529 |
| derived/frade-maze-multicolor-traced.svg | c371c6d254c7bc8efe6c6d9321554367e088bd3969e861ad257f7a906e6dce88 |
| source/frade-maze-multicolor-dark-master.png | 67f9e91ed2c4e9dc21885ea5ad3abe2fc01978966840aee313233ab7039d4c14 |

After separation, actual commands/results:

- `pnpm run routing:v2:arch-gate`: exit 0, GATE_STATUS: PASS; 875 changed
  paths, 77 V2 source/test files, HEAD/INDEX/WORKTREE inspected.
- `openspec validate routing-v2-03-direction-resolver --strict`: PASS.
- `git diff --check`: exit 0.
- NUL-safe `git status --porcelain=v1 -z --untracked-files=all`: 875 paths,
  all in R03 implementation/process scope; no unrelated path.
- All 25 frozen source/test hashes still match the formal Verify snapshot.
- `git rev-parse HEAD`: approved baseline unchanged.

These executor checks remove the reported workspace scope condition. They
are not a fresh independent POST approval. POST_IMPLEMENTATION_GATE remains
FAIL, ARCHIVE_ALLOWED remains false, and tasks 5.2–5.4 stay open until a new
independent read-only POST review passes and the later lifecycle steps occur.
No full runtime, mutation or gate self-test suite was repeated for this
file-separation-only repair; those files and the current classifier are
unchanged. Do not commit, archive or start R04 yet.

Post-recording process checks also passed: the installed gate checked 876
authorized paths and 77 V2 source/test files across HEAD/INDEX/WORKTREE;
strict OpenSpec validation and diff check passed. Expanded NUL-safe status
found 876 authorized paths and no unexpected path. All 25 frozen hashes still
match, and POST remains FAIL pending independent re-review.
