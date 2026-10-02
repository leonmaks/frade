import { readFile, readdir, writeFile, access } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(resolve('packages/repository-application/package.json'))
const { Parser, AstBuilder, GherkinClassicTokenMatcher } = require('@cucumber/gherkin')
const { IdGenerator } = require('@cucumber/messages')
const ts = require('typescript')
const root = 'packages/repository-application/tests'
const tests = await readFile(root + '/acceptance/repository.test.ts', 'utf8')
const testNames = []
function visit(node) {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'it' &&
    node.arguments.length >= 2 &&
    ts.isStringLiteral(node.arguments[0])
  )
    testNames.push(node.arguments[0].text.split(':')[0])
  ts.forEachChild(node, visit)
}
visit(ts.createSourceFile('tests.ts', tests, ts.ScriptTarget.Latest, true))
const seen = new Set()
const linksByRequirement = new Map()
const implementations = {
  'CORE-001': 'packages/repository-domain/src/types.ts',
  'CORE-002': 'packages/metamodel-domain/src/index.ts',
  'CORE-003': 'packages/repository-domain/src/codec.ts',
  'CORE-004': 'packages/repository-application/src/commands.ts',
  'CORE-005': 'packages/repository-application/src/extensions.ts',
  'CORE-006': 'packages/repository-domain/src/query.ts',
  'CORE-007': 'packages/repository-application/src/commands.ts',
  'CORE-008': 'packages/repository-application/src/session.ts',
  'CORE-009': 'packages/repository-application/src/commands.ts',
  'CORE-010': 'packages/repository-ports/src/contracts.ts',
  'CORE-011': 'packages/adapter-yaml/src/native.ts',
  'CORE-012': 'packages/local-index/src/index.ts',
  'CORE-013': 'packages/repository-application/src/session.ts',
  'CORE-014': 'packages/repository-bridge/src/index.ts',
  'CORE-015': 'packages/repository-bridge/src/index.ts',
  'CORE-016': 'packages/repository-api/src/http.ts',
  'CORE-017': 'packages/adapter-yaml/src/native.ts',
  'CORE-018': 'packages/versioning-git/src/index.ts',
  'CORE-019': 'packages/repository-application/src/session.ts',
  'CORE-020': 'packages/adapter-yaml/src/native.ts',
}
let scenarios = 0
for (const file of await readdir(root + '/features')) {
  if (!file.endsWith('.feature')) continue
  const feature = new Parser(
    new AstBuilder(IdGenerator.incrementing()),
    new GherkinClassicTokenMatcher(),
  ).parse(await readFile(root + '/features/' + file, 'utf8')).feature
  if (!feature) throw Error('Missing feature: ' + file)
  for (const child of feature.children) {
    if (!child.scenario) throw Error('Unsupported feature child: ' + file)
    const scenario = child.scenario
    const tags = [...feature.tags, ...scenario.tags].map((tag) => tag.name)
    const requirements = tags.filter((tag) => /^@CORE-\d{3}$/.test(tag))
    const links = tags.filter((tag) => tag.startsWith('@test:'))
    if (!requirements.length || links.length !== 1 || scenario.steps.length < 3)
      throw Error('Missing traceability: ' + file)
    const id = links[0].slice(6)
    if (testNames.filter((name) => name === id).length !== 1)
      throw Error('Missing or ambiguous executable test: ' + id)
    for (const requirement of requirements) {
      const key = requirement.slice(1)
      seen.add(key)
      const rows = linksByRequirement.get(key) ?? []
      rows.push({ feature: file, test: id })
      linksByRequirement.set(key, rows)
    }
    scenarios++
  }
}
for (let i = 1; i <= 20; i++) {
  const id = 'CORE-' + String(i).padStart(3, '0')
  if (!seen.has(id)) throw Error('Unmapped requirement: ' + id)
  await access(implementations[id])
}
const legacyLinks = new Map()
let executableScenarios = 0
for (const file of await readdir(root + '/bdd/features')) {
  if (!file.endsWith('.feature')) continue
  const text = await readFile(root + '/bdd/features/' + file, 'utf8')
  if (
    text.replaceAll('\r', '') !==
    (await readFile('openspec/changes/frade-repo-core/features/' + file, 'utf8')).replaceAll(
      '\r',
      '',
    )
  )
    throw Error('Planning feature drift: ' + file)
  const feature = new Parser(
    new AstBuilder(IdGenerator.incrementing()),
    new GherkinClassicTokenMatcher(),
  ).parse(text).feature
  for (const child of feature.children) {
    const scenario = child.scenario
    if (!scenario) throw Error('Unsupported legacy child')
    const tags = [...feature.tags, ...scenario.tags]
      .map((tag) => tag.name)
      .filter((tag) => /^@(RE|RP|RC)-\d+$/.test(tag))
    if (!tags.length) throw Error('Unlinked legacy scenario: ' + scenario.name)
    const count = scenario.examples.length
      ? scenario.examples.reduce((n, ex) => n + ex.tableBody.length, 0)
      : 1
    if (!count) throw Error('Empty scenario outline')
    executableScenarios += count
    for (const tag of tags) {
      const values = legacyLinks.get(tag.slice(1)) ?? new Set()
      values.add(file)
      legacyLinks.set(tag.slice(1), values)
    }
  }
}
for (const [prefix, count] of [
  ['RE', 3],
  ['RP', 5],
  ['RC', 5],
])
  for (let i = 1; i <= count; i++)
    if (!legacyLinks.has(prefix + '-' + i))
      throw Error('Unmapped legacy requirement: ' + prefix + '-' + i)
