# ADR 0001: pnpm/Turborepo monorepo and Draw boundaries

- Status: Accepted
- Date: 2026-09-23

## Context

Frade needs multiple hosts and infrastructure adapters while preserving the already verified Frade Draw editor. Empty future packages would imply contracts that do not yet exist, and allowing Draw to import host or storage code would prevent reuse in browser and Electron renderers.

## Decision

Use a single pnpm 12.6.0 workspace and Turborepo task graph. Create physical packages only when a change implements real behavior. `@frade/draw` is a host-neutral React/AntV X6 package and standalone Vite application.

Dependency direction is:

```text
apps/* and runtime hosts
        ↓
application services and ports
        ↓
domain packages

hosts/adapters ──→ ports
hosts/apps     ──→ @frade/draw
@frade/draw    ──╳ Electron, repository adapters, Git, SQL, filesystem
```

The rule is executable through `pnpm check:boundaries` and its negative contract test.

## Consequences

- Draw remains independently runnable and embeddable.
- One root lockfile and uniform scripts define reproducible verification.
- Future packages are added by their owning OpenSpec changes, not as placeholders.
