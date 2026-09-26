# Backend adapter registry

`@frade/runtime-node` exports `createRepositoryAdapterRegistry`, `RepositoryAdapterRegistry`, `GrantedRepository` and `RepositoryAdapterFactory`.

The default registry explicitly registers `sberea` and `native`. `native` retains the existing native-v1/native-v2 selection from its validated profile. No factory is chosen from a `.yaml` extension. Unknown kinds return `UNSUPPORTED_CAPABILITY` with `UNKNOWN_ADAPTER` and do not fall back to another format or affect existing sessions.

```ts
const registry = createRepositoryAdapterRegistry()
const result = await registry.open({
  adapterKind: 'sberea',
  repositoryId: stableRepositoryId,
  dataRoot: authorizedDataFolder,
  metadataSet: defaultMetadataSet(authorizedMetadataFolder),
})
```

The grant is constructed by trusted host/backend code after directory authorization. It is not an unrestricted renderer request. A native grant currently uses the identity from its native profile; mismatch closes the returned session and fails with `REPOSITORY_MISMATCH`. Workspace identity mapping belongs to the later session registry integration and must not be inferred from a directory or silently change a native profile.

Register an additional format at host composition time:

```ts
registry.register('another-yaml', async (grant) => {
  return anotherAdapterFactory({
    root: grant.dataRoot,
    repositoryId: grant.repositoryId,
    settings: grant.settings,
  }).open()
})
```

Factories return the public `RepositoryAdapterSession` contract. Registry registration does not require changing UI or Core. Duplicate kinds and invalid kind names are rejected. Each factory gets an isolated copy of the grant; it cannot mutate the caller's settings. Thrown factory errors produce a bounded generic error rather than exposing host paths. Returned adapter failures still need the normal transport response validation/redaction before renderer publication.

The caller owns successful sessions and must close them. This registry selects adapters only; independent backend session lifecycles, metadata activation and Utility transport remain separate pending tasks.

`packages/runtime-node/tests/adapters.test.ts` verifies simultaneous real sberea/native roots, native-v2 compatibility, unknown kinds, injected factories, option isolation, identity mismatch and factory exceptions. `scripts/check-workbench-boundaries.mjs` checks the new package exports and dependency directions; positive and negative contracts are in `tests/contract/workbench-boundaries.test.mjs`.
