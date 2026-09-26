# Tasks

## 1. Contracts and backend

- [x] 1.1 Implement platform-neutral validated requests, responses, health snapshots and stable errors; test malformed/version/operation handling.
- [x] 1.2 Implement the Electron-independent Node health service with request revalidation.

## 2. Process lifecycle

- [x] 2.1 Implement correlated requests, timeout/cancellation cleanup, handshake deadlines, sequenced health, bounded restart and shutdown in a testable supervisor.
- [x] 2.2 Test startup failure, invalid responses, unknown/duplicate IDs, crash pending failure/no replay, bounded retries, unsubscribe and shutdown.

## 3. Desktop host

- [x] 3.1 Add explicitly built Main, sandboxed Preload, Renderer and Utility entries and pinned dependencies.
- [x] 3.2 Enforce sender/frame/origin and payload validation, contained production resources, CSP, navigation/window/permission denial and named preload API.
- [x] 3.3 Mount Draw with health status and asynchronous desktop Save As dialog while preserving browser behavior.

## 4. Acceptance

- [x] 4.1 Verify built Electron with real utility startup, document file operations, renderer isolation, blocked navigation, crash recovery and shutdown.
- [x] 4.2 Integrate root commands and Windows CI, run static/browser/desktop gates, strict OpenSpec validation and document exact evidence and limitations.
