# PRE08 evidence response

Owning run2026-10-27T02-42-19-115Z-103ad441-7ab2-4f1c-9cf8-d91ee7271b39
returned FAIL02:47:03Z, candidate/packet unchanged. Raw outputs, events, provenance
and exit are retained byte-for-byte under pre-08-20261027T024703Z. The facade-only plan
was found coherent, but validation text lacked strict invocation and actual exit.
No checker policy edit approved or performed.

RCA INTEGRATION: redirected validation text loses its invocation/status. A first
structured capture02 also exposed ENVIRONMENT: legacy Windows PowerShell selected
openspec.ps1 and rejected it under execution policy, while its wrapper exited0 with
empty stdout/version. That is NOT OpenSpec success. Raw02 plus stderr retained; never
accepted as PASS and not sent as the authoritative validation. The existing build
recorder was checked separately: it actually ran pnpm/build, emitted all pinned asset,
typecheck, Vite and utility completion output, and took16–30seconds; this .ps1 failure
does not apply to that executable.

Actual validation03 calls the public openspec.cmd launcher through cmd.exe using a
fixed command, preserving normal execution policy. It records the exact --strict
command, actual exit0, validator version1.14.3, unchanged before/after hashes for all
four active artifacts, and separately hashed raw stdout/stderr/version outputs.
It fails unless the validation message is present, both invocations exit0, the version
is nonempty and input hashes remain identical. This probe actually PASS;02 remains
INVALID/NOT_EXECUTED despite its wrapper code0. No configuration/policy bypass.

Fresh PRE09 receives complete actual03 artifacts and the original focused packet;
strictly recorded current validation replaces no historical failed report. Exact
facade contract RED and307 assertions/two unavailable current suites remain until
approved repair and new execution. PRE/POST assignment stays gpt-6-sol/high.
