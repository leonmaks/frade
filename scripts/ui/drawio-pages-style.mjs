import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

export const pageCssPath = 'packages/draw/src/editor/generated/drawio-pages.css'
export const pageTsPath = 'packages/draw/src/editor/generated/drawio-pages.ts'
const vendor = 'apps/desktop/vendor/drawio/'
const hash = (value) => createHash('sha256').update(value).digest('hex')
const relevant = (selector) =>
  selector.startsWith(':where(.geEditor ') ||
  selector.split(',').some((part) => part.trim() === '.geEditor') ||
  /\.ge(?:Tab|PageTab|ControlTab|ActivePage|Button\b|Btn\b|PrimaryBtn\b|Dialog\b|ZoomInput\b)|\.mxPopup|\.mxDisabled|^:root$|^\.geEditor(?:\s*\*)?$|^\.geEditor input/.test(
    selector,
  )

/** Bounded lower-level artifact of the SAME pinned adapter, usable without a workbench dependency. */
export async function generatePageStrip({
  base,
  manifest,
  sources,
  app,
  rewrite,
  layout,
  selectors,
}) {
  const inputs = [],
    rules = [],
    images = {},
    labels = {}
  async function resource(file) {
    const bytes = await readFile(resolve(base, vendor + file))
    const pin = manifest.assets.find((value) => value.path === file)
    const blob = createHash('sha1')
      .update('blob ' + bytes.length + '\0')
      .update(bytes)
      .digest('hex')
    if (!pin || pin.size !== bytes.length || pin.sha !== blob)
      throw Error('UPSTREAM_PAGE_RESOURCE_DRIFT: ' + file)
    inputs.push({
      path: vendor + file,
      bytes: bytes.length,
      sha256: hash(bytes),
      gitBlob: blob,
    })
    return bytes
  }
  for (const [name, constant] of Object.entries({
    insert: 'plusImage',
    menu: 'menuImage',
    options: 'thinExpandImage',
    left: 'chevronLeftImage',
    right: 'chevronRightImage',
    checked: 'checkmarkImage',
    submenu: 'arrowRightImage',
    close: 'crossImage',
  })) {
    const matches = [
      ...app.matchAll(new RegExp('Editor\\.' + constant + '="(data:image/[^"\\n]+)"', 'g')),
    ]
    if (matches.length !== 1) throw Error('UPSTREAM_PAGE_ICON_AMBIGUOUS: ' + constant)
    images[name] = matches[0][1]
  }
  images.github =
    'data:image/svg+xml;base64,' + (await resource('images/github-logo.svg')).toString('base64')
  const keys = [
    'page',
    'pageWithNumber',
    'copyOf',
    'insertPage',
    'pages',
    'duplicateIt',
    'removeIt',
    'renameIt',
    'move',
    'sortPages',
    'deleteAll',
    'openInNewWindow',
    'rename',
    'cancel',
    'options',
    'close',
  ]
  for (const [locale, file] of [
    ['en', 'resources/dia.txt'],
    ['ru', 'resources/dia_ru.txt'],
  ]) {
    const strings = new Map(
      (await resource(file))
        .toString()
        .split(/\r?\n/)
        .flatMap((line) => {
          const equals = line.indexOf('=')
          return equals < 0 ? [] : [[line.slice(0, equals), line.slice(equals + 1)]]
        }),
    )
    labels[locale] = Object.fromEntries(
      keys.map((key) => {
        const value = strings.get(key)
        if (!value) throw Error('UPSTREAM_PAGE_LABEL_MISSING: ' + key)
        return [key, value]
      }),
    )
  }
  const chunks = []
  for (const [file, source] of sources) {
    const tree = source.clone()
    tree.walkAtRules(/keyframes$/, (rule) => rule.remove())
    tree.walkRules((rule) => {
      if (!relevant(rule.selector)) {
        rule.remove()
        return
      }
      const original = rule.selector
      if (original === '.geEditor')
        rule.walkDecls((decl) => {
          if (layout.has(decl.prop)) decl.remove()
        })
      rule.selector = rewrite(original, selectors, {
        preserveSourceRoots: true,
      })
      rules.push({
        file,
        line: rule.source.start.line,
        original,
        adapted: rule.selector,
      })
    })
    tree.walkAtRules((rule) => {
      if (!rule.nodes?.length) rule.remove()
    })
    const block =
      '@scope ([data-frade-page-surface]) to (svg) {\n' +
      tree.toString().replaceAll('\r\n', '\n') +
      '\n}\n'
    chunks.push(
      file === 'styles/high-contrast.css'
        ? '@media(forced-colors:active){\n' + block + '}\n'
        : block,
    )
  }
  const root =
    ':scope[data-frade-editor="light"][data-frade-editor="light"][data-frade-editor="light"].geEditor'
  let stripHeight, tabFont, dialogPadding, backdrop, backdropFilter, backdropOpacity
  sources.get('styles/grapheditor.css').walkRules((rule) => {
    if (rule.selector === '.geTabContainer')
      rule.walkDecls('height', (decl) => {
        stripHeight = decl.value
      })
    if (rule.selector === '.geTab')
      rule.walkDecls('font-size', (decl) => {
        tabFont = decl.value
      })
    if (rule.selector === '.geDialog')
      rule.walkDecls('padding', (decl) => {
        dialogPadding = decl.value
      })
    if (rule.selector === '.geBackground')
      rule.walkDecls((decl) => {
        if (decl.prop === 'background-color') backdrop = decl.value
        if (decl.prop === 'backdrop-filter') backdropFilter = decl.value
        if (decl.prop === 'opacity') backdropOpacity = decl.value
      })
  })
  if (stripHeight !== '32px' || tabFont !== '13px') throw Error('UPSTREAM_PAGE_METRIC_DRIFT')
  const renameStart = app.indexOf('EditorUi.prototype.renamePage=function(')
  const rename = app
    .slice(renameStart, renameStart + 800)
    .match(/\.showDialog\(\w+\.container,(\d+),(\d+),!0,!0\)/)
  const filenameStart = app.indexOf('FilenameDialog=function('),
    header = app.slice(filenameStart, filenameStart + 1000)
  const filenameEnd = app.indexOf('FilenameDialog.filenameHelpLink=', filenameStart)
  const filename = app.slice(filenameStart, filenameEnd)
  const metric = (pattern) => {
    const found = [...header.matchAll(pattern)]
    if (found.length !== 1) throw Error('UPSTREAM_FILENAME_METRIC_AMBIGUOUS')
    return found[0][1]
  }
  const filenameGap = metric(/\.style\.gap="([^"]+)"/g),
    filenamePadding = metric(/\.style\.padding="(\d+px)"/g),
    labelFont = metric(/\.style\.fontSize="([^"]+)"/g)
  const actionPadding = filename.match(/\.style\.paddingTop=null!=\w+\?"\d+px":"(\d+px)"/)?.[1]
  if (
    renameStart < 0 ||
    filenameStart < 0 ||
    filenameEnd < filenameStart ||
    !rename ||
    rename[1] !== '300' ||
    rename[2] !== '80' ||
    dialogPadding !== '24px' ||
    filenameGap !== '5px 8px' ||
    filenamePadding !== '3px' ||
    labelFont !== '10pt' ||
    !backdrop ||
    !backdropFilter ||
    backdropOpacity !== '1' ||
    actionPadding !== '14px'
  )
    throw Error('UPSTREAM_RENAME_METRIC_DRIFT')
  rules.push(
    {
      file: 'js/app.min.js',
      offset: renameStart,
      original: rename[0],
      adapted: '--frade-pages-dialog-width / height',
      purpose: 'renamePage dialog content dimensions',
      width: rename[1],
      height: rename[2],
    },
    {
      file: 'js/app.min.js',
      offset: filenameStart,
      original: 'FilenameDialog source grid and label styles',
      adapted: '--frade-pages-filename-*',
      headerSha256: hash(header),
    },
  )
  const generated = [
    'color-scheme:light',
    '--frade-pages-strip-height:' + stripHeight,
    '--frade-pages-tab-font-size:' + tabFont,
    '--frade-pages-tab-font-rem:' + Number.parseFloat(tabFont) / 16 + 'rem',
    '--frade-pages-dialog-width:' + rename[1] + 'px',
    '--frade-pages-dialog-height:' + rename[2] + 'px',
    '--frade-pages-dialog-padding:' + dialogPadding,
    '--frade-pages-dialog-backdrop:' + backdrop,
    '--frade-pages-dialog-backdrop-filter:' + backdropFilter,
    '--frade-pages-dialog-backdrop-opacity:' + backdropOpacity,
    '--frade-pages-filename-gap:' + filenameGap,
    '--frade-pages-filename-padding:' + filenamePadding,
    '--frade-pages-filename-label-font:' + labelFont,
    '--frade-pages-filename-action-padding:' + actionPadding,
    ...Object.entries(images).map(
      ([name, url]) => '--frade-pages-' + name + '-image:url("' + url + '")',
    ),
  ].join(';')
  const css =
    '/* Generated from pinned Draw.io 31.5.2 by the shared adapter; Apache-2.0 LICENSE retained. */\n' +
    chunks.join('\n') +
    '\n@scope ([data-frade-page-surface]){' +
    root +
    '{' +
    generated +
    ';}}\n'
  return {
    inputs,
    rules,
    output: {
      [pageCssPath]: css,
      [pageTsPath]:
        '// Generated from pinned Draw.io 31.5.2 resources; do not edit.\nexport const pageLabels = ' +
        JSON.stringify(labels, null, 2) +
        ' as const\n',
    },
  }
}
