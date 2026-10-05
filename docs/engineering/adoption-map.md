# Frade ownership and check map

This is W01's scoped inventory, derived from the accepted 2 October 2026 audit and all 20 supplied package manifests. It names existing contract families, not test executions or consumer adoption. Current W01 status is `NOT_DEPLOYED_W01_CLOSURE_PENDING`.

| Owner                             | Observed disposition                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| W01 engineering standard          | Implementation in own control/docs scope; checks, Verify, POST, closure pending                  |
| Routing V2 R01–R03 / R04          | Historical archived stages retained; R04 remains planning/control repair, adoption `NOT_STARTED` |
| UI P01–P07                        | P01 visual/cumulative closure open; later stage planning retained, adoption `NOT_STARTED`        |
| Repo Core                         | 26/37 committed tasks; closure gaps retained, adoption `NOT_STARTED`                             |
| Other legacy completed checklists | `IMPLEMENTED_PENDING_CLOSURE` unless actual Verify/POST/archive evidence exists                  |
| Main integration                  | Separate candidate and authorization; `NOT_STARTED`                                              |

| Subsystem           | Package manifests                                                                                             | Existing required control families when affected                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Metamodel           | `metamodel-domain`, `metamodel-compiler`, `metamodel-config`                                                  | Domain purity, inheritance/relations/defaults, exact imports/composition/fingerprints, config compatibility                   |
| Repository core     | `repository-domain`, `repository-ports`, `repository-application`                                             | Identity/revisions/decoding, authorization, atomicity, cancel/recovery, BDD/properties/consumer types                         |
| Repository adapters | `adapter-yaml`, `adapter-sberea-yaml`, `local-index`, `versioning-git`, `repository-api`, `repository-bridge` | Real file/lock/path behavior, derived index consistency, disposable Git, sender/auth/limits, persistence/binding independence |
| Runtime             | `runtime-contracts`, `runtime-node`, `runtime-electron`                                                       | DTO validation, lifecycle/cancel, Utility crash/recovery, transport isolation                                                 |
| UI                  | `ui-workspace`, `ui-navigator`, `ui-inspector`                                                                | Theme/density/tokens, keyboard/focus/contrast, visual and dirty-state preservation                                            |
| Editor              | `draw`                                                                                                        | Host boundaries, semantic geometry/history/persistence, browser/E2E and Routing numerical/parity/property/frozen gates        |
| Desktop             | `apps/desktop`                                                                                                | Main/preload/renderer/utility isolation, real window/filesystem/settings/frame/security behavior                              |
| Engineering         | root manifest/AGENTS/CI and `scripts`, `tests`, `docs/engineering`                                            | Temporary Git owner/scope/inheritance/review/status/publication controls, strict validation and unchanged product tree        |

All product changes keep applicable root and scoped regressions. The W01 applicability plan is [check-applicability.json](check-applicability.json); N/A depends on unchanged protected tree proof before execution. A required unavailable or failing check blocks closure. Remote CI and branch protection are `NOT_RUN` and `NOT_CONFIGURED` until observed. Each consumer adopts through its own owner plan, scope, current PRE/RED/checks/Verify/POST; W01 does not migrate it or modify foreign files.
