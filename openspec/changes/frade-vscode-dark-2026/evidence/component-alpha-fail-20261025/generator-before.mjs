import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { contrastPairs, contrastRatio } from './tokens.mjs'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const referenceDirectory = 'packages/ui-workspace/src/design/reference/vscode-dark-2026'
export const generatedPath = referenceDirectory + '/generated.ts'
export const themeId = 'frade.reference/vscode-dark-2026'
const require = createRequire(resolve(root, 'packages/ui-workspace/package.json'))
const ts = require('typescript')
const digest = bytes => createHash('sha256').update(bytes).digest('hex')
// Replaced by the implementation bootstrap with PRE-approved upstream hashes.
const expectedSources = {
  "2026-dark.json": "d102252dee12fb56400fa4c4c573435d866a234ec7678fbc525483a5c1b05acf",
  "dark_modern.json": "664f109c88bddc72358d6e25f0fdcb2cc49bc8fc43b01b4374cef8a54f9942e5",
  "dark_plus.json": "409f33088a5cfd6589384900ef80627787c568d367c25b12f31bc7940936e573",
  "dark_vs.json": "a2b2a99947e5e68e318d10942f969cd54d445cdaf93634e8246932745de4b62e",
  "LICENSE.txt": "9480271317925265e806a9a196aaa33410a962fa9d4d1e248a4a5187bc8c9df9"
}
const attributes = Object.keys(expectedSources).map(name => 'upstream/' + name + ' -text')
  .concat('generated.ts -text').sort().join('\n') + '\n'
const roleMap = {
  'surface.base': ['editor.background'], 'surface.panel': ['sideBar.background'],
  'surface.rail': ['activityBar.background'], 'surface.hover': ['list.hoverBackground', 'sideBar.background'],
  'surface.overlay': ['menu.background'], 'text.primary': ['foreground'],
  'text.secondary': ['descriptionForeground'], 'text.disabled': ['disabledForeground'],
  'border.subtle': ['sideBar.border'], 'border.control': ['input.border'],
  'action.primary': ['button.background'], 'action.primaryHover': ['button.hoverBackground'],
  'action.onPrimary': ['button.foreground'], 'selection.bg': ['list.activeSelectionBackground', 'sideBar.background'],
  'selection.fg': ['list.activeSelectionForeground'], 'selection.indicator': ['activityBar.activeBorder'],
  'focus.ring': ['focusBorder', 'editor.background'], 'status.success': ['gitDecoration.addedResourceForeground'],
  'status.successBg': ['editor.background'], 'status.warning': ['list.warningForeground'],
  'status.warningBg': ['editor.background'], 'status.error': ['errorForeground'],
  'status.errorBg': ['editor.background'], 'status.info': ['textLink.foreground'],
  'status.infoBg': ['editor.background'], 'diagram.canvas': ['editor.background'],
}

