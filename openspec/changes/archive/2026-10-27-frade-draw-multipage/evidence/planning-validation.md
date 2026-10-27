# Planning validation — 27 October 2026

Actual commands in isolated `codex/frade-draw-pages` from baseline e54cf0c1:

- `openspec list --json`, `openspec context --json`, `openspec list --specs`: PASS, local root resolved and relevant contracts inspected.
- Common workflow `cli.mjs status`: AVAILABLE in main and owning worktree; release matches adopted policy SHA256. This is not PRE or sandbox proof.
- First `openspec validate frade-draw-multipage --strict`: FAIL (long normative requirement warning promoted by strict mode). Split requirements without removing behavior. Second and post-format runs: PASS (`Change 'frade-draw-multipage' is valid`).
- `git diff --check` without local `-c` flags: NOT_COMPLETED; existing deep historical evidence exceeds Windows default paths and fsmonitor daemon errored. Scoped `git -c core.longpaths=true -c core.fsmonitor=false diff --check -- openspec/changes/frade-draw-multipage docs/engineering/BRANCH-STATUS.md`: PASS. No persistent Git configuration changed.
- `pnpm install --frozen-lockfile --offline --ignore-scripts` in restricted sandbox: FAIL, sandbox-specific pnpm cache lacks metadata. Same authorized command with normal user cache: PASS in 5.8s; 336 reused, zero downloads; lockfile unchanged. Install scripts intentionally not run; Electron native runtime availability is not established.
- Prettier on the six authored planning Markdown files: PASS. Shared-policy bytes were copied verbatim and excluded from formatting.
- Online empty Draw.io sample: insert and page-options/Move menu observed; screenshot/DOM retained. Online is supplementary, local pinned rendered parity NOT_RUN.

Production edits/tests/OpenSpec implementation verify/PRE/POST/visual acceptance remain NOT_RUN. No unrelated main source or dependency edits transferred. Dashboard open result: QUEUED, not proof of visibility.
