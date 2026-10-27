import { defineConfig } from 'E:/dev/codex/frade/apps/desktop/node_modules/@playwright/test/index.mjs'
export default defineConfig({testDir:'.',workers:1,timeout:120000,reporter:'json',outputDir:'results'})
