import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { isBuiltin } from 'node:module'
export default defineConfig({
  build: {
    outDir: 'out/utility',
    emptyOutDir: true,
    target: 'node24',
    rollupOptions: { external: (id) => isBuiltin(id) },
    lib: { entry: resolve('src/utility/index.ts'), formats: ['cjs'], fileName: () => 'index.cjs' },
  },
})
