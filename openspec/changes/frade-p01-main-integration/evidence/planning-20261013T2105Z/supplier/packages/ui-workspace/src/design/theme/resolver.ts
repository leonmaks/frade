import { builtinTokens } from '../generated/tokens'
import { repairContrast, themeRoles } from './contrast'
import { BUILTIN_IDS, themeKinds, validateColors, issue } from './registry'
import { freezeOwned } from './types'
import type {
  ResolveInput,
  ResolvedTheme,
  ThemeKind,
  ThemeColors,
  ThemeIssue,
  ThemeMode,
} from './types'

/** No IO or framework state. Every returned object is owned by this resolution. */
export function resolveTheme(input: ResolveInput): ResolvedTheme {
  const issues: ThemeIssue[] = input.registry.issues.map((item) => ({ ...item }))
  const requested = input.selection?.mode ?? 'system'
  const mode: ThemeMode =
    requested === 'system' || themeKinds.includes(requested as ThemeKind) ? requested : 'system'
  if (mode !== requested)
    issues.push(issue('INVALID_MODE', 'selection', 'Invalid mode falls back to System'))
  const kind: ThemeKind =
    mode === 'system'
      ? input.environment?.highContrast
        ? 'high-contrast'
        : input.environment?.colorScheme === 'dark'
          ? 'dark'
          : 'light'
      : mode
  const requestedDensity = input.selection?.density ?? 'compact'
  const density = requestedDensity === 'comfortable' ? 'comfortable' : 'compact'
  if (density !== requestedDensity)
    issues.push(issue('INVALID_DENSITY', 'selection', 'Invalid density falls back to compact'))
  const preferred = input.selection?.preferred?.[kind] ?? BUILTIN_IDS[kind]
  let selected = input.registry.get(preferred)
  if (!selected || !selected.enabled || selected.kind !== kind) {
    issues.push(
      issue(
        !selected ? 'UNKNOWN_THEME' : !selected.enabled ? 'DISABLED_THEME' : 'KIND_MISMATCH',
        'selection',
        'Selection falls back to the matching builtin',
      ),
    )
    selected = input.registry.get(BUILTIN_IDS[kind])
  }
  if (!selected) throw new Error('Theme registry must contain all reserved builtins')
  const builtin: ThemeColors = builtinTokens.themes[kind]
  const colors = { ...builtin, ...selected.colors },
    recognized = new Set<string>(),
    ignored = new Set<string>()
  for (const role of themeRoles) if (Object.hasOwn(selected.colors, role)) recognized.add(role)
  for (const diagnostic of selected.issues) if (diagnostic.role) ignored.add(diagnostic.role)
  const apply = (layer: unknown, source: string) => {
    if (layer === undefined) return
    const validated = validateColors(layer, source)
    Object.assign(colors, validated.colors)
    issues.push(...validated.issues)
    for (const role of validated.recognized) recognized.add(role)
    for (const role of validated.ignored) ignored.add(role)
  }
  apply(input.overrides?.global, 'user.global')
  apply(input.overrides?.byTheme?.[selected.id], 'user.theme.' + selected.id)
  if (input.overrides?.workspaceEnabled === true) apply(input.overrides.workspace, 'workspace')
  // No descriptor/override may supply a constraint table: all runtime palettes use the 34 fixed pairs.
  const repaired = repairContrast(colors, builtin)
  if (repaired.status !== 'VALID')
    issues.push(
      issue(
        'CONTRAST_' + repaired.status,
        selected.id,
        repaired.status === 'REPAIRED'
          ? 'Violating role pairs restored from builtin palette'
          : 'Ten-pass bound reached; complete builtin palette restored',
      ),
    )
  const forcedColors = input.environment?.forcedColors === true
  const effectiveColors = { ...repaired.colors }
  if (forcedColors) {
    for (const role of themeRoles)
      effectiveColors[role] =
        role.startsWith('surface.') || role.endsWith('Bg') || role === 'diagram.canvas'
          ? 'Canvas'
          : 'CanvasText'
    for (const role of [
      'action.primary',
      'action.primaryHover',
      'selection.bg',
      'selection.indicator',
      'focus.ring',
      'diagram.selection',
    ] as const)
      effectiveColors[role] = 'Highlight'
    for (const role of ['action.onPrimary', 'selection.fg'] as const)
      effectiveColors[role] = 'HighlightText'
  }
  return freezeOwned({
    id: selected.id,
    label: selected.label,
    kind,
    density,
    revision:
      Number.isSafeInteger(input.revision) && (input.revision ?? -1) >= 0 ? input.revision! : 0,
    colors: { ...repaired.colors },
    effectiveColors,
    forcedColors,
    status: repaired.status,
    repairPasses: repaired.passes,
    issues,
    compatibility: {
      recognized: themeRoles.filter((role) => recognized.has(role)),
      ignored: [...ignored].sort(),
      repaired: [...repaired.repaired],
    },
  })
}
