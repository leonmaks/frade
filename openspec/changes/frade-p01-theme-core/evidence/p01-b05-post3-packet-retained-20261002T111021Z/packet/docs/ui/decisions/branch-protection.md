# Owner instructions — NOT_CONFIGURED / remote state unverified

Audit found `origin=git@github.com:leonmaks/frade.git`; `gh auth status` could not execute because gh is absent. No authenticated repository administration tool was established. This is evidence of an unverified state, not proof that protection is absent remotely.

After the actual workflow jobs exist and have completed at least one GitHub run:

1. In repository Settings → Rules → Rulesets, create/update the rule for the actual default branch (read it from GitHub; do not assume main).
2. Require pull requests, appropriate review and required status checks. Select the emitted UI job context `ui-compliance` and retain existing `foundation` and `draw-chromium-windows` checks.
3. Require the checks for the latest proposed revision; do not allow an obsolete check run to satisfy the UI gate. Choose repository policy for up-to-date branches/merge queue.
4. Inspect bypass actors and admin enforcement with the owner; do not silently broaden privileges or disable current rules.
5. Submit an isolated test PR that triggers a UI violation and confirm it cannot merge, then record ruleset ID, target branch, actual check contexts and run URLs in a new evidence report.

Authenticated CLI inspection, when installed/authorized: `gh repo view leonmaks/frade --json defaultBranchRef`; `gh api repos/leonmaks/frade/rulesets`; `gh api repos/leonmaks/frade/branches/<verified-default-branch>/protection`. Read access failures must be reported. No remote changes were made in this task.
