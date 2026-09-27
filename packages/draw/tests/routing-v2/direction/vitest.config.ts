import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { directionResolvePlugin } from './mutation/resolve.mjs'

const mutantRoot = process.env.FRADE_DIRECTION_MUTANT_ROOT

export default defineConfig({
  root: fileURLToPath(new URL('../../..', import.meta.url)),
  plugins: mutantRoot ? [directionResolvePlugin(mutantRoot)] : [],
  test: {
    environment: 'node',
    include: ['tests/routing-v2/direction/**/*.test.ts'],
  },
})
