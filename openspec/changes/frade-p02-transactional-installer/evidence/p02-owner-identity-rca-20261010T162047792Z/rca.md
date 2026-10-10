# Bootstrap ownership RCA

2026-10-10T16:20:47.792Z. Classification: STATE_TRANSITION / INVARIANT. Actual genuine unlink/recreate after owner write-close produced a different checked native identity, yet factory resolved VERIFIED and removed replacement bytes. RED: p02-check-owner-creation-identity-red-20261010T161606672Z. Original identity was sampled only after sealing, so the cleanup capability adopted an unowned leaf.

Repair within accepted S1: capture checked leaf identity while write handle still held; bind post-close and post-publication identities to that creation identity. Native owned enumeration already borrows pinned pending handles; no new backend operation, schema field, scope or loosened tests. Preserve mismatched leaf/probe and refuse without certification. Reserve bind/disposal and retain max48/60s.
