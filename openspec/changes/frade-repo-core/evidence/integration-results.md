# Integration scope and executed evidence

- Native adapter: **16 tests passed**, including actual YAML/JSON I/O, stale revisions, unsafe paths/junctions, metadata preservation, discovery, duplicate IDs and relocation. Explicit recovery is tested with injected rename failure and actual child-process termination at two write barriers. No real user repository is a mutable fixture.
- Application: **198 tests passed**, including 113 original BDD/harness tests, 25 linked acceptance tests, 15 shared adapter contracts, independent fixture conformance, graph concurrency, policies, actual watcher changes, actual Git source integration and seven seeded property suites across domain/application.
- SQLite: real Node SQLite index and rebuild/corruption tests; authoritative source remains independent. A failed index update after source commit warns rather than replaying.
- Git: one provider test plus two application integration tests in real temporary Git repositories; domain writes leave HEAD unchanged, conflicts are inspected/refused without resolving files. No changes to this workspace's Git history and no network push.
- Bridge: four tests, including existing Draw codec/detached round-trip, wrong-identity refusal and connected style refresh with preserved geometry/overrides and explicit reconnect.
- HTTP: real local Node HTTP server and authenticated resolver integration, not a deployed public server. API suite has three tests.
- Desktop: actual Electron renderer → preload → main → application → native write test, plus existing standalone Draw lifecycle/isolation E2E. Refer to final regression status in test-results.md; no separate Designer UI is claimed.

Automatic filesystem notifications and writer-process interruption are now directly tested. Power loss, directory durability, interruption during recovery, PostgreSQL and production deployment remain unproven. The two real watch tests cover invalid content, model/profile changes, degraded/read-only transitions and close; no durable delivery claim is made.
