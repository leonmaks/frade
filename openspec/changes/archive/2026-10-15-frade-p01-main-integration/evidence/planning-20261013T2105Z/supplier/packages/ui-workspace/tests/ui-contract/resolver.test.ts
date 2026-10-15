import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { builtinTokens } from '../../src/design/generated/tokens'
import { createThemeRegistry, BUILTIN_IDS } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'
import { contrastPairs, contrastRatio, repairContrast, themeRoles } from '../../src/design/theme/contrast'
import type { ThemeKind } from '../../src/design/theme/types'
const kinds: ThemeKind[] = ['light', 'dark', 'high-contrast']
const preferences = { ...BUILTIN_IDS }
const resolve = (mode: ThemeKind | 'system' = 'light', extra = {}) => resolveTheme({ registry: createThemeRegistry(), selection: { mode, density: 'compact', preferred: preferences }, ...extra })
const authorityUrl = new URL('../../../../scripts/ui/tokens.mjs', import.meta.url).href
const authority = await import(/* @vite-ignore */ authorityUrl)

describe('P01 deterministic resolver / registry', () => {
  it('ships three reserved offline IDs and complete matching palettes in both densities', () => {
    const registry = createThemeRegistry()
    expect(registry.list().map(x => x.id)).toEqual(kinds.map(k => 'frade.builtin/' + k))
    for (const mode of kinds) for (const density of ['compact', 'comfortable'] as const) {
      const s = resolveTheme({ registry, selection: { mode, density, preferred: preferences } })
      expect(s.id).toBe('frade.builtin/' + mode)
      expect(s.colors).toEqual(builtinTokens.themes[mode])
      expect(Object.keys(s.colors)).toHaveLength(31)
      expect(s.density).toBe(density)
      expect(s.status).toBe('VALID')
    }
  })
  it('matches the unchanged foundation role table, ordered 34 pairs and contrast math', () => {
    expect(themeRoles).toEqual(authority.themeRoles)
    expect(contrastPairs).toEqual(authority.contrastPairs)
    expect(contrastPairs).toHaveLength(34)
    for (const mode of kinds) for (const [fg, bg, minimum] of contrastPairs) {
      const p = builtinTokens.themes[mode]
      expect(contrastRatio(p[fg], p[bg])).toBe(authority.contrastRatio(p[fg], p[bg]))
      expect(contrastRatio(p[fg], p[bg])).toBeGreaterThanOrEqual(minimum)
    }
    expect(() => contrastRatio('url(remote)', 'Canvas')).toThrow()
  })
  it('follows System preferences while explicit Light survives OS Dark and HC events', () => {
    for (const kind of kinds) {
      const environment = { colorScheme: kind === 'light' ? 'light' : 'dark', highContrast: kind === 'high-contrast', forcedColors: false }
      expect(resolve('system', { environment }).kind).toBe(kind)
      expect(resolve('light', { environment }).kind).toBe('light')
    }
  })
  it('applies builtin, selected, global, ThemeId and opt-in workspace precedence', () => {
    const id = 'example.workshop/one'
    const registry = createThemeRegistry([{ id, label: 'One', kind: 'light', colors: { 'diagram.grid': '#111111' } }])
    const selection = { mode: 'light' as const, density: 'comfortable' as const, preferred: { ...preferences, light: id } }
    const overrides = { global: { 'diagram.grid': '#222222' }, byTheme: { [id]: { 'diagram.grid': '#333333' } }, workspace: { 'diagram.grid': '#444444' }, workspaceEnabled: false }
    expect(resolveTheme({ registry, selection, overrides }).colors['diagram.grid']).toBe('#333333')
    expect(resolveTheme({ registry, selection, overrides: { ...overrides, workspaceEnabled: true } }).colors['diagram.grid']).toBe('#444444')
    expect(resolveTheme({ registry, selection, overrides: { global: overrides.global } }).colors['diagram.grid']).toBe('#222222')
    expect(resolveTheme({ registry, selection }).colors['diagram.grid']).toBe('#111111')
  })
  it('validates data, diagnoses unknown roles and never exposes arbitrary CSS', () => {
    const registry = createThemeRegistry([{ id: 'example.workshop/data', label: 'Data', kind: 'light', colors: { 'text.primary': 'url(https://example.invalid)', 'unknown.role': '#123456', 'diagram.grid': '#123456' } }])
    const s = resolve('light', { registry, selection: { mode: 'light', density: 'compact', preferred: { ...preferences, light: 'example.workshop/data' } }, overrides: { global: { 'surface.base': 'Canvas', '__proto__': '#123456' } } })
    expect(s.colors['text.primary']).toBe(builtinTokens.themes.light['text.primary'])
    expect(s.colors['diagram.grid']).toBe('#123456')
    expect(Object.keys(s.colors)).toHaveLength(31)
    expect(s.issues.map(x => x.code)).toContain('UNKNOWN_ROLE')
    expect(s.issues.map(x => x.code)).toContain('INVALID_COLOR')
    expect(Object.values(s.colors).every(v => /^#[0-9a-f]{6}$/i.test(v))).toBe(true)
  })
  it('refuses malformed descriptors, duplicate and reserved builtin replacement', () => {
    const r = createThemeRegistry([null, { id: 'bad', kind: 'light', label: 'Bad', colors: {} }, { id: BUILTIN_IDS.light, kind: 'light', label: 'Replace', colors: {} }, { id: 'example.workshop/a', kind: 'light', label: 'A', colors: {} }, { id: 'example.workshop/a', kind: 'dark', label: 'Duplicate', colors: {} }])
    expect(r.get(BUILTIN_IDS.light)?.label).toBe('Frade Light')
    expect(r.list()).toHaveLength(4)
    expect(r.issues.map(x => x.code)).toEqual(expect.arrayContaining(['INVALID_DESCRIPTOR', 'RESERVED_ID', 'DUPLICATE_ID']))
  })
  it('repairs stale, disabled and wrong-kind selections to the matching builtin', () => {
    const registry = createThemeRegistry([{ id: 'example.workshop/disabled', label: 'Disabled', kind: 'light', enabled: false, colors: {} }, { id: 'example.workshop/dark', label: 'Dark', kind: 'dark', colors: {} }])
    for (const [id, code] of [['example.workshop/missing', 'UNKNOWN_THEME'], ['example.workshop/disabled', 'DISABLED_THEME'], ['example.workshop/dark', 'KIND_MISMATCH']]) {
      const s = resolve('light', { registry, selection: { mode: 'light', density: 'comfortable', preferred: { ...preferences, light: id } } })
      expect(s.id).toBe(BUILTIN_IDS.light)
      expect(s.density).toBe('comfortable')
      expect(s.issues.map(x => x.code)).toContain(code)
    }
  })
  it('keeps stable identity across a label change without installation/version machinery', () => {
    const id = 'example.workshop/stable'
    for (const label of ['First label', 'New label']) {
      const registry = createThemeRegistry([{ id, label, kind: 'light', colors: {} }])
      expect(resolve('light', { registry, selection: { mode: 'light', preferred: { ...preferences, light: id } } }).id).toBe(id)
    }
  })
  it('repairs both roles of violating pairs without dropping unrelated valid roles', () => {
    const registry = createThemeRegistry([{ id: 'example.workshop/low', label: 'Low', kind: 'light', colors: { 'text.primary': '#FFFFFF', 'diagram.grid': '#123456' } }])
    const s = resolve('light', { registry, selection: { mode: 'light', preferred: { ...preferences, light: 'example.workshop/low' } } })
    expect(s.status).toBe('REPAIRED')
    expect(s.colors['text.primary']).toBe(builtinTokens.themes.light['text.primary'])
    expect(s.colors['diagram.grid']).toBe('#123456')
    expect(s.compatibility.repaired).toEqual(expect.arrayContaining(['text.primary', 'surface.base']))
    expect(s.repairPasses).toBeLessThanOrEqual(10)
    for (const [fg, bg, minimum] of contrastPairs) expect(contrastRatio(s.colors[fg], s.colors[bg])).toBeGreaterThanOrEqual(minimum)
  })
  it('bounds nonconvergence at ten passes and returns a complete builtin fallback', () => {
    // Fault fixture is helper-only. Runtime resolution always uses the fixed foundation table.
    const source = { ...builtinTokens.themes.light, 'diagram.grid': '#123456' }
    const before = JSON.stringify(source)
    const result = repairContrast(source, builtinTokens.themes.light, [['text.primary', 'text.primary', 4.5]])
    expect(result.status).toBe('FALLBACK')
    expect(result.passes).toBe(10)
    expect(result.colors).toEqual(builtinTokens.themes.light)
    expect(JSON.stringify(source)).toBe(before)
    for (const [fg, bg, minimum] of contrastPairs) expect(contrastRatio(result.colors[fg], result.colors[bg])).toBeGreaterThanOrEqual(minimum)
  })
  it('gives final forced-color precedence using the unchanged generated keyword mapping', () => {
    const css = readFileSync(new URL('../../src/design/generated/tokens.css', import.meta.url), 'utf8')
    const block = css.slice(css.indexOf('@media (forced-colors: active)'))
    const s = resolve('light', { environment: { colorScheme: 'dark', forcedColors: true }, overrides: { global: { 'diagram.grid': '#123456' } } })
    expect(s.kind).toBe('light')
    expect(s.colors['diagram.grid']).toBe('#123456')
    for (const role of themeRoles) {
      const name = '--frade-' + role.replaceAll('.', '-')
      const keyword = block.match(new RegExp(name + ': ([A-Za-z]+);'))?.[1]
      expect(keyword).toBeTruthy()
      expect(s.effectiveColors[role]).toBe(keyword)
    }
    expect(resolve('light').effectiveColors).toEqual(resolve('light').colors)
  })
  it('copies and deeply freezes outputs without freezing or mutating inputs', () => {
    const descriptor = { id: 'example.workshop/copy', label: 'Copy', kind: 'light', colors: { 'diagram.grid': '#123456' } }
    const original = JSON.stringify(descriptor), builtinBefore = JSON.stringify(builtinTokens)
    const registry = createThemeRegistry([descriptor]), s = resolve('light', { registry, selection: { mode: 'light', preferred: { ...preferences, light: descriptor.id } } })
    descriptor.colors['diagram.grid'] = '#654321'
    expect(s.colors['diagram.grid']).toBe('#123456')
    expect(Object.isFrozen(descriptor.colors)).toBe(false)
    descriptor.colors['diagram.grid'] = '#123456'
    expect(JSON.stringify(descriptor)).toBe(original)
    expect(JSON.stringify(builtinTokens)).toBe(builtinBefore)
    const frozen = (v: unknown): void => { if (v && typeof v === 'object') { expect(Object.isFrozen(v)).toBe(true); for (const x of Object.values(v)) frozen(x) } }
    frozen(s); frozen(registry.list()); frozen(registry.issues)
    expect(() => Object.assign(s.colors, { 'text.primary': '#010203' })).toThrow()
  })
  it('is deterministic, order-independent and idempotent for seed 20260930 / 200 palettes', () => {
    let seed = 20260930
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed }
    for (let run = 0; run < 200; run++) {
      const kind = kinds[run % kinds.length], id = 'property.fixture/theme'
      const colors = Object.fromEntries(authority.themeRoles.map((role: string) => [role, '#' + (random() & 0xffffff).toString(16).padStart(6, '0')]))
      const before = JSON.stringify(colors)
      const selection = { mode: kind, density: run % 2 ? 'comfortable' as const : 'compact' as const, preferred: { ...preferences, [kind]: id } }
      const a = resolveTheme({ registry: createThemeRegistry([{ id, label: 'Property', kind, colors }]), selection })
      const b = resolveTheme({ registry: createThemeRegistry([{ id, label: 'Property', kind, colors: Object.fromEntries(Object.entries(colors).reverse()) }]), selection })
      expect(a).toEqual(b)
      expect(Object.keys(a.colors)).toHaveLength(31)
      expect(JSON.stringify(colors)).toBe(before)
      expect(a.repairPasses).toBeLessThanOrEqual(10)
      for (const [fg, bg, minimum] of contrastPairs) expect(contrastRatio(a.colors[fg], a.colors[bg])).toBeGreaterThanOrEqual(minimum)
      const repeat = resolveTheme({ registry: createThemeRegistry([{ id, label: 'Property', kind, colors: a.colors }]), selection })
      expect(repeat.colors).toEqual(a.colors)
      expect(repeat.status).toBe('VALID')
    }
  })
})
