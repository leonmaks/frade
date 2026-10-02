import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const adoption = Object.freeze({
  guideVersion: '1.0',
  tokenVersion: '1.0.0',
  cssAdoptionRevision: 1,
})
export const themeRoles = Object.freeze(
  'surface.base surface.panel surface.rail surface.hover surface.overlay text.primary text.secondary text.disabled border.subtle border.control action.primary action.primaryHover action.onPrimary selection.bg selection.fg selection.indicator focus.ring status.success status.successBg status.warning status.warningBg status.error status.errorBg status.info status.infoBg diagram.canvas diagram.grid diagram.nodeBg diagram.nodeStroke diagram.edge diagram.selection'.split(
    ' ',
  ),
)
const commonRoles =
  'space.0 space.1 space.2 space.3 space.4 space.5 space.6 space.7 space.8 radius.control radius.overlay border.width focus.width focus.offset size.target size.touchTarget size.activity size.titlebar size.tabs size.toolbar size.breadcrumbs size.statusbar size.splitterHit font.ui font.code font.caption line.caption font.heading line.heading font.chat line.chat motion.fast motion.overlay'.split(
    ' ',
  )
const densityRoles = 'size.row size.control space.panel space.field font.body line.body'.split(' ')
const themes = ['light', 'dark', 'high-contrast']
const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v)
const hex = (v) => typeof v === 'string' && /^#[\da-f]{6}$/i.test(v)
export const contrastPairs = Object.freeze(
  (() => {
    const surfaces = [
      'surface.base',
      'surface.panel',
      'surface.rail',
      'surface.hover',
      'surface.overlay',
    ]
    const pairs = ['text.primary', 'text.secondary'].flatMap((fg) =>
      surfaces.map((bg) => [fg, bg, 4.5]),
    )
    pairs.push(
      ['action.onPrimary', 'action.primary', 4.5],
      ['action.onPrimary', 'action.primaryHover', 4.5],
      ['selection.fg', 'selection.bg', 4.5],
      ['text.secondary', 'selection.bg', 4.5],
      ['text.primary', 'diagram.nodeBg', 4.5],
    )
    for (const status of ['success', 'warning', 'error', 'info'])
      pairs.push(['status.' + status, 'status.' + status + 'Bg', 4.5])
    pairs.push(
      ...['focus.ring', 'border.control'].flatMap((fg) => surfaces.map((bg) => [fg, bg, 3])),
    )
    pairs.push(
      ['diagram.nodeStroke', 'diagram.canvas', 3],
      ['diagram.nodeStroke', 'diagram.nodeBg', 3],
      ['diagram.edge', 'diagram.canvas', 3],
      ['diagram.selection', 'diagram.nodeBg', 3],
      ['focus.ring', 'selection.bg', 3],
    )
    return pairs.map((p) => Object.freeze(p))
  })(),
)
export function contrastRatio(a, b) {
  if (!hex(a) || !hex(b)) throw new Error('Contrast requires HEX6 values')
  const lum = (value) =>
    [1, 3, 5]
      .map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
  const x = lum(a),
    y = lum(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
export function validateBuiltin(data) {
  const errors = []
  function keys(value, expected, label) {
    if (!object(value)) {
      errors.push(label + ': expected object')
      return false
    }
    for (const key of expected)
      if (!Object.hasOwn(value, key)) errors.push(label + ': missing ' + key)
    for (const key of Object.keys(value))
      if (!expected.includes(key)) errors.push(label + ': unknown ' + key)
    return true
  }
  if (!keys(data, ['version', 'format', 'themes', 'common', 'density'], 'tokens')) return errors
  if (data.version !== '1.0.0' || data.format !== 'frade-semantic-tokens-v1')
    errors.push('Token format/version mismatch')
  if (keys(data.themes, themes, 'themes'))
    for (const theme of themes) {
      const colors = data.themes[theme]
      if (!keys(colors, themeRoles, theme)) continue
      for (const [role, color] of Object.entries(colors))
        if (!hex(color)) errors.push(theme + ': invalid HEX6 ' + role)
      for (const [fg, bg, minimum] of contrastPairs)
        if (hex(colors[fg]) && hex(colors[bg])) {
          const ratio = contrastRatio(colors[fg], colors[bg])
          if (ratio < minimum)
            errors.push(theme + ': contrast ' + fg + '/' + bg + ' = ' + ratio + ' < ' + minimum)
        }
    }
  const values = (value, expected, label) => {
    if (!keys(value, expected, label)) return
    for (const [role, v] of Object.entries(value)) {
      const font = role === 'font.ui' || role === 'font.code'
      if (
        typeof v !== 'string' ||
        !v ||
        /[;\r\n{}]/.test(v) ||
        (!font && (!/^(0|\d+(\.\d+)?(px|rem|ms))$/.test(v) || !Number.isFinite(parseFloat(v))))
      )
        errors.push(label + ': invalid CSS value ' + role)
    }
  }
  values(data.common, commonRoles, 'common')
  if (keys(data.density, ['compact', 'comfortable'], 'density'))
    for (const name of ['compact', 'comfortable']) values(data.density[name], densityRoles, name)
  return errors
}
const cssName = (key) => '--frade-' + key.replaceAll('.', '-').replaceAll('_', '-')
const block = (selector, values) =>
  selector +
  ' {\n' +
  Object.entries(values)
    .map(([key, value]) => '  ' + cssName(key) + ': ' + value + ';\n')
    .join('') +
  '}\n'
export function exactSourceOracle(css) {
  const before = ':root:not([data-frade-theme])'
  if (css.split(before).length !== 2)
    throw new Error('Accepted selector occurrence count must be one')
  return css.replace(before, ':root:where(:not([data-frade-theme]))')
}
export function generateCss(data) {
  const errors = validateBuiltin(data)
  if (errors.length) throw new Error(errors.join('\n'))
  let css = '/* Generated from tokens.json; do not edit. Frade UI v' + data.version + ' */\n'
  css += block(':root', { ...data.common, ...data.density.compact, ...data.themes.light })
  for (const [theme, colors] of Object.entries(data.themes))
    css += block('[data-frade-theme="' + theme + '"]', colors)
  css +=
    '@media (prefers-color-scheme: dark) {\n' +
    block(':root:where(:not([data-frade-theme])), [data-frade-theme="system"]', data.themes.dark) +
    '}\n'
  css += block('[data-frade-theme="system"]', {})
  for (const [density, values] of Object.entries(data.density))
    css += block('[data-frade-density="' + density + '"]', values)
  const coarse = { 'size.target': '44px', 'size.control': '44px', 'size.row': '44px' }
  css += '@media (pointer: coarse) {\n' + block(':root', coarse) + '}\n'
  css += '@media (pointer: coarse) {\n' + block('[data-frade-density]', coarse) + '}\n'
  css +=
    '@media (prefers-reduced-motion: reduce) {\n' +
    block(':root', { 'motion.fast': '0ms', 'motion.overlay': '0ms' }) +
    '}\n'
  const forced = Object.fromEntries(
    themeRoles.map((role) => [
      role,
      role.startsWith('surface.') ||
      role.endsWith('Bg') ||
      ['diagram.canvas', 'diagram.nodeBg'].includes(role)
        ? 'Canvas'
        : 'CanvasText',
    ]),
  )
  Object.assign(forced, {
    'action.primary': 'Highlight',
    'action.primaryHover': 'Highlight',
    'action.onPrimary': 'HighlightText',
    'selection.bg': 'Highlight',
    'selection.fg': 'HighlightText',
    'selection.indicator': 'Highlight',
    'focus.ring': 'Highlight',
    'diagram.selection': 'Highlight',
  })
  return (
    css + '@media (forced-colors: active) {\n' + block(':root, [data-frade-theme]', forced) + '}\n'
  )
}
export function generateTs(data) {
  const errors = validateBuiltin(data)
  if (errors.length) throw new Error(errors.join('\n'))
  return (
    '// Generated from tokens.json; do not edit.\nexport const tokenContract = ' +
    JSON.stringify(adoption, null, 2) +
    ' as const\nexport const builtinTokens = ' +
    JSON.stringify(data, null, 2) +
    ' as const\nexport type FradeThemeKind = keyof typeof builtinTokens.themes\nexport type FradeThemeRole = keyof typeof builtinTokens.themes.light\nexport type FradeDensity = keyof typeof builtinTokens.density\n'
  )
}
export function checkGenerated(data, css, ts) {
  const errors = validateBuiltin(data)
  if (errors.length) return errors
  if (css !== generateCss(data)) errors.push('Generated CSS drift')
  if (ts !== generateTs(data)) errors.push('Generated TS drift')
  return errors
}
export async function checkTokenFiles(base = root) {
  const data = JSON.parse(
    await readFile(resolve(base, 'packages/ui-workspace/tokens/tokens.json'), 'utf8'),
  )
  const fixture = await readFile(
    resolve(base, 'tests/ui-contract/fixtures/upstream.tokens.css'),
    'utf8',
  )
  if (
    createHash('sha256').update(fixture).digest('hex') !==
    '11aac6f1c08ae67ef25415b220330d26bef9d0d805090ecc9626bb7ca6707d29'
  )
    throw new Error('Immutable upstream CSS fixture drift')
  const errors = validateBuiltin(data)
  if (!errors.length && generateCss(data) !== exactSourceOracle(fixture))
    errors.push('Unapproved CSS equivalence deviation')
  const cssPath = resolve(base, 'packages/ui-workspace/src/design/generated/tokens.css')
  const tsPath = resolve(base, 'packages/ui-workspace/src/design/generated/tokens.ts')
  if (process.argv.includes('--write') && !errors.length) {
    await mkdir(dirname(cssPath), { recursive: true })
    await writeFile(cssPath, generateCss(data), 'utf8')
    await writeFile(tsPath, generateTs(data), 'utf8')
  }
  if (!errors.length)
    errors.push(
      ...checkGenerated(data, await readFile(cssPath, 'utf8'), await readFile(tsPath, 'utf8')),
    )
  return {
    status: errors.length ? 'FAIL' : 'PASS',
    namedContrastChecks: contrastPairs.length * themes.length,
    adoption,
    errors,
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = await checkTokenFiles(
      process.argv.includes('--root')
        ? resolve(process.argv[process.argv.indexOf('--root') + 1])
        : root,
    )
    console.log(JSON.stringify(report))
    process.exitCode = report.errors.length ? 1 : 0
  } catch (error) {
    console.error(String(error))
    process.exitCode = 1
  }
}
