# LDE-REFUSAL-FIXTURE-01

Status: PROPOSED_NOT_ACCEPTED. Product and active control/fixture implementation remain unchanged.

## Exact issue

Independent PRE 03, gpt-6-sol/xhigh, resolved the earlier three findings but found the required frame-refusal regression incompatible with the new local Light snapshot. The sole setup helper intercepts a prepare only when snapshot.kind is dark, even after the test explicitly arms __p01RefuseDark. The actual tests still require the refused prepare, no document writes and truthful rollback/error behavior.

## Sole additional test-control change

In apps/desktop/tests/e2e/ui-contract-theme.spec.ts, replace exactly one line inside the existing armed prepare-refusal helper:

Before: data.snapshot?.kind === 'dark' &&
After: data.snapshot?.kind === 'light' &&

The surrounding action===fradePresentation, operation===prepare and __p01RefuseDark arming predicate remain exact. Every assertion, simulated REFUSED message/context, action, arm variable, timeout, numeric tolerance, document/settings/rollback check and test title remains unchanged. This changes how the fixture recognizes the editor snapshot; it does not remove or bypass refusal. No other fixture repair is authorized.

The full guard-only draft and design draft hashes are in manifest.json. The already accepted LDE-PRE-RECONCILIATION-01 origin chain additionally reverses this one exact predicate with a required count of one, so the unchanged pre-LDE live SHA 3535fd97bbb5ad514abd7cc896e2dab750042a757afde459cd4be71984e367e9 and historical original SHA 7c3e52a69c1b8346a78f4297774f5c2342a3ecdaeb05a2611465d2f09c546f43 remain mandatory. Negative controls reject any other guard/action/assertion/hash change. No new implementation path is added.

## Timing

After acceptance apply only the design draft before fresh PRE; the guard-only TS draft is a reviewed exact future implementation input and MUST NOT be copied into the live test before PRE PASS. Only after PRE PASS and meaningful RED may the exact guard delta be applied alongside already authorized visual expectations, with final current pin/source map and original-byte proof. Acceptance is not PRE PASS or a visual baseline.

## Review packet repair and strategy

PRE 03 also requires scripts/ka-fixtures.mjs, scripts/flow-fixtures.mjs and the original pinned benchmark hardware JSON. Add these baseline Frade sources/data plus their relevant in-repository import/file closure and hashes before another review. Repeated manual additions cost three reviews without implementation; use a bounded transitive dependency preflight and disclose unresolved/external reads instead of silently omitting them. Other repositories, secrets and external business data are not copied into the review packet.

No product code, routing/domain/vendor, .gitattributes/raw-protected docs/tokens, benchmark workload/budget, review harness, dependencies or persistence schema change is permitted. PRE/POST remain automatic gpt-6-sol/xhigh.
