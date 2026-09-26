# ADR 0003 — Isolated desktop runtime

Status: accepted for `frade-electron-runtime` (2026-09-23).

## Decision

Use Electron 44.4.5, electron-vite 5.0.0 and Vite 6.1.0 with four explicit bundled entries. Main, sandboxed Preload and Utility are CommonJS; Renderer is a browser bundle. Workspace TypeScript packages are bundled into privileged outputs, not resolved at runtime.

- `runtime-contracts`: platform-neutral, allowlisted wire schemas and stable error codes.
- `runtime-node`: health service; no Electron dependency.
- `runtime-electron`: injected transport supervisor; handshake, correlation, timeout, cancellation, events and recovery.
- `apps/desktop`: concrete Electron transports, resource host and Draw UI.
- `@frade/draw` remains host-neutral. Its optional asynchronous name provider allows a renderer-owned Save As dialog.

The public bridge exposes only `runtime.getHealth()` and `events.subscribe(listener)`. The latter returns an unsubscribe function. No generic invoke/send, filesystem or process API is exposed. Main checks WebContents, main frame and document URL before schema validation. Backend revalidates requests; Preload validates responses and event sequence.

Production uses `frade://app/index.html`; only real paths inside the bundled renderer root may be served. CSP disallows scripts from other origins, connections, frames, objects and form submission. Inline styles are needed by X6. Node integration is off, context isolation and OS sandbox are on. Navigation, redirects, popups, webviews and permissions are denied unless expressly allowed by the local UI policy. Development permits only the configured loopback Vite origin.

## Lifecycle

Startup handshake deadline: 5 seconds. Request timeout: 3 seconds. Pending requests fail on backend loss and are never replayed. Internal callers may cancel with AbortSignal, translated to a request-ID control message. Health work itself is synchronous.

Automatic recovery permits two restarts per application lifetime, with 250/500 ms backoff. Further failures remain unavailable until relaunch. Health events have monotonic host sequence numbers; fresh snapshots recover missed events. Shutdown stops recovery and allows 1.5 seconds for graceful exit, then kills the child.

## Consequences and limits

This is a real process/IPC foundation with a health operation, not a repository implementation. Repository sessions, journals, metamodels, index, Git, installers/signing and web runtime remain subsequent changes. Save still downloads JSON through the browser controls; it is not in-place repository persistence.

The built application is exercised on Windows with Playwright 1.57.0. After a prevented Electron navigation, Playwright may keep its navigation auto-wait pending; the test checks the actual Main URL and live renderer DOM after the prevented transition.

References: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [Utility processes](https://www.electronjs.org/docs/latest/api/utility-process), [electron-vite dependency handling](https://electron-vite.org/guide/dependency-handling).
