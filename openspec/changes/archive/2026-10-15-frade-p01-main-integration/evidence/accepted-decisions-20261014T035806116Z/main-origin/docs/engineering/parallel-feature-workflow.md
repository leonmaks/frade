# Independent feature workflow

The user's 30 September 2026 decision removes routing prerequisites from Frade UI Design Contract. Root AGENTS §18 is the mandatory rule. SDD/BDD/TDD, independent reviews, test integrity, domain contracts and Git safety remain required within each owning feature.

## Ownership and dependency direction

| Supplier                                        | Consumer                                   | Consumer-owned work                                                                         |
| ----------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Existing approved Draw/Repo interfaces          | UI presentation adapters                   | Preserve public behavior and persisted semantics; meaningful adapter tests                  |
| UI tokens/component contract                    | Future routing/X6 presentation integration | Adopt at adapter boundary without changing route semantics                                  |
| Independently approved shared engineering rules | Routing's historical fingerprints/gate     | Review adopted rules and repair exact freeze/scope/checkpoint checks in routing's workspace |
| P01 theme core                                  | P02 installer, then P03–P07                | Retain each consumer's numbered predecessor/integration checkpoint                          |

UI Contract has no R04 completion prerequisite. Shared root AGENTS, Git ancestry and a dirty worktree are process collisions, not product dependencies. UI owns guide/tokens/components/UI compliance. Routing owns algorithms, numerical/mutation contracts, tests and its gate. WB-001 remains a separate UI visual decision.

## Separate workspaces

1. Select the feature's change and explicit baseline. Reuse a suitable managed worktree or create an isolated branch/worktree.
2. Transfer only its planning/input and authorized shared process files. Record paths/hashes/branch/HEAD. Preserve the source; do not clean/reset it or copy foreign uncommitted source, tests or metadata for a green build.
3. Run its own and required general checks there. PRE/implementation/verify/POST/archive belong to that feature. Failures of applicable checks stop its progression.
4. Merge shared-file changes serially; resolve conflicts explicitly. The consuming branch owns adoption/revalidation and preserves cumulative origin and historical evidence. New integration evidence never rewrites old reports.

## Gate applicability

Routing's existing strict gate remains authoritative in the routing workspace. Whole-checkout discovery and historical whole-file fingerprints are not general UI gates. Routing-owned adoption tasks must handle provider provenance, exact checkpoints, cumulative history, unknown-path rejection and adversarial regression fixtures. This UI task does not implement that routing repair.

UI PRE reviews its exact additive root section and canonical guide paths without routing PRE. Routing's old fingerprint stays bound to its approved baseline until its own reviewed adoption. NOT_APPLICABLE requires an actual scope/contract reason; a routing-semantic change cannot be labeled cosmetic. Existing general CI/build/typecheck/boundary checks remain required. Shared manifests/CI/AGENTS need merge coordination, not completion of an unrelated feature.
