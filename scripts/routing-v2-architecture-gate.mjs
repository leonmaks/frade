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
const R02 = 'routing-v2-02-terminal-perimeter'
const R02_BASE = 'd6579321d13e5c423eb1f1523b1d4ce35bcae583'
const ROUTING = 'packages/draw/src/routing/'
const V2_TESTS = 'packages/draw/tests/routing-v2/'
const R01_IMPLEMENTATION = [ROUTING + 'model/**', ROUTING + 'geometry/**', V2_TESTS + 'geometry/**']
const R01_CONTROL = ['openspec/changes/' + R01 + '/**', CURRENT, MASTER, PLAYBOOK, SCRIPT]
const R02_IMPLEMENTATION = [
  ROUTING + 'terminal/**',
  ROUTING + 'perimeter/**',
  V2_TESTS + 'terminal/**',
  V2_TESTS + 'perimeter/**',
]
const R02_CONTROL = ['openspec/changes/' + R02 + '/**', CURRENT, SCRIPT]
const CORE = new Set([
  'model',
  'geometry',
  'terminal',
  'perimeter',
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
const canonicalText = (text) => text.replaceAll('\r\n', '\n')

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
    previousChange: field(content, 'PREVIOUS_CHANGE'),
    previousStatus: field(content, 'PREVIOUS_CHANGE_STATUS'),
    previousArchived: field(content, 'PREVIOUS_CHANGE_ARCHIVED'),
    previousPostGate: field(content, 'PREVIOUS_CHANGE_POST_IMPLEMENTATION_GATE'),
    planningCommit: field(content, 'APPROVED_PLANNING_COMMIT'),
    preImplementationGate: field(content, 'PRE_IMPLEMENTATION_GATE'),
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
  if (current.activeChange === R02) {
    for (const [name, actual, expected] of [
      ['IMPLEMENTATION_SCOPE', current.implementation, R02_IMPLEMENTATION],
      ['PROCESS_CONTROL_SCOPE', current.control, R02_CONTROL],
    ]) {
      if (JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort()))
        fail(CURRENT, name + ' differs from the exact authorized R02 scope')
    }
    if (
      current.sequence !== 'R02_OF_10' ||
      current.nextAllowed !== 'false' ||
      (current.phase === 'PLANNING'
        ? current.baseCommit !== R02_BASE
        : !/^[0-9a-f]{40}$/i.test(current.planningCommit ?? '') ||
          current.baseCommit !== current.planningCommit) ||
      current.previousChange !== R01 ||
      current.previousStatus !== 'CLOSED' ||
      current.previousArchived !== 'true' ||
      current.previousPostGate !== 'PASS'
    )
      fail(CURRENT, 'R02 baseline/previous-change/sequence/next-change fields are inconsistent')
    if (!['PLANNING', 'IMPLEMENTATION', 'VERIFICATION'].includes(current.phase))
      fail(CURRENT, 'Unrecognized R02 phase')
    if (
      current.phase !== 'PLANNING' &&
      (current.preImplementationGate !== 'PASS' || !current.frozenGateVerified)
    )
      fail(
        CURRENT,
        'Implementation requires PRE_IMPLEMENTATION PASS and a verified approved planning gate',
      )
    for (const file of files) {
      if (inScope(file, R02_IMPLEMENTATION)) {
        if (current.phase === 'PLANNING')
          fail(file, 'R02 product code/tests changed during PLANNING')
      } else if (inScope(file, R02_CONTROL)) {
        if (file === SCRIPT && current.phase !== 'PLANNING' && !current.frozenGateVerified)
          fail(file, 'Architecture gate differs from the approved planning commit')
      } else if (
        inScope(file, R01_IMPLEMENTATION) ||
        file.startsWith('openspec/changes/archive/') ||
        file.startsWith('openspec/specs/routing-geometry-kernel/')
      ) {
        fail(file, 'Archived R01 is read-only; R01_EXTENSION_REQUIRED')
      } else fail(file, 'Changed file is outside R02 implementation and process/control scopes')
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
  { core = true, tests = false, dependencies = [] } = {},
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
    if (tests && current.number === 2 && FRAMEWORK.test(expression.text)) {
      fail(node, 'Framework dependency in R02 tests: ' + expression.text)
      return
    }
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
    if (core && dependency.target) dependencies.push(dependency.target)
    if (core && current.number === 1 && !['model', 'geometry'].includes(dependency.layer)) {
      fail(node, 'R01 depends on a later V2 layer: ' + dependency.layer)
    }
    if (core && current.number === 2) {
      const allowed = {
        model: ['model'],
        geometry: ['model', 'geometry'],
        perimeter: ['model', 'geometry', 'perimeter'],
        terminal: ['model', 'geometry', 'perimeter', 'terminal'],
      }[coreLayer(file)]
      if (!allowed || !allowed.includes(dependency.layer))
        fail(
          node,
          'R02 dependency direction violation: ' + coreLayer(file) + ' -> ' + dependency.layer,
        )
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

export function verifyFrozenGate(current, gitRoot = ROOT) {
  if (current.baseCommit !== current.planningCommit)
    throw new Error('R02 BASE_COMMIT must equal APPROVED_PLANNING_COMMIT during implementation')
  if (!/^[0-9a-f]{40}$/i.test(current.planningCommit ?? ''))
    throw new Error('APPROVED_PLANNING_COMMIT must pin the frozen R02 planning gate')
  const git = (args) =>
    execFileSync('git', args, { cwd: gitRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  git(['merge-base', '--is-ancestor', current.planningCommit, 'HEAD'])
  const approved = git(['show', current.planningCommit + ':' + CURRENT])
  if (
    field(approved, 'ACTIVE_CHANGE') !== R02 ||
    field(approved, 'PHASE') !== 'PLANNING' ||
    field(approved, 'BASE_COMMIT') !== R02_BASE
  )
    throw new Error('Approved planning commit is not the R02 planning checkpoint')
  const frozen = git(['show', current.planningCommit + ':' + SCRIPT])
  return (
    canonicalText(frozen) === canonicalText(fs.readFileSync(path.join(gitRoot, SCRIPT), 'utf8'))
  )
}
export function cycleFindings(graph) {
  const findings = [],
    visiting = new Set(),
    visited = new Set(),
    stack = []
  function visit(file) {
    if (visiting.has(file)) {
      findings.push({
        file,
        reason:
          'Circular V2 dependency: ' + [...stack.slice(stack.indexOf(file)), file].join(' -> '),
      })
      return
    }
    if (visited.has(file)) return
    visiting.add(file)
    stack.push(file)
    for (const target of graph.get(file) ?? []) if (graph.has(target)) visit(target)
    stack.pop()
    visiting.delete(file)
    visited.add(file)
  }
  for (const file of [...graph.keys()].sort()) visit(file)
  return findings
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
    if (current.activeChange === R02 && current.phase !== 'PLANNING')
      current.frozenGateVerified = verifyFrozenGate(current)
    const boundary = protectedPaths()
    if (boundary.algorithms.size === 0)
      throw new Error('Protected legacy boundary could not be parsed')
    const files = changedFiles(current.baseCommit)
    findings.push(...scopeFindings(current, files, boundary))
    const checked = new Set()
    const graph = new Map()
    const inspect = (file, core, tests) => {
      if (checked.has(file)) return
      checked.add(file)
      const dependencies = []
      findings.push(
        ...inspectSource(file, read(file), current, boundary, { core, tests, dependencies }),
      )
      if (core) graph.set(file, dependencies)
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
    findings.push(...cycleFindings(graph))
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
  const current = {
    ...readCurrentChange(),
    activeChange: R01,
    number: 1,
    phase: 'PLANNING',
    sequence: 'R01_OF_10',
    nextAllowed: 'false',
    previousGate: 'BOOTSTRAP PASS',
    implementation: R01_IMPLEMENTATION,
    control: R01_CONTROL,
  }
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
  check(
    'freeze tolerates Git CRLF checkout only',
    canonicalText('x\r\ny\r\n') === canonicalText('x\ny\n'),
  )
  check(
    'freeze rejects actual content edits',
    canonicalText('x\r\ny\r\n') !== canonicalText('x\ny-edited\n'),
  )
  const r02 = {
    ...current,
    activeChange: R02,
    number: 2,
    sequence: 'R02_OF_10',
    baseCommit: R02_BASE,
    previousChange: R01,
    previousStatus: 'CLOSED',
    previousArchived: 'true',
    previousPostGate: 'PASS',
    implementation: R02_IMPLEMENTATION,
    control: R02_CONTROL,
  }
  const r02Impl = {
    ...r02,
    phase: 'IMPLEMENTATION',
    baseCommit: 'a'.repeat(40),
    planningCommit: 'a'.repeat(40),
    preImplementationGate: 'PASS',
    frozenGateVerified: true,
  }
  const terminal = ROUTING + 'terminal/fixture.ts'
  const perimeter = ROUTING + 'perimeter/fixture.ts'
  check(
    'R02 planning permits authorized process repairs',
    scopeFindings(r02, [SCRIPT, CURRENT, 'openspec/changes/' + R02 + '/design.md'], boundary)
      .length === 0,
  )
  check(
    'R02 implementation permits all four trees',
    scopeFindings(
      r02Impl,
      [
        terminal,
        perimeter,
        V2_TESTS + 'terminal/unit/x.test.ts',
        V2_TESTS + 'perimeter/unit/x.test.ts',
      ],
      boundary,
    ).length === 0,
  )
  check(
    'R02 approved gate remains allowed in baseline diff',
    scopeFindings(r02Impl, [SCRIPT], boundary).length === 0,
  )
  check(
    'R02 edited frozen gate is rejected',
    scopeFindings({ ...r02Impl, frozenGateVerified: false }, [SCRIPT], boundary).length > 0,
  )
  check(
    'R02 missing pre-gate cannot implement',
    scopeFindings({ ...r02Impl, preImplementationGate: 'FAIL' }, [terminal], boundary).length > 0,
  )
  for (const file of [
    terminal,
    perimeter,
    V2_TESTS + 'terminal/unit/x.test.ts',
    V2_TESTS + 'perimeter/unit/x.test.ts',
  ])
    check('R02 planning rejects product ' + file, scopeFindings(r02, [file], boundary).length > 0)
  for (const file of [
    geometry,
    ROUTING + 'model/x.ts',
    V2_TESTS + 'geometry/x.test.ts',
    MASTER,
    PLAYBOOK,
    'AGENTS.md',
    ROUTING + 'AGENTS.md',
    LEGACY_DOC,
    'packages/draw/src/index.ts',
    ROUTING + 'orthogonal/x.ts',
    'openspec/specs/routing-geometry-kernel/spec.md',
    'openspec/changes/archive/2026-09-27-' + R01 + '/tasks.md',
  ])
    check(
      'R02 rejects frozen/outside path ' + file,
      scopeFindings(r02Impl, [file], boundary).length > 0,
    )
  check(
    'R02 exact scope cannot be broadened',
    scopeFindings(
      { ...r02Impl, implementation: [...R02_IMPLEMENTATION, ROUTING + 'geometry/**'] },
      [],
      boundary,
    ).length > 0,
  )
  check(
    'R02 implementation rejects old R01 baseline',
    scopeFindings({ ...r02Impl, baseCommit: R02_BASE }, [], boundary).length > 0,
  )
  check(
    'R02 planning still uses closed R01 baseline',
    scopeFindings(r02, [], boundary).length === 0,
  )
  check(
    'R02 baseline cannot drift',
    scopeFindings({ ...r02Impl, baseCommit: '1234567' }, [], boundary).length > 0,
  )
  for (const [file, source, allowed] of [
    [terminal, 'import type { Point } from "../model";', true],
    [terminal, 'import { EPSILON } from "../geometry";', true],
    [terminal, 'import { X } from "../perimeter/x";', true],
    [perimeter, 'import { EPSILON } from "../geometry";', true],
    [perimeter, 'import type { Rect } from "../model";', true],
    [perimeter, 'import { X } from "../terminal/x";', false],
    [geometry, 'import { X } from "../perimeter/x";', false],
    [geometry, 'import { X } from "../terminal/x";', false],
    [terminal, 'import { X } from "../orthogonal/x";', false],
    [terminal, 'import { X } from "../floatingAttachment";', false],
    [terminal, 'import { X } from "../../document/schema";', false],
    [terminal, 'import { X } from "../../../index";', false],
    [
      terminal,
      'import { X } from "../../../../../../apps/desktop/vendor/drawio/mxgraph/src/view/mxPerimeter";',
      false,
    ],
  ])
    check(
      'R02 dependency ' + file + source,
      (inspectSource(file, source, r02, boundary).length === 0) === allowed,
    )
  for (const source of [
    'import "react";',
    'import "react-dom";',
    'import "@antv/x6";',
    'import "electron";',
    'window;',
    'document;',
    'devicePixelRatio;',
    'Math.random();',
    'Date.now();',
  ])
    for (const file of [terminal, perimeter])
      check('R02 purity ' + file + source, inspectSource(file, source, r02, boundary).length > 0)
  for (const source of [
    'import "react";',
    'export { X } from "react-dom";',
    'import "@antv/x6";',
    'require("electron");',
  ])
    check(
      'R02 tests reject framework ' + source,
      inspectSource(V2_TESTS + 'terminal/unit/x.test.ts', source, r02, boundary, {
        core: false,
        tests: true,
      }).length > 0,
    )
  check(
    'R02 compiler negative cases allowed',
    inspectSource(
      V2_TESTS + 'terminal/types/x.type-test.ts',
      '// @ts-expect-error mixed spaces\nconst x = 1;',
      r02,
      boundary,
      { core: false, tests: true },
    ).length === 0,
  )
  check(
    'inward graph is acyclic',
    cycleFindings(
      new Map([
        [terminal, [perimeter]],
        [perimeter, [geometry]],
        [geometry, []],
      ]),
    ).length === 0,
  )
  check(
    'same-layer cycle is rejected',
    cycleFindings(
      new Map([
        [terminal, [ROUTING + 'terminal/other.ts']],
        [ROUTING + 'terminal/other.ts', [terminal]],
      ]),
    ).length > 0,
  )
  check(
    'self import cycle is rejected',
    cycleFindings(new Map([[perimeter, [perimeter]]])).length > 0,
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
    fs.mkdirSync(path.join(temporaryRoot, path.dirname(CURRENT)), { recursive: true })
    fs.mkdirSync(path.join(temporaryRoot, path.dirname(SCRIPT)), { recursive: true })
    fs.writeFileSync(
      path.join(temporaryRoot, CURRENT),
      'ACTIVE_CHANGE: ' + R02 + '\nPHASE: PLANNING\nBASE_COMMIT: ' + R02_BASE + '\n',
    )
    fs.writeFileSync(path.join(temporaryRoot, SCRIPT), '// approved process gate\n')
    git(['add', '--', 'baseline.txt', 'removed.txt', CURRENT, SCRIPT])
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
    const approvedCurrent = { ...r02Impl, baseCommit: base, planningCommit: base }
    check(
      'actual committed planning gate is frozen',
      verifyFrozenGate(approvedCurrent, temporaryRoot),
    )
    fs.writeFileSync(path.join(temporaryRoot, SCRIPT), '// approved process gate\r\n')
    check(
      'actual CRLF checkout preserves frozen gate',
      verifyFrozenGate(approvedCurrent, temporaryRoot),
    )
    fs.writeFileSync(path.join(temporaryRoot, SCRIPT), '// unauthorized process gate edit\n')
    check('actual gate edit breaks freeze', !verifyFrozenGate(approvedCurrent, temporaryRoot))
    assert.throws(() =>
      verifyFrozenGate({ ...approvedCurrent, planningCommit: undefined }, temporaryRoot),
    )
    count++
    assert.throws(() =>
      verifyFrozenGate({ ...approvedCurrent, planningCommit: 'f'.repeat(40) }, temporaryRoot),
    )
    count++
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
