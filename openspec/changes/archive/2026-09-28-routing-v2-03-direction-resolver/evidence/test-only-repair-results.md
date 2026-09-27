# R03 test-only verification repair

Repair scope was limited to `packages/draw/tests/routing-v2/direction/**`.
No production file was modified.

The conditioned property generator now rejects generated point coordinates,
translation deltas, and fixed points outside `[-100000, 100000]`; it also
rejects reflected rectangle origins outside that domain. Existing edge,
intermediate, separation, and non-tie conditioning checks remain in place. A
direct deterministic fixture replays the audited `fixedSource.y = 100568`
case as rejected and confirms the inclusive `100000` boundary is accepted.

A direct unit fixture now checks identical source/target bounds at their
original location and after horizontal and vertical reflection. Each case
asserts the explicit NORTH/SOUTH tie policy and quadrant 2.

## Executed checks

- Targeted property and preference tests, using the direction-local Vitest
  config and `--configLoader runner`: **2 files, 15 tests passed**.
- Complete R03 direction suite with the same config: **9 files, 118 tests
  passed**. Each of the six generated R03 properties accepted 5000 cases and
  rejected 106 conditioned candidates (5106 raw candidates, seed `0xFAD003`).
- R01 geometry regression suite: **8 files, 92 tests passed**. All required
  generated properties met their recorded 5000 accepted-case quota.
- R02 terminal/perimeter regression suite: **13 files, 126 tests passed**.
  All required generated properties accepted 5000 cases.
- `pnpm --filter @frade/draw typecheck`: **PASS**.
- `pnpm --filter @frade/draw exec eslint src/routing/orthogonal tests/routing-v2/direction`:
  **PASS**.
- Full R03 mutation runner: **85 inventory, 67 killed, 18 compiler-invalid,
  0 survived, 0 timeouts, 100% score**. Raw output is in
  `evidence/mutation-progress-rerun.txt`; structured results are in
  `evidence/mutation-results-rerun.json`.
- `pnpm run routing:v2:arch-gate`: **PASS**.
- `openspec validate routing-v2-03-direction-resolver --strict`: **PASS**.
- `git diff --check`: **PASS** (Git reported only existing LF-to-CRLF notices
  for process-control files).

The Windows sandbox initially blocked Vitest's default config bundler from
writing under `packages/draw/node_modules/.vite-temp`; using Vitest's
`--configLoader runner` avoided that temporary config write. The mutation
harness self-test also writes a temporary fixture in its own directory; its
first sandboxed run received `EPERM`, while the complete suite passed when
rerun with access to that authorized temporary write.

This evidence clears the two test-evidence findings from the earlier formal
Verify. The formal OpenSpec Verify must be rerun independently on Sol high;
no post-implementation gate, commit, archive, or R04 work was started.
