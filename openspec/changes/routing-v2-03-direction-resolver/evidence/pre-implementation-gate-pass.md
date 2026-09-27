CHANGE: routing-v2-03-direction-resolver
GATE_TYPE: PRE_IMPLEMENTATION
GATE_STATUS: PASS

BLOCKERS:

None found. The report-to-fingerprint binding defect is resolved.

SPEC_ALIGNMENT:

Proposal, delta specification, design and tasks define one coherent direction-selection capability. Requirements and scenarios map to meaningful implementation and verification tasks. No unresolved numerical or domain decision was identified.

The FINAL singleton override explicitly leaves singleton endpoints unlocked during paired preference-row construction.

SCOPE_ALIGNMENT:

HEAD and the planning baseline remain `2b6619627e3e744007b06251a05dad86e7bce634`. There are no intervening commits or staged changes.

All 14 discovered paths belong to authorized planning/control scope. Both prospective R03 source and test directories are absent. R01/R02 source, tests, main specifications, archives and dependency manifests remain unchanged.

ARCHITECTURE_ALIGNMENT:

The planned dependency direction remains direction → terminal/perimeter → geometry/model. R03 introduces no route construction, jetty, rendering, persistence or later-layer responsibility.

Installed scope/dependency checks reject archived-layer changes, orthogonal siblings, later layers, reverse imports, framework/browser/legacy dependencies and cycles.

TEST_COVERAGE_ALIGNMENT:

The plan requires:

- 900 independently reference-derived quadrant/mask expected pairs, with membership assertions.
- Direct numerical, fixed-point, corner, singleton and role-exchange fixtures.
- Strict compiler negatives for mixed and widened coordinate spaces.
- Six properties with at least 5,000 accepted cases each, seed `0xFAD003`, rejection accounting and reproducible counterexamples.

The existing R02 `runConditionedProperty` harness supports that contract. TypeScript and Vitest resolve locally; `fast-check` remains absent and is no longer assumed available.

The test-local mutation plan specifies a complete applicable operator inventory, isolated mutations, import-redirection controls and:

`killed / (killed + survived + timeout) × 100`

Compiler-invalid mutants are reported separately; infrastructure errors abort. The required score remains ≥90%.

R03 implementation suites and mutation testing are future work and were not executed.

NUMERICAL_CONTRACT_ALIGNMENT:

Quadrant numbering, inclusive EPSILON zero bands, signed gaps versus non-negative separation, overlap/containment, zero extents, finite-result rejection and no quantization are explicit and coherent.

Mask membership, R02 effective-mask precedence, target outward semantics, fixed-point preservation and vertical corner priority are retained. Translation/reflection domains are input-defined; excluded ties and cancellation remain direct fixtures. Universal source/target exchange symmetry is correctly rejected.

REFERENCE_ALIGNMENT:

The pinned `mxEdgeStyle.js` SHA256 matches:

`8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d`

Independent memory-only extraction and interpretation produced:

- 900/900 matching quadrant/mask cases.
- 12,254 shared-domain reference comparisons without mismatch.
- 32,400 conditioned reflection comparisons and 24,750 safe translation comparisons without mismatch.

Shared-domain comparisons exclude documented adaptations, including singleton fixed-lock behavior. These are reviewer probes, not R03 implementation-suite evidence.

Early singleton locking changed 72/900 matrix results. For source `(0,0,10,10)`, target `(-30,-30,10,10)`, masks `{WEST,NORTH}` / `{NORTH}`, final override produces `WEST/NORTH`; early locking produces `NORTH/NORTH`.

Source-role asymmetry is observable: diagonal default-mask selection gives `EAST/NORTH`, while exchanging endpoints gives `WEST/SOUTH`. Mask-filtered fixed-side adaptations preserve the master’s membership requirement.

MACHINE_GATE_INTEGRITY: PASS

The installed [fingerprint extraction and approval verification](E:/dev/codex/frade/scripts/routing-v2-architecture-gate.mjs:577) requires one marker-delimited, canonical pretty-JSON fingerprint with exact path coverage and valid hashes. Re-serialization rejects duplicate keys and ambiguous encodings. Verification requires:

`report fingerprint = manifest artifacts = canonical checkpoint hashes`

Separate memory-only probes accepted matching evidence and rejected missing, duplicate, malformed, duplicate-key, missing-path and incorrect-hash fingerprints. Both changed-design cases were rejected: retaining the old manifest, and recomputing the manifest.

For the stale-report/recomputed-manifest probe, explicit assertions confirmed unchanged saved report bytes, unchanged report SHA256 and unchanged `reportSha256`.

