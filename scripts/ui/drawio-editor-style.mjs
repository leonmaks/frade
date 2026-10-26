import { createRequire } from 'node:module'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const version = '31.5.2'
const vendor = 'apps/desktop/vendor/drawio/'
const pins = {
  'styles/grapheditor.css': 'b660bcd355fdb3257635c95c23445e24a49b54875805b662f63a15354bba4989',
  'styles/high-contrast.css': '06173c9ab9d1715004f6040beb3d75b7fcec4a3029e3304b0c32c0baeb1732b5',
  'mxgraph/css/common.css': '080278000f2a3bdba6d29f426f24654b5041539d3c4868a9434028e141db92a7',
}
const hash = (value) => createHash('sha256').update(value).digest('hex')
const json = (value) => JSON.stringify(value, null, 2) + '\n'
const cssPath = 'packages/ui-workspace/src/design/generated/drawio-editor.css'
const tsPath = 'packages/ui-workspace/src/design/generated/drawio-editor.ts'
const profilePath = 'packages/ui-workspace/tokens/diagram-editor-presentation.json'
const manifestPath = 'packages/ui-workspace/tokens/drawio-editor-source.json'
export const drawioGeneratedPaths = Object.freeze([cssPath, tsPath])
const owner = "[data-frade-editor='light']"
const layout = new Set([
  'position',
  'overflow',
  'width',
  'height',
  'margin',
  'display',
  'grid-template-rows',
  'grid-template-columns',
])
function parsers() {
  const require = createRequire(resolve(root, 'apps/desktop/package.json'))
  const vite = dirname(require.resolve('vite/package.json'))
  return {
    postcss: require(require.resolve('postcss', { paths: [vite] })),
    selectors: require(require.resolve('lightningcss', { paths: [vite] })),
  }
}
const aliases = {
  geBtn: ['.geBtn', 'button'],
  gePrimaryBtn: ['.gePrimaryBtn', '.primary', '.editor-actions > button:first-of-type'],
  geDialog: ['.geDialog', '[role="dialog"]', '[role="alertdialog"]'],
  mxPopupMenu: ['.mxPopupMenu', '[role="menu"]'],
  mxPopupMenuItem: ['.mxPopupMenuItem', '[role="menuitem"]'],
  mxTooltip: ['.mxTooltip', '[role="tooltip"]'],
}
function rewrite(selector, compiler) {
  const parse = (text) => {
    const found = []
    compiler.transform({
      filename: 'selector.css',
      code: Buffer.from(text + '{--frade-selector:0}'),
      visitor: {
        Selector(value) {
          found.push(value)
        },
      },
    })
    return found
  }
  const mapped = Object.fromEntries(
    Object.entries(aliases).map(([name, values]) => [name, values.flatMap(parse)]),
  )
  const visit = (value) => {
    let list = value
    if (
      list[0]?.type === 'type' &&
      list[0].name === 'html' &&
      list[1]?.type === 'combinator' &&
      list[1].value === 'descendant' &&
      list[2]?.type === 'type' &&
      list[2].name === 'body'
    )
      list = list.slice(2)
    const out = []
    for (const original of list) {
      let node = structuredClone(original)
      if (node.selectors) node.selectors = node.selectors.map(visit)
      if (
        (node.type === 'type' && ['html', 'body'].includes(node.name)) ||
        (node.type === 'pseudo-class' && node.kind === 'root') ||
        (node.type === 'class' && node.name === 'geEditor')
      ) {
        node = { type: 'pseudo-class', kind: 'scope' }
        if (out.at(-1)?.type === 'pseudo-class' && out.at(-1).kind === 'scope') continue
      } else if (node.type === 'class' && mapped[node.name])
        node = { type: 'pseudo-class', kind: 'is', selectors: mapped[node.name] }
      out.push(node)
    }
    return out
  }
  const prefix = [{ type: 'pseudo-class', kind: 'scope' }, ...parse(owner)[0], ...parse(owner)[0], ...parse(owner)[0]]
  const output = compiler.transform({
    filename: 'selector.css',
    code: Buffer.from(selector + '{--frade-selector:0}'),
    minify: false,
    visitor: {
      Selector(value) {
        const adapted = visit(value)
        if (adapted[0]?.type === 'pseudo-class' && adapted[0].kind === 'scope')
          return [...prefix, ...adapted.slice(1)]
        const descendant = [...prefix, { type: 'combinator', value: 'descendant' }, ...adapted]
        return ['class', 'attribute', 'pseudo-class'].includes(adapted[0]?.type)
          ? [descendant, [...prefix, ...adapted]]
          : descendant
      },
    },
  }).code
  const parsed = parsers().postcss.parse(output)
  if (parsed.nodes.length !== 1 || parsed.first.type !== 'rule')
    throw Error('UPSTREAM_SELECTOR_AMBIGUOUS')
  return parsed.first.selector
}
export async function generateDrawioEditor({ base = root } = {}) {
  const { postcss, selectors } = parsers()
  const manifestBytes = await readFile(resolve(base, 'apps/desktop/vendor/drawio-manifest.json'))
  const manifest = JSON.parse(manifestBytes)
  if (manifest.version !== version) throw Error('UPSTREAM_VERSION_DRIFT')
  const inputs = [],
    sources = new Map()
  for (const [file, expected] of Object.entries(pins)) {
    const bytes = await readFile(resolve(base, vendor + file)),
      pin = manifest.assets.find((value) => value.path === file)
    const blob = createHash('sha1')
      .update(Buffer.from('blob ' + bytes.length + '\0'))
      .update(bytes)
      .digest('hex')
    if (hash(bytes) !== expected || !pin || pin.size !== bytes.length || pin.sha !== blob)
      throw Error('UPSTREAM_SOURCE_DRIFT: ' + file)
    inputs.push({ path: vendor + file, bytes: bytes.length, sha256: hash(bytes), gitBlob: blob })
    sources.set(file, postcss.parse(bytes.toString(), { from: file }))
  }
  const properties = {}
  sources.get('styles/grapheditor.css').walkRules(':root', (rule) =>
    rule.walkDecls((decl) => {
      if (!decl.prop.startsWith('--') || Object.hasOwn(properties, decl.prop))
        throw Error('UPSTREAM_PROPERTY_AMBIGUOUS')
      properties[decl.prop] = decl.value
    }),
  )
  const color = (name) => {
    const value = properties[name]
    if (!/^#[a-f\d]{6}$/i.test(value ?? '')) throw Error('UPSTREAM_COLOR_UNRESOLVED: ' + name)
    return value.toUpperCase()
  }
  const tokenPath = 'packages/ui-workspace/tokens/tokens.json',
    tokenBytes = await readFile(resolve(base, tokenPath))
  const canonical = JSON.parse(tokenBytes).themes.light
  inputs.push({
    path: tokenPath,
    sha256: hash(tokenBytes),
    purpose: 'Unchanged domain/Frade-only status roles without upstream counterpart',
  })
  const slots = {
    'surface.base': '--field-color',
    'surface.panel': '--ge-panel-color',
    'surface.rail': '--inactive-color',
    'surface.hover': '--highlight-color',
    'surface.overlay': '--dialog-color',
    'text.primary': '--text-color',
    'text.secondary': '--secondary-text-color',
    'text.disabled': '--faint-text-color',
    'border.subtle': '--border-color',
    'border.control': '--strong-text-color',
    'action.primary': '--primary-color',
    'action.primaryHover': '--primary-hover-color',
    'action.onPrimary': '--text-color',
    'selection.bg': '--selected-color',
    'selection.fg': '--text-color',
    'selection.indicator': '--focus-color',
    'focus.ring': '--focus-color',
    'status.error': '--error-color',
    'status.errorBg': '--error-background-color',
    'status.info': '--accent-text-color',
    'status.infoBg': '--accent-color',
    'diagram.canvas': '--field-color',
  }
  const colors = { ...canonical }
  const roleSources = {}
  for (const [role, property] of Object.entries(slots)) {
    colors[role] = color(property)
    roleSources[role] = { property, source: 'styles/grapheditor.css' }
  }
  for (const role of Object.keys(colors))
    if (!roleSources[role])
      roleSources[role] = {
        source: tokenPath,
        reason: role.startsWith('diagram.')
          ? 'DOMAIN_VISUALIZATION_PRESERVED'
          : 'FRADE_ONLY_SEMANTIC_STATUS_NO_UPSTREAM_COUNTERPART',
      }
  const appBytes = await readFile(resolve(base, vendor + 'js/app.min.js')),
    appPin = manifest.assets.find((value) => value.path === 'js/app.min.js')
  const appBlob = createHash('sha1')
    .update(Buffer.from('blob ' + appBytes.length + '\0'))
    .update(appBytes)
    .digest('hex')
  if (!appPin || appPin.size !== appBytes.length || appPin.sha !== appBlob)
    throw Error('UPSTREAM_GRID_SOURCE_DRIFT')
  const app = appBytes.toString(),
    grid = [...app.matchAll(/mxGraphView\.prototype\.defaultGridColor="(#[a-f\d]{6})"/gi)],
    steps = [...app.matchAll(/mxGraphView\.prototype\.gridSteps=(\d+)/g)]
  if (grid.length !== 1 || steps.length !== 1) throw Error('UPSTREAM_GRID_AMBIGUOUS')
  const gridStart = app.indexOf('mxGraphView.prototype.createSvgGrid=function'),
    gridEnd = app.indexOf(';var a=mxGraph.prototype.panGraph', gridStart)
  if (gridStart < 0 || gridEnd < gridStart) throw Error('UPSTREAM_GRID_METHOD_AMBIGUOUS')
  const gridMethod = app.slice(gridStart, gridEnd),
    gridPaint = [...gridMethod.matchAll(/opacity="([\d.]+)" stroke-width="([\d.]+)"/g)]
  if (gridPaint.length !== 1) throw Error('UPSTREAM_GRID_PAINT_AMBIGUOUS')
  colors['diagram.grid'] = grid[0][1].toUpperCase()
  roleSources['diagram.grid'] = {
    source: 'js/app.min.js',
    property: 'mxGraphView.prototype.defaultGridColor',
  }
  inputs.push({
    path: vendor + 'js/app.min.js',
    sha256: hash(appBytes),
    gitBlob: appBlob,
    purpose: 'Exact unique grid style constants only; no runtime execution',
  })
  const rules = [],
    exceptions = [],
    chunks = []
  const animationNames = new Map()
  for (const tree of sources.values())
    tree.walkAtRules(/keyframes$/, (rule) =>
      animationNames.set(rule.params, 'frade-drawio-' + rule.params),
    )
  for (const [file, original] of sources) {
    const tree = original.clone()
    tree.walkAtRules((rule) => {
      if (rule.name === 'import') throw Error('UPSTREAM_IMPORT_NOT_PINNED')
      if (/keyframes$/.test(rule.name)) {
        exceptions.push({
          file,
          animation: rule.params,
          adapted: animationNames.get(rule.params),
          reason: 'NAMESPACE_ANIMATION_TO_PREVENT_GLOBAL_LEAK',
        })
        rule.params = animationNames.get(rule.params)
      }
    })
    tree.walkDecls((decl) => {
      if (/^(?:-webkit-)?animation(?:-name)?$/.test(decl.prop)) {
        const compiled = selectors.transform({
          code: Buffer.from('x{' + decl.prop + ':' + decl.value + '}'),
          visitor: {
            CustomIdent(name) {
              return animationNames.get(name)
            },
          },
        }).code
        const next = postcss.parse(compiled).first.first.value
        exceptions.push({
          file,
          property: decl.prop,
          original: decl.value,
          adapted: next,
          reason: 'NAMESPACE_ANIMATION_REFERENCE',
        })
        decl.value = next
      }
      if (decl.value.includes('url(')) {
        selectors.transform({
          filename: 'resource.css',
          code: Buffer.from('x{' + decl.prop + ':' + decl.value + '}'),
          visitor: {
            Url(value) {
              if (!value.url.startsWith('data:'))
                throw Error('UPSTREAM_RESOURCE_NOT_EMBEDDED: ' + value.url)
            },
          },
        })
      }
    })
    tree.walkRules((rule) => {
      const selector = rule.selector
      if (rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) {
        rules.push({
          file,
          line: rule.source.start.line,
          original: selector,
          adapted: selector,
          purpose: 'KEYFRAME_STEP_PRESERVED_NOT_A_SELECTOR',
        })
        return
      }
      if (selector === '.geEditor')
        rule.walkDecls((decl) => {
          if (layout.has(decl.prop)) {
            exceptions.push({
              file,
              selector,
              property: decl.prop,
              value: decl.value,
              reason: 'PRESERVE_NATIVE_HOST_LAYOUT_NOT_ENGINE_REPLACEMENT',
            })
            decl.remove()
          }
        })
      rule.selector = rewrite(selector, selectors)
      rules.push({
        file,
        line: rule.source.start.line,
        original: selector,
        adapted: rule.selector,
        purpose:
          /geBtn|geDialog|mxPopupMenu|mxTooltip|geEditor|^:root|\bbutton\b|\binput\b|\bselect\b|\btextarea\b/.test(
            selector,
          )
            ? 'SCOPED_NATIVE_ALIAS_OR_UI_ROOT'
            : 'SCOPED_UPSTREAM_RULE_NO_INVENTED_NATIVE_FEATURE',
      })
    })
    const block =
      '@scope (' +
      owner +
      ') to (.canvas, .draw-host, iframe, svg) {\n' +
      tree.toString().replaceAll('\r\n', '\n') +
      '\n}\n'
    chunks.push(
      file === 'styles/high-contrast.css'
        ? '@media (forced-colors:active){\n' + block + '}\n'
        : block,
    )
  }
  const primary = sources.get('styles/grapheditor.css')
  let buttonHeight, fontSize, fontFamily
  primary.walkRules('.geBtn', (rule) =>
    rule.walkDecls('height', (decl) => {
      if (buttonHeight) throw Error('UPSTREAM_METRIC_AMBIGUOUS')
      buttonHeight = decl.value
    }),
  )
  primary.walkRules('.geEditor', (rule) =>
    rule.walkDecls((decl) => {
      if (decl.prop === 'font-size') fontSize = decl.value
      if (decl.prop === 'font-family') fontFamily = decl.value
    }),
  )
  if (!buttonHeight || !fontSize || !fontFamily) throw Error('UPSTREAM_METRIC_MISSING')
  const aaScope = ":scope[data-frade-editor='light'][data-frade-editor='light'][data-frade-editor='light']"
  const accessibility = `\n@scope (${owner}) to (.canvas, .draw-host, iframe, svg) {
    :scope { color-scheme: light; --frade-drawio-button-height:${buttonHeight}; }
    :scope :is(button,input,select,textarea,[role=menuitem]) { min-height:28px; }
    :scope :is(button,input,select,textarea):not(.geColorBtn):not(.geStyleBtn) { border-color:var(--strong-text-color)!important; }
    :scope :focus-visible { outline:2px solid var(--focus-color); outline-offset:2px; }
  }
  @media(pointer:coarse){@scope (${owner}) to (.canvas,.draw-host,iframe,svg){:scope :is(button,input,select,textarea,[role=menuitem]){min-width:44px;min-height:44px;}}}
  @media(forced-colors:active){@scope (${owner}) to (.canvas,.draw-host,iframe,svg){
    :scope,:scope * { forced-color-adjust:auto!important; }
    :scope { background:Canvas!important;color:CanvasText!important; }
    :scope :is(button,input,select,textarea,[role=dialog],[role=alertdialog],[role=menu],[role=menuitem],[role=tooltip]) {background:Canvas!important;color:CanvasText!important;border-color:CanvasText!important;}
    :scope :focus-visible{outline-color:Highlight!important;}
  }}\n`
  exceptions.push(
    { reason: 'FIXED_LIGHT_SCHEME_PRESERVES_WORKBENCH_SELECTION' },
    { reason: 'REQUIRED_ACCESSIBLE_TARGETS_28_NORMAL_44_COARSE' },
    { reason: 'REQUIRED_CONTROL_BORDER_CONTRAST_USES_UPSTREAM_STRONG_TEXT_COLOR' },
    { reason: 'REQUIRED_VISIBLE_FOCUS_2PX_USES_UPSTREAM_FOCUS_COLOR' },
    { reason: 'WINDOWS_SYSTEM_COLORS_OVERRIDE_UPSTREAM_FORCED_COLOR_SUPPRESSION' },
  )
  const header =
    '/* Derived from Draw.io v31.5.2, Apache-2.0; original vendor LICENSE retained. Generated; do not edit. */\n'
  const css = header + chunks.join('\n') + accessibility.replaceAll(':scope', aaScope)
  const data = {
    version,
    id: 'frade.editor/drawio-light',
    colors,
    properties,
    metrics: { buttonHeight, fontSize, fontFamily },
    grid: {
      color: colors['diagram.grid'],
      majorSteps: Number(steps[0][1]),
      minorOpacity: Number(gridPaint[0][1]),
      strokeWidth: Number(gridPaint[0][2]),
      methodSha256: hash(gridMethod),
    },
    exceptions,
  }
  const profileData = {
    version: '2.0.0',
    base: 'drawio/31.5.2/light',
    roles: { 'diagram.canvas': colors['diagram.canvas'], 'diagram.grid': colors['diagram.grid'] },
  }
  const ts =
    '// Generated from pinned Draw.io v31.5.2; Apache-2.0 vendor LICENSE retained.\nexport const drawioEditor = ' +
    JSON.stringify(data, null, 2) +
    ' as const\nexport const drawioEditorProfile = ' +
    JSON.stringify(profileData, null, 2) +
    ' as const\n'
  const profile = json(profileData)
  const output = { [cssPath]: css, [tsPath]: ts, [profilePath]: profile }
  const source = {
    version,
    inputs,
    sourceManifestSha256: hash(manifestBytes),
    aliases,
    root: owner,
    contentBoundary: ['.canvas', '.draw-host', 'iframe', 'svg'],
    rules,
    roleSources,
    exceptions,
    outputs: Object.entries(output).map(([path, value]) => ({ path, sha256: hash(value) })),
  }
  output[manifestPath] = json(source)
  return { output, source, data }
}
export async function checkDrawioEditor({ base = root } = {}) {
  try {
    const { output } = await generateDrawioEditor({ base }),
      errors = []
    for (const [file, expected] of Object.entries(output)) {
      try {
        if ((await readFile(resolve(base, file), 'utf8')) !== expected)
          errors.push('DRAWIO_OUTPUT_DRIFT: ' + file)
      } catch (error) {
        if (error.code === 'ENOENT') errors.push('DRAWIO_OUTPUT_MISSING: ' + file)
        else throw error
      }
    }
    return errors
  } catch (error) {
    return [error.message]
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv.includes('--write') ? 'write' : 'check'
  try {
    if (mode === 'write') {
      const { output, source } = await generateDrawioEditor()
      for (const [file, value] of Object.entries(output)) {
        const target = resolve(root, file)
        if (relative(root, target).startsWith('..')) throw Error('OUTPUT_OUTSIDE_ROOT')
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, value)
      }
      console.log(
        'Drawio ' +
          version +
          ': generated ' +
          Object.keys(output).length +
          ' artifacts from ' +
          source.rules.length +
          ' pinned scoped rules',
      )
    } else {
      const errors = await checkDrawioEditor()
      if (errors.length) throw Error(errors.join('\n'))
      console.log('Drawio ' + version + ': source closure and generated output PASS')
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
