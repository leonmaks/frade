import { builtinTokens } from '../generated/tokens'
import { isHexColor, themeRoles } from './contrast'
import { freezeOwned } from './types'
import type { RegisteredTheme, ThemeRegistry, ThemeIssue, ThemeKind, ThemeRole } from './types'

export const BUILTIN_IDS = Object.freeze({
  light: 'frade.builtin/light',
  dark: 'frade.builtin/dark',
  'high-contrast': 'frade.builtin/high-contrast',
})
export const themeKinds: readonly ThemeKind[] = Object.freeze(['light', 'dark', 'high-contrast'])
const labels: Record<ThemeKind, string> = {
  light: 'Frade Light',
  dark: 'Frade Dark',
  'high-contrast': 'Frade High Contrast',
}
const roles = new Set<string>(themeRoles)
export function isDataRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return (
    (prototype === Object.prototype || prototype === null) &&
    Object.values(Object.getOwnPropertyDescriptors(value)).every((d) => 'value' in d)
  )
}
export function issue(code: string, source: string, message: string, role?: string): ThemeIssue {
  return role === undefined ? { code, source, message } : { code, source, message, role }
}
/** Native descriptors accept data only. This is an in-memory registry, not an installer. */
export function validateColors(
  value: unknown,
  source: string,
): {
  colors: Partial<Record<ThemeRole, string>>
  issues: ThemeIssue[]
  recognized: string[]
  ignored: string[]
} {
  const colors: Partial<Record<ThemeRole, string>> = {},
    issues: ThemeIssue[] = [],
    recognized: string[] = [],
    ignored: string[] = []
  if (!isDataRecord(value))
    return {
      colors,
      issues: [issue('INVALID_COLORS', source, 'Colors must be a plain data record')],
      recognized,
      ignored,
    }
  for (const role of themeRoles)
    if (Object.hasOwn(value, role)) {
      if (isHexColor(value[role])) {
        colors[role] = value[role]
        recognized.push(role)
      } else {
        issues.push(issue('INVALID_COLOR', source, 'Known roles require HEX6 values', role))
        ignored.push(role)
      }
    }
  for (const role of Object.keys(value)
    .filter((key) => !roles.has(key))
    .sort()) {
    issues.push(issue('UNKNOWN_ROLE', source, 'Unregistered role ignored', role))
    ignored.push(role)
  }
  return { colors, issues, recognized, ignored }
}
export function createThemeRegistry(descriptors: readonly unknown[] = []): ThemeRegistry {
  const entries = new Map<string, RegisteredTheme>(),
    issues: ThemeIssue[] = []
  for (const kind of themeKinds)
    entries.set(
      BUILTIN_IDS[kind],
      freezeOwned({
        id: BUILTIN_IDS[kind],
        label: labels[kind],
        kind,
        enabled: true,
        builtin: true,
        colors: { ...builtinTokens.themes[kind] },
        issues: [],
      }),
    )
  for (const [index, descriptor] of descriptors.entries()) {
    const source = 'descriptor[' + index + ']'
    if (!isDataRecord(descriptor)) {
      issues.push(issue('INVALID_DESCRIPTOR', source, 'Theme must be a plain data record'))
      continue
    }
    if (typeof descriptor.id === 'string' && descriptor.id.startsWith('frade.builtin/')) {
      issues.push(issue('RESERVED_ID', source, 'Builtin identity cannot be replaced'))
      continue
    }
    if (
      typeof descriptor.id !== 'string' ||
      descriptor.id.length > 160 ||
      !/^[a-z0-9][a-z0-9.-]*\.[a-z0-9][a-z0-9.-]*[/][a-z0-9][a-z0-9._-]*$/i.test(descriptor.id) ||
      typeof descriptor.label !== 'string' ||
      descriptor.label.length < 1 ||
      descriptor.label.length > 160 ||
      [...descriptor.label].some(
        (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
      ) ||
      !themeKinds.includes(descriptor.kind as ThemeKind) ||
      (descriptor.enabled !== undefined && typeof descriptor.enabled !== 'boolean') ||
      Object.keys(descriptor).some(
        (key) => !['id', 'label', 'kind', 'enabled', 'colors'].includes(key),
      ) ||
      !isDataRecord(descriptor.colors)
    ) {
      issues.push(
        issue('INVALID_DESCRIPTOR', source, 'Invalid theme identity, kind, label or data fields'),
      )
      continue
    }
    if (entries.has(descriptor.id)) {
      issues.push(issue('DUPLICATE_ID', source, 'First registered stable identity wins'))
      continue
    }
    const validated = validateColors(descriptor.colors, descriptor.id)
    issues.push(...validated.issues)
    entries.set(
      descriptor.id,
      freezeOwned({
        id: descriptor.id,
        label: descriptor.label,
        kind: descriptor.kind as ThemeKind,
        enabled: descriptor.enabled !== false,
        builtin: false,
        colors: validated.colors,
        issues: validated.issues,
      }),
    )
  }
  const list = freezeOwned([...entries.values()]),
    diagnostics = freezeOwned(issues)
  return Object.freeze({
    issues: diagnostics,
    get: (id: string) => entries.get(id),
    list: () => list,
  })
}
