## Why

Teams need a lightweight, local-first diagram editor with Draw.io-style orthogonal connection editing, without inheriting an architecture repository, backend, or collaboration platform. The empty project is the appropriate place to establish one focused editor whose routing behavior is observable and regression-tested in a real browser.

## What Changes

- Create a standalone React, TypeScript, Vite application using AntV X6 as its only graph engine.
- Provide a local diagram canvas, five basic shapes, selection, move/resize, viewport controls, undo/redo, JSON open/save, and SVG/PNG export.
- Add floating contour attachments by default: terminals remain bound to node IDs while their attachment point and side may be recalculated; explicitly fixed ports remain compatible.
- Implement constrained Manhattan routing with rounded rendering, obstacle validation, deterministic attachment-side selection, and a shared pure geometry validator.
- Implement Draw.io-style segment editing: selected edges expose derived handles; dragging moves a real edge perpendicularly, supports straight-edge sliding or detours, and commits atomically.
- Add executable BDD, unit/TDD suites, and Playwright/Chromium visual integration that inspect both routed geometry and rendered SVG.

## Capabilities

### New Capabilities

- `standalone-diagram-editor`: Local canvas, shape, selection, viewport, history, and document lifecycle behavior.
- `floating-manhattan-connections`: Dynamic contour attachments, obstacle-safe Manhattan routes, preview connections, and terminal-direction policy.
- `drawio-segment-editing`: Derived segment handles, live constrained editing, normalization, history, persistence, and legacy route compatibility.
- `diagram-visual-verification`: Deterministic Chromium routing/segment fixtures, SVG inspection, geometry validation, and screenshot regression.

### Modified Capabilities

- None.

## Impact

Adds the application source, npm lockfile, OpenSpec artifacts, tests, deterministic browser fixtures and project documentation. Runtime dependencies are React 18.3.1, React DOM 18.3.1, and @antv/x6 3.1.8; development dependencies include Vite, TypeScript, Vitest, @cucumber/gherkin, and Playwright. No server, database, repository-domain API, authentication, or collaboration capability is introduced.
