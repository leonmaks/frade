# Proposal

## Why

Frade currently runs only in a browser. The next planned phase needs a real isolated desktop host and a tested backend transport before repository/metamodel features depend on it.

## What Changes

- Add an Electron application mounting the existing Draw component with Main, sandboxed Preload, Renderer and an explicitly built Utility entry.
- Add reusable runtime contracts, Node health service, validated correlated IPC, backend health events, bounded recovery and shutdown.
- Enforce local-resource navigation, permissions, CSP and sender checks; expose only named health/event methods.
- Add real Electron process tests alongside protocol/lifecycle unit tests and root commands/CI.
- Preserve browser Draw functionality, including providing a desktop-compatible Save As name dialog.

## Capabilities

### New Capabilities

- `desktop-host`: Local isolated desktop window hosting Draw.
- `runtime-ipc`: Validated typed requests, responses and health events across process boundaries.
- `backend-lifecycle`: Utility startup, protocol handshake, bounded recovery, pending-request failure and controlled shutdown.

### Modified Capabilities

None. Draw remains independent of Electron.

## Impact

Adds apps/desktop and packages/runtime-contracts, runtime-node, runtime-electron. Pins compatible Electron tooling with existing Vite 6/React 18. Repository operations, indexing, write journals, multiple writable repository sessions and signed installers belong to subsequent planned phases; this foundation implements their process/transport prerequisites and a real health service only.