The gate also requires committed PRE approval and linked report evidence, verifies linear planning-only ancestry from R02 closure, and checks every intervening commit. Executable regressions reject forbidden history even when subsequently reverted.

Retained checks cover four-source NUL-safe discovery, cancellation, deletion/recreation, committed forbidden changes, rename old/new paths, copy destinations, positive controls and independent HEAD/INDEX/WORKTREE inspection.

POSIX executable-bit enforcement is independent of `core.filemode`; its executable negative probe ran in memory on Windows. Windows policy requires `core.filemode=false`, matching Git modes and regular worktree files. TAB/LF parser regressions execute without requiring unsupported native Windows filenames.

Executed checks:

| Command | Result |
|---|---|
| `git status --short --branch` | Authorized planning changes only; unchanged after review |
| `git diff --check` | Exit 0; LF/CRLF warnings only |
| `openspec validate routing-v2-03-direction-resolver --strict` | Valid |
| `node scripts/routing-v2-architecture-gate.mjs --self-test` | 451 assertions passed |
| `pnpm run routing:v2:arch-gate` | Machine PLANNING pass; 14 paths, 56 source/test files |

LEGACY_ISOLATION:

Legacy, vendor and integration boundaries remain unchanged. No fallback or integration work enters R03.

NON_BLOCKING_RECOMMENDATIONS:

Retain the concrete singleton counterexample above in the planned paired-row regression.

No repository files were modified. The execution agent must persist this actual report and copy its exact fingerprint into the linked manifest before checkpointing. Replacing the report’s fingerprint constitutes a new review, not repair of old approval.

The manifest binds saved review evidence to reviewed content; it does not cryptographically authenticate reviewer identity. The new planning checkpoint SHA must become both `APPROVED_PLANNING_COMMIT` and implementation `BASE_COMMIT`, followed by successful frozen-control verification before product work. Machine PLANNING approval alone authorizes no implementation.

READY_FOR_IMPLEMENTATION: YES

REVIEWED_ARTIFACTS_JSON_BEGIN
{
  "scripts/routing-v2-architecture-gate.mjs": "0da45a4f0ce007a156395c89b77ac3efca79d2cd2b8d44b245eb0070436910df",
  "docs/routing-v2/workflow-models.md": "e74f9fff21deba8435bebfd940269efaadc93e6018dfcbc91ec8da2cb3929964",
  "docs/routing-v2/drawio-routing-master-spec.md": "3000ec93cf4a2e663e38e5e5ee869673fc96e254d011055b2873fc16537897f6",
  "docs/routing-v2/implementation-playbook.md": "39fb8ae6e328863d24df6e1bfabea1a7a0eb980c4f84b7a9190e3490b8782368",
  "docs/routing-v2/legacy-boundary.md": "c81922a0699511786595a70fa240e33b7be00a1c18f98bab2d16b8b9a039ff47",
  "AGENTS.md": "5cf0b48fd99285c92da9f550374adbbb1d941531324e0f52357bf384165ef686",
  "packages/draw/src/routing/AGENTS.md": "622a37a293a55f3d38099a8582672e750a8bef686a64dabec62f63f82ec258b9",
  "docs/routing-v2/CURRENT_CHANGE.md": "fc0bcea1e69838eef4204360d28432a2cfc8aa2a322423bd1b77ef7202b578dd",
  "openspec/changes/routing-v2-03-direction-resolver/.openspec.yaml": "65ff9df577b54daf8b21917c880c564135cf80d9e6a2de690feb0f4a842393f1",
  "openspec/changes/routing-v2-03-direction-resolver/proposal.md": "25d6677311d263d1b09aa9b8065ccf5d75e2f889ef2672f71ff347c7a01b52e6",
  "openspec/changes/routing-v2-03-direction-resolver/design.md": "5b800347269154d5ca941b1a30a5f31c47eb19b6cf1df87a49d6f01796dfd23b",
  "openspec/changes/routing-v2-03-direction-resolver/tasks.md": "98b2e867021978f79ddfff0ec5c663b229d870ef8a685ef158b7a2aedc42b8c9",
  "openspec/changes/routing-v2-03-direction-resolver/specs/routing-direction-resolver/spec.md": "393ee574b3e6c5fcc36f461ffe94ab51e882db0f7738ab1a289ea278a029128d",
  "openspec/changes/routing-v2-03-direction-resolver/evidence/pre-implementation-gate-prompt.md": "eb68400a14d094b04692b5de552978cf3301672f85fd9b167003bb6966c23cf3"
}
REVIEWED_ARTIFACTS_JSON_END