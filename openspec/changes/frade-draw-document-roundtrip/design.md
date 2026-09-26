# Design

## Context

See proposal.md. The current schema is version 1. Graph export maps X6 shapes directly, omits styles and viewport, and reduces vertices to alternating-axis constraints. Open clears cells then reconstructs lossy vertices; edge-added routing overwrites imported routes. The existing lifecycle test checks mounting only.

## Goals / Non-Goals

Goals: faithful supported document state, early validation, deterministic legacy reading and real UI evidence.
Non-goals: Electron implementation in this corrective change, arbitrary X6 markup/plugin serialization, recovering information already lost by older exports, or changing routing policies.

## Decisions

- Extend version 1 with optional vertices, terminal anchor offsets, explicit shape metadata, limited style properties and port coordinates. Keep existing constraints readable using a deterministic orthogonal conversion. Full X6 JSON was rejected because it includes tools and implementation state and permits arbitrary markup.
- Map semantic shapes to X6 shapes through a shared factory. Preserve semantic identity in a private cell property and infer older cells where possible.
- Validate unknown input into a fresh canonical document without mutating it. Whitelist supported styles; validate references, IDs, finite geometry and optional fields.
- Construct detached cells before replacing the graph. Reset cells in one operation, bypass initial rerouting only for restored explicit routes, and reset document history after success. Restore previous cells and viewport on an unexpected commit failure.
- Save current graph zoom/translation and metadata. Save As uses a browser name prompt and changes the name only after successful export; cancellation is a no-op. File selection is cleared after reads so the same file can be retried; ignore stale reads after New or another Open.
- Browser tests use file input and download events with the real editor, compare decoded documents and rendered paths, then exercise editing after reopening.

## Risks / Trade-offs

- Legacy alternating-axis constraints are lossy → preserve what is present with deterministic routing; new saves also store full vertices.
- Imported routes could be recomputed → restoration-specific event option and browser path equality tests.
- Imported arbitrary attributes could execute or load external content → only finite numeric and simple presentation properties are accepted.
- Old files cannot recover already-discarded styling → document this limitation without fabricating data.

## Migration Plan

Introduce failing regression tests, implement compatible adapters/UI, run focused checks and all Draw regression tests without updating screenshot baselines. Record fresh evidence separately from the archived foundation report.
