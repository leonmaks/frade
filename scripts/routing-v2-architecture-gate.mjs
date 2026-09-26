import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = process.cwd()
const requireDraw = createRequire(path.join(ROOT, 'packages/draw/package.json'))
const ts = requireDraw('typescript')
const CURRENT = 'docs/routing-v2/CURRENT_CHANGE.md'
const MASTER = 'docs/routing-v2/drawio-routing-master-spec.md'
const PLAYBOOK = 'docs/routing-v2/implementation-playbook.md'
const SCRIPT = 'scripts/routing-v2-architecture-gate.mjs'
const LEGACY_DOC = 'docs/routing-v2/legacy-boundary.md'
const R01 = 'routing-v2-01-geometry-kernel'
const ROUTING = 'packages/draw/src/routing/'
const V2_TESTS = 'packages/draw/tests/routing-v2/'
const R01_IMPLEMENTATION = [ROUTING + 'model/**', ROUTING + 'geometry/**', V2_TESTS + 'geometry/**']
const R01_CONTROL = ['openspec/changes/' + R01 + '/**', CURRENT, MASTER, PLAYBOOK, SCRIPT]
const CORE = new Set([
  'model',
  'geometry',
  'terminal',
  'orthogonal',
  'segment',
  'loop',
  'normalization',
  'validation',
  'interaction',
])
const SOURCE = /\.(?:[cm]?[jt]sx?)$/
const FRAMEWORK = /^(?:react|react-dom|@antv\/x6|electron)(?:\/|$)/
const BROWSER = new Set([
  'window',
  'document',
  'devicePixelRatio',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'navigator',
  'screen',
  'localStorage',
  'sessionStorage',
  'getComputedStyle',
  'DOMPoint',
  'DOMMatrix',
  'HTMLElement',
  'SVGElement',
])
const normalize = (value) => value.replaceAll('\\', '/')
const relative = (file) => normalize(path.relative(ROOT, file))
const inScope = (file, scope) =>
  scope.some((entry) =>
    entry.endsWith('/**') ? file.startsWith(entry.slice(0, -2)) : file === entry,
  )
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

function field(content, name) {
  return new RegExp('^' + name + ':[ \\t]*(.+?)[ \\t]*$', 'm').exec(content)?.[1].trim()
}

