import { expect, it } from 'vitest'
import * as ports from '../src/index'
it.each(['postgres', 'remote'])(
  '%s contracts do not advertise an unconfigured implementation',
  async (kind) => {
    const connection = {
      schemaVersion: 1,
      kind,
      connectionRef: 'fixture-endpoint',
      mappingRef: 'fixture-mapping',
      authenticationRef: 'keychain:fixture',
    }
    expect(ports.decodeExternalConnection(connection).ok).toBe(true)
    expect(ports.decodeExternalConnection({ ...connection, password: 'secret' }).ok).toBe(false)
    expect(await ports.unconfiguredAdapter(kind).open()).toMatchObject({
      ok: false,
      error: { code: 'UNSUPPORTED_CAPABILITY' },
    })
  },
)
