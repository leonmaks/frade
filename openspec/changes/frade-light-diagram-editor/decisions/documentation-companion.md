# Documentation delivery reconciliation after PRE packet audit

This refines implementation within the accepted Light-editor behavior and existing allowed companion-document path; no new product behavior, production path, control repair, deferred requirement or user exception is introduced.

Observed baseline: scripts/ui/checkout.mjs protectedArtifacts and runCheckoutControls require exact raw SHA256/LF for Guide, QA Checklist and Themes Spec, as well as five token artifacts. Editing any of these would fail required pnpm ui:checkout:check. The current feature does not authorize changing this oracle.

Selected correction: publish the approved editor exception as docs/ui/diagram-editor-presentation.md, with explicit rule IDs, precedence and accepted authority, plus this change's normative deltas. Keep all eight protected artifacts byte-identical. The original documentation-amendment.md draft is retained as superseded planning text only; its proposed physical insertions MUST NOT be applied. The companion reproduces the accepted policy without pretending that the frozen v1.0 source already contains it. The accepted user scope and new diagram-editor-presentation requirements supersede conflicting global-theme wording only inside the two editor scopes.

Alternatives: changing raw-byte oracle/pins broadens process scope and weakens isolation unless separately reviewed, so it is not selected; silently omitting documentation is rejected. Companion publication preserves both normative decision traceability and the exact existing check. No expansion of allowed paths.

Native capability inventory: packages/draw/src/document/schema.ts currently supports five shapes, style/labelStyle and explicit color/opacity/font properties; native DiagramDocument has no authored page-background/image or gradient fields. Shared parity therefore covers supported attributes, with Draw.io-only page/image/gradient witnesses separately reported. Unsupported native features remain unsupported, as already required by the spec; no schema/adapter/domain repair is permitted. Read these files as packet evidence, never implementation targets.
