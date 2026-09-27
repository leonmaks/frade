# R03 mutation evidence blocker

STATUS: SUPERSEDED_BY_TEST_ONLY_REPAIR
LATEST_MUTATION_RUN: 85 inventory; 67 killed; 18 compiler-invalid; 0 survived; 0 timeouts; 100% score
The failure below remains as historical evidence. See mutation-rerun-review.md
and mutation-results-rerun.json for the passing rerun.

REPAIR_CLASSIFICATION: TEST
IMPLEMENTATION_PHASE_ADVANCEMENT: STOPPED
READY_FOR_VERIFY: NO

Executed complete inventory: 84 candidates; 54 killed, 12 survived,
18 strict compiler-invalid, 0 timeouts. Denominator 66; score 81.81818181818181%.
Required threshold: >=90%. The runner exited 1. Full unchanged inventory and
outcomes remain in mutation-results.json; no survivors have been excluded or
labelled equivalent. Production passed normal unit/reference/property checks;
this report identifies assertion coverage gaps rather than a demonstrated
production defect.

## Surviving substitutions

| Source location | Substitution | Original expression |
| --- | --- | --- |
| preferences.ts:41 | < → <= | if (west < -EPSILON \|\| east > EPSILON \|\| north < -EPSILON \|\| south > EPSILON) return undefined |
| preferences.ts:41 | > → >= | if (west < -EPSILON \|\| east > EPSILON \|\| north < -EPSILON \|\| south > EPSILON) return undefined |
| preferences.ts:41 | < → <= | if (west < -EPSILON \|\| east > EPSILON \|\| north < -EPSILON \|\| south > EPSILON) return undefined |
| preferences.ts:41 | > → >= | if (west < -EPSILON \|\| east > EPSILON \|\| north < -EPSILON \|\| south > EPSILON) return undefined |
| preferences.ts:43 | <= → < | if (Math.abs(west) <= EPSILON) candidate = Direction.WEST |
| preferences.ts:44 | <= → < | else if (Math.abs(east) <= EPSILON) candidate = Direction.EAST |
| preferences.ts:45 | <= → < | if (Math.abs(north) <= EPSILON) candidate = Direction.NORTH |
| preferences.ts:46 | <= → < | else if (Math.abs(south) <= EPSILON) candidate = Direction.SOUTH |
| preferences.ts:56 | >= → > | const horizontal = gaps.west >= gaps.east ? Direction.WEST : Direction.EAST |
| preferences.ts:113 | !== → === | list = [candidate, ...list.filter((direction) => direction !== candidate)] |
| resolve.ts:32 | || → && | if (options === null \|\| typeof options !== 'object') |
| resolve.ts:45 | !== → === | [fixedSource !== undefined, fixedTarget !== undefined], |

## Test-only repair checkpoint

- Cover equality at each of the four EPSILON-expanded span boundaries AND each
  fixed-side matching boundary. Use edge-at-zero fixtures to represent the exact
  threshold without introducing subtraction rounding at coordinate 10.
- Assert raw WEST horizontal preference at equal opposing gaps, even when the
  selected direction is vertical.
- Assert the complete ordered candidate evidence, including deduplication,
  not merely its first entry or allowed membership.
- Exercise malformed non-object options and operation-specific TypeError context.
- Check target fixedDisposition both when target fixed point is supplied and when
  absent; current fixtures inspect the candidate but do not establish all audit fields.

Do not change production, contract, EPSILON, thresholds, seeds, inventory or
score denominator to address this warning. Preserve existing regressions and
rerun the full mutation inventory after meaningful test strengthening. Before
additional Test/Fix work, switch to GPT-6 Luna high per workflow-models.md.
