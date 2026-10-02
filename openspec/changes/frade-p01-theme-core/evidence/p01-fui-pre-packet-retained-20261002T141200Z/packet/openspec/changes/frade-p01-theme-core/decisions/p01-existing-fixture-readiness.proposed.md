# P01-COMPAT-READINESS-01 — exact proposed fixture scope

Status: PROPOSED / NOT_USER_ACCEPTED / NOT_PRE_PASS. Existing assertion files remain unchanged. No PASS/waiver of root FAIL.

Actual complete-root desktop has5FAIL; unchanged existing retry retains two of them. Current P01 actual multiroot oracle passes after rename-dialog dismissal. Current actual restored-readonly iframe drop passes after exact current presentation revision and hidden curtain. These observations support a TEST readiness hypothesis, not a proof that every regression is resolved. Native segment failure did not recur in the isolated retry; its0.05 tolerance/geometry/Undo assertions remain unchanged. B02 frame has a separate unstable SVG fixture blocker, not covered by this proposal.

## Exact path addition, if approved

Only add these two existing test files to the P01 allowed scope, for the following stronger readiness preconditions. Preserve every old assertion, source-origin bytes, workload, fixture and tolerance. No production/feature/DOM/model/vendor/routing behavior repair is authorized by this addition.

- apps/desktop/tests/e2e/workbench-multiroot.spec.ts — SHA256 24ccf7e4a64fceccce598aec0c7dbbc182cb666b12ece3ba5c7b6a03e83eb4a6; 16311 bytes
- apps/desktop/tests/e2e/diagrams.spec.ts — SHA256 fd4cbb6020a53ba6629c13144503cb42cacdeda44586800d7839bf8e0944086f; 44878 bytes

In workbench-multiroot.spec.ts, immediately after the existing rename submit click and before card(page,A), require the actual rename dialog to be hidden:

```ts
await expect(page.getByRole('dialog', { name: 'Переименовать корень', exact: true })).toBeHidden()
```

In diagrams.spec.ts dragObject, before reading pointer geometry/starting mouse-down, when the actual iframe exists, require that same iframe to be visible, its data-frade-revision to equal the current root revision, and the actual frade-theme-commit-barrier to be hidden; wait for document.fonts.ready and two subsequent frame RAFs. Do not force hidden state, bypass the cover, invoke graph APIs, invent DOM/DTOs, ignore errors or retry writes. The existing drop-overlay, coordinate assertions, reference counts, readonly disabled Save/unchanged bytes/dirty-state, semantic persistence, routing geometry and Undo/Redo checks stay exact.

## Process

Human approval is needed because the accepted proposal explicitly says 'Existing test assertions remain untouched' and closes P01 to its new test paths. This draft adds two exact compatibility fixture paths; it does not silently expand scope. After acceptance, preserve original planning/test bytes, update coherent proposal/design/spec/tasks/traceability, validate, freeze a fresh full manifest and run automatic independent gpt-6-astra/xhigh read-only focused PRE. Apply only after PRE PASS; then require targeted old tests and a current full root regression. If a check still fails, keep FAIL and investigate the correct owner. No P02 progression or readonly feature behavior expansion.

The independent P01-READONLY-STATE-01 question remains separate; this proposal does not decide how to open readonly FlowManager or remove that assertion.
