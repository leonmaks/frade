GATE_STATUS: FAIL

1. **B05: a failure notification can clear the unresolved diagnostic.** [DiagramView.tsx:428](/mnt/e/dev/codex/frade/.git/frade-workflow/runs/2026-10-02T09-29-07-389Z-8241e7b9-1dc3-4d92-bc04-9cd864f247ad/prepared/packet/packages/ui-workspace/src/DiagramView.tsx:428) ignores the publication event type, accepts `IDLE`, and clears whenever the painted revision differs.

   After a refusal at preview revision 1, a subsequent failed transaction can compensate to committed revision 0. The service then emits `failure` in `IDLE`; the matching frame/snapshot revision passes these checks and erases the diagnostic. An in-memory probe executing the exact current callbacks reproduced this clearing. The Electron regression covers only failure retaining the **same revision**.

   This violates PRE note 3 and the accepted successful-boundary requirement. Preserve the diagnostic on failure notifications, distinguish successful publication explicitly, and add regression coverage for failure rolling back to a different revision.

Packet integrity and current execution evidence checked successfully: 2,888 packet hashes, 1,952 runtime aliases, root3 execution, four retained RED failures, and recomputed p95 of 110.6 ms. These do not resolve the correctness blocker.

No files modified. This decision concerns focused B05 only; cumulative closure, visual approval, archive, and P02 remain open.