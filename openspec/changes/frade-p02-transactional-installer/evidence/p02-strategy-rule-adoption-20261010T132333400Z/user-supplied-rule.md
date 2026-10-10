---

## 18. Strategy Before Expensive Work

Before substantial implementation, an expensive review, bulk processing, or a long
test run, analyze the feasible strategies for achieving the required result.
Do not default to executing the largest procedure or repeatedly processing the
same volume.

Record and communicate before execution:

1. The objective, acceptance criteria, and evidence needed to prove completion.
2. All materially different feasible alternatives, including the existing
   approach, removing duplicate work, incremental checks, safe reuse of verified
   results, isolation or parallel execution, and algorithm or tool changes.
   Explain why an alternative is inapplicable when relevant.
3. For each viable alternative: expected time, resource and token cost, risks,
   dependencies, and uncertainty. Distinguish measured durations from forecasts
   and hard timeouts; label any success probability as measured or judgment.
4. The selected strategy and why it offers the best expected path to the required
   result while preserving correctness and the required evidence.
5. A bounded initial probe when major costs are unknown, progress observations,
   a reassessment point, and criteria for stopping or changing strategy.

Optimize execution without weakening specifications, assertions, historical
regressions, source binding, isolation, or independent review requirements.
Run each required check on the exact applicable inputs; avoid duplicate complete
runs when equivalent coverage can be demonstrated. Change a mandated procedure
only within user-authorized scope and reconcile its formal contract first.

If observed costs or failures invalidate the selected strategy, reassess before
launching another expensive attempt. Preserve interrupted and failed evidence;
never report an incomplete run as PASS. Already spent time or tokens are not a
reason to continue an inferior strategy.

Apply this analysis proportionately: routine low-impact edits do not require a
large planning ceremony. Do not request another approval for actions the user
has already authorized.
