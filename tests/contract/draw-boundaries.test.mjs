import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkDrawBoundaries } from '../../scripts/check-boundaries.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

test('current Draw production dependencies and imports respect the boundary', async () => {
  assert.deepEqual(await checkDrawBoundaries({ root }), [])
})

test('boundary check rejects a privileged Electron import', async () => {
  const violations = await checkDrawBoundaries({
    root,
    virtualSources: [{ file: 'probe.ts', content: "import { ipcRenderer } from 'electron'" }],
  })

  assert.deepEqual(violations, ['probe.ts: forbidden import electron'])
})
