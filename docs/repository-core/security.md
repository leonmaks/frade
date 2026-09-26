# Security and deployment

Run filesystem/SQLite/Git adapters only in trusted Node 24 or Electron main/server runtimes. Domain/application public contracts use ES2022 without Node/DOM ambient libraries. The browser/renderer receives only the portable protocol. No mandatory network/cloud/AI service is involved.

Desktop opens a native root chosen through the host directory dialog. Renderer requests cannot choose a path or supply permission scopes. The narrow preload bridge exposes `fradeRepository.open/request`; existing Draw APIs and renderer isolation are preserved. Main validates the trusted sender. The local desktop policy grants the current user read/write/configure/cascade for the selected repository; multi-user organization authorization is host-specific.

The HTTP handler is a host integration, not a deployed web service. Hosts must implement authenticated `sessionFor(request)` and enforce origin/CSRF/TLS/session lifecycle policies appropriate to their deployment. The `/repository` POST JSON protocol has a bounded body (default 1 MiB) and request timeout (default 30 seconds). Do not expose a demo session resolver publicly. Mutations require an idempotency key, and reconciliation is available through the protocol. Timeout after dispatch is OUTCOME_UNKNOWN, never proof of rollback.

Profiles hold authentication references, not raw secrets. Secret-shaped connection keys are rejected. Hosts must still avoid putting credentials into arbitrary values/URLs; a complete adapter-specific connection schema and export-redaction service remains unfinished. Errors omit stack traces and native paths; diagnostics should not log repository payloads by default.

Native containment rejects traversal, absolute paths and observed symlink/junction components. This does not defend against a malicious local process changing directory entries between checks and access. Use trusted, permission-controlled roots; this is not an operating-system filesystem sandbox. Participating writers use a lock, but arbitrary external writers are not fully excluded.

Git is optional and never automatically pushes/commits. Native watchers are best-effort; source writes remain authoritative if index update or subscriber delivery fails. Back up source files and metamodels; derived SQLite can be rebuilt. Preserve recovery artifacts after failed writes. Medium/Large storage and automated crash recovery are not release-ready.
