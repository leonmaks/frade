# Diagram editor presentation — shared Light scope

Contract version: 1.0.0. Guide version: 1.0. Owning change: `frade-light-diagram-editor`.

This companion records the user-approved exception to Guide section 5.1 and
Themes-and-Plugins Spec section 6. Their protected source files and canonical
tokens are unchanged; the normative OpenSpec deltas define the scoped change.
Current implementation/check coverage is reported in LIGHT-DIAGRAM-EDITOR-STATUS.md.
This document does not imply completed integration, visual acceptance or POST.

## Appearance and ownership

The complete application-rendered Draw.io and native Frade diagram editor uses
one shared Light presentation, including its own actions, panels, menus, dialogs,
style controls and tooltips. Ordinary Light, Dark, System, High Contrast and
VS Code Dark 2026 selection still controls the external workbench and global
pickers. The reference geometry preset applies to the external workbench;
comparable editor controls use the shared density/component contract.

Windows forced colors has final priority. The editor reuses the existing
resolver's validated system-color mapping and returns to Light on exit. Density
is independent: compact/comfortable and coarse pointer targets use canonical
shared tokens. No second resolver, registry, visual library or preference is added.

The versioned role data is packages/ui-workspace/tokens/diagram-editor-presentation.json.
It references the canonical Light palette and declares only the neutral canvas
and decorative dot colors. Both engines keep their configured semantic grid size,
visibility, phase, pan/zoom and snapping. The common scale-1 dot diameter is 1.2 CSS px.
No routing algorithm, endpoint, persisted coordinate or author style changes are allowed.

Each editor has an explicit root/ownership lease. A portaled editor-owned surface
retains that lease inside the one managed overlay host; a global dialog is not
made editor-owned merely because it overlaps the diagram. Disposal restores only
owned projection fields, preserving subsequent owners. Unknown/disposed owners
cannot restyle another editor or a global picker.

## Atomic presentation and content

Local Light is a derived participant-boundary view of the authoritative snapshot.
The application identity, settings, revisions and transaction contexts remain in
the existing controller. Parent chrome and canvas/frame share one registration
and the service's painted neutral cover. They must both settle their actual paint
ACK before publication. Prepare is side-effect-free. Abort, stale membership,
rollback, parked-frame readiness and original deadlines remain mandatory.

Authored fills, strokes, text, alpha, images, page styles and effective defaults
remain content. UI rules must exclude SVG cell paint, palette swatches and style
preview thumbnails. Never materialize author attributes or persist derived theme
state to make appearance match. Compare matched supported attributes on the same
backdrop; list unavailable native page/image/gradient capabilities explicitly.
System file/color pickers and native prompts remain OS-owned surfaces.

## Evidence and rollout

The incremental rollout is shared profile/composition, native retained root,
frame/bridge, owned surfaces, then full current interaction/visual coverage.
Partial unit GREEN is not application integration or visual approval. Required
runtime, performance, accessibility, unchanged-document/undo, source replay and
independent POST checks remain in the owning verification.md. Preserve historic
FAILs and existing origin pins. New baselines need explicit visual acceptance.

The implemented owner boundary uses opaque instance leases and the originating
dirty-diagram key as read-only UI metadata. Shared host modal priority, focus and
save/discard/cancel behavior remain unchanged. A current controller snapshot
provides the initial owned popup palette before the editor first paints.
Published-Git and Windows-checkout guard controls retain exact pinned raw bytes;
no runtime source normalization or hash discovery is permitted.
