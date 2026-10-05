# W01 task 4.2 test hygiene repair

Status: **LOCAL_REPAIR_VERIFIED_OWNER_CHECKS_PENDING**. Approved pair: `gpt-6-sol/high`; actual backend and effort: `NOT_CONFIRMED`. Source HEAD from `EXECUTION-INPUTS.json`: `bb980612e519fabcfbdb76a76a432dcf074c1689`.

RCA: **TEST**. Native scoped lint exited 1 because `trace` was destructured but unused in the new FWE-014-S01 case. The supplied native full run passed 221/221 before this repair; neither supplied record was changed.

The only source change is `tests/directions/task42-requirement-reciprocity.test.mjs`: `  const { trace, input } = fixture({ independent: true })` became `  const { input } = fixture({ independent: true })`. The target line existed exactly once, and its prior SHA matched the native lint input. Exact replacement and unchanged assertions were verified against the immutable input bytes.

- Before SHA256: `654d5cc9fd5c5b34dab7cf2184609b472ac41097e14d0d473610e6797188c170`
- After SHA256: `3478b9c968349e5f19ca9594e109f26ac8994785563333d72a1a16ee66e02b6d`

## Staged checks

| Command | Exit | TAP tests/pass/fail | Raw stdout SHA256 | Raw stderr SHA256 |
| --- | ---: | ---: | --- | --- |
| `node --test tests/directions/task42-requirement-reciprocity.test.mjs tests/directions/task42-trace-gap.test.mjs tests/directions/contracts.test.mjs` | 0 | 3/3/0 file wrappers | `447d64a1caec77e383aaef1c2eea80760f0869438d8f7a7903fb75bfbff530bc` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `node --check tests/directions/task42-requirement-reciprocity.test.mjs` | 0 | N/A | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `node tests/directions/task42-requirement-reciprocity.test.mjs` | 0 | 13/13/0 | `b8d6d67fed138f500cc20a13fe06db3f0f55968d244f2ce94089f9bdbbfeff43` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `node tests/directions/task42-trace-gap.test.mjs` | 0 | 8/8/0 | `84cf5ca14f1f642934d7b080c00d90b0afab2b55139a1a9fe42854eca871d2cb` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `node tests/directions/contracts.test.mjs` | 0 | 14/14/0 | `2f4e32935aa856faf5245706b8fdd491741f143af4a7e771f923f0152817b516` | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |

Raw stdout and stderr are retained beside this report as `HYGIENE-TEST.*.log`, `HYGIENE-CHECK.*.log`, `HYGIENE-DIRECT-RECIPROCITY.*.log`, `HYGIENE-DIRECT-TRACE.*.log`, and `HYGIENE-DIRECT-CONTRACTS.*.log`. The direct file invocations executed **35/35 individual cases**. Node v18.19.1 reported only three file-level subtests for the requested `--test` command. An initial child-process wrapper failed with `EPERM` before checks launched; direct commands produced the recorded exits and logs.

Owner still needs to repeat native scoped lint and the native full suite, then perform applicable Verify/POST/closure gates. This repair is not a gate result or phase advancement; no writer dispatch or foreign adoption occurred.
