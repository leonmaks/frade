# P01-WORKSPACE-SAVEAS-READINESS-01 — proposed exact test-only scope

Status: PROPOSED / NOT_USER_ACCEPTED / NOT_PRE_PASS. No implementation authorization.

Actual p01-e2e07-readiness-targeted-20261001T085708Z.json: bundle native+frame and drawio drop PASS3; WB-006/007 FAIL at line160 with ENOENT reading alternate/moved.frade-workspace immediately after actual Save As. Unchanged isolated WB retry p01-e2e07-minimal-verify-20261001T090249Z.json PASS1; the earlier FAIL is preserved. This is an intermittent TEST readiness race, not a waived product gate. Baseline HEAD and current Workbench both dispatch Save As with void host(...); click completion is not host completion. Existing main workbench.ts atomicJson writes/syncs/closes a temporary file and renames it to the selected path. The target existence is therefore a real complete-file readiness signal. No supplier dependency on routing is added.

Current source apps/desktop/tests/e2e/workbench-multiroot.spec.ts: 16434 raw bytes, SHA256 6217bacf65c394ca7b6c240985383b17a2d0fcf31d6be54904884029d681e9b9. Accepted rename-dialog-hidden insertion remains exact. Save original raw source/failed trace/planning bytes before any future repair.

Decision requested: permit only one import of existsSync from node:fs and one actual-target existence precondition at each of the two existing Save As sites, before the unchanged readFile/JSON expect.poll.

```ts
import { existsSync } from 'node:fs'

// after the first existing Save As command, before original readFile/JSON poll
await expect.poll(() => existsSync(workspace)).toBe(true)

// after the second existing Save As command, before original readFile/JSON poll
await expect.poll(() => existsSync(alternate)).toBe(true)
```

Keep all original commands/actions, fixtures, JSON assertions, roots count3/order/identity, relative-path mapping, reopen/edit/Save All/dirty Remove/Cancel and every tolerance exact. No ignored errors, catches, fixed sleep, write retry, skip/only, dummy file, mock DTO/handler, production/domain/routing/vendor/dependency/CI change. This does not change the already approved rename precondition or E2E-07 patch.

After acceptance: coherently update proposal/design/spec/tasks and traceability, strict validate, freeze an authorized immutable packet, automatic independent gpt-6-astra/xhigh focused PRE PASS, then apply exact three-line test delta and targeted plus fresh root check:all. Full FUI, human visual acceptance, verify/cumulative POST/archive stay open. STOP before P02.

The separate drop observation at p01-e2e07-minimal-verify-20261001T090249Z.json is a missing B source before geometry, with actual empty search and collapsed B root screenshot. Preserve it and diagnose within the already authorized iframe readiness scope; do not classify it as routing or silently change original assertions/actions.
