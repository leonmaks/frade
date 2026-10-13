# P02-WINDOWS-FILESYSTEM-BACKEND-01 — proposed exact planning amendment

Status: PROPOSED; NOT_ACCEPTED; native helper/backend NOT_IMPLEMENTED. Owning branch codex/frade-ui-design-contract; current checkpoint 950f0dc62a5f1cb6fbcc88f268ef10166ccec73c; original and accepted P02 origins unchanged. This is a material first-party deployment/backend decision, not acceptance of executable extensions or a failing test waiver.

## Reproduced limitation

[Actual probe](../evidence/p02-windows-fs-readiness-20261010T013525Z/probe.json) on Node24.18/Windows: exclusive file write+sync+same-directory rename PASS; directory fsync EPERM; O_NOFOLLOW UNDEFINED and open through a junction ancestor creates a file in the owned outside-root fixture. Static lstat detects the junction, but that alone does not prove protection when an ancestor is replaced between check/open. [Cleanup](../evidence/p02-windows-fs-readiness-20261010T013525Z/fixture-cleanup.json) confirms fixture removed without touching a user project. No installer staging/root exists in production.

Inference: a Node-only path/check/open implementation cannot claim the accepted Windows handle/reparse boundary or supported metadata durability based on these APIs. This is not proof that all Windows backends are impossible. Preserve the zero outside-root-write and durable journal obligations; do not relabel probe as PASS or waive the requirements.

## Exact requested decision

Authorize a small first-party Windows filesystem backend for P02, behind the injected extension-service filesystem port. Ship a reviewed compiled C#/.NET Framework helper built from repository-owned source using an explicitly discovered existing compiler. It has only closed bounded filesystem operations for the Main-authorized local installation root; Main starts it without elevation and authenticates one owning session/generation. No extension JavaScript, shell, user command, networking, registry edit, credentials, global configuration or repository filesystem access is accepted by the helper. No compilation at application runtime and no automatic SDK/runtime installation.

Existing portable validation and current59tests remain unchanged. The helper is Frade implementation infrastructure; P05/P06 executable extension hosting and APIs remain NOT_STARTED. Renderer/preload receive only the named existing approved portable extension DTO interface, never native handles, helper paths or generic filesystem methods.

### Authorize only these concrete new paths/purposes

- packages/extension-service/native/windows-filesystem.cs: first-party closed protocol, Win32 handle/reparse and write-through operations; bounded source reviewed by PRE/POST. Build output is ignored, not vendored or masqueraded as signed.
- packages/extension-service/src/filesystem/types.ts, windows.ts, windows-protocol.ts, factory.ts: portable injected port plus Main/service-only typed child transport and capability binding; fail closed on absent, drifted, unsupported, timed-out or unverified backend. Future other-platform support must satisfy the same contract before PASS.
- packages/extension-service/scripts/build-windows-filesystem.mjs, copy-windows-filesystem.mjs: discovered existing compiler, exact source/command/artifact hashes, Windows-only build and copy into the current desktop output; no account/global settings. Unsupported compiler/runtime or capability reports BLOCKED, no weakened Node fallback.
- packages/extension-service/tests/filesystem*.test.ts and fixtures: actual Windows handle/junction/ancestor-replacement, lock, outside-root-no-write, directory/file identity, disposal/crash/protocol bounds and capability tests; no weakening of existing assertions. Non-Windows jobs run portable checks; Windows-required evidence remains explicit, never skipped as PASS.
- packages/extension-service/package.json and apps/desktop/package.json: exact owned build/copy/test hooks for this helper. Use current build commands/order; no Electron/Vite config edit, broad packaging refactor, app version bump or other dependencies. Validate actual dev/build/start availability before claiming integration.
- Existing approved apps/desktop/src/main/extension-installer.ts and index.ts: start/bind/dispose the service-side backend only; this adds no privileged preload API.
- Owning P02 proposal/design/tasks/spec/evidence/decisions, docs/ui/extension-installer.md and branch dashboard: exact coherent platform/capability/build/test obligations before new PRE. Retain original scenarios, journal phases,50MiB/200MiB/10000/ratio100/depth32, source/control origin and historical failures.

No other existing path is added. Original integration scope remains valid. Routing/domain/Repo Core/P01 tests or evidence/vendor/guide/tokens/brand/CI/shared review policy remain frozen. No new third-party parser, SDK download, universal reviewer model or executable plugin capability.

## Backend acceptance criteria before production use

1. Main grants only one installation root identity. The backend rejects root/ancestor/leaf reparse points and special entries; retains checked directory identities/handles so replacement cannot redirect writes. Ordinary Node lstat+string-prefix checks are not sufficient. An exact chain-pin/root-handle algorithm and closure of race windows must be specified and independently reviewed before implementation. No admin elevation.
2. File writes are exclusive, bounded and flushed; journal replace is same-volume, uses documented flush/write-through behavior with checked source/target parents and an explicit failure contract. No cross-volume copy, reboot-delayed mutation or metadata-durability claim merely from rename returning. The final supported guarantee and filesystem/runtime preconditions are stated in the coherent design; uncertain/unsupported capability is BLOCKED/REFUSED, never ACK.
3. Actual Windows negative fixtures replace ancestors/reparse points at the check/open boundary; assert zero outside-root writes. Positive safe fixture passes. Test locked files and explicit cleanup pending. Real process-kill/reopen at all durable phases/side effects remains mandatory; mocks and process-kill evidence do not prove OS power-loss behavior.
4. Bounded closed request/reply framing includes version, operation, requestID, session/generation, deadlines and typed errors; reject invalid/replayed/malformed/out-of-order requests. Handle/path authority stays service side. Hold/release semantics and shutdown must be tested, including helper crash before/after an effect.
5. Build/runtime integrity and supported Windows filesystem/architecture are actually checked. Helper/source hashes describe integrity only, not signing/trust. Missing compiler, framework, asset or proof is an honest blocker. Existing Linux CI pipeline is not silently changed or advertised as a Windows capability proof.
6. A verified backend is prerequisite to staging/journal production use. The current validator remains a component, not a working installer. Unsupported other hosts do not become working by returning synthetic success.

## Procedure after acceptance

Save exact human acceptance and proposal raw SHA. Update coherent active P02 plan/spec/tasks without erasing original requirements/evidence; strict validation; fresh independent PRE on approved gpt-6-sol/xhigh covering this backend amendment and existing component/control state. No backend implementation before PRE PASS. Then meaningful RED, implementation, required tests, actual build/runtime/crash evidence, full verify/POST/visual/archive. STOP beforeP03. Current archive component59/59/typecheck/lint/UIcompliance/strict PASS remains historical component evidence only; all remaining gates remain required.

## Primary technical references checked10October2026

- [CreateFileW](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew): reparse-point opening and sharing options. A final-component open flag alone is not an ancestor confinement algorithm.
- [MoveFileExW](https://learn.microsoft.com/en-us/windows/win32/api/winbase/nf-winbase-movefileexw): same-volume replace/write-through options and error behavior; assess exact supported guarantees without overstating generic crash/power-loss evidence.

These API references are candidates for the backend design, not implementation or capability proof.
