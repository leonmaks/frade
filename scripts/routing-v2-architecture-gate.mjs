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

// Git metadata precedes the first TAB; paths remain NUL-delimited and intact.
function gitSnapshotEntries(output, snapshot) {
  return output
    .split('\0')
    .filter(Boolean)
    .map((record) => {
      const separator = record.indexOf('\t')
      if (separator < 0) throw new Error('Malformed ' + snapshot + ' Git snapshot record')
      const metadata = record.slice(0, separator).split(' ')
      return {
        file: normalize(record.slice(separator + 1)),
        mode: metadata[0],
        stage: snapshot === 'INDEX' ? metadata[2] : '0',
      }
    })
}

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
  // Union independent Git layers so opposing index/worktree changes cannot cancel.
  // Keep baseline -> HEAD after implementation commits; retain NUL-safe path handling.
  return [
    ...new Set([
      ...git(['diff', '--no-renames', '--name-only', '-z', baseCommit, 'HEAD', '--']),
      ...git(['diff', '--cached', '--no-renames', '--name-only', '-z', '--']),
      ...git(['diff', '--no-renames', '--name-only', '-z', '--']),
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

function dependencyCategory(importer, specifier, boundary, tests = false, snapshotFiles) {
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
  const existing = candidates.find((candidate) =>
    snapshotFiles
      ? snapshotFiles.has(relative(candidate))
      : fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  )
  if (existing) target = snapshotFiles ? existing : fs.realpathSync(existing)
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
  { core = true, tests = false, dependencies = [], snapshotFiles } = {},
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
    const dependency = dependencyCategory(file, expression.text, boundary, tests, snapshotFiles)
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
  const approvedEntries = gitSnapshotEntries(
    git(['ls-tree', '-z', current.planningCommit, '--', SCRIPT]),
    'HEAD',
  )
  if (approvedEntries.length !== 1 || !['100644', '100755'].includes(approvedEntries[0].mode))
    return false
  const approvedMode = approvedEntries[0].mode
  for (const [snapshot, args] of [
    ['HEAD', ['ls-tree', '-z', 'HEAD', '--', SCRIPT]],
    ['INDEX', ['ls-files', '--stage', '-z', '--', SCRIPT]],
  ]) {
    const entries = gitSnapshotEntries(git(args), snapshot)
    if (
      entries.length !== 1 ||
      entries[0].file !== SCRIPT ||
      entries[0].stage !== '0' ||
      entries[0].mode !== approvedMode
    )
      return false
  }
  if (!fs.lstatSync(path.join(gitRoot, SCRIPT)).isFile()) return false

  const frozen = git(['show', current.planningCommit + ':' + SCRIPT])
  // No live Git layer may hide a frozen-control edit in another layer.
  // Missing or unmerged snapshots throw and make the installed gate fail closed.
  const snapshots = [
    git(['show', 'HEAD:' + SCRIPT]),
    git(['show', ':' + SCRIPT]),
    fs.readFileSync(path.join(gitRoot, SCRIPT), 'utf8'),
  ]
  return snapshots.every((snapshot) => canonicalText(snapshot) === canonicalText(frozen))
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

// Inspect each tracked snapshot independently; worktree restoration cannot hide
// forbidden imports, globals or cycles that remain in HEAD or the index.
function trackedSnapshotFindings(current, changed, boundary) {
  const findings = []
  const checked = new Set()
  const git = (args) =>
    execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  for (const [snapshot, list, prefix] of [
    ['HEAD', ['ls-tree', '-r', '-z', 'HEAD'], 'HEAD:'],
    ['INDEX', ['ls-files', '--stage', '-z'], ':'],
  ]) {
    const entries = gitSnapshotEntries(git(list), snapshot)
    const snapshotFiles = new Set(entries.map((entry) => entry.file))
    const graph = new Map()
    for (const { file, mode, stage } of entries) {
      const core = CORE.has(coreLayer(file))
      const tests = /(?:^|\/)tests\//.test(file)
      if (
        !core &&
        !file.startsWith(V2_TESTS) &&
        !(changed.includes(file) && file.startsWith('packages/draw/src/'))
      )
        continue
      if (stage !== '0') {
        findings.push({
          file,
          reason: '[' + snapshot + '] Unmerged V2 snapshot cannot prove isolation',
        })
        continue
      }
      if (mode === '120000') {
        findings.push({ file, reason: '[' + snapshot + '] Symlink in V2 snapshot' })
        continue
      }
      if (!['100644', '100755'].includes(mode)) {
        findings.push({ file, reason: '[' + snapshot + '] Unsupported V2 Git mode: ' + mode })
        continue
      }
      if (!SOURCE.test(file)) continue
      const dependencies = []
      const content = git(['show', prefix + file])
      const issues = inspectSource(file, content, current, boundary, {
        core,
        tests,
        dependencies,
        snapshotFiles,
      })
      findings.push(
        ...issues.map((finding) => ({
          ...finding,
          reason: '[' + snapshot + '] ' + finding.reason,
        })),
      )
      checked.add(file)
      if (core) graph.set(file, dependencies)
    }
    findings.push(
      ...cycleFindings(graph).map((finding) => ({
        ...finding,
        reason: '[' + snapshot + '] ' + finding.reason,
      })),
    )
  }
  return { findings, checked }
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
    const snapshots = trackedSnapshotFindings(current, files, boundary)
    findings.push(...snapshots.findings)
    for (const file of snapshots.checked) checked.add(file)
    console.log('GIT_SOURCE_SNAPSHOTS_CHECKED: HEAD INDEX WORKTREE')
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
    // Net baseline-to-working-tree diff can hide changes in independent Git layers.
    git(['add', '--', 'baseline.txt'])
    fs.writeFileSync(path.join(temporaryRoot, 'baseline.txt'), 'baseline\n')
    check(
      'cancellation fixture is absent from net baseline diff',
      git(['diff', '--no-renames', '--name-only', base, '--', 'baseline.txt']).trim() === '',
    )
    check(
      'staged edit undone in worktree remains discovered',
      changedFiles(base, temporaryRoot).includes('baseline.txt'),
    )
    fs.unlinkSync(path.join(temporaryRoot, 'staged.txt'))
    check(
      'staged addition removed in worktree remains discovered',
      changedFiles(base, temporaryRoot).includes('staged.txt'),
    )
    const committed = 'committed implementation with spaces.ts'
    fs.writeFileSync(path.join(temporaryRoot, committed), 'export const implementation = true\n')
    git(['add', '--', committed])
    git([
      '-c',
      'user.name=Gate Self Test',
      '-c',
      'user.email=gate-self-test@example.invalid',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--quiet',
      '--only',
      '-m',
      'process-test implementation',
      '--',
      committed,
    ])
    check(
      'implementation commit remains discovered from original baseline',
      changedFiles(base, temporaryRoot).includes(committed),
    )
    fs.unlinkSync(path.join(temporaryRoot, committed))
    check(
      'committed addition undone in worktree is absent from net baseline diff',
      git(['diff', '--no-renames', '--name-only', base, '--', committed]).trim() === '',
    )
    check(
      'committed change undone in worktree remains discovered',
      changedFiles(base, temporaryRoot).includes(committed),
    )
    check(
      'union discovers each path once in sorted order',
      JSON.stringify(changedFiles(base, temporaryRoot)) ===
        JSON.stringify(
          [
            'baseline.txt',
            committed,
            'removed.txt',
            'staged.txt',
            'untracked with spaces.ts',
          ].sort(),
        ),
    )
    const approvedCurrent = { ...r02Impl, baseCommit: base, planningCommit: base }
    check(
      'actual committed planning gate is frozen',
      verifyFrozenGate(approvedCurrent, temporaryRoot),
    )
    git(['update-index', '--chmod=+x', SCRIPT])
    check(
      'frozen gate rejects staged mode-only edit with identical content',
      !verifyFrozenGate(approvedCurrent, temporaryRoot),
    )
    git(['update-index', '--chmod=-x', SCRIPT])
    check(
      'frozen gate accepts restored approved index mode',
      verifyFrozenGate(approvedCurrent, temporaryRoot),
    )

    git(['update-index', '--chmod=+x', SCRIPT])
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
      'committed gate mode change',
    ])
    git(['update-index', '--chmod=-x', SCRIPT])
    check(
      'frozen gate rejects committed mode edit with restored index and worktree',
      !verifyFrozenGate(approvedCurrent, temporaryRoot),
    )
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
      'restore approved gate mode',
    ])
    check(
      'frozen gate accepts restored approved HEAD mode',
      verifyFrozenGate(approvedCurrent, temporaryRoot),
    )

    fs.writeFileSync(path.join(temporaryRoot, SCRIPT), '// approved process gate\r\n')
    check(
      'actual CRLF checkout preserves frozen gate',
      verifyFrozenGate(approvedCurrent, temporaryRoot),
    )
    fs.writeFileSync(path.join(temporaryRoot, SCRIPT), '// unauthorized process gate edit\n')
    check('actual gate edit breaks freeze', !verifyFrozenGate(approvedCurrent, temporaryRoot))

    // Frozen controls must agree across independent Git snapshots.
    fs.writeFileSync(path.join(temporaryRoot, SCRIPT), '// unauthorized staged gate\n')
    git(['add', '--', SCRIPT])
    fs.writeFileSync(path.join(temporaryRoot, SCRIPT), '// approved process gate\n')
    check(
      'frozen staged cancellation is discovered',
      changedFiles(base, temporaryRoot).includes(SCRIPT),
    )
    check(
      'frozen staged cancellation retains unauthorized index',
      git(['show', ':' + SCRIPT]) === '// unauthorized staged gate\n',
    )
    check('frozen staged cancellation must fail', !verifyFrozenGate(approvedCurrent, temporaryRoot))
    check(
      'frozen staged cancellation makes scope fail',
      scopeFindings(
        {
          ...approvedCurrent,
          frozenGateVerified: verifyFrozenGate(approvedCurrent, temporaryRoot),
        },
        [SCRIPT],
        boundary,
      ).some((finding) => finding.file === SCRIPT),
    )

    fs.writeFileSync(path.join(temporaryRoot, SCRIPT), '// unauthorized committed gate\n')
    git(['add', '--', SCRIPT])
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
      'unauthorized gate snapshot',
    ])
    fs.writeFileSync(path.join(temporaryRoot, SCRIPT), '// approved process gate\n')
    git(['add', '--', SCRIPT])
    check(
      'committed frozen edit remains discovered after live restoration',
      changedFiles(base, temporaryRoot).includes(SCRIPT),
    )
    check(
      'committed frozen edit exists in HEAD',
      git(['show', 'HEAD:' + SCRIPT]) === '// unauthorized committed gate\n',
    )
    check(
      'committed frozen edit restored in index and worktree must fail',
      !verifyFrozenGate(approvedCurrent, temporaryRoot),
    )

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
      'restore approved gate',
    ])
    check(
      'unchanged HEAD index and worktree preserve freeze',
      verifyFrozenGate(approvedCurrent, temporaryRoot),
    )
    fs.unlinkSync(path.join(temporaryRoot, SCRIPT))
    git(['add', '--', SCRIPT])
    fs.writeFileSync(path.join(temporaryRoot, SCRIPT), '// approved process gate\n')
    check(
      'frozen staged deletion with recreation remains discovered',
      changedFiles(base, temporaryRoot).includes(SCRIPT),
    )
    check('frozen index deletion fails closed', !verifyFrozenGate(approvedCurrent, temporaryRoot))
    git(['add', '--', SCRIPT])
    check(
      'restored approved index after deletion preserves freeze',
      verifyFrozenGate(approvedCurrent, temporaryRoot),
    )
    fs.unlinkSync(path.join(temporaryRoot, SCRIPT))
    assert.throws(() => verifyFrozenGate(approvedCurrent, temporaryRoot))
    count++
    fs.writeFileSync(path.join(temporaryRoot, SCRIPT), '// approved process gate\n')

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
  // Isolated adversarial repositories exercise discovery and scope together.
  function adversarialCase(label, file, mutate, forbidden, { tracked = true } = {}) {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'frade-process-gate-'))
    try {
      const git = (args) =>
        execFileSync('git', args, {
          cwd: fixtureRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      const write = (text) => {
        fs.mkdirSync(path.join(fixtureRoot, path.dirname(file)), { recursive: true })
        fs.writeFileSync(path.join(fixtureRoot, file), text)
      }
      const commit = (message) =>
        git([
          '-c',
          'user.name=Gate Self Test',
          '-c',
          'user.email=gate-self-test@example.invalid',
          '-c',
          'commit.gpgsign=false',
          'commit',
          '--quiet',
          '--allow-empty',
          '-m',
          message,
        ])
      const sourcePaths = (args) => git(args).split('\0').filter(Boolean).map(normalize)
      git(['init', '--quiet'])
      if (tracked) {
        write('original\n')
        git(['add', '--', file])
      }
      commit('adversarial baseline')
      const baseline = git(['rev-parse', 'HEAD']).trim()
      mutate({ git, write, commit, baseline, fixtureRoot, sourcePaths })
      const discovered = changedFiles(baseline, fixtureRoot)
      check(label + ': discovery finds exact path', discovered.includes(file))
      check(
        label + ': isolated union contains only that path',
        JSON.stringify(discovered) === JSON.stringify([file]),
      )
      const findings = scopeFindings(r02Impl, discovered, boundary)
      if (forbidden) {
        check(
          label + ': scope gate FAIL is caused by discovered path',
          findings.some((finding) => finding.file === file),
        )
        check(
          label + ': no unrelated control-state failure',
          findings.every((finding) => finding.file === file),
        )
      } else check(label + ': allowed cancellation keeps scope gate PASS', findings.length === 0)
    } finally {
      const resolved = path.resolve(fixtureRoot)
      assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()))
      assert.ok(path.basename(resolved).startsWith('frade-process-gate-'))
      fs.rmSync(resolved, { recursive: true, force: true })
    }
  }
  const forbiddenFile = ROUTING + 'floatingAttachment.ts'
  adversarialCase(
    'A staged forbidden + restored worktree',
    forbiddenFile,
    ({ git, write, baseline, sourcePaths }) => {
      write('illegal\n')
      git(['add', '--', forbiddenFile])
      write('original\n')
      check('A: HEAD remains original', git(['show', 'HEAD:' + forbiddenFile]) === 'original\n')
      check('A: index contains illegal edit', git(['show', ':' + forbiddenFile]) === 'illegal\n')
      check(
        'A: net baseline diff hides path',
        sourcePaths(['diff', '--name-only', '-z', baseline, '--']).length === 0,
      )
      check(
        'A: staged source contains path',
        sourcePaths(['diff', '--cached', '--name-only', '-z', '--']).includes(forbiddenFile),
      )
    },
    true,
  )
  adversarialCase(
    'B committed forbidden + restored worktree',
    forbiddenFile,
    ({ git, write, commit, baseline, sourcePaths }) => {
      write('illegal\n')
      git(['add', '--', forbiddenFile])
      commit('forbidden implementation')
      write('original\n')
      check(
        'B: HEAD contains committed illegal edit',
        git(['show', 'HEAD:' + forbiddenFile]) === 'illegal\n',
      )
      check(
        'B: net baseline diff hides path',
        sourcePaths(['diff', '--name-only', '-z', baseline, '--']).length === 0,
      )
      check(
        'B: baseline-to-HEAD source contains path',
        sourcePaths(['diff', '--name-only', '-z', baseline, 'HEAD', '--']).includes(forbiddenFile),
      )
    },
    true,
  )
  adversarialCase(
    'C staged deletion + unstaged recreation',
    forbiddenFile,
    ({ git, write, fixtureRoot, sourcePaths }) => {
      fs.unlinkSync(path.join(fixtureRoot, forbiddenFile))
      git(['add', '--', forbiddenFile])
      write('original\n')
      check(
        'C: staged deletion is real',
        sourcePaths(['diff', '--cached', '--diff-filter=D', '--name-only', '-z', '--']).includes(
          forbiddenFile,
        ),
      )
      check(
        'C: recreation is untracked relative to index',
        sourcePaths(['ls-files', '--others', '--exclude-standard', '-z']).includes(forbiddenFile),
      )
      check(
        'C: recreated worktree content is original',
        fs.readFileSync(path.join(fixtureRoot, forbiddenFile), 'utf8') === 'original\n',
      )
    },
    true,
  )
  adversarialCase(
    'D untracked forbidden',
    forbiddenFile,
    ({ write, sourcePaths }) => {
      write('illegal\n')
      check(
        'D: untracked source contains path',
        sourcePaths(['ls-files', '--others', '--exclude-standard', '-z']).includes(forbiddenFile),
      )
    },
    true,
    { tracked: false },
  )
  const allowedFile = ROUTING + 'terminal/cancellation-fixture.ts'
  adversarialCase(
    'Positive allowed staged + unstaged inverse',
    allowedFile,
    ({ git, write, baseline, sourcePaths }) => {
      write('allowed change\n')
      git(['add', '--', allowedFile])
      write('original\n')
      check(
        'Positive: net baseline diff hides path',
        sourcePaths(['diff', '--name-only', '-z', baseline, '--']).length === 0,
      )
      check(
        'Positive: staged source contains allowed path',
        sourcePaths(['diff', '--cached', '--name-only', '-z', '--']).includes(allowedFile),
      )
      check(
        'Positive: unstaged inverse contains allowed path',
        sourcePaths(['diff', '--name-only', '-z', '--']).includes(allowedFile),
      )
    },
    false,
  )

  // Verify each independent Git layer finds both allowed and forbidden changes.
  for (const [kind, file, forbidden] of [
    ['allowed', allowedFile, false],
    ['forbidden', forbiddenFile, true],
  ]) {
    for (const source of ['baseline-to-HEAD', 'staged', 'unstaged', 'untracked']) {
      adversarialCase(
        kind + ' ' + source,
        file,
        ({ git, write, commit, baseline, sourcePaths }) => {
          write('changed\n')
          if (source === 'staged' || source === 'baseline-to-HEAD') git(['add', '--', file])
          if (source === 'baseline-to-HEAD') commit('committed discovery fixture')
          const args =
            source === 'baseline-to-HEAD'
              ? ['diff', '--no-renames', '--name-only', '-z', baseline, 'HEAD', '--']
              : source === 'staged'
                ? ['diff', '--cached', '--no-renames', '--name-only', '-z', '--']
                : source === 'unstaged'
                  ? ['diff', '--no-renames', '--name-only', '-z', '--']
                  : ['ls-files', '--others', '--exclude-standard', '-z']
          check(
            kind + ' ' + source + ': named source finds exact path',
            JSON.stringify(sourcePaths(args)) === JSON.stringify([file]),
          )
        },
        forbidden,
        { tracked: source !== 'untracked' },
      )
    }
  }
  adversarialCase(
    'Positive allowed staged deletion + recreation',
    allowedFile,
    ({ git, write, fixtureRoot, sourcePaths }) => {
      fs.unlinkSync(path.join(fixtureRoot, allowedFile))
      git(['add', '--', allowedFile])
      write('original\n')
      check(
        'Allowed deletion: staged source finds path',
        sourcePaths(['diff', '--cached', '--no-renames', '--name-only', '-z', '--']).includes(
          allowedFile,
        ),
      )
      check(
        'Allowed recreation: untracked source finds path',
        sourcePaths(['ls-files', '--others', '--exclude-standard', '-z']).includes(allowedFile),
      )
    },
    false,
  )

  function relocationCase(label, from, to, source, copy, forbiddenPaths) {
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'frade-process-gate-'))
    try {
      const git = (args) =>
        execFileSync('git', args, {
          cwd: fixtureRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      const paths = (args) => git(args).split('\0').filter(Boolean).map(normalize).sort()
      const equalPaths = (actual, expected) =>
        JSON.stringify(actual) === JSON.stringify([...expected].sort())
      const commit = (message) =>
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
          message,
        ])
      git(['init', '--quiet'])
      fs.mkdirSync(path.join(fixtureRoot, path.dirname(from)), { recursive: true })
      fs.writeFileSync(path.join(fixtureRoot, from), 'original\n')
      git(['add', '--', from])
      commit('relocation baseline')
      const baseline = git(['rev-parse', 'HEAD']).trim()
      fs.mkdirSync(path.join(fixtureRoot, path.dirname(to)), { recursive: true })
      if (copy) fs.copyFileSync(path.join(fixtureRoot, from), path.join(fixtureRoot, to))
      else fs.renameSync(path.join(fixtureRoot, from), path.join(fixtureRoot, to))
      if (source !== 'unstaged') git(['add', '-A'])
      if (source === 'baseline-to-HEAD') commit('relocation after baseline')
      const expected = copy ? [to] : [from, to]
      if (source === 'unstaged') {
        // A physical unstaged rename spans tracked deletion and untracked addition.
        check(
          label + ': unstaged source finds old tracked path',
          equalPaths(paths(['diff', '--no-renames', '--name-only', '-z', '--']), [from]),
        )
        check(
          label + ': untracked source finds new path',
          equalPaths(paths(['ls-files', '--others', '--exclude-standard', '-z']), [to]),
        )
      } else {
        const args =
          source === 'staged'
            ? ['diff', '--cached', '--no-renames', '--name-only', '-z', '--']
            : ['diff', '--no-renames', '--name-only', '-z', baseline, 'HEAD', '--']
        check(
          label + ': named source finds complete exact paths',
          equalPaths(paths(args), expected),
        )
      }
      const discovered = changedFiles(baseline, fixtureRoot)
      for (const file of expected)
        check(label + ': union finds exact path ' + file, discovered.includes(file))
      check(
        label + ': NUL-safe union has no split or extra paths',
        equalPaths(discovered, expected),
      )
      if (copy) {
        check(
          label + ': tracked source content remains unchanged',
          fs.readFileSync(path.join(fixtureRoot, from), 'utf8') === 'original\n',
        )
        check(label + ': unchanged copy source is not discovered', !discovered.includes(from))
      }
      const findings = scopeFindings(r02Impl, discovered, boundary)
      if (forbiddenPaths.length) {
        for (const file of forbiddenPaths)
          check(
            label + ': scope FAIL identifies forbidden side ' + file,
            findings.some((finding) => finding.file === file),
          )
        check(
          label + ': scope has no unrelated findings',
          findings.every((finding) => forbiddenPaths.includes(finding.file)),
        )
      } else check(label + ': discovered allowed paths keep scope PASS', findings.length === 0)
    } finally {
      const resolved = path.resolve(fixtureRoot)
      assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()))
      assert.ok(path.basename(resolved).startsWith('frade-process-gate-'))
      fs.rmSync(resolved, { recursive: true, force: true })
    }
  }
  const allowedOld = ROUTING + 'terminal/file with spaces.ts'
  const allowedNew = ROUTING + 'perimeter/renamed with spaces.ts'
  const forbiddenNew = ROUTING + 'forbidden file with spaces.ts'
  relocationCase(
    'R1 staged allowed to forbidden with spaces',
    allowedOld,
    forbiddenNew,
    'staged',
    false,
    [forbiddenNew],
  )
  relocationCase('R2 staged forbidden to allowed', forbiddenFile, allowedNew, 'staged', false, [
    forbiddenFile,
  ])
  relocationCase('R3 unstaged allowed to forbidden', allowedOld, forbiddenNew, 'unstaged', false, [
    forbiddenNew,
  ])
  relocationCase(
    'R4 committed allowed to forbidden',
    allowedOld,
    forbiddenNew,
    'baseline-to-HEAD',
    false,
    [forbiddenNew],
  )
  for (const source of ['staged', 'unstaged', 'baseline-to-HEAD']) {
    relocationCase('Positive allowed rename ' + source, allowedOld, allowedNew, source, false, [])
  }
  relocationCase(
    'Positive Unicode allowed rename',
    ROUTING + 'terminal/точка.ts',
    ROUTING + 'perimeter/граница.ts',
    'staged',
    false,
    [],
  )
  relocationCase('Positive allowed copy destination', allowedOld, allowedNew, 'staged', true, [])
  relocationCase('Forbidden copy destination', allowedOld, forbiddenNew, 'staged', true, [
    forbiddenNew,
  ])

  // Exercise the installed main path, not only scopeFindings or a mocked AST.
  function sourceSnapshotCase(label, mode, forbidden, kind = 'framework') {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'frade-process-gate-'))
    try {
      const git = (args, input) =>
        execFileSync('git', args, {
          cwd: root,
          encoding: 'utf8',
          input,
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      const write = (file, content) => {
        fs.mkdirSync(path.join(root, path.dirname(file)), { recursive: true })
        fs.writeFileSync(path.join(root, file), content)
      }
      const commit = (message) =>
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
          message,
        ])
      // Only the fixture dependency loader points at the installed TypeScript.
      // All gate logic runs unchanged against the isolated Git repository.
      const installed = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')
      const loader =
        "const requireDraw = createRequire(path.join(ROOT, 'packages/draw/package.json'))"
      const fixtureScript = installed.replace(
        loader,
        'const requireDraw = createRequire(' +
          JSON.stringify(path.join(ROOT, 'packages/draw/package.json')) +
          ')',
      )
      assert.notEqual(fixtureScript, installed)
      write(SCRIPT, fixtureScript)
      for (const control of [MASTER, PLAYBOOK, LEGACY_DOC]) write(control, read(control))
      const planning = [
        'PROGRAM: Routing Engine V2',
        'ACTIVE_CHANGE: ' + R02,
        'PREVIOUS_CHANGE: ' + R01,
        'SEQUENCE_POSITION: R02_OF_10',
        'PHASE: PLANNING',
        'BASE_COMMIT: ' + R02_BASE,
        'PREVIOUS_CHANGE_STATUS: CLOSED',
        'PREVIOUS_CHANGE_ARCHIVED: true',
        'PREVIOUS_CHANGE_POST_IMPLEMENTATION_GATE: PASS',
        'NEXT_CHANGE_ALLOWED: false',
        '## IMPLEMENTATION_SCOPE',
        ...R02_IMPLEMENTATION,
        '## PROCESS_CONTROL_SCOPE',
        ...R02_CONTROL,
        '',
      ].join('\n')
      write(CURRENT, planning)
      const source = ROUTING + 'terminal/snapshot fixture.ts'
      if (mode !== 'staged-addition') write(source, 'export const value = 1\n')
      const partner = ROUTING + 'terminal/snapshot-partner.ts'
      if (kind === 'cycle') write(partner, 'export const value = 1\n')
      if (kind === 'symlink')
        write(
          'packages/draw/src/frameworkFixture.ts',
          "import React from 'react'\nexport const value = React\n",
        )
      git(['init', '--quiet'])
      git(['add', '-A'])
      commit('snapshot planning baseline')
      const base = git(['rev-parse', 'HEAD']).trim()
      write(
        CURRENT,
        planning
          .replace(/^PHASE:.*$/m, 'PHASE: IMPLEMENTATION')
          .replace(/^BASE_COMMIT:.*$/m, 'BASE_COMMIT: ' + base) +
          '\nAPPROVED_PLANNING_COMMIT: ' +
          base +
          '\nPRE_IMPLEMENTATION_GATE: PASS\n',
      )
      const content =
        kind === 'cycle'
          ? "import { value as other } from './snapshot-partner'\nexport const value = other\n"
          : forbidden
            ? "import React from 'react'\nexport const value = React\n"
            : 'export const value = 2\n'
      write(source, content)
      git(['add', '--', source])
      if (kind === 'cycle') {
        write(
          partner,
          "import { value as other } from './snapshot fixture'\nexport const value = other\n",
        )
        git(['add', '--', partner])
      }
      if (kind === 'symlink') {
        const blob = git(['hash-object', '-w', '--stdin'], '../../frameworkFixture.ts\n').trim()
        git(['update-index', '--cacheinfo', '120000,' + blob + ',' + source])
      }
      if (kind === 'unmerged') {
        const blob = git(['rev-parse', 'HEAD:' + source]).trim()
        const entries =
          '0 ' +
          '0'.repeat(40) +
          '\t' +
          source +
          '\n' +
          [1, 2, 3].map((stage) => '100644 ' + blob + ' ' + stage + '\t' + source + '\n').join('')
        git(['update-index', '--index-info'], entries)
      }
      if (mode === 'committed') commit('source snapshot change')
      if (mode === 'staged-addition') fs.unlinkSync(path.join(root, source))
      else write(source, 'export const value = 1\n')
      if (kind === 'cycle') write(partner, 'export const value = 1\n')
      check(label + ': changed path remains discovered', changedFiles(base, root).includes(source))
      let output, failure
      try {
        output = execFileSync(process.execPath, [path.join(root, SCRIPT)], {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      } catch (error) {
        failure = error
      }
      if (forbidden) {
        check(
          label + ': forbidden source content causes FAIL',
          failure && String(failure.stdout).includes('GATE_STATUS: FAIL'),
        )
        const reason =
          kind === 'cycle'
            ? 'Circular V2 dependency:'
            : kind === 'symlink'
              ? 'Symlink in V2 snapshot'
              : kind === 'unmerged'
                ? 'Unmerged V2 snapshot'
                : 'Framework dependency: react'
        check(
          label + ': exact path and forbidden cause identified',
          String(failure.stderr).includes(source) && String(failure.stderr).includes(reason),
        )
      } else {
        if (failure) throw failure
        check(label + ': allowed source snapshots pass', output.includes('GATE_STATUS: PASS'))
      }
    } finally {
      const resolved = path.resolve(root)
      assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()))
      assert.ok(path.basename(resolved).startsWith('frade-process-gate-'))
      fs.rmSync(resolved, { recursive: true, force: true })
    }
  }
  sourceSnapshotCase('Forbidden index import with pure restored worktree', 'staged', true)
  sourceSnapshotCase('Forbidden committed import with pure restored worktree', 'committed', true)
  sourceSnapshotCase('Forbidden staged addition absent from worktree', 'staged-addition', true)
  sourceSnapshotCase('Allowed index source cancellation', 'staged', false)
  sourceSnapshotCase('Allowed committed source cancellation', 'committed', false)

  sourceSnapshotCase('Allowed staged addition absent from worktree', 'staged-addition', false)
  sourceSnapshotCase('Forbidden index dependency cycle with pure worktree', 'staged', true, 'cycle')
  sourceSnapshotCase(
    'Forbidden HEAD dependency cycle with pure worktree',
    'committed',
    true,
    'cycle',
  )

  sourceSnapshotCase(
    'Forbidden INDEX symlink with pure regular worktree',
    'staged',
    true,
    'symlink',
  )
  sourceSnapshotCase(
    'Forbidden HEAD symlink with pure regular worktree',
    'committed',
    true,
    'symlink',
  )
  sourceSnapshotCase('Unmerged INDEX with pure worktree fails closed', 'staged', true, 'unmerged')

  console.log('PROCESS_GATE_SELF_TESTS: PASS (' + count + ' assertions)')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--self-test')) selfTest()
  else main()
}
