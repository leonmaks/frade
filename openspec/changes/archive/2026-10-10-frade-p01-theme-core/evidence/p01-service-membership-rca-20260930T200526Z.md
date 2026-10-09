# P01 membership failure root cause

Classification: STATE_TRANSITION.

Reproduction: first service check p01-service-check-20260930T200427Z.json failed 2/20 cases: join during APPLYING and leave/generation replacement. Disposing membership aborts an apply handle; that adapter reports its own Invalidated handle Error before service.check can throw the service's Invalidated subtype. The catch branch incorrectly used the error subtype to decide reprepare, so a valid membership invalidation was returned as REFUSED.

Fix: classify captured-versus-current membership independently of adapter error type before compensation, then allow the already approved single reprepare. The same snapshots/drafts/undo/ACK assertions remain unchanged. No additional retry or ignored refusal is introduced. First repair attempt; targeted tests must execute after this change.
