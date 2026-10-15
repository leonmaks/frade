import { createRequire } from 'node:module'
import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { root, themeRoles } from './tokens.mjs'
const require = createRequire(resolve(root, 'packages/ui-workspace/package.json'))
const ts = require('typescript')
const names =
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgrey darkgreen darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray grey green greenyellow honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgrey lightgreen lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent'.split(
    ' ',
  )
const colorPattern = new RegExp(
  '#[\\da-f]{3,8}(?![\\da-f])|(?:rgba?|hsla?)\\([^)]*\\)|(?<![\\w-])(?:' +
    names.join('|') +
    ')(?![\\w-])',
  'gi',
)
const sha = (s) => createHash('sha256').update(s).digest('hex')
export function inspectColors(file, original) {
  const source = original.replaceAll('\r\n', '\n')
  const hits = []
  const collect = (value, base, literalEnd) => {
    for (const match of value.matchAll(colorPattern)) {
      const start = base + match.index,
        end = literalEnd ?? start + match[0].length
      const lineStart = source.lastIndexOf('\n', base - 1) + 1
      const lineEnd = source.indexOf('\n', base)
      const context = source.slice(lineStart, lineEnd < 0 ? source.length : lineEnd)
      hits.push({
        file: file.replaceAll('\\', '/'),
        start,
        end,
        line: source.slice(0, start).split('\n').length,
        value: match[0],
        occurrenceHash: sha(match[0] + '\n' + context),
        context,
      })
    }
  }
  if (extname(file) === '.css') {
    const clean = source.replace(/\/\*[\s\S]*?\*\//g, (text) => text.replace(/[^\n]/g, ' '))
    for (const declaration of clean.matchAll(/[-\w]+\s*:\s*([^;{}]+)/g)) {
      const value = declaration[1]
      collect(value, declaration.index + declaration[0].indexOf(value))
    }
  } else {
    const ast = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      extname(file) === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )
    const visit = (node) => {
      if (
        ts.isStringLiteralLike(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      )
        collect(node.text, node.getStart(ast) + 1, node.getEnd())
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  return hits.sort((a, b) => a.start - b.start)
}
const key = (h) => [h.file, h.start, h.end, h.value, h.occurrenceHash].join('\0')
export function applyExceptions(hits, exceptions) {
  const errors = [],
    allowed = new Set()
  for (const entry of exceptions) {
    if (
      !entry.reason ||
      !entry.stage ||
      !['LEGACY', 'DOMAIN_VISUALIZATION', 'BRAND'].includes(entry.classification) ||
      !Number.isInteger(entry.start) ||
      !Number.isInteger(entry.end) ||
      !entry.value ||
      !/^[a-f\d]{64}$/.test(entry.occurrenceHash ?? '')
    ) {
      errors.push('Invalid occurrence exception: ' + entry.file)
      continue
    }
    const id = key(entry)
    if (allowed.has(id)) errors.push('Duplicate exception: ' + entry.file + ':' + entry.start)
    allowed.add(id)
  }
  const actual = new Set(hits.map(key))
  for (const entry of exceptions)
    if (!actual.has(key(entry))) errors.push('Stale exception: ' + entry.file + ':' + entry.start)
  for (const hit of hits)
    if (!allowed.has(key(hit)))
      errors.push(hit.file + ':' + hit.line + ': forbidden color ' + hit.value)
  return errors
}
export function classifyColorData(kind, value) {
  const errors = []
  const hex = (v) =>
    typeof v === 'string' && /^#[\da-f]{6,8}$/i.test(v) && [7, 9].includes(v.length)
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return ['Expected color data object']
  if (kind === 'theme') {
    if (
      !['light', 'dark', 'high-contrast'].includes(value.kind) ||
      !value.colors ||
      typeof value.colors !== 'object'
    )
      return ['Invalid theme boundary']
    for (const [role, color] of Object.entries(value.colors))
      if (!themeRoles.includes(role) || typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color))
        errors.push('Invalid theme color ' + role)
  } else if (kind === 'domain-paint') {
    for (const [field, color] of Object.entries(value)) {
      if (['fill', 'stroke', 'color'].includes(field)) {
        if (!hex(color)) errors.push('Invalid domain paint ' + field)
      } else if (field !== 'width' || !Number.isFinite(color) || color < 0)
        errors.push('Unknown domain paint field ' + field)
    }
  } else errors.push('Unknown color data boundary ' + kind)
  return errors
}
export const featureRoots = Object.freeze([
  'apps/desktop/src/renderer',
  'packages/ui-workspace/src',
  'packages/ui-navigator/src',
  'packages/ui-inspector/src',
  'packages/draw/src',
])
export async function featureColorHits(base = root) {
  const result = []
  const walk = async (relative) => {
    for (const item of await readdir(resolve(base, relative), { withFileTypes: true })) {
      const file = relative + '/' + item.name
      if (item.isDirectory()) await walk(file)
      else if (
        /\.(css|tsx?)$/.test(file) &&
        ![
          'packages/ui-workspace/src/design/generated/tokens.css',
          'packages/ui-workspace/src/design/generated/tokens.ts',
        ].includes(file)
      )
        result.push(...inspectColors(file, await readFile(resolve(base, file), 'utf8')))
    }
  }
  for (const directory of featureRoots) await walk(directory)
  return result
}
export async function checkFeatureColors(base = root) {
  const inventory = JSON.parse(
    await readFile(resolve(base, 'docs/ui/decisions/legacy-colors.json'), 'utf8'),
  )
  if (inventory.version !== 1 || inventory.normalization !== 'LF UTF16 logical spans')
    throw new Error('Invalid exception inventory version')
  const hits = await featureColorHits(base)
  const errors = applyExceptions(hits, inventory.occurrences)
  return {
    status: errors.length ? 'FAIL' : 'PASS',
    occurrences: hits.length,
    legacyExceptions: inventory.occurrences.length,
    errors,
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await checkFeatureColors(
      process.argv.includes('--root')
        ? resolve(process.argv[process.argv.indexOf('--root') + 1])
        : root,
    )
    console.log(JSON.stringify(result))
    process.exitCode = result.errors.length ? 1 : 0
  } catch (error) {
    console.error(String(error))
    process.exitCode = 1
  }
}
