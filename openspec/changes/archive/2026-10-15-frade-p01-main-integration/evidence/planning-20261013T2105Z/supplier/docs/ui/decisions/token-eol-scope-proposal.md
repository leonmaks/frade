# Narrow foundation scope repair — awaiting acceptance

Production .gitattributes has not been created. PRE-20260930T091121Z approved exact paths and does not include that root file. The requested scope addition is one new .gitattributes containing only the eight entries in token-eol.gitattributes.proposed. No global wildcard, runtime source rule, Git global config change or relaxation of the byte oracle.

Classification: ENVIRONMENT. Actual local core.autocrlf is true; text/eol attributes for generated files and upstream fixture are unspecified. A fresh checkout in a verified OS-temp Git repository turned source LF into CRLF, causing the actual token checker to fail with Immutable upstream CSS fixture drift (exit 1). Four scoped text eol=lf entries restored exit 0. The other four proposed entries preserve the accepted byte-identical docs/schema copies; all eight currently contain zero CRLF sequences.

Evidence: openspec/changes/frade-ui-design-contract/evidence/foundation-eol-reproduction-2026-09-30.json. The first probe kept existing files; the successful reproduction removed only the four fixed fixture files before checkout. Canonical production/input/history bytes were not changed. The temporary repository was removed.

After user acceptance: update the scope/planning artifact explicitly, obtain focused independent PRE for the added path and unchanged byte contract, implement only the accepted entries, add a meaningful fresh-Git-checkout RED/GREEN control using the existing Node runner, repeat affected/full required checks, verify and obtain independent POST. This scope repair is owned by UI foundation and creates no routing prerequisite.

Local direct compliance PASS does not prove a clean Windows checkout. Task 4.1 remains open; foundation cannot claim complete/POST PASS/archive or start P01 until this blocker is resolved.
