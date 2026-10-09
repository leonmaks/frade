import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { builtinTokens } from '../../src/design/generated/tokens'
import { createThemeRegistry, BUILTIN_IDS } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'
import { contrastPairs, contrastRatio } from '../../src/design/theme/contrast'
const root = fileURLToPath(new URL('../../../../', import.meta.url))
const feature = readFileSync(resolve(root, 'docs/ui/bdd/p01-theme-core.feature'), 'utf8')
const cases = [...feature.matchAll(/@P01-RES-(\d+)[^\n]*\n\s*Scenario: ([^\n]+)/g)].map(m => ({ id: 'P01-RES-' + m[1], name: m[2] }))
const selection = { mode: 'light' as const, density: 'compact' as const, preferred: { ...BUILTIN_IDS } }
const story = (id: string, run: () => void) => {
  const scenario = cases.find(c => c.id === id)
  if (!scenario) throw new Error('Missing durable BDD scenario ' + id)
  it(id + ' ' + scenario.name, run)
}
story('P01-RES-001', () => {
  const registry = createThemeRegistry()
  for (const mode of ['light', 'dark', 'high-contrast'] as const) {
    const snapshot = resolveTheme({ registry, selection: { ...selection, mode } })
    expect(snapshot.colors).toEqual(builtinTokens.themes[mode])
    expect(Object.keys(snapshot.colors)).toHaveLength(31)
    for (const [fg, bg, minimum] of contrastPairs) expect(contrastRatio(snapshot.colors[fg], snapshot.colors[bg])).toBeGreaterThanOrEqual(minimum)
  }
})
story('P01-RES-002', () => {
  const snapshot = resolveTheme({ registry: createThemeRegistry(), selection: { ...selection, density: 'comfortable' }, environment: { colorScheme: 'dark' } })
  expect(snapshot.kind).toBe('light')
  expect(snapshot.density).toBe('comfortable')
  expect(builtinTokens.density[snapshot.density]['size.row']).toBe('36px')
})
story('P01-RES-003', () => {
  const registry = createThemeRegistry(), overrides = { global: { 'diagram.grid': '#111111' }, byTheme: { [BUILTIN_IDS.light]: { 'diagram.grid': '#222222' } }, workspace: { 'diagram.grid': '#333333', 'unrecognized.role': '#123456' }, workspaceEnabled: false }
  expect(resolveTheme({ registry, selection, overrides }).colors['diagram.grid']).toBe('#222222')
  const snapshot = resolveTheme({ registry, selection, overrides: { ...overrides, workspaceEnabled: true } })
  expect(snapshot.colors['diagram.grid']).toBe('#333333')
  expect(snapshot.issues.map(x => x.code)).toContain('UNKNOWN_ROLE')
  expect(Object.keys(snapshot.colors)).toHaveLength(31)
})
story('P01-RES-004', () => {
  const descriptor = { id: 'bdd.workshop/low', label: 'Low', kind: 'light', colors: { 'text.primary': '#FFFFFF' } }, before = JSON.stringify(descriptor), registry = createThemeRegistry([descriptor])
  const input = { registry, selection: { ...selection, preferred: { ...BUILTIN_IDS, light: descriptor.id } } }
  const snapshot = resolveTheme(input)
  expect(snapshot.status).toBe('REPAIRED')
  expect(snapshot.compatibility.repaired).toContain('text.primary')
  expect(resolveTheme(input)).toEqual(snapshot)
  expect(JSON.stringify(descriptor)).toBe(before)
  for (const [fg, bg, minimum] of contrastPairs) expect(contrastRatio(snapshot.colors[fg], snapshot.colors[bg])).toBeGreaterThanOrEqual(minimum)
})
story('P01-RES-005', () => {
  const overrides = { global: { 'diagram.grid': '#123456' } }, before = JSON.stringify(overrides)
  const snapshot = resolveTheme({ registry: createThemeRegistry(), selection, overrides, environment: { colorScheme: 'dark', forcedColors: true } })
  expect(snapshot.effectiveColors['surface.base']).toBe('Canvas')
  expect(snapshot.effectiveColors['text.primary']).toBe('CanvasText')
  expect(snapshot.effectiveColors['focus.ring']).toBe('Highlight')
  expect(snapshot.colors['diagram.grid']).toBe('#123456')
  expect(JSON.stringify(overrides)).toBe(before)
})
it('P01 traceability fails closed on missing IDs, stale assertion hashes or premature runtime claims', () => {
  const registry = JSON.parse(readFileSync(resolve(root, 'docs/ui/decisions/p01-theme-traceability.json'), 'utf8'))
  expect(registry.bindings.map((b: { id: string }) => b.id)).toEqual(cases.map(c => c.id))
  for (const binding of registry.bindings) {
    expect(binding.scope).toBe('PURE_RESOLVER_BDD')
    const source = readFileSync(resolve(root, binding.assertion.file))
    expect(createHash('sha256').update(source).digest('hex')).toBe(binding.assertion.sha256)
    expect(source.toString()).toContain("story('" + binding.id + "'")
  }
  for (const boundary of registry.pendingRuntime) expect(boundary.status).toBe('NOT_RUN')
  const property = readFileSync(resolve(root, registry.propertyAssertion.file))
  expect(createHash('sha256').update(property).digest('hex')).toBe(registry.propertyAssertion.sha256)
  expect(registry.propertyAssertion.seed).toBe(20260930)
  expect(registry.propertyAssertion.runs).toBe(200)
})
