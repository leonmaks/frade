# Routing Engine V2 — Current Change

PROGRAM: Routing Engine V2

ACTIVE_CHANGE: NONE

SEQUENCE_POSITION: BOOTSTRAP

PHASE: ENFORCEMENT_SETUP

BASE_COMMIT: NONE

PREVIOUS_GATE: NONE

NEXT_CHANGE_ALLOWED: false

## Current objective

Install and verify the Routing Engine V2 enforcement layer before creating R01.

## Allowed modifications

```text
AGENTS.md
packages/draw/src/routing/AGENTS.md
docs/routing-v2/**
scripts/routing-v2-architecture-gate.mjs
package.json
```

## Forbidden implementation work

Do not implement:

```text
Geometry Kernel
Terminal Resolver
Direction Resolver
Orthogonal Router
Segment Router
Segment Editor
Preview/Commit
Self-loop
Differential Harness
X6 V2 Integration
```

## Exit criteria

Bootstrap is complete only when:

```text
root AGENTS.md is active
routing scoped AGENTS.md is active
legacy boundary exists
machine architecture gate executes successfully
Codex started from routing scope sees both instruction layers
bootstrap changes are committed
```

After bootstrap commit:

```text
ACTIVE_CHANGE
```

may be changed to:

```text
routing-v2-01-geometry-kernel
```

and `BASE_COMMIT` must be set to the bootstrap commit SHA.
