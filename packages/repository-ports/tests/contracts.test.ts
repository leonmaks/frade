import { expect, it } from 'vitest'
import * as ports from '../src/index'
it('CORE-010 rejects contradictory capabilities', () => {
  expect(
    ports.validateCapabilities({ canRead: true, canWrite: true, supportsAtomicBatch: true }, {}).ok,
  ).toBe(false)
})
it('CORE-010 validates profile compatibility and refuses embedded credentials', () => {
  const profile = {
    schemaVersion: 1,
    repositoryId: 'R',
    displayName: 'Sample',
    adapterKind: 'native',
    connection: { source: 'local' },
    metamodel: { path: 'metamodel.json', version: '1.0.0' },
    mapping: { sourceFile: 'repository.yaml', format: 'yaml' },
    policyRef: 'default',
    accessMode: 'read-write',
    indexing: { enabled: false },
    versioning: { provider: 'none' },
  }
  expect(ports.decodeProfile(profile).ok).toBe(true)
  expect(ports.decodeProfile({ ...profile, schemaVersion: 999 })).toMatchObject({
    ok: false,
    error: { code: 'SCHEMA_INCOMPATIBLE' },
  })
  expect(ports.decodeProfile({ ...profile, connection: { password: 'secret' } })).toMatchObject({
    ok: false,
    error: { code: 'PROFILE_INVALID' },
  })
  for (const endpoint of [
    'postgres://alice:secret@localhost/db',
    'https://alice@host/api',
    'https://host/api?access_token=secret',
    'https://host/api#password=secret',
  ]) {
    const result = ports.decodeProfile({ ...profile, connection: { nested: [{ endpoint }] } })
    expect(result).toMatchObject({ ok: false, error: { code: 'PROFILE_INVALID' } })
    expect(JSON.stringify(result)).not.toContain('secret')
  }
  expect(
    ports.decodeProfile({
      ...profile,
      connection: { endpoint: 'https://host/api?version=1' },
      authenticationRef: 'vault-alias',
    }).ok,
  ).toBe(true)
})
