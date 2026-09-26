# Electron runtime verification

Date: 2026-09-23. Host: Windows x64, Node 24.18.0, pnpm 12.6.0.
Change: `frade-electron-runtime`.

## Final gate

`pnpm check:all` completed with exit code 0:

- ESLint and strict TypeScript across all five packages.
- 230 unit tests: Draw 200, runtime-contracts 12, runtime-node 2, runtime-electron 11, desktop 5.
- 3 Draw BDD contract checks; 4 root architecture contract tests.
- All workspace builds; Draw and runtime dependency/import boundaries.
- 214/214 Chromium tests (1.5 minutes), including document lifecycle and unchanged visual baselines.
- 1 built Electron integration test (3.9 seconds including runner startup).

`pnpm install --frozen-lockfile` and strict validation of both active changes passed. All 12 imported PNG files remain SHA-256-identical to the source Draw checkout. No source checkout files or visual expectations were modified.

## Real desktop evidence

The test launches `apps/desktop/out/main/index.cjs` with Electron 44.4.5; Main launches the separately built Utility entry.

Assertions cover:

- Ready backend snapshot through the named preload API.
- Node and process absent from the renderer, isolated-world separation, OS-level renderer sandbox.
- No generic IPC exposed; popup denied; notifications denied.
- Production CSP header, blocked renderer fetch and forbidden out-of-root resource access.
- Add a diamond; cancel Save As; save with an in-app name dialog; New; open the downloaded JSON; Save again with exact document equality.
- Identify the real Utility process by type/name, terminate that PID, observe unavailable → starting → ready, and verify a replacement PID and increasing health sequence.
- Block an external navigation while keeping the live local document intact.
- Close the app and verify the backend PID no longer exists.

## Deterministic unit evidence

Contracts reject invalid versions, operations, payloads, IDs, response schemas and health sequences. The Node service revalidates requests. Supervisor tests cover handshake timeout/incompatibility, response correlation and duplicates, timeout/AbortSignal cleanup, failed pending requests without replay, two bounded retries, spawn failure, unsubscribe and graceful/forced shutdown. Host tests cover sender/frame/URL authorization, contained file paths and preload validation/subscription cleanup.

## Test and setup notes

- The initial Node download client hit ECONNRESET. The official GitHub Electron archive was downloaded with the system HTTPS client, verified against the SHA-256 shipped in the pinned npm package, and installed through Electron's installer from a workspace-local cache. No TLS checks were disabled and no alternate binary source was used.
- Electron's prevented navigation leaves Playwright 1.57 navigation auto-wait pending. The test checks Main's actual URL and the live DOM after that action, at the end of the scenario.
- Non-failing tooling warnings remain: Turbo test output folders are absent without coverage; Playwright's Windows launcher emits Node DEP0190 and color-environment warnings. Production uses utilityProcess, not a shell command launcher.
- Windows CI was extended but not run remotely in this task. macOS/Linux GUI behavior, signed installers, repository services and persistence are not claimed.

See [ADR 0003](../adr/0003-isolated-desktop-runtime.md) for API, security policy, deadlines and recovery limits.
