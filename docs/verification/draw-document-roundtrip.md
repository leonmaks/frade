# Draw document round-trip verification

Date: 2026-09-23. Source checkout `E:/dev/codex/frade-draw` was not modified.

## Evidence

- Eight new fidelity regressions failed against the original implementation before the fix.
- Root static gate: lint, typecheck, 200 unit tests (28 files), 3 BDD checks, 2 architecture boundary tests and production build passed.
- Initial full browser run: 213/214 passed. One existing symmetry test accessed its test API before initialization. Added an explicit readiness wait; no geometry or expectations changed.
- Full browser rerun: 214/214 passed, including 7 real document lifecycle tests.
- All 12 imported PNG baselines are byte-identical to the source checkout.
- `openspec validate frade-draw-document-roundtrip --strict` passed.

The original foundation acceptance established migration equivalence, not complete document fidelity. This change closes that gap with actual file import/download, shape/style/port/route/viewport preservation, Save As, clean New, malformed-input rejection and stale-read protection.

Known limits: browser Save downloads a file; it does not overwrite an existing filesystem handle. Older documents cannot restore styles/vertices they never stored. No repository persistence is claimed.
