# R04 requirement traceability

All requirements refer to specs/routing-orthogonal-router/spec.md. Task numbers
refer to tasks.md. BDD/TDD tasks precede the corresponding production tasks;
4.1-4.4 provide full verification, not substitutes for direct regression cases.

| Requirement | Direct fixtures / evidence | Test tasks | Implementation/control tasks |
|---|---|---|---|
| Model space automatic routing boundary | tsc space/readonly negatives; same vs distinct cell identity | 2.1, 2.2 | 3.1, 3.5 |
| Finite input and derived arithmetic | malformed values, subtraction/sum/expansion/cost overflow, lost positive runs | 2.2, 2.3 | 3.1, 3.3, 3.4, 3.5 |
| Fixed resolution and direction authority | masks, fixed bypass, all selected pairs, reversed target convention | 2.2, 2.3 | 3.4, 3.5 |
| Jetty resolution and evidence | precedence, auto/marker, zero/sub-EPSILON, asymmetric minima | 2.3 | 3.1, 3.3, 3.4 |
| Decoded reference pattern behavior | 64 direction/quadrant cases, direct flags/limits/no-ops/final approach | 2.4 | 3.3 |
| Floating attachment after intermediates | shared snapshot, mixed endpoints, rectangle/ellipse membership | 2.2, 2.4 | 3.5 |
| Strict too short branch selection | Euclidean below/equal/above; one floating endpoint; overflow | 2.2, 2.3 | 3.1, 3.5 |
| Local exterior fallback topology | NORTH/NORTH example, 16 pairs, both candidates, equal-exit full circuit, ties | 2.3, 2.6 | 3.4 |
| Fallback constraints and jetty minima have no exceptions | exact endpoints, selected directions/masks, independent final minima, numeric rejection | 2.3, 2.6 | 3.2, 3.4 |
| Endpoint preserving canonicalization | true duplicates/collinear runs, pinned endpoints, direct idempotence | 2.5, 2.6 | 3.2 |
| Actionable invariant validation | malformed independent paths, IDs/indices, actual perimeters and direction | 2.5, 2.6 | 3.2, 3.5 |
| Reference parity and adaptation evidence remain separate | pinned extraction, input domain, original fallback output retained unchanged | 2.4 | 1.1, 3.3, 3.4 |
| Reproducible core property coverage | each 10000 accepted, seed/replay/accounting, conditioned translation, external zoom | 2.6 | 4.1 |
| Trustworthy mutation and regression evidence | fatal precedence compositions, authentic timeouts, full AST inventory/children, R01-R03 regressions | 2.7 | 4.2, 4.3 |
| R04 scope and approval boundary | exact profile hostile controls, fingerprints, Git-layer snapshots, independent PRE/POST | 1.2 | 1.3, 1.4, 4.4, 5.1, 5.2, 5.3, 5.4 |

Master BDD-006 maps to the strict trigger, local exterior topology, unconditional
fallback constraints and reference-adaptation rows above. Master INV-007/008
remain mandatory on ordinary and fallback routes. No implementation or review
PASS is implied by this table.
