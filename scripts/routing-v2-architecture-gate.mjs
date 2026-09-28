import fs from 'node:fs'
import vm from 'node:vm'
import { createHash } from 'node:crypto'
import path from 'node:path'
import assert from 'node:assert/strict'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

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
const R03 = 'routing-v2-03-direction-resolver'
const R03_BASE = '2b6619627e3e744007b06251a05dad86e7bce634'
const R04 = 'routing-v2-04-orthogonal-router'
const R04_BASE = '0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4'
const WORKFLOW = 'docs/routing-v2/workflow-models.md'
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
const R03_IMPLEMENTATION = [ROUTING + 'orthogonal/direction/**', V2_TESTS + 'direction/**']
const R03_CONTROL = ['openspec/changes/' + R03 + '/**', CURRENT, SCRIPT, WORKFLOW]
const R03_FROZEN = [
  SCRIPT,
  WORKFLOW,
  MASTER,
  PLAYBOOK,
  LEGACY_DOC,
  'AGENTS.md',
  ROUTING + 'AGENTS.md',
]
const R04_IMPLEMENTATION = [
  ROUTING + 'orthogonal/router/**',
  ROUTING + 'normalization/**',
  ROUTING + 'validation/**',
  V2_TESTS + 'orthogonal/**',
]
const R04_CONTROL = ['openspec/changes/' + R04 + '/**', CURRENT, MASTER, PLAYBOOK, SCRIPT]
const R04_METADATA = ['packages/draw/package.json', 'pnpm-lock.yaml']
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
  return [
    ...body.matchAll(/^(?:(?:packages|openspec|docs|scripts)\/[^\s`]+|pnpm-lock\.yaml)$/gm),
  ].map((match) => match[0].trim())
}

function readCurrentChange() {
  const content = read(CURRENT)
  const activeChange = field(content, 'ACTIVE_CHANGE') ?? 'UNKNOWN'
  if (activeChange === R04) reviewCanonical(CURRENT, content, R04)
  return {
    activeChange,
    phase: field(content, 'PHASE'),
    baseCommit: field(content, 'BASE_COMMIT'),
    sequence: field(content, 'SEQUENCE_POSITION'),
    nextAllowed: field(content, 'NEXT_CHANGE_ALLOWED'),
    nextChange: field(content, 'NEXT_CHANGE'),
    implementationStatus: field(content, 'IMPLEMENTATION_STATUS'),
    previousGate: field(content, 'PREVIOUS_GATE'),
    previousChange: field(content, 'PREVIOUS_CHANGE'),
    previousStatus: field(content, 'PREVIOUS_CHANGE_STATUS'),
    previousArchived: field(content, 'PREVIOUS_CHANGE_ARCHIVED'),
    previousPostGate: field(content, 'PREVIOUS_CHANGE_POST_IMPLEMENTATION_GATE'),
    planningCommit: field(content, 'APPROVED_PLANNING_COMMIT'),
    preImplementationGate: field(content, 'PRE_IMPLEMENTATION_GATE'),
    preEvidence: field(content, 'PRE_IMPLEMENTATION_GATE_EVIDENCE'),
    number: Number(/^routing-v2-(\d{2})-/.exec(activeChange)?.[1]) || null,
    implementation: section(content, 'IMPLEMENTATION_SCOPE'),
    control: section(content, 'PROCESS_CONTROL_SCOPE'),
    testTooling: section(content, 'TEST_TOOLING_SCOPE'),
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
  if (![R01, R02, R03, R04].includes(current.activeChange))
    fail(CURRENT, 'No exact machine profile for this active change')
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
  if (current.activeChange === R03) {
    for (const [name, actual, expected] of [
      ['IMPLEMENTATION_SCOPE', current.implementation, R03_IMPLEMENTATION],
      ['PROCESS_CONTROL_SCOPE', current.control, R03_CONTROL],
    ]) {
      if (JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort()))
        fail(CURRENT, name + ' differs from the exact authorized R03 scope')
    }
    if (
      current.sequence !== 'R03_OF_10' ||
      current.nextAllowed !== 'false' ||
      current.previousChange !== R02 ||
      current.previousStatus !== 'CLOSED' ||
      current.previousArchived !== 'true' ||
      current.previousPostGate !== 'PASS' ||
      (current.phase === 'PLANNING'
        ? current.baseCommit !== R03_BASE
        : !/^[0-9a-f]{40}$/i.test(current.planningCommit ?? '') ||
          current.baseCommit !== current.planningCommit)
    )
      fail(CURRENT, 'R03 baseline/previous-change/sequence/next-change fields are inconsistent')
    if (!['PLANNING', 'IMPLEMENTATION', 'VERIFICATION'].includes(current.phase))
      fail(CURRENT, 'Unrecognized R03 phase')
    if (
      current.phase !== 'PLANNING' &&
      (current.preImplementationGate !== 'PASS' || !current.frozenGateVerified)
    )
      fail(CURRENT, 'R03 requires PRE_IMPLEMENTATION PASS and verified approved frozen controls')
    for (const file of files) {
      if (inScope(file, R03_IMPLEMENTATION)) {
        if (current.phase === 'PLANNING')
          fail(file, 'R03 product code/tests changed during PLANNING')
      } else if (inScope(file, R03_CONTROL)) {
        if (
          [SCRIPT, WORKFLOW].includes(file) &&
          current.phase !== 'PLANNING' &&
          !current.frozenGateVerified
        )
          fail(file, 'R03 frozen control differs from the approved planning commit')
      } else if (
        inScope(file, R01_IMPLEMENTATION) ||
        inScope(file, R02_IMPLEMENTATION) ||
        file.startsWith('openspec/changes/archive/') ||
        file.startsWith('openspec/specs/routing-')
      ) {
        fail(file, 'Archived routing dependencies are read-only; DEPENDENCY_EXTENSION_REQUIRED')
      } else fail(file, 'Changed file is outside R03 implementation and process/control scopes')
    }
  }
  if (current.activeChange === R04) {
    for (const [name, actual, expected] of [
      ['IMPLEMENTATION_SCOPE', current.implementation, R04_IMPLEMENTATION],
      ['PROCESS_CONTROL_SCOPE', current.control, R04_CONTROL],
      ['TEST_TOOLING_SCOPE', current.testTooling, R04_METADATA],
    ])
      if (!isDeepStrictEqual([...(actual ?? [])].sort(), [...expected].sort()))
        fail(CURRENT, name + ' differs from the exact authorized R04 scope')
    if (
      current.sequence !== 'R04_OF_10' ||
      current.nextAllowed !== 'false' ||
      current.nextChange !== 'routing-v2-05-segment-router' ||
      current.previousChange !== R03 ||
      current.previousStatus !== 'CLOSED' ||
      current.previousArchived !== 'true' ||
      current.previousPostGate !== 'PASS' ||
      (current.phase === 'PLANNING'
        ? current.baseCommit !== R04_BASE
        : !/^[0-9a-f]{40}$/.test(current.planningCommit ?? '') ||
          current.baseCommit !== current.planningCommit)
    )
      fail(CURRENT, 'R04 baseline/previous-change/sequence/next-change fields are inconsistent')
    if (!['PLANNING', 'IMPLEMENTATION', 'VERIFICATION'].includes(current.phase))
      fail(CURRENT, 'Unrecognized R04 phase')
    if (
      current.phase === 'PLANNING'
        ? current.implementationStatus !== 'NOT_STARTED'
        : !['IN_PROGRESS', 'COMPLETE'].includes(current.implementationStatus) ||
          current.preImplementationGate !== 'PASS' ||
          !current.frozenGateVerified
    )
      fail(CURRENT, 'R04 requires planning isolation or PRE PASS with verified approved controls')
    for (const file of files) {
      if (inScope(file, R04_IMPLEMENTATION) || R04_METADATA.includes(file)) {
        if (current.phase === 'PLANNING')
          fail(file, 'R04 product/tests/dependencies changed during PLANNING')
      } else if (inScope(file, R04_CONTROL)) {
        if (
          [MASTER, PLAYBOOK, SCRIPT].includes(file) &&
          current.phase !== 'PLANNING' &&
          !current.frozenGateVerified
        )
          fail(file, 'R04 frozen control differs from approved planning')
      } else
        fail(
          file,
          'Changed file is outside exact R04 scopes; earlier layers and R05+ are read-only',
        )
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

function r04Layer(file) {
  if (file.startsWith(ROUTING + 'orthogonal/direction/')) return 'direction'
  if (file.startsWith(ROUTING + 'orthogonal/router/')) return 'router'
  return coreLayer(file)
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
    if (tests && [2, 3, 4].includes(current.number) && FRAMEWORK.test(expression.text)) {
      fail(node, 'Framework dependency in R0' + current.number + ' tests: ' + expression.text)
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
    if (core && current.number === 3) {
      const layer = coreLayer(file)
      const allowed = {
        model: ['model'],
        geometry: ['model', 'geometry'],
        perimeter: ['model', 'geometry', 'perimeter'],
        terminal: ['model', 'geometry', 'perimeter', 'terminal'],
        orthogonal: ['model', 'geometry', 'perimeter', 'terminal', 'orthogonal'],
      }[layer]
      if (
        !allowed ||
        !allowed.includes(dependency.layer) ||
        (dependency.layer === 'orthogonal' &&
          (!file.startsWith(ROUTING + 'orthogonal/direction/') ||
            !dependency.target?.startsWith(ROUTING + 'orthogonal/direction/')))
      )
        fail(node, 'R03 dependency direction violation: ' + layer + ' -> ' + dependency.layer)
    }
    if (core && current.number === 4) {
      const from = r04Layer(file),
        to = r04Layer(dependency.target ?? '')
      const allowed = {
        model: ['model'],
        geometry: ['model', 'geometry'],
        perimeter: ['model', 'geometry', 'perimeter'],
        terminal: ['model', 'geometry', 'perimeter', 'terminal'],
        direction: ['model', 'geometry', 'perimeter', 'terminal', 'direction'],
        normalization: ['model', 'geometry', 'normalization'],
        validation: ['model', 'geometry', 'perimeter', 'terminal', 'normalization', 'validation'],
        router: [
          'model',
          'geometry',
          'perimeter',
          'terminal',
          'direction',
          'normalization',
          'validation',
          'router',
        ],
      }[from]
      if (!allowed?.includes(to))
        fail(node, 'R04 dependency direction violation: ' + from + ' -> ' + to)
    }
    if (
      tests &&
      current.number === 4 &&
      dependency.target?.startsWith(ROUTING) &&
      ![
        'model',
        'geometry',
        'perimeter',
        'terminal',
        'direction',
        'normalization',
        'validation',
        'router',
      ].includes(r04Layer(dependency.target))
    )
      fail(node, 'R04 tests depend on a later V2 layer: ' + dependency.target)
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

const R03_PREFIX = 'openspec/changes/' + R03 + '/'
const R03_APPROVAL = R03_PREFIX + 'evidence/pre-implementation-review.json'
const R03_REVIEWED = [
  ...R03_FROZEN,
  CURRENT,
  R03_PREFIX + '.openspec.yaml',
  R03_PREFIX + 'proposal.md',
  R03_PREFIX + 'design.md',
  R03_PREFIX + 'tasks.md',
  R03_PREFIX + 'specs/routing-direction-resolver/spec.md',
  R03_PREFIX + 'evidence/pre-implementation-gate-prompt.md',
]
const R04_PREFIX = 'openspec/changes/' + R04 + '/'
const R04_APPROVAL = R04_PREFIX + 'evidence/pre-implementation-review.json'
const R04_REVIEWED = [
  ...R03_FROZEN,
  CURRENT,
  ...R04_METADATA,
  ...[
    '.openspec.yaml',
    'proposal.md',
    'design.md',
    'tasks.md',
    'traceability.md',
    'specs/routing-orthogonal-router/spec.md',
    'evidence/fallback-decision.md',
    'evidence/pre-implementation-gate-prompt.md',
    'evidence/too-short-reference-probe.mjs',
    'evidence/gate-profile.md',
  ].map((file) => R04_PREFIX + file),
]

export function reviewCanonical(file, value, active = R03) {
  let text = canonicalText(value)
  if (active === R04 && file === CURRENT) {
    const names = [...text.matchAll(/^([A-Z][A-Z_0-9]*):/gm)].map((m) => m[1])
    if (new Set(names).size !== names.length) throw new Error('Duplicate CURRENT_CHANGE field')
    for (const [name, values] of [
      ['PHASE', ['PLANNING', 'IMPLEMENTATION', 'VERIFICATION']],
      ['PRE_IMPLEMENTATION_GATE', ['NOT_RUN', 'PENDING', 'PASS', 'FAIL']],
      ['IMPLEMENTATION_STATUS', ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE']],
      ['NEXT_CHANGE_ALLOWED', ['false']],
    ])
      if (!values.includes(field(text, name))) throw new Error('Invalid R04 process field ' + name)
    // Only named lifecycle fields are mutable; prose, scopes and all other keys
    // remain fingerprinted. Phase/baseline/approval are independently verified.
    return text.replace(
      /^(?:PHASE|BASE_COMMIT|APPROVED_PLANNING_COMMIT|PRE_IMPLEMENTATION_GATE|PRE_IMPLEMENTATION_GATE_EVIDENCE|IMPLEMENTATION_STATUS|IMPLEMENTATION_TASKS|IMPLEMENTATION_TESTS|VERIFICATION_STATUS|POST_IMPLEMENTATION_GATE|MACHINE_ARCHITECTURE_GATE|ARCHIVE_ALLOWED):[^\n]*(?:\n|$)/gm,
      '',
    )
  }
  if (file === CURRENT)
    text = text.replace(
      /^(?:PRE_IMPLEMENTATION_GATE|PRE_IMPLEMENTATION_GATE_EVIDENCE|PRE_REVALIDATION_REQUIRED):[^\n]*\n/gm,
      '',
    )
  if (file === (active === R04 ? R04_PREFIX : R03_PREFIX) + 'tasks.md')
    text = text.replace(/^(- \[)[ xX](\])/gm, '$1 $2')
  return text
}
const textHash = (value) => createHash('sha256').update(value).digest('hex')

export function planningReviewFingerprint(gitRoot = ROOT, active = R03) {
  return Object.fromEntries(
    (active === R04 ? R04_REVIEWED : R03_REVIEWED).map((file) => [
      file,
      textHash(reviewCanonical(file, fs.readFileSync(path.join(gitRoot, file), 'utf8'), active)),
    ]),
  )
}

export function reviewReportFingerprint(value, active = R03) {
  const report = canonicalText(value)
  const starts = [...report.matchAll(/^REVIEWED_ARTIFACTS_JSON_BEGIN\n/gm)]
  const ends = [...report.matchAll(/^REVIEWED_ARTIFACTS_JSON_END(?:\n|$)/gm)]
  if (starts.length !== 1 || ends.length !== 1) return null
  const from = starts[0].index + starts[0][0].length
  if (ends[0].index <= from) return null
  const body = report.slice(from, ends[0].index).trim()
  let fingerprint
  try {
    fingerprint = JSON.parse(body)
  } catch {
    return null
  }
  if (!fingerprint || Array.isArray(fingerprint) || typeof fingerprint !== 'object') return null
  // The reviewer command emits this canonical JSON. Re-serialization rejects
  // duplicate keys and other ambiguous encodings before values are trusted.
  if (body !== JSON.stringify(fingerprint, null, 2)) return null
  const reviewed = active === R04 ? R04_REVIEWED : R03_REVIEWED
  if (JSON.stringify(Object.keys(fingerprint).sort()) !== JSON.stringify([...reviewed].sort()))
    return null
  if (reviewed.some((file) => !/^[0-9a-f]{64}$/.test(fingerprint[file]))) return null
  return fingerprint
}

function verifyPlanningApproval(current, approved, git, gitRoot) {
  const r04 = current.activeChange === R04
  const active = r04 ? R04 : R03,
    base = r04 ? R04_BASE : R03_BASE
  const approval = r04 ? R04_APPROVAL : R03_APPROVAL
  const prefix = r04 ? R04_PREFIX : R03_PREFIX
  const reviewed = r04 ? R04_REVIEWED : R03_REVIEWED
  const control = r04 ? R04_CONTROL : R03_CONTROL
  if (r04) reviewCanonical(CURRENT, approved, R04)
  if (
    field(approved, 'PRE_IMPLEMENTATION_GATE') !== 'PASS' ||
    field(approved, 'PRE_IMPLEMENTATION_GATE_EVIDENCE') !== approval ||
    current.preEvidence !== approval ||
    field(approved, 'SEQUENCE_POSITION') !== (r04 ? 'R04_OF_10' : 'R03_OF_10') ||
    field(approved, 'PREVIOUS_CHANGE') !== (r04 ? R03 : R02) ||
    field(approved, 'PREVIOUS_CHANGE_STATUS') !== 'CLOSED' ||
    field(approved, 'PREVIOUS_CHANGE_ARCHIVED') !== 'true' ||
    field(approved, 'PREVIOUS_CHANGE_POST_IMPLEMENTATION_GATE') !== 'PASS' ||
    field(approved, 'IMPLEMENTATION_STATUS') !== 'NOT_STARTED' ||
    field(approved, 'NEXT_CHANGE_ALLOWED') !== 'false'
  )
    return false
  for (const [name, expected] of [
    ['IMPLEMENTATION_SCOPE', r04 ? R04_IMPLEMENTATION : R03_IMPLEMENTATION],
    ['PROCESS_CONTROL_SCOPE', control],
    ...(r04 ? [['TEST_TOOLING_SCOPE', R04_METADATA]] : []),
  ]) {
    if (JSON.stringify(section(approved, name).sort()) !== JSON.stringify([...expected].sort()))
      return false
  }
  git(['merge-base', '--is-ancestor', base, current.planningCommit])
  // Inspect each commit: a forbidden edit later reverted is still forbidden.
  const commits = git(['rev-list', '--parents', base + '..' + current.planningCommit])
    .trim()
    .split('\n')
    .filter(Boolean)
  if (!commits.length) return false
  for (const record of commits) {
    const [commit, ...parents] = record.split(' ')
    if (parents.length !== 1) return false
    const paths = git(['diff', '--no-renames', '--name-only', '-z', parents[0], commit, '--'])
      .split('\0')
      .filter(Boolean)
      .map(normalize)
    if (paths.some((file) => !inScope(file, control))) return false
  }
  const proofText = git(['show', current.planningCommit + ':' + approval])
  const proof = JSON.parse(proofText)
  if (r04 && canonicalText(proofText).trim() !== JSON.stringify(proof, null, 2)) return false
  if (
    proof.schemaVersion !== 1 ||
    proof.change !== active ||
    proof.gateType !== 'PRE_IMPLEMENTATION' ||
    proof.gateStatus !== 'PASS' ||
    proof.baseline !== base ||
    proof.reviewerContext !== 'fresh-read-only' ||
    proof.reportPath !== prefix + 'evidence/pre-implementation-gate-pass.md'
  )
    return false
  const report = canonicalText(git(['show', current.planningCommit + ':' + proof.reportPath]))
  if (proof.reportSha256 !== textHash(report)) return false
  for (const [name, expected] of [
    ['CHANGE', active],
    ['GATE_TYPE', 'PRE_IMPLEMENTATION'],
    ['GATE_STATUS', 'PASS'],
    ['READY_FOR_IMPLEMENTATION', 'YES'],
    ...(r04
      ? [
          ['MACHINE_GATE_INTEGRITY', 'PASS'],
          ['BLOCKERS', 'NONE'],
        ]
      : []),
  ]) {
    const entries = [...report.matchAll(new RegExp('^' + name + ':[ \\t]*(.+?)[ \\t]*$', 'gm'))]
    if (entries.length !== 1 || entries[0][1] !== expected) return false
  }
  if (
    !proof.artifacts ||
    JSON.stringify(Object.keys(proof.artifacts).sort()) !== JSON.stringify([...reviewed].sort())
  )
    return false
  const reviewedFingerprint = reviewReportFingerprint(report, active)
  if (
    !reviewedFingerprint ||
    reviewed.some((file) => reviewedFingerprint[file] !== proof.artifacts[file])
  )
    return false
  for (const file of reviewed) {
    if (
      proof.artifacts[file] !==
      textHash(reviewCanonical(file, git(['show', current.planningCommit + ':' + file]), active))
    )
      return false
  }
  return [
    ...reviewed.filter((file) => (r04 ? !R04_METADATA.includes(file) : file !== CURRENT)),
    approval,
    proof.reportPath,
  ].every((file) =>
    verifyFrozenFile(
      file,
      gitRoot,
      current.planningCommit,
      (text) => reviewCanonical(file, text, active),
      git,
    ),
  )
}

export function frozenWorktreeModeMatches(approvedMode, stat, platform, gitFileMode) {
  if (!stat.isFile()) return false
  // NTFS lacks a POSIX executable bit: require Git's explicit mode policy,
  // while approved tree, HEAD and INDEX still enforce the exact Git modes.
  if (platform === 'win32') return gitFileMode === 'false'
  return approvedMode === (stat.mode & 0o100 ? '100755' : '100644')
}

function regularWorktreePath(root, file) {
  let cursor = root
  const parts = file.split('/')
  for (const [index, part] of parts.entries()) {
    if (!part || part === '.' || part === '..') return false
    cursor = path.join(cursor, part)
    const stat = fs.lstatSync(cursor)
    if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile()))
      return false
  }
  return true
}

// Use ESLint's already locked YAML parser; no dependency installation or
// workspace metadata edit is needed to run the planning gate.
function parseMetadata(file, value) {
  const requireRoot = createRequire(path.join(ROOT, 'package.json'))
  const yaml = createRequire(requireRoot.resolve('eslint/package.json'))('js-yaml')
  const documents = yaml.loadAll(value, undefined, { schema: yaml.JSON_SCHEMA, json: false })
  if (
    !documents.length ||
    documents.some((doc) => !doc || typeof doc !== 'object' || Array.isArray(doc))
  )
    throw new Error('Expected metadata mappings')
  if (file.endsWith('.json')) {
    if (documents.length !== 1 || !isDeepStrictEqual(documents[0], JSON.parse(value)))
      throw new Error('Invalid package JSON')
    return documents[0]
  }
  // pnpm 12 uses separate package-manager and workspace YAML documents.
  // Preserve and compare every document; only one may own Draw's importer.
  metadataDependencies(file, documents)
  return documents
}

function metadataDependencies(file, parsed) {
  if (file.endsWith('.json')) return parsed.devDependencies
  const owners = parsed.filter((doc) => Object.hasOwn(doc.importers ?? {}, 'packages/draw'))
  if (owners.length !== 1)
    throw new Error('Expected exactly one Draw importer across lock documents')
  return owners[0].importers['packages/draw'].devDependencies
}

export function r04MetadataAllowed(file, baseline, candidate) {
  try {
    if (!R04_METADATA.includes(file)) return false
    const before = parseMetadata(file, baseline)
    // YAML aliases can share maps across importers. Detach them before removing
    // Draw's allowed key, otherwise deleting it could hide another importer edit.
    // Cyclic aliases cannot represent package metadata and fail closed here.
    const after = JSON.parse(JSON.stringify(parseMetadata(file, candidate)))
    if (isDeepStrictEqual(before, after)) return true
    const original = metadataDependencies(file, before)
    const changed = metadataDependencies(file, after)
    if (!original || !changed || Object.hasOwn(original, 'fast-check')) return false
    const expected = file.endsWith('.json') ? '4.10.2' : { specifier: '4.10.2', version: '4.10.2' }
    if (!isDeepStrictEqual(changed['fast-check'], expected)) return false
    delete changed['fast-check']
    return isDeepStrictEqual(before, after)
  } catch {
    return false
  }
}

export function r04MetadataFindings(current, gitRoot = ROOT) {
  const findings = []
  const git = (args) =>
    execFileSync('git', args, { cwd: gitRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const fail = (file, snapshot, error) =>
    findings.push({ file, reason: '[' + snapshot + '] R04 package metadata: ' + error })
  const baselines = new Map()
  try {
    for (const file of R04_METADATA) {
      const entries = gitSnapshotEntries(
        git(['ls-tree', '-z', current.baseCommit, '--', file]),
        'HEAD',
      )
      if (entries.length !== 1 || entries[0].mode !== '100644')
        throw new Error('Baseline metadata must be regular nonexecutable files')
      baselines.set(file, git(['show', current.baseCommit + ':' + file]))
    }
    for (const snapshot of ['HEAD', 'INDEX', 'WORKTREE']) {
      const flags = []
      for (const file of R04_METADATA) {
        try {
          let content
          if (snapshot === 'WORKTREE') {
            if (
              !regularWorktreePath(gitRoot, file) ||
              !frozenWorktreeModeMatches(
                '100644',
                fs.lstatSync(path.join(gitRoot, file)),
                process.platform,
                git(['config', '--bool', 'core.filemode']).trim(),
              )
            )
              throw new Error('Invalid worktree file type/mode')
            content = fs.readFileSync(path.join(gitRoot, file), 'utf8')
          } else {
            const entries = gitSnapshotEntries(
              git(
                snapshot === 'HEAD'
                  ? ['ls-tree', '-z', 'HEAD', '--', file]
                  : ['ls-files', '--stage', '-z', '--', file],
              ),
              snapshot,
            )
            if (entries.length !== 1 || entries[0].mode !== '100644' || entries[0].stage !== '0')
              throw new Error('Missing/unmerged/invalid metadata mode')
            content = git(['show', (snapshot === 'HEAD' ? 'HEAD:' : ':') + file])
          }
          if (!r04MetadataAllowed(file, baselines.get(file), content))
            throw new Error('Only exact fast-check 4.10.2 addition is authorized')
          const parsed = parseMetadata(file, content)
          flags.push(Object.hasOwn(metadataDependencies(file, parsed), 'fast-check'))
        } catch (error) {
          fail(file, snapshot, error.message)
        }
      }
      if (flags.length === 2 && flags[0] !== flags[1])
        fail(R04_METADATA.join(' + '), snapshot, 'Package/lock importer mismatch')
    }
  } catch (error) {
    fail(R04_METADATA.join(' + '), 'BASELINE', error.message)
  }
  return findings
}

function r04PathModeFindings(files, gitRoot = ROOT) {
  const findings = []
  const git = (args) =>
    execFileSync('git', args, { cwd: gitRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  for (const file of files) {
    for (const [snapshot, args] of [
      ['HEAD', ['ls-tree', '-z', 'HEAD', '--', file]],
      ['INDEX', ['ls-files', '--stage', '-z', '--', file]],
    ])
      for (const entry of gitSnapshotEntries(git(args), snapshot)) {
        if (
          entry.file !== file ||
          entry.stage !== '0' ||
          !['100644', '100755'].includes(entry.mode)
        )
          findings.push({ file, reason: '[' + snapshot + '] Invalid R04 path type/mode/stage' })
      }
    try {
      // lstat catches dangling links too; do not test existsSync first.
      fs.lstatSync(path.join(gitRoot, file))
      if (!regularWorktreePath(gitRoot, file))
        findings.push({ file, reason: '[WORKTREE] Invalid R04 path or symlink ancestor' })
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  return findings
}

export function verifyFrozenGate(current, gitRoot = ROOT) {
  const r03 = current.activeChange === R03
  const r04 = current.activeChange === R04
  const active = r04 ? R04 : r03 ? R03 : R02
  const base = r04 ? R04_BASE : r03 ? R03_BASE : R02_BASE
  if (current.baseCommit !== current.planningCommit)
    throw new Error('BASE_COMMIT must equal APPROVED_PLANNING_COMMIT during implementation')
  if (!/^[0-9a-f]{40}$/i.test(current.planningCommit ?? ''))
    throw new Error('APPROVED_PLANNING_COMMIT must pin the frozen planning gate')
  const cache = new Map()
  const git = (args) => {
    const key = JSON.stringify(args)
    if (!cache.has(key))
      cache.set(
        key,
        execFileSync('git', args, {
          cwd: gitRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      )
    return cache.get(key)
  }
  git(['merge-base', '--is-ancestor', current.planningCommit, 'HEAD'])
  const approved = git(['show', current.planningCommit + ':' + CURRENT])
  if (
    field(approved, 'ACTIVE_CHANGE') !== active ||
    field(approved, 'PHASE') !== 'PLANNING' ||
    field(approved, 'BASE_COMMIT') !== base
  )
    throw new Error('Approved planning commit is not the active change planning checkpoint')
  if (r03 || r04) return verifyPlanningApproval(current, approved, git, gitRoot)
  return [SCRIPT].every((frozenFile) =>
    verifyFrozenFile(frozenFile, gitRoot, current.planningCommit),
  )
}

function verifyFrozenFile(
  frozenFile,
  gitRoot,
  planningCommit,
  canonicalize = canonicalText,
  runner,
) {
  const git =
    runner ??
    ((args) =>
      execFileSync('git', args, {
        cwd: gitRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }))
  const approvedEntries = gitSnapshotEntries(
    git(['ls-tree', '-z', planningCommit, '--', frozenFile]),
    'HEAD',
  )
  if (approvedEntries.length !== 1 || !['100644', '100755'].includes(approvedEntries[0].mode))
    return false
  const approvedMode = approvedEntries[0].mode
  for (const [snapshot, args] of [
    ['HEAD', ['ls-tree', '-z', 'HEAD', '--', frozenFile]],
    ['INDEX', ['ls-files', '--stage', '-z', '--', frozenFile]],
  ]) {
    const entries = gitSnapshotEntries(git(args), snapshot)
    if (
      entries.length !== 1 ||
      entries[0].file !== frozenFile ||
      entries[0].stage !== '0' ||
      entries[0].mode !== approvedMode
    )
      return false
  }
  const stat = fs.lstatSync(path.join(gitRoot, frozenFile))
  if (!regularWorktreePath(gitRoot, frozenFile)) return false
  const gitFileMode = git(['config', '--bool', 'core.filemode']).trim()
  if (!frozenWorktreeModeMatches(approvedMode, stat, process.platform, gitFileMode)) return false

  const frozen = git(['show', planningCommit + ':' + frozenFile])
  // No live Git layer may hide a frozen-control edit in another layer.
  // Missing or unmerged snapshots throw and make the installed gate fail closed.
  const snapshots = [
    git(['show', 'HEAD:' + frozenFile]),
    git(['show', ':' + frozenFile]),
    fs.readFileSync(path.join(gitRoot, frozenFile), 'utf8'),
  ]
  return snapshots.every((snapshot) => canonicalize(snapshot) === canonicalize(frozen))
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
export function trackedSnapshotFindings(current, changed, boundary, gitRoot = ROOT) {
  const findings = []
  const checked = new Set()
  const git = (args) =>
    execFileSync('git', args, {
      cwd: gitRoot,
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
    if ([R02, R03, R04].includes(current.activeChange) && current.phase !== 'PLANNING')
      current.frozenGateVerified = verifyFrozenGate(current)
    const boundary = protectedPaths()
    if (boundary.algorithms.size === 0)
      throw new Error('Protected legacy boundary could not be parsed')
    const files = changedFiles(current.baseCommit)
    findings.push(...scopeFindings(current, files, boundary))
    if (current.activeChange === R04) findings.push(...r04PathModeFindings(files))
    if (current.activeChange === R04 && current.phase !== 'PLANNING')
      findings.push(...r04MetadataFindings(current))
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

function r03ApprovalRegressions(check) {
  const prefix = 'openspec/changes/' + R03 + '/'
  const evidencePath = prefix + 'evidence/pre-implementation-review.json'
  const reportPath = prefix + 'evidence/pre-implementation-gate-pass.md'
  const artifacts = [
    ...R03_FROZEN,
    CURRENT,
    prefix + '.openspec.yaml',
    prefix + 'proposal.md',
    prefix + 'design.md',
    prefix + 'tasks.md',
    prefix + 'specs/routing-direction-resolver/spec.md',
    prefix + 'evidence/pre-implementation-gate-prompt.md',
  ]
  const sourceObjects = path.resolve(
    ROOT,
    execFileSync('git', ['rev-parse', '--git-path', 'objects'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim(),
  )
  const results = []
  for (const kind of [
    'valid',
    'missing-fingerprint',
    'duplicate-fingerprint',
    'malformed-fingerprint',
    'duplicate-fingerprint-key',
    'changed-artifact-recomputed-manifest',
    'pending',
    'missing-pre',
    'missing-evidence',
    'fail-evidence',
    'fail-report',
    'bad-report-hash',
    'bad-artifact-hash',
    'forbidden-checkpoint',
    'forbidden-history-restored',
  ]) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'frade-r03-approval-'))
    try {
      const git = (args) =>
        execFileSync('git', args, {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }).trim()
      const write = (file, value) => {
        fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
        fs.writeFileSync(path.join(root, file), value)
      }
      git(['init', '--quiet'])
      git(['config', 'user.name', 'Routing approval fixture'])
      git(['config', 'user.email', 'routing-gate@example.invalid'])
      git(['config', 'core.autocrlf', 'false'])
      git(['config', 'core.filemode', 'false'])
      write('.git/objects/info/alternates', normalize(sourceObjects) + '\n')
      git(['symbolic-ref', 'HEAD', 'refs/heads/main'])
      git(['update-ref', 'refs/heads/main', R03_BASE])
      git(['read-tree', R03_BASE])
      const pre = kind === 'pending' ? 'PENDING' : 'PASS'
      const state =
        [
          'ACTIVE_CHANGE: ' + R03,
          'PREVIOUS_CHANGE: ' + R02,
          'PHASE: PLANNING',
          'BASE_COMMIT: ' + R03_BASE,
          'SEQUENCE_POSITION: R03_OF_10',
          'PREVIOUS_CHANGE_STATUS: CLOSED',
          'PREVIOUS_CHANGE_ARCHIVED: true',
          'PREVIOUS_CHANGE_POST_IMPLEMENTATION_GATE: PASS',
          'NEXT_CHANGE_ALLOWED: false',
          'IMPLEMENTATION_STATUS: NOT_STARTED',
          ...(kind === 'missing-pre' ? [] : ['PRE_IMPLEMENTATION_GATE: ' + pre]),
          'PRE_IMPLEMENTATION_GATE_EVIDENCE: ' + evidencePath,
          '## IMPLEMENTATION_SCOPE',
          ...R03_IMPLEMENTATION,
          '## PROCESS_CONTROL_SCOPE',
          ...R03_CONTROL,
        ].join('\n') + '\n'
      for (const file of artifacts) {
        let content = 'reviewed fixture ' + file + '\n'
        if (file === CURRENT) content = state
        else if ([MASTER, PLAYBOOK, LEGACY_DOC, 'AGENTS.md', ROUTING + 'AGENTS.md'].includes(file))
          content = execFileSync('git', ['show', R03_BASE + ':' + file], {
            cwd: ROOT,
            encoding: 'utf8',
          })
        write(file, content)
      }
      const hashes = Object.fromEntries(
        artifacts.map((file) => {
          let content = fs.readFileSync(path.join(root, file), 'utf8').replaceAll('\r\n', '\n')
          if (file === CURRENT)
            content = content.replace(
              /^(?:PRE_IMPLEMENTATION_GATE|PRE_IMPLEMENTATION_GATE_EVIDENCE|PRE_REVALIDATION_REQUIRED):[^\n]*\n/gm,
              '',
            )
          if (file.endsWith('/tasks.md')) content = content.replace(/^(- \[)[ xX](\])/gm, '$1 $2')
          return [file, createHash('sha256').update(content).digest('hex')]
        }),
      )
      const report =
        'CHANGE: ' +
        R03 +
        '\nGATE_TYPE: PRE_IMPLEMENTATION\nGATE_STATUS: ' +
        (kind === 'fail-report' ? 'FAIL' : 'PASS') +
        '\nREADY_FOR_IMPLEMENTATION: YES\n'
      let fingerprint = JSON.stringify(hashes, null, 2)
      if (kind === 'malformed-fingerprint') fingerprint = '{invalid JSON'
      if (kind === 'duplicate-fingerprint-key')
        fingerprint = fingerprint.replace(
          '{\n',
          '{\n  "' + SCRIPT + '": "' + hashes[SCRIPT] + '",\n',
        )
      const fingerprintBlock =
        '\nREVIEWED_ARTIFACTS_JSON_BEGIN\n' + fingerprint + '\nREVIEWED_ARTIFACTS_JSON_END\n'
      let savedReport = report + (kind === 'missing-fingerprint' ? '' : fingerprintBlock)
      if (kind === 'duplicate-fingerprint') savedReport += fingerprintBlock
      write(reportPath, savedReport)
      if (kind === 'changed-artifact-recomputed-manifest') {
        const design = prefix + 'design.md'
        write(design, 'unreviewed planning content\n')
        hashes[design] = createHash('sha256').update('unreviewed planning content\n').digest('hex')
        check(
          'stale report attack preserves actual saved report bytes',
          fs.readFileSync(path.join(root, reportPath), 'utf8') === savedReport,
        )
      }
      const review = {
        schemaVersion: 1,
        change: R03,
        gateType: 'PRE_IMPLEMENTATION',
        gateStatus: kind === 'fail-evidence' ? 'FAIL' : 'PASS',
        baseline: R03_BASE,
        reviewerContext: 'fresh-read-only',
        reportPath,
        reportSha256: createHash('sha256').update(savedReport).digest('hex'),
        artifacts: hashes,
      }
      if (kind === 'bad-report-hash') review.reportSha256 = '0'.repeat(64)
      if (kind === 'bad-artifact-hash') review.artifacts[SCRIPT] = '0'.repeat(64)
      if (kind !== 'missing-evidence') write(evidencePath, JSON.stringify(review, null, 2) + '\n')
      git([
        'add',
        '--',
        ...artifacts,
        reportPath,
        ...(kind === 'missing-evidence' ? [] : [evidencePath]),
      ])
      const forbidden = ROUTING + 'model/approval-laundering.ts'
      if (kind === 'forbidden-checkpoint' || kind === 'forbidden-history-restored') {
        write(forbidden, 'export const illegal = true\n')
        git(['add', '--', forbidden])
        if (kind === 'forbidden-history-restored') {
          git(['commit', '--quiet', '-m', 'Illegal planning product fixture'])
          git(['rm', '--quiet', '--', forbidden])
        }
      }
      git(['commit', '--quiet', '-m', 'Approval checkpoint fixture'])
      const sha = git(['rev-parse', 'HEAD'])
      let accepted
      try {
        accepted = verifyFrozenGate(
          { activeChange: R03, baseCommit: sha, planningCommit: sha, preEvidence: evidencePath },
          root,
        )
      } catch {
        accepted = false
      }
      results.push({ kind, accepted, expected: kind === 'valid' })
    } finally {
      const resolved = path.resolve(root)
      assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()))
      assert.ok(path.basename(resolved).startsWith('frade-r03-approval-'))
      fs.rmSync(resolved, { recursive: true, force: true })
    }
  }
  const stat = { isFile: () => true, mode: 0o100755 }
  const modeProbe = vm.runInNewContext('(' + verifyFrozenFile.toString() + ')', {
    fs: { lstatSync: () => stat, readFileSync: () => 'original\n' },
    path,
    process: { platform: 'linux' },
    gitSnapshotEntries,
    canonicalText,
    regularWorktreePath: () => true, // This probe isolates POSIX mode handling.
    frozenWorktreeModeMatches:
      typeof frozenWorktreeModeMatches === 'function' ? frozenWorktreeModeMatches : undefined,
    execFileSync: (_command, args) =>
      args.includes('ls-tree')
        ? '100644 abc\t' + SCRIPT + '\0'
        : args.includes('ls-files')
          ? '100644 abc 0\t' + SCRIPT + '\0'
          : args.includes('config')
            ? 'false\n'
            : 'original\n',
  })
  results.push({
    kind: 'POSIX-worktree-executable-mismatch',
    accepted: modeProbe(SCRIPT, '/fixture', 'a'.repeat(40)),
    expected: false,
  })
  const regular = { isFile: () => true, mode: 0o100644 }
  check(
    'POSIX non-executable positive',
    frozenWorktreeModeMatches('100644', regular, 'linux', 'false'),
  )
  check('POSIX executable positive', frozenWorktreeModeMatches('100755', stat, 'linux', 'true'))
  check(
    'POSIX removed execute bit fails',
    !frozenWorktreeModeMatches('100755', regular, 'linux', 'false'),
  )
  check(
    'Windows explicit mode policy positive',
    frozenWorktreeModeMatches('100755', regular, 'win32', 'false'),
  )
  check(
    'Windows unsupported mode policy fails',
    !frozenWorktreeModeMatches('100644', regular, 'win32', 'true'),
  )
  check(
    'WORKTREE symlink or directory fails',
    !frozenWorktreeModeMatches('100644', { isFile: () => false }, 'win32', 'false'),
  )
  const unusual = 'packages/draw/tests/routing-v2/direction/tab\tline\nname.ts'
  for (const snapshot of ['HEAD', 'INDEX']) {
    const record = (snapshot === 'INDEX' ? '100644 abc 0\t' : '100644 blob abc\t') + unusual + '\0'
    const entries = gitSnapshotEntries(record, snapshot)
    check(
      snapshot + ' NUL TAB/LF parser preserves full path',
      entries.length === 1 && entries[0].file === unusual,
    )
  }
  const failures = results.filter((x) => x.accepted !== x.expected)
  if (failures.length)
    console.error('R03_APPROVAL_REGRESSION_FAILURES: ' + JSON.stringify(failures))
  check('R03 approval and mode regressions: ' + JSON.stringify(failures), failures.length === 0)
  for (const result of results)
    check('R03 approval regression ' + result.kind, result.accepted === result.expected)
}

function r04GitRegressions(check, planning, impl, boundary) {
  const temporary = (prefix, run) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix))
    const git = (args) =>
      execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    const write = (file, text) => {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
      // The fixture disables autocrlf; reproduce repository blob line endings
      // rather than inventing forbidden CRLF-only edits in inherited contracts.
      fs.writeFileSync(path.join(root, file), canonicalText(text))
    }
    try {
      git(['init', '--quiet'])
      git(['config', 'user.name', 'R04 gate fixture'])
      git(['config', 'user.email', 'r04@example.invalid'])
      git(['config', 'commit.gpgsign', 'false'])
      git(['config', 'core.autocrlf', 'false'])
      git(['config', 'core.filemode', 'false'])
      run(root, git, write)
    } finally {
      const resolved = path.resolve(root)
      assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()))
      assert.ok(path.basename(resolved).startsWith(prefix))
      fs.rmSync(resolved, { recursive: true, force: true })
    }
  }
  temporary('frade-r04-discovery-', (root, git, write) => {
    const forbidden = ROUTING + 'model/forbidden.ts',
      allowed = ROUTING + 'orthogonal/router/allowed.ts'
    const original = 'export const original = true\n'
    for (const file of [forbidden, allowed]) write(file, original)
    git(['add', '--', forbidden, allowed])
    git(['commit', '--quiet', '-m', 'baseline'])
    const base = git(['rev-parse', 'HEAD']).trim()
    const expectPath = (label, file, sourceArgs, rejected) => {
      check(label + ' exact source', git(sourceArgs).split('\0').includes(file))
      const paths = changedFiles(base, root)
      check(label + ' discovered', paths.includes(file))
      check(
        label + ' scope result',
        scopeFindings(impl, paths, boundary).some((f) => f.file === file) === rejected,
      )
    }
    for (const file of [forbidden, allowed]) {
      write(file, 'export const changed=true\n')
      git(['add', '--', file])
      write(file, original)
      check(
        'R04 net diff cancellation ' + file,
        git(['diff', '--name-only', base, '--', file]).trim() === '',
      )
      expectPath(
        'R04 staged cancellation',
        file,
        ['diff', '--cached', '--no-renames', '--name-only', '-z'],
        file === forbidden,
      )
      git(['restore', '--staged', '--', file])
      fs.unlinkSync(path.join(root, file))
      git(['add', '--', file])
      write(file, original)
      expectPath(
        'R04 deletion/recreation',
        file,
        ['diff', '--cached', '--no-renames', '--name-only', '-z'],
        file === forbidden,
      )
      check(
        'R04 recreation untracked source',
        git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').includes(file),
      )
      git(['add', '--', file])
      write(file, 'export const changed=true\n')
      expectPath(
        'R04 unstaged',
        file,
        ['diff', '--no-renames', '--name-only', '-z'],
        file === forbidden,
      )
      write(file, original)
    }
    write(forbidden, 'committed\n')
    git(['add', '--', forbidden])
    git(['commit', '--quiet', '-m', 'committed forbidden'])
    write(forbidden, original)
    expectPath(
      'R04 committed cancellation',
      forbidden,
      ['diff', '--no-renames', '--name-only', '-z', base, 'HEAD'],
      true,
    )
    const unusual =
      process.platform === 'win32'
        ? 'brand/данные with spaces.txt'
        : 'brand/данные\twith\nnewline.txt'
    write(unusual, 'unrelated\n')
    expectPath(
      'R04 NUL-safe untracked',
      unusual,
      ['ls-files', '--others', '--exclude-standard', '-z'],
      true,
    )
    const destination = ROUTING + 'segment/copy.ts'
    write(destination, original)
    git(['add', '--', destination])
    expectPath(
      'R04 forbidden copy destination',
      destination,
      ['diff', '--cached', '--name-only', '--no-renames', '-z'],
      true,
    )
    const moved = ROUTING + 'normalization/moved.ts'
    fs.mkdirSync(path.dirname(path.join(root, moved)), { recursive: true })
    fs.renameSync(path.join(root, allowed), path.join(root, moved))
    git(['add', '--', allowed, moved])
    for (const file of [allowed, moved])
      expectPath(
        'R04 rename old/new',
        file,
        ['diff', '--cached', '--no-renames', '--name-only', '-z'],
        false,
      )
    const stagedRouter = ROUTING + 'orthogonal/router/staged.ts'
    write(stagedRouter, 'import "react"\n')
    git(['add', '--', stagedRouter])
    write(stagedRouter, 'export {}\n')
    const snapshots = trackedSnapshotFindings(impl, changedFiles(base, root), boundary, root)
    check(
      'R04 staged import retained',
      snapshots.findings.some(
        (f) =>
          f.file === stagedRouter && f.reason.includes('[INDEX]') && f.reason.includes('Framework'),
      ),
    )
    git(['commit', '--quiet', '-m', 'bad source snapshot'])
    write(stagedRouter, 'export {}\n')
    git(['add', '--', stagedRouter])
    check(
      'R04 committed import retained',
      trackedSnapshotFindings(impl, changedFiles(base, root), boundary, root).findings.some(
        (f) =>
          f.file === stagedRouter && f.reason.includes('[HEAD]') && f.reason.includes('Framework'),
      ),
    )
    const link = R04_PREFIX + 'evidence/link.md'
    const blob = git(['hash-object', '-w', '--stdin']).trim()
    // Empty blob is sufficient: Git mode, not target contents, must cause rejection.
    git(['update-index', '--add', '--cacheinfo', '120000,' + blob + ',' + link])
    check(
      'R04 evidence staged symlink rejected',
      r04PathModeFindings([link], root).some((f) => f.reason.includes('[INDEX]')),
    )
    check(
      'R04 unusual path parser',
      gitSnapshotEntries('100644 abc\tspace\tand\nnewline.md\0', 'HEAD')[0].file ===
        'space\tand\nnewline.md',
    )
    write('target/item.md', 'fixture\n')
    fs.symlinkSync(
      path.join(root, 'target'),
      path.join(root, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
    check(
      'R04 symlink ancestor rejected',
      r04PathModeFindings(['linked/item.md'], root).some((f) =>
        f.reason.includes('symlink ancestor'),
      ),
    )
  })
  temporary('frade-r04-approval-', (root, git, write) => {
    const objects = path.resolve(
      ROOT,
      execFileSync('git', ['rev-parse', '--git-path', 'objects'], {
        cwd: ROOT,
        encoding: 'utf8',
      }).trim(),
    )
    write('.git/objects/info/alternates', normalize(objects) + '\n')
    git(['symbolic-ref', 'HEAD', 'refs/heads/main'])
    git(['update-ref', 'refs/heads/main', R04_BASE])
    git(['read-tree', R04_BASE])
    const approvedState =
      read(CURRENT).replace(/^PRE_IMPLEMENTATION_GATE:.*$/m, 'PRE_IMPLEMENTATION_GATE: PASS') +
      '\nPRE_IMPLEMENTATION_GATE_EVIDENCE: ' +
      R04_APPROVAL +
      '\n'
    for (const file of R04_REVIEWED) write(file, file === CURRENT ? approvedState : read(file))
    const artifacts = planningReviewFingerprint(root, R04)
    const reportPath = R04_PREFIX + 'evidence/pre-implementation-gate-pass.md'
    const report =
      'CHANGE: ' +
      R04 +
      '\nGATE_TYPE: PRE_IMPLEMENTATION\nGATE_STATUS: PASS\nBLOCKERS: NONE\nMACHINE_GATE_INTEGRITY: PASS\nREADY_FOR_IMPLEMENTATION: YES\n' +
      'REVIEWED_ARTIFACTS_JSON_BEGIN\n' +
      JSON.stringify(artifacts, null, 2) +
      '\nREVIEWED_ARTIFACTS_JSON_END\n'
    const proof = {
      schemaVersion: 1,
      change: R04,
      gateType: 'PRE_IMPLEMENTATION',
      gateStatus: 'PASS',
      baseline: R04_BASE,
      reviewerContext: 'fresh-read-only',
      reportPath,
      reportSha256: textHash(report),
      artifacts,
    }
    const proofText = JSON.stringify(proof, null, 2) + '\n'
    write(reportPath, report)
    write(R04_APPROVAL, proofText)
    git(['add', '--', ...R04_REVIEWED, R04_APPROVAL, reportPath])
    git(['commit', '--quiet', '-m', 'reviewed planning fixture'])
    const sha = git(['rev-parse', 'HEAD']).trim()
    const state = { ...impl, baseCommit: sha, planningCommit: sha, preEvidence: R04_APPROVAL }
    const verify = () => {
      try {
        return verifyFrozenGate(state, root)
      } catch {
        return false
      }
    }
    check('R04 approved checkpoint valid', verify())
    check('R04 baseline metadata valid', r04MetadataFindings(state, root).length === 0)
    const liveState =
      approvedState
        .replace(/^PHASE:.*$/m, 'PHASE: IMPLEMENTATION')
        .replace(/^BASE_COMMIT:.*$/m, 'BASE_COMMIT: ' + sha)
        .replace(/^IMPLEMENTATION_STATUS:.*$/m, 'IMPLEMENTATION_STATUS: IN_PROGRESS') +
      '\nAPPROVED_PLANNING_COMMIT: ' +
      sha +
      '\n'
    // Keep blank-line layout stable; only named lifecycle fields are mutable.
    write(
      CURRENT,
      liveState.replace(/\n\nAPPROVED_PLANNING_COMMIT:/, '\nAPPROVED_PLANNING_COMMIT:'),
    )
    check('R04 lifecycle fields preserve fingerprint', verify())
    write(CURRENT, approvedState)
    for (const file of R04_REVIEWED.filter((f) => !R04_METADATA.includes(f)).concat(
      R04_APPROVAL,
      reportPath,
    )) {
      const original = fs.readFileSync(path.join(root, file), 'utf8')
      write(file, original + 'unapproved contract edit\n')
      git(['add', '--', file])
      write(file, original)
      check('R04 frozen staged path found ' + file, changedFiles(sha, root).includes(file))
      check('R04 frozen staged cancellation ' + file, !verify())
      git(['restore', '--staged', '--', file])
      write(file, original + 'unapproved contract edit\n')
      check('R04 frozen worktree ' + file, !verify())
      write(file, original)
    }
    check('R04 restored controls valid', verify())
    const task = R04_PREFIX + 'tasks.md',
      taskText = fs.readFileSync(path.join(root, task), 'utf8')
    write(task, taskText.replace('- [ ] 1.2', '- [x] 1.2'))
    check('R04 checked tasks permitted', verify())
    write(task, taskText)
    write(CURRENT, approvedState + 'PHASE: IMPLEMENTATION\n')
    check('R04 duplicate current key rejected', !verify())
    write(CURRENT, approvedState)
    git(['update-index', '--chmod=+x', SCRIPT])
    check('R04 index executable mode rejected', !verify())
    git(['update-index', '--chmod=-x', SCRIPT])
    const originalPackage = fs.readFileSync(path.join(root, R04_METADATA[0]), 'utf8')
    const originalLock = fs.readFileSync(path.join(root, R04_METADATA[1]), 'utf8')
    const p = JSON.parse(originalPackage),
      l = parseMetadata(R04_METADATA[1], originalLock)
    p.devDependencies['fast-check'] = '4.10.2'
    metadataDependencies(R04_METADATA[1], l)['fast-check'] = {
      specifier: '4.10.2',
      version: '4.10.2',
    }
    write(R04_METADATA[0], JSON.stringify(p))
    write(R04_METADATA[1], l.map((doc) => JSON.stringify(doc)).join('\n---\n'))
    check('R04 exact package pair accepted', r04MetadataFindings(state, root).length === 0)
    git(['add', '--', ...R04_METADATA])
    write(R04_METADATA[0], originalPackage)
    write(R04_METADATA[1], originalLock)
    check(
      'R04 allowed staged inverse metadata accepted',
      r04MetadataFindings(state, root).length === 0,
    )
    p.scripts.test = 'exit 0'
    write(R04_METADATA[0], JSON.stringify(p))
    git(['add', '--', R04_METADATA[0]])
    write(R04_METADATA[0], originalPackage)
    check(
      'R04 forbidden staged inverse metadata rejected',
      r04MetadataFindings(state, root).some((f) => f.reason.includes('[INDEX]')),
    )
    git(['restore', '--staged', '--', ...R04_METADATA])
    write(
      R04_METADATA[0],
      JSON.stringify({
        ...JSON.parse(originalPackage),
        devDependencies: { ...JSON.parse(originalPackage).devDependencies, 'fast-check': '4.10.2' },
      }),
    )
    check(
      'R04 unmatched lock rejected',
      r04MetadataFindings(state, root).some((f) => f.reason.includes('mismatch')),
    )
    write(R04_METADATA[0], originalPackage)
    // Checkpoint attacks commit only planning controls; no product edits can
    // be hidden by a later control-only checkpoint.
    for (const kind of [
      'missing-fingerprint',
      'duplicate-fingerprint',
      'wrong-status',
      'stale-report',
    ]) {
      let badReport = report,
        badProof = structuredClone(proof)
      if (kind === 'missing-fingerprint')
        badReport = report.split('REVIEWED_ARTIFACTS_JSON_BEGIN')[0]
      if (kind === 'duplicate-fingerprint')
        badReport += report.slice(report.indexOf('REVIEWED_ARTIFACTS_JSON_BEGIN'))
      if (kind === 'wrong-status')
        badReport = report.replace('GATE_STATUS: PASS', 'GATE_STATUS: FAIL')
      if (kind === 'stale-report') {
        write(R04_PREFIX + 'design.md', 'unreviewed design\n')
        badProof.artifacts[R04_PREFIX + 'design.md'] = textHash('unreviewed design\n')
      }
      badProof.reportSha256 = textHash(badReport)
      write(reportPath, badReport)
      write(R04_APPROVAL, JSON.stringify(badProof, null, 2) + '\n')
      git(['add', '--', reportPath, R04_APPROVAL, R04_PREFIX + 'design.md'])
      git(['commit', '--quiet', '-m', 'invalid ' + kind])
      state.baseCommit = state.planningCommit = git(['rev-parse', 'HEAD']).trim()
      check('R04 checkpoint rejects ' + kind, !verify())
      write(reportPath, report)
      write(R04_APPROVAL, proofText)
      write(R04_PREFIX + 'design.md', read(R04_PREFIX + 'design.md'))
    }
    git(['add', '--', reportPath, R04_APPROVAL, R04_PREFIX + 'design.md'])
    git(['commit', '--quiet', '-m', 'restore valid approval'])
    state.baseCommit = state.planningCommit = git(['rev-parse', 'HEAD']).trim()
    check('R04 valid report restored', verify())
    write(SCRIPT, read(SCRIPT) + '\n// unapproved committed content\n')
    git(['add', '--', SCRIPT])
    git(['commit', '--quiet', '-m', 'committed frozen edit'])
    write(SCRIPT, read(SCRIPT))
    git(['add', '--', SCRIPT])
    check('R04 frozen HEAD hidden by index/worktree rejected', !verify())
    git(['commit', '--quiet', '-m', 'restore frozen control'])
    check('R04 same baseline valid after restoration', verify())
    const forbidden = ROUTING + 'model/illegal-planning.ts'
    write(forbidden, 'export {}\n')
    git(['add', '--', forbidden])
    git(['commit', '--quiet', '-m', 'illegal planning product'])
    git(['rm', '--', forbidden])
    git(['commit', '--quiet', '-m', 'remove illegal product'])
    state.baseCommit = state.planningCommit = git(['rev-parse', 'HEAD']).trim()
    check('R04 reverted forbidden planning history rejected', !verify())
    write(R04_METADATA[0], JSON.stringify(p))
    git(['add', '--', R04_METADATA[0]])
    git(['commit', '--quiet', '-m', 'forbidden committed metadata'])
    write(R04_METADATA[0], originalPackage)
    git(['add', '--', R04_METADATA[0]])
    check(
      'R04 committed metadata cannot hide behind index/worktree',
      r04MetadataFindings({ ...state, baseCommit: sha }, root).some((f) =>
        f.reason.includes('[HEAD]'),
      ),
    )
  })
}

function r04Regressions(check) {
  const current = {
    activeChange: 'routing-v2-04-orthogonal-router',
    number: 4,
    phase: 'PLANNING',
    sequence: 'R04_OF_10',
    baseCommit: '0b2a9096ab42e431e6e56a7ece17a5f29c72cdb4',
    previousChange: R03,
    previousStatus: 'CLOSED',
    previousArchived: 'true',
    previousPostGate: 'PASS',
    nextAllowed: 'false',
    nextChange: 'routing-v2-05-segment-router',
    implementationStatus: 'NOT_STARTED',
    implementation: [
      ROUTING + 'orthogonal/router/**',
      ROUTING + 'normalization/**',
      ROUTING + 'validation/**',
      V2_TESTS + 'orthogonal/**',
    ],
    control: [
      'openspec/changes/routing-v2-04-orthogonal-router/**',
      CURRENT,
      MASTER,
      PLAYBOOK,
      SCRIPT,
    ],
    testTooling: ['packages/draw/package.json', 'pnpm-lock.yaml'],
  }
  const boundary = protectedPaths()
  const router = ROUTING + 'orthogonal/router/fixture.ts'
  check(
    'R04 root lockfile scope parser',
    isDeepStrictEqual(
      section(
        '## TEST_TOOLING_SCOPE\npackages/draw/package.json\npnpm-lock.yaml\n',
        'TEST_TOOLING_SCOPE',
      ),
      R04_METADATA,
    ),
  )
  check(
    'Unimplemented profile fails closed',
    scopeFindings(
      { ...current, activeChange: 'routing-v2-05-segment-router', number: 5 },
      [],
      boundary,
    ).length > 0,
  )
  check(
    'R04 planning rejects premature router',
    scopeFindings(current, [router], boundary).some((f) => f.file === router),
  )
  const impl = {
    ...current,
    phase: 'IMPLEMENTATION',
    implementationStatus: 'IN_PROGRESS',
    baseCommit: 'a'.repeat(40),
    planningCommit: 'a'.repeat(40),
    preImplementationGate: 'PASS',
    frozenGateVerified: true,
  }
  for (const file of [
    ...R04_IMPLEMENTATION.map((p) => p.replace('**', 'fixture.ts')),
    ...R04_METADATA,
  ]) {
    check(
      'R04 planning rejects ' + file,
      scopeFindings(current, [file], boundary).some((f) => f.file === file),
    )
    check('R04 implementation permits ' + file, scopeFindings(impl, [file], boundary).length === 0)
  }
  for (const file of [CURRENT, SCRIPT, MASTER, PLAYBOOK, R04_PREFIX + 'evidence/check.md'])
    check(
      'R04 planning control positive ' + file,
      scopeFindings(current, [file], boundary).length === 0,
    )
  for (const file of [...R01_IMPLEMENTATION, ...R02_IMPLEMENTATION, ...R03_IMPLEMENTATION]
    .map((p) => p.replace('**', 'fixture.ts'))
    .concat([
      'AGENTS.md',
      WORKFLOW,
      LEGACY_DOC,
      'packages/draw/src/index.ts',
      ROUTING + 'segment/router.ts',
      ROUTING + 'orthogonal/jetty.ts',
      'openspec/specs/routing-direction-resolver/spec.md',
      'openspec/changes/archive/closed/tasks.md',
      'apps/desktop/vendor/drawio/new.js',
      'unrelated.txt',
    ]))
    for (const state of [current, impl])
      check(
        'R04 outside scope ' + state.phase + file,
        scopeFindings(state, [file], boundary).some((f) => f.file === file),
      )
  for (const patch of [
    { phase: 'VERIFY' },
    { nextAllowed: 'true' },
    { baseCommit: R03_BASE },
    { sequence: 'R03_OF_10' },
    { previousChange: R02 },
    { previousStatus: 'OPEN' },
    { previousArchived: 'false' },
    { previousPostGate: 'FAIL' },
    { nextChange: 'routing-v2-06-segment-editor' },
    { implementationStatus: 'COMPLETE' },
    { implementation: [...current.implementation, ROUTING + 'model/**'] },
    { control: [...current.control, WORKFLOW] },
    { testTooling: [...current.testTooling, 'package.json'] },
  ])
    check(
      'R04 planning fields ' + JSON.stringify(patch),
      scopeFindings({ ...current, ...patch }, [], boundary).length > 0,
    )
  for (const patch of [
    { preImplementationGate: 'FAIL' },
    { frozenGateVerified: false },
    { planningCommit: undefined },
    { baseCommit: R04_BASE },
  ])
    check(
      'R04 implementation approval ' + JSON.stringify(patch),
      scopeFindings({ ...impl, ...patch }, [], boundary).length > 0,
    )

  const roots = {
    model: 'model',
    geometry: 'geometry',
    perimeter: 'perimeter',
    terminal: 'terminal',
    direction: 'orthogonal/direction',
    normalization: 'normalization',
    validation: 'validation',
    router: 'orthogonal/router',
    segment: 'segment',
  }
  const permitted = {
    model: 'model',
    geometry: 'model geometry',
    perimeter: 'model geometry perimeter',
    terminal: 'model geometry perimeter terminal',
    direction: 'model geometry perimeter terminal direction',
    normalization: 'model geometry normalization',
    validation: 'model geometry perimeter terminal normalization validation',
    router: 'model geometry perimeter terminal direction normalization validation router',
    segment: '',
  }
  for (const [from, a] of Object.entries(roots))
    for (const [to, b] of Object.entries(roots)) {
      const file = ROUTING + a + '/fixture.ts',
        target = ROUTING + b + '/dependency.ts'
      let specifier = normalize(path.relative(path.dirname(file), target))
      if (!specifier.startsWith('.')) specifier = './' + specifier
      check(
        'R04 dependency ' + from + ' -> ' + to,
        (inspectSource(file, 'import "' + specifier + '"', current, boundary).length === 0) ===
          permitted[from].split(' ').includes(to),
      )
    }
  for (const source of [
    'import "react"',
    'require("@antv/x6")',
    'window',
    'Math.random()',
    'Date.now()',
    'import "../../../geometry/normalizeRoute"',
    'import "../../floatingAttachment"',
  ])
    check(
      'R04 core forbidden ' + source,
      inspectSource(router, source, current, boundary).length > 0,
    )
  for (const source of ['import "react"', 'test.only("x",()=>{})', '// @ts-ignore\nconst x=1'])
    check(
      'R04 test integrity ' + source,
      inspectSource(V2_TESTS + 'orthogonal/unit/x.test.ts', source, current, boundary, {
        core: false,
        tests: true,
      }).length > 0,
    )
  check(
    'R04 tooling imports allowed',
    inspectSource(
      V2_TESTS + 'orthogonal/property/x.test.ts',
      'import fc from "fast-check"; import {test} from "vitest"',
      current,
      boundary,
      { core: false, tests: true },
    ).length === 0,
  )
  const pkg = {
    name: '@frade/draw',
    exports: { '.': './src/index.ts' },
    dependencies: { react: '18.3.1' },
    devDependencies: { vitest: '3.2.7' },
  }
  const lock = {
    lockfileVersion: '9.0',
    importers: {
      'packages/draw': { devDependencies: { vitest: { specifier: '3.2.7', version: '3.2.7' } } },
      other: { devDependencies: {} },
    },
    packages: { 'fast-check@4.10.2': { resolution: { integrity: 'pinned' } } },
    snapshots: { 'fast-check@4.10.2': {} },
  }
  for (const [file, base] of [
    [R04_METADATA[0], pkg],
    [R04_METADATA[1], lock],
  ]) {
    const candidate = structuredClone(base)
    const entries = file.endsWith('.json')
      ? candidate.devDependencies
      : candidate.importers['packages/draw'].devDependencies
    entries['fast-check'] = file.endsWith('.json')
      ? '4.10.2'
      : { specifier: '4.10.2', version: '4.10.2' }
    const text = JSON.stringify(candidate)
    check(
      'R04 unchanged metadata ' + file,
      r04MetadataAllowed(file, JSON.stringify(base), JSON.stringify(base)),
    )
    check('R04 exact metadata ' + file, r04MetadataAllowed(file, JSON.stringify(base), text))
    check(
      'R04 wrong fast-check version ' + file,
      !r04MetadataAllowed(file, JSON.stringify(base), text.replaceAll('4.10.2', '4.10.3')),
    )
    check(
      'R04 duplicate metadata key ' + file,
      !r04MetadataAllowed(file, JSON.stringify(base), text.replace('{', '{"devDependencies":{},')),
    )
    const unrelated = structuredClone(candidate)
    unrelated.unapproved = true
    check(
      'R04 unrelated metadata ' + file,
      !r04MetadataAllowed(file, JSON.stringify(base), JSON.stringify(unrelated)),
    )
  }
  for (const mutate of [
    (p) => (p.exports['.'] = './illegal.ts'),
    (p) => (p.dependencies['fast-check'] = '4.10.2'),
    (p) => (p.scripts = { test: 'exit 0' }),
    (p) => (p.version = '99'),
    (p) => (p.devDependencies.vitest = '0'),
  ]) {
    const p = structuredClone(pkg)
    p.devDependencies['fast-check'] = '4.10.2'
    mutate(p)
    check(
      'R04 package edit rejected',
      !r04MetadataAllowed(R04_METADATA[0], JSON.stringify(pkg), JSON.stringify(p)),
    )
  }
  for (const mutate of [
    (l) => (l.packages['fast-check@4.10.2'].resolution.integrity = 'changed'),
    (l) => (l.importers.other.devDependencies.extra = { version: '1' }),
    (l) => (l.snapshots.extra = {}),
  ]) {
    const l = structuredClone(lock)
    l.importers['packages/draw'].devDependencies['fast-check'] = {
      specifier: '4.10.2',
      version: '4.10.2',
    }
    mutate(l)
    check(
      'R04 unrelated lock edit rejected',
      !r04MetadataAllowed(R04_METADATA[1], JSON.stringify(lock), JSON.stringify(l)),
    )
  }
  const manager = {
    lockfileVersion: '9.0',
    importers: { '.': { packageManagerDependencies: { pnpm: { version: '12.6.0' } } } },
  }
  const updated = structuredClone(lock)
  updated.importers['packages/draw'].devDependencies['fast-check'] = {
    specifier: '4.10.2',
    version: '4.10.2',
  }
  const multi = JSON.stringify(manager) + '\n---\n' + JSON.stringify(lock)
  const multiUpdated = JSON.stringify(manager) + '\n---\n' + JSON.stringify(updated)
  check(
    'R04 multi-document lock exact addition',
    r04MetadataAllowed('pnpm-lock.yaml', multi, multiUpdated),
  )
  check(
    'R04 package-manager document immutable',
    !r04MetadataAllowed('pnpm-lock.yaml', multi, multiUpdated.replace('12.6.0', '12.7.0')),
  )
  check(
    'R04 duplicate importer owner rejected',
    !r04MetadataAllowed(
      'pnpm-lock.yaml',
      multi,
      multiUpdated + '\n---\n' + JSON.stringify(updated),
    ),
  )
  const aliasBase = {
    importers: {
      'packages/draw': { devDependencies: { vitest: '3.2.7' } },
      other: { devDependencies: { vitest: '3.2.7' } },
    },
  }
  const aliased =
    'importers:\n  packages/draw:\n    devDependencies: &shared\n      vitest: 3.2.7\n      fast-check: {specifier: 4.10.2, version: 4.10.2}\n  other:\n    devDependencies: *shared\n'
  check(
    'R04 YAML alias cannot broaden another importer',
    !r04MetadataAllowed('pnpm-lock.yaml', JSON.stringify(aliasBase), aliased),
  )
  const task = R04_PREFIX + 'tasks.md'
  check(
    'R04 checkbox normalization',
    reviewCanonical(task, '- [ ] 1. test\n', R04) === reviewCanonical(task, '- [x] 1. test\n', R04),
  )
  check(
    'R04 task wording frozen',
    reviewCanonical(task, '- [x] 1. changed\n', R04) !==
      reviewCanonical(task, '- [ ] 1. test\n', R04),
  )
  r04GitRegressions(check, current, impl, boundary)
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
  r03ApprovalRegressions(check)
  r04Regressions(check)
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

  const r03 = {
    activeChange: R03,
    number: 3,
    phase: 'PLANNING',
    sequence: 'R03_OF_10',
    baseCommit: R03_BASE,
    previousChange: R02,
    previousStatus: 'CLOSED',
    previousArchived: 'true',
    previousPostGate: 'PASS',
    nextAllowed: 'false',
    implementation: R03_IMPLEMENTATION,
    control: R03_CONTROL,
  }
  const direction = ROUTING + 'orthogonal/direction/fixture.ts'
  const directionTest = V2_TESTS + 'direction/unit/fixture.test.ts'
  const r03Impl = {
    ...r03,
    phase: 'IMPLEMENTATION',
    planningCommit: 'a'.repeat(40),
    baseCommit: 'a'.repeat(40),
    preImplementationGate: 'PASS',
    frozenGateVerified: true,
  }
  check(
    'R03 planning controls pass',
    scopeFindings(
      r03,
      [CURRENT, SCRIPT, WORKFLOW, 'openspec/changes/' + R03 + '/proposal.md'],
      boundary,
    ).length === 0,
  )
  for (const file of [direction, directionTest]) {
    check('R03 planning rejects product ' + file, scopeFindings(r03, [file], boundary).length > 0)
    check(
      'R03 implementation accepts exact product ' + file,
      scopeFindings(r03Impl, [file], boundary).length === 0,
    )
  }
  for (const file of [
    ROUTING + 'model/x.ts',
    ROUTING + 'geometry/x.ts',
    ROUTING + 'terminal/x.ts',
    ROUTING + 'perimeter/x.ts',
    V2_TESTS + 'geometry/x.test.ts',
    V2_TESTS + 'terminal/x.test.ts',
    V2_TESTS + 'perimeter/x.test.ts',
    'openspec/specs/routing-terminal-perimeter/spec.md',
    'openspec/changes/archive/old/tasks.md',
    ROUTING + 'orthogonal/JettyResolver.ts',
    ROUTING + 'orthogonal/direction-other/x.ts',
    V2_TESTS + 'direction-other/x.test.ts',
    ROUTING + 'segment/x.ts',
    'packages/draw/src/index.ts',
    MASTER,
    PLAYBOOK,
    LEGACY_DOC,
    'AGENTS.md',
    ROUTING + 'AGENTS.md',
    'apps/desktop/vendor/drawio/x.js',
  ]) {
    check(
      'R03 rejects readonly/outside ' + file,
      scopeFindings(r03Impl, [file], boundary).some((x) => x.file === file),
    )
  }
  for (const control of [SCRIPT, WORKFLOW]) {
    check(
      'R03 approved frozen diff accepted ' + control,
      scopeFindings(r03Impl, [control], boundary).length === 0,
    )
    check(
      'R03 unverified freeze rejected ' + control,
      scopeFindings({ ...r03Impl, frozenGateVerified: false }, [control], boundary).length > 0,
    )
  }
  for (const override of [
    { sequence: 'R04_OF_10' },
    { previousStatus: 'OPEN' },
    { previousArchived: 'false' },
    { previousPostGate: 'FAIL' },
    { previousChange: R01 },
    { nextAllowed: 'true' },
    { phase: 'UNKNOWN' },
    { baseCommit: R03_BASE },
    { preImplementationGate: 'PENDING' },
    { implementation: [...R03_IMPLEMENTATION, ROUTING + 'terminal/**'] },
    { control: [...R03_CONTROL, MASTER] },
  ])
    check(
      'R03 rejects invalid control ' + JSON.stringify(override),
      scopeFindings({ ...r03Impl, ...override }, [], boundary).length > 0,
    )

  for (const [file, source, pass] of [
    [direction, 'import type { Rect } from "../../model";', true],
    [direction, 'import { EPSILON } from "../../geometry";', true],
    [direction, 'import type { DirectionMask } from "../../terminal";', true],
    [direction, 'import type { PerimeterGeometry } from "../../perimeter";', true],
    [direction, 'import { X } from "./peer";', true],
    [direction, 'import { X } from "../JettyResolver";', false],
    [direction, 'import { X } from "../../segment/x";', false],
    [direction, 'import { X } from "../../floatingAttachment";', false],
    [ROUTING + 'terminal/x.ts', 'import { X } from "../orthogonal/direction/x";', false],
    [ROUTING + 'perimeter/x.ts', 'import { X } from "../terminal/x";', false],
    [ROUTING + 'geometry/x.ts', 'import { X } from "../terminal/x";', false],
    [ROUTING + 'model/x.ts', 'import { X } from "../geometry/x";', false],
    [direction, 'import React from "react";', false],
    [direction, 'const x = window.devicePixelRatio;', false],
  ])
    check(
      'R03 dependency/purity ' + source,
      (inspectSource(file, source, r03, boundary).length === 0) === pass,
    )
  check(
    'R03 test framework rejected',
    inspectSource(directionTest, 'import React from "react";', r03, boundary, {
      core: false,
      tests: true,
    }).length > 0,
  )

  const r03Root = fs.mkdtempSync(path.join(os.tmpdir(), 'frade-r03-freeze-'))
  try {
    const git = (args) =>
      execFileSync('git', args, {
        cwd: r03Root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }).trim()
    git(['init', '--quiet'])
    git(['config', 'user.name', 'Routing gate fixture'])
    git(['config', 'user.email', 'routing-gate@example.invalid'])
    git(['config', 'core.autocrlf', 'false'])
    git(['config', 'core.filemode', 'false'])
    const objects = path.resolve(
      ROOT,
      execFileSync('git', ['rev-parse', '--git-path', 'objects'], {
        cwd: ROOT,
        encoding: 'utf8',
      }).trim(),
    )
    fs.writeFileSync(path.join(r03Root, '.git/objects/info/alternates'), normalize(objects) + '\n')
    git(['symbolic-ref', 'HEAD', 'refs/heads/main'])
    git(['update-ref', 'refs/heads/main', R03_BASE])
    git(['read-tree', R03_BASE])
    const originals = new Map()
    for (const file of R03_REVIEWED) {
      const text =
        file === CURRENT
          ? 'ACTIVE_CHANGE: ' +
            R03 +
            '\nPHASE: PLANNING\nBASE_COMMIT: ' +
            R03_BASE +
            '\nSEQUENCE_POSITION: R03_OF_10\nPREVIOUS_CHANGE: ' +
            R02 +
            '\nPREVIOUS_CHANGE_STATUS: CLOSED\nPREVIOUS_CHANGE_ARCHIVED: true\n' +
            'PREVIOUS_CHANGE_POST_IMPLEMENTATION_GATE: PASS\nIMPLEMENTATION_STATUS: NOT_STARTED\n' +
            'NEXT_CHANGE_ALLOWED: false\nPRE_IMPLEMENTATION_GATE: PASS\n' +
            'PRE_IMPLEMENTATION_GATE_EVIDENCE: ' +
            R03_APPROVAL +
            '\n\n## IMPLEMENTATION_SCOPE\n' +
            R03_IMPLEMENTATION.join('\n') +
            '\n\n## PROCESS_CONTROL_SCOPE\n' +
            R03_CONTROL.join('\n') +
            '\n'
          : [MASTER, PLAYBOOK, LEGACY_DOC, 'AGENTS.md', ROUTING + 'AGENTS.md'].includes(file)
            ? execFileSync('git', ['show', R03_BASE + ':' + file], { cwd: ROOT, encoding: 'utf8' })
            : 'approved original\n'
      originals.set(file, text)
      fs.mkdirSync(path.dirname(path.join(r03Root, file)), { recursive: true })
      fs.writeFileSync(path.join(r03Root, file), text)
    }
    const reportPath = R03_PREFIX + 'evidence/pre-implementation-gate-pass.md'
    const reviewed = planningReviewFingerprint(r03Root)
    const report =
      'CHANGE: ' +
      R03 +
      '\nGATE_TYPE: PRE_IMPLEMENTATION\n' +
      'GATE_STATUS: PASS\nREADY_FOR_IMPLEMENTATION: YES\n' +
      '\nREVIEWED_ARTIFACTS_JSON_BEGIN\n' +
      JSON.stringify(reviewed, null, 2) +
      '\nREVIEWED_ARTIFACTS_JSON_END\n'
    fs.writeFileSync(path.join(r03Root, reportPath), report)
    fs.writeFileSync(
      path.join(r03Root, R03_APPROVAL),
      JSON.stringify({
        schemaVersion: 1,
        change: R03,
        gateType: 'PRE_IMPLEMENTATION',
        gateStatus: 'PASS',
        baseline: R03_BASE,
        reviewerContext: 'fresh-read-only',
        reportPath,
        reportSha256: textHash(report),
        artifacts: reviewed,
      }),
    )
    git(['add', '--', ...R03_REVIEWED, R03_APPROVAL, reportPath])
    git(['commit', '--quiet', '-m', 'R03 approved planning fixture'])
    const approvedSha = git(['rev-parse', 'HEAD'])
    const approved = {
      ...r03Impl,
      baseCommit: approvedSha,
      planningCommit: approvedSha,
      preEvidence: R03_APPROVAL,
    }
    check('R03 all frozen controls match approved checkpoint', verifyFrozenGate(approved, r03Root))
    for (const file of R03_FROZEN) {
      fs.writeFileSync(path.join(r03Root, file), 'illegal staged content\n')
      git(['add', '--', file])
      fs.writeFileSync(path.join(r03Root, file), originals.get(file))
      check(
        'R03 freeze staged/worktree cancellation discovers ' + file,
        changedFiles(approvedSha, r03Root).includes(file),
      )
      check(
        'R03 freeze staged/worktree cancellation fails ' + file,
        !verifyFrozenGate(approved, r03Root),
      )
      git(['restore', '--staged', '--', file])
      fs.writeFileSync(path.join(r03Root, file), 'illegal worktree content\n')
      check('R03 freeze worktree change fails ' + file, !verifyFrozenGate(approved, r03Root))
      fs.writeFileSync(path.join(r03Root, file), originals.get(file))
      check('R03 freeze restored control passes ' + file, verifyFrozenGate(approved, r03Root))
    }
    fs.writeFileSync(path.join(r03Root, WORKFLOW), 'committed illegal\n')
    git(['add', '--', WORKFLOW])
    git(['commit', '--quiet', '-m', 'Forbidden frozen workflow fixture'])
    fs.writeFileSync(path.join(r03Root, WORKFLOW), originals.get(WORKFLOW))
    check('R03 committed inverse-worktree freeze fails', !verifyFrozenGate(approved, r03Root))
    check(
      'R03 committed inverse-worktree path discovered',
      changedFiles(approvedSha, r03Root).includes(WORKFLOW),
    )
  } finally {
    const resolved = path.resolve(r03Root)
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()))
    assert.ok(path.basename(resolved).startsWith('frade-r03-freeze-'))
    fs.rmSync(resolved, { recursive: true, force: true })
  }

  console.log('PROCESS_GATE_SELF_TESTS: PASS (' + count + ' assertions)')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--review-fingerprint')) {
    const active = readCurrentChange().activeChange
    if (![R03, R04].includes(active))
      throw new Error('No approval fingerprint profile for ' + active)
    console.log(JSON.stringify(planningReviewFingerprint(ROOT, active), null, 2))
  } else if (process.argv.includes('--self-test-r04')) {
    let count = 0
    r04Regressions((label, value) => {
      assert.ok(value, label)
      count++
    })
    console.log('R04_GATE_SELF_TESTS: PASS (' + count + ' assertions)')
  } else if (process.argv.includes('--self-test')) selfTest()
  else main()
}
