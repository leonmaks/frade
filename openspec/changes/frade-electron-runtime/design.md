# Design

## Context

Only @frade/draw exists today. The master plan explicitly places a real health-check runtime before repository implementation. See proposal.md. Node 24, React 18, Vite 6 and TypeScript 5.9 are the verified baseline.

## Goals / Non-Goals

Goals: four real Electron entry points, narrow validated transport, isolated Draw, observable recovery and executable evidence.
Non-goals: fake repository APIs, repository recovery/journals before repository services exist, SQLite, native installers or cross-platform release claims.

## Decisions

- Use Electron 44.4.5 and electron-vite 5.0.0 with Vite 6.1.0 (peer-compatible), exact pins and a single lockfile. Build the utility entry explicitly as CommonJS through Vite; bundle internal runtime packages into privileged outputs and the preload. This avoids unbundled TypeScript at runtime.
- runtime-contracts is platform neutral; runtime-node owns the health service and imports no Electron; runtime-electron owns a testable supervisor with injected child transport. The desktop utility entry wires process.parentPort to runtime-node.
- Renderer exposes only runtime.getHealth and events.subscribe through contextBridge. Main validates the requesting WebContents, its main frame, URL and the request schema. Both backend messages and public responses have explicit validators.
- Correlation, timeout and AbortSignal support live in the internal client/supervisor. Cancellation is a control message containing the request ID, never a transferred AbortSignal. The initial public health API needs no arbitrary command executor.
- Health is starting/ready/unavailable/stopping. Restart uses two bounded attempts with backoff. Every pending request fails on exit. Handshake timeout and incompatible messages terminate a child. Graceful shutdown sends a control message and falls back to kill.
- Production loads frade://app/index.html through a contained resource handler, with path checks, CSP, denied permissions/new windows and external navigation. Development trusts exactly its configured loopback Vite origin. No filesystem commands are exposed to the renderer.
- Draw receives an optional asynchronous name-provider callback for Save As. Desktop supplies a renderer dialog because Electron does not implement window.prompt. Browser behavior remains compatible.
- Packaging installers and repository-specific lifecycle cases remain explicit follow-up phases from the master plan. This change tests the built app and real utility process on Windows.

## Risks / Trade-offs

- New Electron binary download may be restricted → report the prerequisite if installation is blocked; do not claim runtime verification.
- An old Playwright line may not drive new Electron → verify early against the real binary before interpreting tests.
- Incorrect output paths could hide missing utility builds → launch built artifacts in E2E and assert a separate process.
- Headless Linux needs a display → keep static checks portable and real Electron checks in Windows CI initially.

## References

- https://www.electronjs.org/docs/latest/api/utility-process
- https://www.electronjs.org/docs/latest/tutorial/security
- https://electron-vite.org/guide/dependency-handling

## Migration Plan

Add contracts and tests, backend/supervisor, desktop entries and build wiring, then install and verify. Keep Draw browser tests as a separate root gate. Document platform-specific evidence and leave signed distribution work to desktop hardening.
