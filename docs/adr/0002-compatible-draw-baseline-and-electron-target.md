# ADR 0002: Preserve the Draw baseline and target Electron

- Status: Accepted
- Date: 2026-09-23

## Context

The source Draw directory has no Git commits but has extensive working unit, BDD, geometry-matrix, and screenshot evidence. The partial Frade scaffold had unrelated major upgrades and a manifest-only desktop package.

## Decision

Import Draw from a deterministic SHA-256 snapshot and preserve its exact working baseline: React 18.3.1, AntV X6 3.1.8, TypeScript 5.9.3, Vite 6.1.0, Vitest 3.2.7, and Playwright 1.57.0. Framework upgrades require separate changes after parity.

Electron is the desktop target instead of Tauri. The desktop host will use sandboxed renderer windows, a constrained preload API, typed/validated IPC, Electron Main for lifecycle and authorization, and a Node.js utility process for the reusable backend runtime. No placeholder Electron application is kept in foundation.

## Consequences

- Migration defects are distinguishable from dependency-upgrade defects.
- The source directory stays untouched and is identified by migration evidence.
- `frade-electron-runtime` must create and verify the actual desktop package before any desktop command is advertised.
