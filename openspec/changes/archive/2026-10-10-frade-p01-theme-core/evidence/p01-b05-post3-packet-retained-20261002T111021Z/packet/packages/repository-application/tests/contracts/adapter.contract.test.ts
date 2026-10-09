import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  NativeAdapter,
  createNativeRepository,
  createPagedNativeRepository,
} from '../../../adapter-yaml/src/index'
import { memory } from '../fixtures/memory'
import { repositoryAdapterContract } from './adapter.contract'
repositoryAdapterContract('memory', {
  createRepository: async () => {
    const fixture = await memory()
    return { adapter: fixture.adapter, repositoryId: 'R', dispose: async () => {} }
  },
})
for (const format of ['yaml', 'json', 'native-v2'])
  repositoryAdapterContract('native ' + format, {
    createRepository: async () => {
      const root = await mkdtemp(join(tmpdir(), 'frade-contract-'))
      if (format === 'native-v2') {
        async function* empty() {}
        const result = await createPagedNativeRepository(root, {
          repositoryId: 'R',
          displayName: 'Contract',
          objects: empty(),
          relations: empty(),
        })
        if (!result.ok) throw Error(result.error.code)
      } else
        await createNativeRepository(root, { repositoryId: 'R', displayName: 'Contract', format })
      return {
        adapter: new NativeAdapter(root),
        repositoryId: 'R',
        dispose: async () => {
          await rm(root, { recursive: true, force: true })
        },
      }
    },
  })