await access(root + '/bdd/repository.bdd.test.ts')
const v2Files = [
  'packages/adapter-yaml/tests/native-v2.test.ts',
  'packages/adapter-yaml/tests/native-v2-recovery.test.ts',
  'packages/adapter-yaml/tests/native-v2-safety.test.ts',
  root + '/paged-equivalence.property.test.ts',
  'packages/repository-application/benchmarks/native-v2.bench.ts',
]
const v2Tests = new Map(),
  v2Links = new Map()
for (const file of v2Files) {
  const before = testNames.length
  visit(ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true))
  for (const name of testNames.slice(before)) {
    if (v2Tests.has(name)) throw Error('Duplicate v2 test ID: ' + name)
    v2Tests.set(name, file)
  }
}
const v2Feature = new Parser(
  new AstBuilder(IdGenerator.incrementing()),
  new GherkinClassicTokenMatcher(),
).parse(await readFile('packages/adapter-yaml/tests/native-v2.feature', 'utf8')).feature
for (const { scenario } of v2Feature.children) {
  if (!scenario || scenario.steps.length < 3) throw Error('Invalid v2 scenario')
  const tags = scenario.tags.map((t) => t.name),
    requirements = tags.filter((t) => /^@V2-00[1-6]$/.test(t)),
    links = tags.filter((t) => t.startsWith('@test:'))
  if (!requirements.length || links.length !== 1 || !v2Tests.has(links[0].slice(6)))
    throw Error('Unlinked v2 scenario: ' + scenario.name)
  for (const id of requirements) {
    const rows = v2Links.get(id) ?? []
    rows.push(links[0].slice(6))
    v2Links.set(id, rows)
  }
}
for (let n = 1; n <= 6; n++)
  if (!v2Links.has('@V2-00' + n)) throw Error('Unmapped v2 requirement ' + n)
if (process.argv.includes('--report')) {
  const lines = [
    '# Requirement traceability',
    '',
    'Generated by `node scripts/check-repo-traceability.mjs --report`. Links prove discovery, not complete requirement coverage. See known-limitations.md for uncovered behavior. All tests below are in `packages/repository-application/tests/acceptance/repository.test.ts`; features are in its sibling `features/` directory.',
    '',
    '| Requirement | BDD → executable test | Implementation entry point |',
    '| --- | --- | --- |',
  ]
  for (const [id, rows] of [...linksByRequirement].sort(([a], [b]) => a.localeCompare(b)))
    lines.push(
      `| ${id} | ${rows.map((row) => `${row.feature} → ${row.test}`).join('; ')} | ${implementations[id]} |`,
    )
  lines.push(
    '',
    '## Original executable acceptance',
    '',
    `${executableScenarios} expanded cases execute in packages/repository-application/tests/bdd/repository.bdd.test.ts. The runner awaits assertion-bearing step bindings and rejects missing/ambiguous steps. Feature copies are checked against the original planning files. These links prove scenario coverage, not acceptance of every broader requirement clause.`,
    '',
    '| Requirement | BDD feature | Test / implementation |',
    '| --- | --- | --- |',
  )
  for (const [id, files] of [...legacyLinks].sort(([a], [b]) => a.localeCompare(b)))
    lines.push(
      `| ${id} | ${[...files].map((file) => 'tests/bdd/features/' + file).join('; ')} | repository.bdd.test.ts / ${id.startsWith('RE') ? 'repository-domain' : id.startsWith('RP') ? 'repository-ports + repository-application/session' : 'repository-application/commands + session'} |`,
    )
  lines.push(
    '',
    '## Native v2 test-linked acceptance',
    '',
    'Links include the separately invoked benchmark; a valid link does not certify a successful benchmark. All scenarios are in `packages/adapter-yaml/tests/native-v2.feature`.',
    '',
    '| Requirement | Executable test links |',
    '| --- | --- |',
  )
  for (const [id, rows] of [...v2Links].sort())
    lines.push(
      `| ${id.slice(1)} | ${rows.map((name) => name + ' → ' + v2Tests.get(name)).join('; ')} |`,
    )
  await writeFile(
    'openspec/changes/frade-repo-core/evidence/requirements-traceability.md',
    lines.join('\n') + '\n',
  )
}
console.log(
  `${scenarios} test-linked scenarios; ${seen.size} CORE requirements; ${executableScenarios} executable legacy cases; ${legacyLinks.size} RE/RP/RC requirements; ${v2Feature.children.length} native v2 scenarios / ${v2Links.size} requirements. Structural traceability only: behavior acceptance requires executing linked tests.`,
)