function section(content, name) {
  const heading = new RegExp('^## ' + name + '[^\\n]*\\n([\\s\\S]*?)(?=^## |$(?![\\s\\S]))', 'm')
  const body = heading.exec(content)?.[1] ?? ''
  return [...body.matchAll(/^(?:packages|openspec|docs|scripts)\/[^\s`]+$/gm)].map((match) =>
    match[0].trim(),
  )
}

function readCurrentChange() {
  const content = read(CURRENT)
  const activeChange = field(content, 'ACTIVE_CHANGE') ?? 'UNKNOWN'
  return {
    activeChange,
    phase: field(content, 'PHASE'),
    baseCommit: field(content, 'BASE_COMMIT'),
    sequence: field(content, 'SEQUENCE_POSITION'),
    nextAllowed: field(content, 'NEXT_CHANGE_ALLOWED'),
    previousGate: field(content, 'PREVIOUS_GATE'),
    number: Number(/^routing-v2-(\d{2})-/.exec(activeChange)?.[1]) || null,
    implementation: section(content, 'IMPLEMENTATION_SCOPE'),
    control: section(content, 'PROCESS_CONTROL_SCOPE'),
  }
}

function protectedPaths() {
  // The maintained boundary document, rather than a filename substring, owns quarantine.
  const content = read(LEGACY_DOC)
  const algorithmSection =
    content
      .split('## 1. Protected legacy routing algorithms')[1]
      ?.split('## 2. Existing integration boundary')[0] ?? ''
  const paths = (text) =>
    [...text.matchAll(/^packages\/[^\s]+\.(?:ts|tsx)$/gm)].map((match) => match[0].trim())
  return { algorithms: new Set(paths(algorithmSection)), all: new Set(paths(content)) }
}

export function changedFiles(baseCommit, gitRoot = ROOT) {
  if (!/^[0-9a-f]{7,40}$/i.test(baseCommit ?? '')) {
    throw new Error('BASE_COMMIT must be a resolvable Git SHA; an absent baseline cannot pass')
  }
  const git = (args) =>
    execFileSync('git', args, {
      cwd: gitRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .split('\0')
      .filter(Boolean)
      .map(normalize)
  // Includes committed-since-baseline, staged, unstaged, deleted and untracked files.
  return [
    ...new Set([
      ...git(['diff', '--no-renames', '--name-only', '-z', baseCommit, '--']),
      ...git(['ls-files', '--others', '--exclude-standard', '-z']),
    ]),
  ].sort()
}

export function scopeFindings(current, files, boundary) {
  const findings = []
  const fail = (file, reason) => findings.push({ file, reason })
  if (!current.number || current.number > 10) fail(CURRENT, 'Unrecognized active Routing V2 change')
  if (current.activeChange === R01) {
    for (const [name, actual, expected] of [
      ['IMPLEMENTATION_SCOPE', current.implementation, R01_IMPLEMENTATION],
      ['PROCESS_CONTROL_SCOPE', current.control, R01_CONTROL],
    ]) {
      if (JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())) {
        fail(CURRENT, name + ' differs from the exact authorized R01 scope')
      }
    }
    if (
      current.sequence !== 'R01_OF_10' ||
      current.nextAllowed !== 'false' ||
      current.previousGate !== 'BOOTSTRAP PASS'
    ) {
      fail(CURRENT, 'R01 sequence/previous-gate/next-change control fields are inconsistent')
    }
    if (!['PLANNING', 'IMPLEMENTATION', 'VERIFICATION'].includes(current.phase)) {
      fail(CURRENT, 'Unrecognized R01 phase')
    }
    for (const file of files) {
      if (inScope(file, R01_CONTROL)) {
        if ([MASTER, PLAYBOOK, SCRIPT].includes(file) && current.phase !== 'PLANNING') {
          fail(
            file,
            'Master/gate repair is PLANNING process work, not a product implementation task',
          )
        }
      } else if (inScope(file, R01_IMPLEMENTATION)) {
        if (current.phase === 'PLANNING')
          fail(file, 'Product implementation changed before PRE_IMPLEMENTATION PASS')
      } else {
        fail(file, 'Changed file is outside R01 implementation and process/control scopes')
      }
    }
  }
  for (const file of files) {
    if (file.startsWith('apps/desktop/vendor/drawio/')) {
      fail(file, 'Vendored draw.io reference modified')
    }
    if (boundary.algorithms.has(file) || (current.number <= 9 && boundary.all.has(file))) {
      fail(file, 'Protected legacy algorithm/integration boundary modified')
    }
  }
  return findings
}

function coreLayer(file) {
  return file.startsWith(ROUTING) ? file.slice(ROUTING.length).split('/')[0] : null
}

function dependencyCategory(importer, specifier, boundary, tests = false) {
  if (FRAMEWORK.test(specifier)) return { forbidden: 'Framework dependency: ' + specifier }
  if (!specifier.startsWith('.')) {
    return { forbidden: 'Non-local dependency outside pure V2 core: ' + specifier }
  }
  let target = path.resolve(ROOT, path.dirname(importer), specifier)
  const candidates = [
    target,
    ...['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs'].map((ext) => target + ext),
    path.join(target, 'index.ts'),
    path.join(target, 'index.js'),
  ]
  if (/\.[cm]?js$/.test(target)) candidates.push(target.replace(/\.[cm]?js$/, '.ts'))
  const existing = candidates.find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  )
  if (existing) target = fs.realpathSync(existing)
  let rel = relative(target)
  if (tests && (rel.startsWith(V2_TESTS) || rel === SCRIPT)) {
    return { target: rel, layer: 'test/process tooling' }
  }
  // Canonicalize extensionless/JS import spelling for boundary matching.
  const canonical = rel.replace(/\.(?:[cm]?js|tsx?|mts|cts)$/, '')
  if ([...boundary.all].some((entry) => entry.replace(/\.tsx?$/, '') === canonical)) {
    return { forbidden: 'Protected legacy/integration dependency: ' + rel }
  }
  if (
    rel.startsWith('packages/draw/src/geometry/') ||
    (rel.startsWith(ROUTING) && !CORE.has(coreLayer(rel)))
  ) {
    return { forbidden: 'Legacy geometry, top-level routing or adapter dependency: ' + rel }
  }
  if (!CORE.has(coreLayer(rel))) {
    return { forbidden: 'Dependency outside V2 domain: ' + rel }
  }
  return { target: rel, layer: coreLayer(rel) }
}

export function inspectSource(
  file,
  content,
  current,
  boundary,
  { core = true, tests = false } = {},
) {
  const findings = []
  const ast = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true)
  const fail = (node, reason) =>
    findings.push({
      file,
      line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1,
      reason,
    })
  const testNames = new Set(['test', 'it', 'describe'])
  for (const statement of ast.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      statement.importClause?.namedBindings &&
      ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      for (const binding of statement.importClause.namedBindings.elements) {
        if (testNames.has(binding.propertyName?.text ?? binding.name.text))
          testNames.add(binding.name.text)
      }
    }
  }
  function checkImport(node, expression) {
    if (!expression || !ts.isStringLiteralLike(expression)) {
      fail(node, 'Non-literal module reference cannot prove V2 isolation')
      return
    }
    const dependency = dependencyCategory(file, expression.text, boundary, tests)
    // Product tests can use Vitest/Node tooling, but cannot construct legacy domain values.
    if (
      !core &&
      !expression.text.startsWith('.') &&
      !/^(?:@frade\/draw|frade-draw)(?:\/|$)/.test(expression.text)
    )
      return
    if (dependency.forbidden) {
      fail(node, dependency.forbidden)
      return
    }
    if (core && current.number === 1 && !['model', 'geometry'].includes(dependency.layer)) {
      fail(node, 'R01 depends on a later V2 layer: ' + dependency.layer)
    }
    if (core && coreLayer(file) === 'model' && dependency.layer !== 'model') {
      fail(node, 'Model depends on geometry/higher layer')
    }
  }
  function access(node) {
    if (ts.isPropertyAccessExpression(node)) return [node.expression, node.name.text]
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
      return [node.expression, node.argumentExpression.text]
    }
    return null
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier) checkImport(node, node.moduleSpecifier)
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      checkImport(node, node.moduleReference.expression)
    } else if (ts.isImportTypeNode(node)) {
      checkImport(node, ts.isLiteralTypeNode(node.argument) ? node.argument.literal : node.argument)
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      checkImport(node, node.arguments[0])
    }
    if (core && ts.isIdentifier(node) && BROWSER.has(node.text)) {
      fail(node, 'Browser/display global in V2 core: ' + node.text)
    }
    const member = access(node)
    if (member) {
      const [owner, name] = member
      const ownerName = ts.isIdentifier(owner) ? owner.text : owner.getText(ast)
      if (
        core &&
        ((name === 'random' && /(?:^|\.)Math$/.test(ownerName)) ||
          (name === 'now' && /(?:^|\.)(?:Date|performance)$/.test(ownerName)))
      ) {
        fail(node, 'Nondeterministic runtime dependency: ' + ownerName + '.' + name)
      }
      if (tests && ['skip', 'only'].includes(name)) {
        // Includes .skip.each and computed access; Vitest import aliases are recognized.
        const chain = owner.getText(ast)
        if (
          [...testNames].some(
            (testName) => chain === testName || chain.startsWith(testName + '.'),
          ) ||
          /(?:^|\.)(?:test|it|describe)$/.test(chain)
        ) {
          fail(node, 'Skipped/focused routing test: ' + name)
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  // Scan actual comments only, avoiding false positives in fixture strings.
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    content,
  )
  let token
  while ((token = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
    if (
      [ts.SyntaxKind.SingleLineCommentTrivia, ts.SyntaxKind.MultiLineCommentTrivia].includes(
        token,
      ) &&
      /@ts-(?:ignore|nocheck)\b/.test(scanner.getTokenText())
    ) {
      findings.push({
        file,
        line: ast.getLineAndCharacterOfPosition(scanner.getTokenPos()).line + 1,
        reason: 'TypeScript suppression directive in routing source/test',
      })
    }
  }
  return findings
}

function walk(directory, visitor) {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'dist', 'build', 'coverage', '.git'].includes(entry.name)) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isSymbolicLink()) throw new Error('Symlink in scanned V2 tree: ' + relative(absolute))
    if (entry.isDirectory()) walk(absolute, visitor)
    else if (SOURCE.test(entry.name)) visitor(relative(absolute))
  }
}

function main() {
  const findings = []
  let current
  try {
    for (const file of [
      MASTER,
      PLAYBOOK,
      CURRENT,
      LEGACY_DOC,
      'docs/routing-v2/implementation-playbook.md',
    ]) {
      if (!fs.existsSync(path.join(ROOT, file)))
        throw new Error('Required control file missing: ' + file)
    }
    current = readCurrentChange()
    const boundary = protectedPaths()
    if (boundary.algorithms.size === 0)
      throw new Error('Protected legacy boundary could not be parsed')
    const files = changedFiles(current.baseCommit)
    findings.push(...scopeFindings(current, files, boundary))
    const checked = new Set()
    const inspect = (file, core, tests) => {
      if (checked.has(file)) return
      checked.add(file)
      findings.push(...inspectSource(file, read(file), current, boundary, { core, tests }))
    }
    walk(path.join(ROOT, ROUTING), (file) => {
      if (CORE.has(coreLayer(file))) inspect(file, true, false)
    })
    walk(path.join(ROOT, V2_TESTS), (file) => inspect(file, false, true))
    for (const file of files) {
      if (!SOURCE.test(file) || !fs.existsSync(path.join(ROOT, file))) continue
      const tests = /(?:^|\/)tests\//.test(file)
      if (tests || file.startsWith('packages/draw/src/')) inspect(file, false, tests)
    }
    console.log('ACTIVE_CHANGE: ' + current.activeChange)
    console.log('PHASE: ' + current.phase)
    console.log('CHANGED_FILES_CHECKED: ' + files.length)
    console.log('V2_SOURCE_TEST_FILES_CHECKED: ' + checked.size)
  } catch (error) {
    findings.push({ file: CURRENT, reason: String(error) })
  }
  for (const finding of findings) {
    console.error(
      'FAIL ' + finding.file + (finding.line ? ':' + finding.line : '') + ' — ' + finding.reason,
    )
  }
  console.log('GATE_STATUS: ' + (findings.length ? 'FAIL' : 'PASS'))
  if (findings.length) process.exitCode = 1
}

function selfTest() {
  const boundary = protectedPaths()
  const current = { ...readCurrentChange(), phase: 'PLANNING' }
  const geometry = ROUTING + 'geometry/fixture.ts'
  let count = 0
  const check = (label, value) => {
    assert.ok(value, label)
    count++
  }
  check(
    'control repairs allowed',
    scopeFindings(
      current,
      R01_CONTROL.filter((x) => !x.endsWith('/**')).concat(
        'openspec/changes/' + R01 + '/proposal.md',
      ),
      boundary,
    ).length === 0,
  )
  for (const file of [
    ROUTING + 'terminal/fixture.ts',
    'packages/draw/src/index.ts',
    V2_TESTS + 'other/fixture.test.ts',
    'apps/desktop/vendor/drawio/new.js',
    ...boundary.algorithms,
  ])
    check('reject scope/protection: ' + file, scopeFindings(current, [file], boundary).length > 0)
  check(
    'planning rejects premature product code',
    scopeFindings(current, [geometry], boundary).length > 0,
  )
  const implementing = { ...current, phase: 'IMPLEMENTATION' }
  check(
    'implementation permits exact R01 trees',
    scopeFindings(
      implementing,
      [geometry, ROUTING + 'model/Point.ts', V2_TESTS + 'geometry/fixture.test.ts'],
      boundary,
    ).length === 0,
  )
  check(
    'implementation cannot rewrite gate',
    scopeFindings(implementing, [SCRIPT], boundary).length > 0,
  )
  check(
    'implementation cannot rewrite planning playbook',
    scopeFindings(implementing, [PLAYBOOK], boundary).length > 0,
  )
  for (const legacy of boundary.all) {
    const specifier = normalize(path.relative(path.dirname(geometry), legacy)).replace(
      /\.tsx?$/,
      '',
    )
    check(
      'resolved legacy import: ' + legacy,
      inspectSource(geometry, 'import type { X } from "' + specifier + '";', current, boundary)
        .length > 0,
    )
  }
  for (const content of [
    'import "react";',
    'export { X } from "react-dom";',
    'const x = import("@antv/x6");',
    'const x = require("electron");',
    'type X = import("react").X;',
    'const x = window;',
    'document.querySelector("x");',
    'devicePixelRatio;',
    'requestAnimationFrame(() => {});',
    'performance.now();',
    'Math["random"]();',
    'Date.now();',
    'import { X } from "../terminal/new";',
    '// @ts-ignore\nconst x = 1;',
    '// @ts-nocheck\nconst x = 1;',
  ])
    check(
      'reject core rule: ' + content,
      inspectSource(geometry, content, current, boundary).length > 0,
    )
  check(
    'model cannot import geometry',
    inspectSource(
      ROUTING + 'model/Point.ts',
      'import { X } from "../geometry/x";',
      current,
      boundary,
    ).length > 0,
  )
  check(
    'geometry can import model',
    inspectSource(geometry, 'import type { Point } from "../model/Point";', current, boundary)
      .length === 0,
  )
  for (const content of [
    'test.skip("x", () => {});',
    'it.only("x", () => {});',
    'describe.skip.each([])("x", () => {});',
    'test["only"]("x", () => {});',
    'import { test as t } from "vitest"; t.skip("x", () => {});',
    '// @ts-nocheck\nconst x = 1;',
  ])
    check(
      'reject test rule: ' + content,
      inspectSource(V2_TESTS + 'geometry/fixture.test.ts', content, current, boundary, {
        core: false,
        tests: true,
      }).length > 0,
    )
  check(
    'comments/fixture strings are not imports or globals',
    inspectSource(
      geometry,
      '// import "react"; window\nconst message = "Math.random()";',
      current,
      boundary,
    ).length === 0,
  )
  check(
    'test-local helper import is allowed',
    inspectSource(
      V2_TESTS + 'geometry/fixture.test.ts',
      'import { seed } from "./seed";',
      current,
      boundary,
      { core: false, tests: true },
    ).length === 0,
  )
  check(
    'product fixture may exercise installed process checker',
    inspectSource(
      V2_TESTS + 'geometry/fixture.test.ts',
      'import { inspectSource } from "../../../../../scripts/routing-v2-architecture-gate.mjs";',
      current,
      boundary,
      { core: false, tests: true },
    ).length === 0,
  )
  // Exercise real Git discovery in a separate temporary repository, not product trees.
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'frade-process-gate-'))
  try {
    const git = (args) =>
      execFileSync('git', args, {
        cwd: temporaryRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    git(['init', '--quiet'])
    fs.writeFileSync(path.join(temporaryRoot, 'baseline.txt'), 'baseline\n')
    fs.writeFileSync(path.join(temporaryRoot, 'removed.txt'), 'temporary fixture\n')
    git(['add', '--', 'baseline.txt', 'removed.txt'])
    git([
      '-c',
      'user.name=Gate Self Test',
      '-c',
      'user.email=gate-self-test@example.invalid',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--quiet',
      '-m',
      'process-test baseline',
    ])
    const base = git(['rev-parse', 'HEAD']).trim()
    fs.writeFileSync(path.join(temporaryRoot, 'staged.txt'), 'staged fixture\n')
    git(['add', '--', 'staged.txt'])
    fs.writeFileSync(path.join(temporaryRoot, 'baseline.txt'), 'unstaged fixture\n')
    fs.writeFileSync(path.join(temporaryRoot, 'untracked with spaces.ts'), 'export {}\n')
    fs.unlinkSync(path.join(temporaryRoot, 'removed.txt'))
    check(
      'Git tracks staged, unstaged, deleted and untracked paths',
      JSON.stringify(changedFiles(base, temporaryRoot)) ===
        JSON.stringify(['baseline.txt', 'removed.txt', 'staged.txt', 'untracked with spaces.ts']),
    )
    assert.throws(() => changedFiles('NONE', temporaryRoot))
    count++
  } finally {
    const resolved = path.resolve(temporaryRoot)
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()))
    assert.ok(path.basename(resolved).startsWith('frade-process-gate-'))
    fs.rmSync(resolved, { recursive: true, force: true })
  }
  console.log('PROCESS_GATE_SELF_TESTS: PASS (' + count + ' assertions)')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--self-test')) selfTest()
  else main()
}
