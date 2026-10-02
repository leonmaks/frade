import { defineConfig } from '@playwright/test'
export default defineConfig({testDir:"C:/Users/NVISEN/.codex/worktrees/ui-design-contract/frade/openspec/changes/frade-p01-theme-core/evidence/p01-bundle-focus-diagnostic-20261001T215131Z",testMatch:'diagnostic.spec.ts',workers:1,timeout:240000,expect:{timeout:10000},reporter:'list',use:{trace:'retain-on-failure',screenshot:'only-on-failure'}})
