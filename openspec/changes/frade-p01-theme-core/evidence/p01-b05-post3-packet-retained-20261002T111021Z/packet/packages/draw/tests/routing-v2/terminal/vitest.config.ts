import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: fileURLToPath(new URL('../../..', import.meta.url)),
  test: {
    environment: 'node',
    include: [
      'tests/routing-v2/terminal/**/*.test.ts',
      'tests/routing-v2/perimeter/**/*.test.ts',
    ],
  },
})
