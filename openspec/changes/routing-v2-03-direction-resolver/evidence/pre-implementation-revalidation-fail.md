CHANGE: routing-v2-03-direction-resolver
GATE_TYPE: PRE_IMPLEMENTATION
GATE_STATUS: FAIL

BLOCKERS:

The saved reviewer report is not bound to the artifact hashes it actually reviewed.

verifyR03Approval (/E:/dev/codex/frade/scripts/routing-v2-architecture-gate.mjs:625) checks the report’s SHA256 and four status fields, then independently compares proof.artifacts with checkpoint contents. It never compares that manifest with the fingerprint embedded in the reviewer’s report, despite the requirement in /E:/dev/codex/frade/openspec/changes/routing-v2-03-direction-resolver/design.md:94.

I reproduced this using the installed verification functions with in-memory Git/filesystem snapshots, without writing files:

 Probe                                                                                            Actual result
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━
 Matching report, manifest and reviewed artifacts                                                 Accepted
───────────────────────────────────────────────────────────────────────────────────────────────  ──────────────────────
 Design changed; original manifest retained                                                       Rejected
───────────────────────────────────────────────────────────────────────────────────────────────  ──────────────────────
 Design changed; manifest hashes recomputed; original report retained with its old fingerprint    Accepted incorrectly

The final probe preserved the report bytes and reportSha256. Thus an old review can approve unreviewed planning content merely by regenerating the manifest. This is a content-binding defect, not a request for cryptographic reviewer authentication.

The existing positive fixtures also accept reports containing only four status lines, without any reviewer-returned fingerprint (fixture (/E:/dev/codex/frade/scripts/routing-v2-architecture-gate.mjs:997)).

Required repair: extract one unambiguous fingerprint from the saved report and require exact equality with both the manifest and canonical checkpoint artifacts. Add missing-fingerprint and changed-artifact/recomputed-manifest regressions, retaining a matching positive control.

SPEC_ALIGNMENT:

The product proposal, delta, design and tasks describe one coherent direction-selection capability. Requirements have test and implementation mappings. No additional product-semantic blocker was found.

The FINAL singleton override is explicit: singleton endpoints remain unlocked while paired preference rows are constructed.

SCOPE_ALIGNMENT:

HEAD and the planning baseline both remain 2b6619627e3e744007b06251a05dad86e7bce634. There are no intervening commits and no staged changes.

All 12 discovered changed/untracked paths are authorized planning/control paths. Both prospective R03 production and test directories are absent. R01/R02 source, tests, main specs, archives and dependency manifests remain unchanged.

No R03 approval checkpoint exists yet; that is appropriate at this review stage.

ARCHITECTURE_ALIGNMENT:

The planned dependency direction remains direction → terminal/perimeter → geometry/model. No route construction, jetty, renderer, persistence, framework or later-layer responsibility enters R03.

The installed checks reject sibling orthogonal modules, reverse imports, later layers, framework/legacy dependencies and cycles. The remaining blocker is in approval enforcement.

TEST_COVERAGE_ALIGNMENT:

The plan requires the 900 independently reference-derived expected pairs, direct geometry/fixed-point cases, strict compiler negatives and six properties with at least 5,000 accepted cases each.

The existing R02 runConditionedProperty harness is available and supports explicit seed, raw/accepted/rejected accounting, exhaustion failure and counterexample replay information. R03 explicitly specifies 0xFAD003. fast-check remains absent; the repaired plan no longer depends on installing it.

The mutation plan is executable within the permitted test tree: installed TypeScript/Vitest, complete operator inventory, isolated mutations, import-redirection controls and score:

killed / (killed + survived + timeout) × 100

Compiler-invalid mutants are separate; infrastructure errors abort; surviving mutants cannot be removed to improve the score. Tasks require at least 90%.

R03 implementation suites and mutation testing remain future work and were not executed.

NUMERICAL_CONTRACT_ALIGNMENT:

The plan explicitly defines quadrant numbering and axis ties, inclusive EPSILON zero bands, signed gaps versus non-negative separation, touching/overlap/containment, zero extents, finite arithmetic rejection and no quantization.

Mask precedence, target outward semantics, vertical corner priority and fixed-point preservation are coherent. Reflection/translation domains depend on inputs, with excluded ties and cancellation retained as direct fixtures. Universal exchange symmetry is correctly rejected.

REFERENCE_ALIGNMENT:

The pinned mxEdgeStyle.js SHA256 matches:

8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d

Independent, memory-only reference extraction and interpretation of the proposed rules produced:

900/900 matching quadrant/mask cases.
4,761 additional shared-domain cases with no mismatch, including fixed endpoints, overlap, axes, containment and differing sizes.
4,050 horizontal and 4,050 vertical conditioned reflection comparisons without a counterexample.

These are reviewer probes, not implementation-suite evidence.

Early singleton locking changed 72/900 results. One concrete case: source (0,0,10,10), target (-30,-30,10,10), source mask {WEST,NORTH}, target {NORTH}. Final override gives WEST/NORTH; early locking gives NORTH/NORTH.

The documented mask-filtering and EPSILON adaptations were also observable against the reference.

MACHINE_GATE_INTEGRITY: FAIL

The repaired gate checks committed approval metadata, report hashes, checkpoint artifact hashes, linear planning-only ancestry and every intervening commit. Its reverted-forbidden-history regression passes. However, the report-to-fingerprint defect above still permits stale approval reuse.

Other inspected controls are present and exercised: four-source discovery union, NUL parsing, cancellation/deletion-recreation, rename old/new paths, copy destinations, positive controls and independent HEAD/INDEX/WORKTREE source checks.

The mode repair checks actual POSIX owner executable bits independently of core.filemode. The executable negative POSIX probe ran in memory on Windows. Windows policy requires core.filemode=false, matching Git modes and regular worktree files. TAB/LF parser regressions execute without unsupported native Windows filenames.

Commands executed:

 Command                                                        Result
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 git status --short --branch                                    Authorized planning changes only; unchanged after review
─────────────────────────────────────────────────────────────  ──────────────────────────────────────────────────────────
 git diff --check                                               Exit 0; LF/CRLF warnings only
─────────────────────────────────────────────────────────────  ──────────────────────────────────────────────────────────
 openspec validate routing-v2-03-direction-resolver --strict    Valid
─────────────────────────────────────────────────────────────  ──────────────────────────────────────────────────────────
 node scripts/routing-v2-architecture-gate.mjs --self-test      445 assertions passed
─────────────────────────────────────────────────────────────  ──────────────────────────────────────────────────────────
 pnpm run routing:v2:arch-gate                                  Machine PLANNING pass; 12 paths, 56 source/test files

LEGACY_ISOLATION:

Legacy and vendor boundaries remain unchanged. No legacy fallback or integration change is planned.

NON_BLOCKING_RECOMMENDATIONS:

Retain the concrete singleton counterexample above as the direct paired-row regression.

No repository files were modified. Repair the approval binding and obtain fresh independent PRE review before creating the implementation checkpoint. The machine PLANNING result authorizes no implementation.

READY_FOR_IMPLEMENTATION: NO