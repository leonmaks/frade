# R03 complete mutation rerun

## Latest result after test-only repair

Command: `node packages/draw/tests/routing-v2/direction/mutation/run.mjs`.
The unmutated unit/reference baseline passed. The runner completed the full AST
inventory of 85 candidates: 67 killed, 0 survived, 18 strict compiler-invalid,
and 0 timeouts. Denominator: 67. Score: 100%. Required: >=90%.
The command exited 0. No candidates were omitted or classified as equivalent.

The raw runner output is retained in `mutation-progress-rerun.txt`; the parsed
machine report is retained in `mutation-results-rerun.json`. The previous
88.05970149253731% result below is superseded. Production source was not edited;
this repair changed tests only.

---

## Superseded result

Command: `node packages/draw/tests/routing-v2/direction/mutation/run.mjs`.
The unmutated unit/reference baseline passed. The runner performed a fresh AST
inventory of 85 candidates: 59 killed, 8 survived, 18 strict compiler-invalid,
0 timeouts. Denominator: 67. Score: 88.05970149253731%. Required: >=90%.
The command exited 1. No candidate was omitted or classified as equivalent.
Production source was not edited during this rerun.

## Survivors

| Location | Mutation | Expression |
| --- | --- | --- |
| preferences.ts:41 | > → >= | if (west < -EPSILON \|\| east > EPSILON \|\| north < -EPSILON \|\| south > EPSILON) return undefined |
| preferences.ts:41 | > → >= | if (west < -EPSILON \|\| east > EPSILON \|\| north < -EPSILON \|\| south > EPSILON) return undefined |
| preferences.ts:62 | !== → === | (candidate, i) => allowed[i].length !== 1 && candidate !== undefined && masks[i][candidate], |
| preferences.ts:74 | > → >= | if (hGap > 0 && vGap > 0 && masks[0][h[0]] && masks[1][v[1]]) { |
| preferences.ts:78 | > → >= | } else if (hGap > 0 && vGap > 0 && masks[0][v[0]] && masks[1][h[1]]) { |
| preferences.ts:113 | !== → === | list = [candidate, ...list.filter((direction) => direction !== candidate)] |
| relative.ts:20 | || → && | if (value === null \|\| typeof value !== 'object') |
| resolve.ts:13 | || → && | if (value === null \|\| typeof value !== 'object') |

The prior complete score of 81.82% is superseded as the latest measurement but
is retained in mutation-results.json. This rerun result also fails the gate.
Do not enter VERIFICATION or archive. Strengthen meaningful assertions for these
eight paths under the approved contract, preserve the full inventory, and rerun
the complete mutation command. Keep compiler-invalid cases and timeout/survival
counts separate from the denominator exactly as the approved formula specifies.