export function compositeColor(value, background) {
  if (typeof value !== 'string' || !/^#(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value))
    throw Error('INVALID_REFERENCE_COLOR')
  let hex = value.slice(1)
  if (hex.length < 5) hex = [...hex].map(char => char + char).join('')
  if (hex.length === 6) return '#' + hex.toUpperCase()
  if (!background || !/^#[a-f\d]{6}$/i.test(background)) throw Error('UNBOUND_REFERENCE_ALPHA')
  const alpha = parseInt(hex.slice(6), 16) / 255
  return '#' + [0, 2, 4].map(offset => Math.round(parseInt(hex.slice(offset, offset + 2), 16) * alpha +
    parseInt(background.slice(offset + 1, offset + 3), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('').toUpperCase()
}

export function parseSourceClosure(files) {
  const visited = new Set(), active = new Set(), order = []
  const merged = { colors: {}, tokenColors: [], semanticTokenColors: {} }
  const visit = name => {
    if (!['2026-dark.json', 'dark_modern.json', 'dark_plus.json', 'dark_vs.json'].includes(name))
      throw Error('UNSAFE_REFERENCE_INCLUDE')
    if (active.has(name)) throw Error('CYCLIC_REFERENCE_INCLUDE')
    if (visited.has(name)) return
    if (typeof files[name] !== 'string') throw Error('MISSING_REFERENCE_INCLUDE')
    active.add(name)
    const parsed = ts.parseConfigFileTextToJson(name, files[name])
    if (parsed.error || !parsed.config || typeof parsed.config !== 'object') throw Error('INVALID_REFERENCE_JSONC')
    const value = parsed.config
    if (value.include !== undefined) {
      if (typeof value.include !== 'string' || !/^\.\/[a-z0-9_-]+\.json$/.test(value.include))
        throw Error('UNSAFE_REFERENCE_INCLUDE')
      visit(value.include.slice(2))
    }
    Object.assign(merged.colors, value.colors ?? {})
    if (Array.isArray(value.tokenColors)) merged.tokenColors.push(...value.tokenColors)
    Object.assign(merged.semanticTokenColors, value.semanticTokenColors ?? {})
    active.delete(name); visited.add(name); order.push(name)
  }
  visit('2026-dark.json')
  return { ...merged, order }
}

// Each slot declares its semantic override and the actual backdrop for alpha/contrast.
const slots = {
  editorBackground: ['editor.background', 'surface.base'],
  editorForeground: ['editor.foreground', 'text.primary', 'editorBackground', 4.5],
  panelBackground: ['sideBar.background', 'surface.panel'],
  panelForeground: ['sideBar.foreground', 'text.primary', 'panelBackground', 4.5],
  railBackground: ['activityBar.background', 'surface.rail'],
  railForeground: ['activityBar.foreground', 'text.primary', 'railBackground', 3],
  railInactive: ['activityBar.inactiveForeground', 'text.secondary', 'railBackground', 3],
  railIndicator: ['activityBar.activeBorder', 'selection.indicator', 'railBackground', 3],
  titleBackground: ['titleBar.activeBackground', 'surface.panel'],
  titleForeground: ['titleBar.activeForeground', 'text.secondary', 'titleBackground', 4.5],
  subtleBorder: ['sideBar.border', 'border.subtle'],
  controlBackground: ['input.background', 'surface.panel'],
  controlForeground: ['input.foreground', 'text.primary', 'controlBackground', 4.5],
  controlBorder: ['input.border', 'border.control', 'controlBackground', 3],
  placeholder: ['input.placeholderForeground', 'text.secondary', 'controlBackground', 4.5],
  primaryBackground: ['button.background', 'action.primary'],
  primaryForeground: ['button.foreground', 'action.onPrimary', 'primaryBackground', 4.5],
  primaryHover: ['button.hoverBackground', 'action.primaryHover'],
  secondaryBackground: ['button.secondaryBackground', 'surface.panel'],
  secondaryForeground: ['button.secondaryForeground', 'text.primary', 'secondaryBackground', 4.5],
  treeHover: ['list.hoverBackground', 'surface.hover', 'panelBackground'],
  treeSelection: ['list.activeSelectionBackground', 'selection.bg', 'panelBackground'],
  treeSelectionForeground: ['list.activeSelectionForeground', 'selection.fg', 'treeSelection', 4.5],
  treeInactive: ['list.inactiveSelectionBackground', 'selection.bg', 'panelBackground'],
  tabActive: ['tab.activeBackground', 'surface.base'],
  tabInactive: ['tab.inactiveBackground', 'surface.panel'],
  tabActiveForeground: ['tab.activeForeground', 'text.primary', 'tabActive', 4.5],
  tabInactiveForeground: ['tab.inactiveForeground', 'text.secondary', 'tabInactive', 4.5],
  tabBorder: ['tab.border', 'border.subtle'],
  tabsBackground: ['editorGroupHeader.tabsBackground', 'surface.panel'],
  menuBackground: ['menu.background', 'surface.overlay'],
  menuForeground: ['menu.foreground', 'text.primary', 'menuBackground', 4.5],
  menuBorder: ['menu.border', 'border.subtle'],
  menuSelection: ['menu.selectionBackground', 'selection.bg', 'menuBackground'],
  menuSelectionForeground: ['menu.selectionForeground', 'selection.fg', 'menuSelection', 4.5],
  pickerBackground: ['quickInput.background', 'surface.overlay'],
  pickerForeground: ['quickInput.foreground', 'text.primary', 'pickerBackground', 4.5],
  statusBackground: ['statusBar.background', 'surface.panel'],
  statusForeground: ['statusBar.foreground', 'text.primary', 'statusBackground', 4.5],
}

export async function generateReference(base = root) {
  const files = {}, manifest = []
  for (const [name, expected] of Object.entries(expectedSources)) {
    const bytes = await readFile(resolve(base, referenceDirectory, 'upstream', name))
    if (digest(bytes) !== expected) throw Error('REFERENCE_SOURCE_DRIFT:' + name)
    files[name] = bytes.toString('utf8'); manifest.push({ name, sha256: expected, bytes: bytes.length })
  }
  const actualAttributes = (await readFile(resolve(base, referenceDirectory, '.gitattributes'), 'utf8')).replaceAll('\r\n', '\n')
  if (actualAttributes !== attributes) throw Error('REFERENCE_CHECKOUT_ATTRIBUTE_DRIFT')
  const merged = parseSourceClosure(files)
  const builtin = JSON.parse(await readFile(resolve(base, 'packages/ui-workspace/tokens/tokens.json'), 'utf8'))
  const colors = {}, mappings = [], repairs = []
  for (const role of Object.keys(builtin.themes.dark)) {
    const keys = roleMap[role], original = keys ? merged.colors[keys[0]] : undefined
    colors[role] = original ? compositeColor(original, keys[1] ? merged.colors[keys[1]] : undefined) : builtin.themes.dark[role]
    mappings.push({ role, key: keys?.[0] ?? null, original: original ?? null, mapped: colors[role], source: original ? 'UPSTREAM' : 'FRADE_NO_COUNTERPART' })
  }
  // This build-time palette adaptation preserves upstream surfaces. The runtime's
  // existing fixed-pair validator/repair remains unchanged and still validates it.
  for (const foreground of [...new Set(contrastPairs.map(pair => pair[0]))]) {
    const pairs = contrastPairs.filter(pair => pair[0] === foreground)
    const passes = color => pairs.every(([, background, minimum]) => contrastRatio(color, colors[background]) >= minimum)
    if (passes(colors[foreground])) continue
    const original = colors[foreground], raw = roleMap[foreground] ? merged.colors[roleMap[foreground][0]] : undefined
    const candidates = [raw?.length === 9 ? raw.slice(0, 7) : undefined,
      builtin.themes.dark[foreground], merged.colors['checkbox.foreground'],
      builtin.themes.dark['text.secondary'], builtin.themes.dark['text.primary'], builtin.themes.light['text.primary']].filter(Boolean)
    const replacement = candidates.find(passes)
    if (!replacement) throw Error('REFERENCE_CONTRAST_UNRESOLVED:' + foreground)
    colors[foreground] = replacement
    repairs.push({ role: foreground, original, effective: replacement, reason: 'NAMED_CONTRAST_PAIR_FOREGROUND_ADAPTATION' })
  }
  if (contrastPairs.some(([fg, bg, minimum]) => contrastRatio(colors[fg], colors[bg]) < minimum)) throw Error('REFERENCE_CONTRAST_INVALID')
  const slotData = Object.fromEntries(Object.entries(slots).map(([name, [key, role, background, minimum]]) => {
    const raw = merged.colors[key] ?? colors[role]
    if (typeof raw !== 'string' || !/^#[a-f\d]{3,8}$/i.test(raw)) throw Error('INVALID_REFERENCE_SLOT:' + key)
    return [name, { key, role, raw, ...(background ? { background } : {}), ...(minimum ? { minimum } : {}) }]
  }))
  const mappedKeys = new Set([...Object.values(roleMap).flat(), ...Object.values(slots).map(slot => slot[0])])
  const data = {
    id: themeId, label: 'VS Code Dark 2026', kind: 'dark',
    descriptor: { id: themeId, label: 'VS Code Dark 2026', kind: 'dark', colors },
    slots: slotData,
    provenance: { repository: 'https://github.com/microsoft/vscode', commit: '36e19389b8a2e64498d0d4d860c346424bf90a3a', manifest },
    compatibility: { mappings, repairs, namedContrastPairs: contrastPairs.length,
      colors: Object.keys(merged.colors).sort().map(key => ({ key, status: mappedKeys.has(key) ? 'MAPPED_OR_COMPOSED' : 'RETAINED_ONLY_NO_FRADE_COUNTERPART' })),
      syntaxRules: merged.tokenColors.length, semanticRules: Object.keys(merged.semanticTokenColors).length,
      syntaxConsumer: 'NOT_IMPLEMENTED_RETAINED_ONLY', geometryDeviations: ['canonical row minima28/36', 'status target minimum24', 'default tab-height referenceNOT_CONFIRMED; existing35 retained'] },
    upstreamSources: files,
  }
  const license = files['LICENSE.txt'].replaceAll('*/', '* /')
  return '/*! Microsoft VS Code source, MIT license; retained verbatim below.\n' + license + '\n*/\n' +
    '// Generated by scripts/ui/vscode-dark-2026.mjs; do not edit.\n' +
    'export const referenceTheme = ' + JSON.stringify(data, null, 2) + ' as const\n'
}

export async function checkReferenceFiles(base = root, write = false) {
  try {
    const output = await generateReference(base)
    if (write) { await mkdir(dirname(resolve(base, generatedPath)), { recursive: true }); await writeFile(resolve(base, generatedPath), output) }
    const actual = await readFile(resolve(base, generatedPath), 'utf8')
    return { status: actual === output ? 'PASS' : 'FAIL', errors: actual === output ? [] : ['REFERENCE_GENERATED_DRIFT'] }
  } catch (error) { return { status: 'FAIL', errors: [String(error)] } }
}
export function expectedReferenceAttributes() { return attributes }
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = process.argv.includes('--root') ? resolve(process.argv[process.argv.indexOf('--root') + 1]) : root
  const result = await checkReferenceFiles(base, process.argv.includes('--write'))
  console.log(JSON.stringify(result)); process.exitCode = result.status === 'PASS' ? 0 : 1
}
