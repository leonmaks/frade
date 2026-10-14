import { builtinTokens } from '../generated/tokens'
import { freezeOwned } from './types'
import type { ContrastPair, ThemeRole, ThemeColors, RepairResult } from './types'
export const themeRoles: readonly ThemeRole[] = Object.freeze(
  Object.keys(builtinTokens.themes.light) as ThemeRole[],
)
const surfaces: ThemeRole[] = [
  'surface.base',
  'surface.panel',
  'surface.rail',
  'surface.hover',
  'surface.overlay',
]
export const contrastPairs: readonly ContrastPair[] = freezeOwned([
  ...(['text.primary', 'text.secondary'] as const).flatMap((fg) =>
    surfaces.map((bg) => [fg, bg, 4.5] as ContrastPair),
  ),
  ['action.onPrimary', 'action.primary', 4.5],
  ['action.onPrimary', 'action.primaryHover', 4.5],
  ['selection.fg', 'selection.bg', 4.5],
  ['text.secondary', 'selection.bg', 4.5],
  ['text.primary', 'diagram.nodeBg', 4.5],
  ...(['success', 'warning', 'error', 'info'] as const).map(
    (status) => ['status.' + status, 'status.' + status + 'Bg', 4.5] as ContrastPair,
  ),
  ...(['focus.ring', 'border.control'] as const).flatMap((fg) =>
    surfaces.map((bg) => [fg, bg, 3] as ContrastPair),
  ),
  ['diagram.nodeStroke', 'diagram.canvas', 3],
  ['diagram.nodeStroke', 'diagram.nodeBg', 3],
  ['diagram.edge', 'diagram.canvas', 3],
  ['diagram.selection', 'diagram.nodeBg', 3],
  ['focus.ring', 'selection.bg', 3],
] as ContrastPair[])
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}
export function contrastRatio(a: string, b: string): number {
  if (!isHexColor(a) || !isHexColor(b)) throw new Error('Contrast requires HEX6 values')
  const luminance = (hex: string) =>
    [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
  const x = luminance(a),
    y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
/** Generic pure repair primitive. Runtime resolver always uses the fixed default table.
 * A helper-only unsatisfiable constraint fixture exercises bounded nonconvergence. */
export function repairContrast(
  input: ThemeColors,
  builtin: ThemeColors,
  pairs: readonly ContrastPair[] = contrastPairs,
): RepairResult {
  const colors = { ...input },
    repaired = new Set<ThemeRole>()
  const complete = () =>
    pairs.every(([fg, bg, minimum]) => contrastRatio(colors[fg], colors[bg]) >= minimum)
  const result = (status: RepairResult['status'], passes: number, value = colors): RepairResult =>
    freezeOwned({
      colors: { ...value },
      status,
      passes,
      repaired: themeRoles.filter((role) => repaired.has(role)),
    })
  if (complete()) return result('VALID', 0)
  for (let pass = 1; pass <= 10; pass++) {
    for (const [fg, bg, minimum] of pairs)
      if (contrastRatio(colors[fg], colors[bg]) < minimum) {
        colors[fg] = builtin[fg]
        colors[bg] = builtin[bg]
        repaired.add(fg)
        repaired.add(bg)
      }
    if (complete()) return result('REPAIRED', pass)
  }
  for (const role of themeRoles) repaired.add(role)
  return result('FALLBACK', 10, builtin)
}
