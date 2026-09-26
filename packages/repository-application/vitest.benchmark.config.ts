import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { include: ['benchmarks/**/*.bench.ts'], testTimeout: 600000, fileParallelism: false },
})
