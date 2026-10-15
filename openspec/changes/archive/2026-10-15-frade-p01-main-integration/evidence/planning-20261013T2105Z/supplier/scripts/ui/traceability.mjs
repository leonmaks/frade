import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { root } from './tokens.mjs'
const require = createRequire(resolve(root, 'packages/draw/package.json'))
const { Parser, AstBuilder, GherkinClassicTokenMatcher } = require('@cucumber/gherkin')
const { IdGenerator } = require('@cucumber/messages')
const ts = createRequire(resolve(root, 'packages/ui-workspace/package.json'))('typescript')
export function featureCases(text) {
  const document = new Parser(
    new AstBuilder(IdGenerator.incrementing()),
    new GherkinClassicTokenMatcher(),
  ).parse(text)
  if (!document.feature) throw new Error('Missing feature')
  const cases = [],
    ids = new Set()
  for (const child of document.feature.children) {
    const scenario = child.scenario
    if (!scenario) throw new Error('Unmapped rule/background in UI feature')
    const tags = scenario.tags.map((tag) => tag.name)
    const idTags = tags.filter((tag) => /^@FUI-\d{3}$/.test(tag))
    if (idTags.length !== 1) throw new Error('Missing/duplicate scenario ID: ' + scenario.name)
    const scenarioId = idTags[0].slice(1)
    if (ids.has(scenarioId)) throw new Error('Duplicate scenario ID ' + scenarioId)
    ids.add(scenarioId)
    if (!scenario.steps.length) throw new Error('Empty scenario ' + scenarioId)
    const foundation = tags.includes('@foundation')
    const rows = []
    if (scenario.examples.length) {
      for (const examples of scenario.examples) {
        const header = examples.tableHeader?.cells.map((cell) => cell.value)
        if (!header?.length || new Set(header).size !== header.length || !examples.tableBody.length)
          throw new Error('Incomplete examples ' + scenarioId)
        for (const row of examples.tableBody) {
          const values = row.cells.map((cell) => cell.value)
          if (values.length !== header.length || values.some((v) => !v))
            throw new Error('Incomplete example ' + scenarioId)
          rows.push({
            values,
            parameters: Object.fromEntries(header.map((key, i) => [key, values[i]])),
          })
        }
      }
    } else if (/Outline/.test(scenario.keyword))
      throw new Error('Outline lacks examples ' + scenarioId)
    else rows.push({ values: [], parameters: {} })
    const seen = new Set()
    for (const row of rows) {
      const id = scenarioId + (row.values.length ? '/' + row.values.join('/') : '')
      if (seen.has(id)) throw new Error('Duplicate example ' + id)
      seen.add(id)
      cases.push({
        id,
        scenarioId,
        foundation,
        tags,
        name: scenario.name,
        parameters: row.parameters,
      })
    }
  }
  return cases
}
function hasBoundAssertions(file, source, name) {
  const ast = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS,
  )
  let bound = false
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      node.expression.getText(ast) === 'test' &&
      node.arguments.length >= 2
    ) {
      const label = node.arguments[0]
      const prefix = ts.isStringLiteralLike(label)
        ? label.text
        : ts.isTemplateExpression(label)
          ? label.head.text
          : ''
      if ((name.startsWith(prefix) && prefix) || (prefix.startsWith(name) && name)) {
        let assertions = 0
        const inspect = (n) => {
          if (ts.isCallExpression(n)) {
            const expression = n.expression.getText(ast)
            if (expression.startsWith('assert.') || /^expect\([\s\S]*\)\.to\w+$/.test(expression))
              assertions++
          }
          ts.forEachChild(n, inspect)
        }
        inspect(node.arguments[1])
        if (assertions) bound = true
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return bound
}
export function validateTraceability(feature, entries, sources) {
  const errors = []
  let cases
  try {
    cases = featureCases(feature)
  } catch (error) {
    return [String(error)]
  }
  if (!Array.isArray(entries)) return ['Traceability must be an array']
  const expected = new Map(cases.map((c) => [c.id, c])),
    seen = new Set()
  for (const entry of entries) {
    if (!entry || !expected.has(entry.id) || seen.has(entry.id)) {
      errors.push('Unknown/duplicate binding ' + entry?.id)
      continue
    }
    seen.add(entry.id)
    const scenario = expected.get(entry.id)
    if (scenario.foundation) {
      const source = sources[entry.file]
      if (
        entry.phase !== 'foundation' ||
        !source ||
        !entry.testName ||
        !/^[\da-f]{64}$/.test(entry.sourceSha256 ?? '')
      ) {
        errors.push('Incomplete foundation binding ' + entry.id)
        continue
      }
      const normalized = source.replaceAll('\r\n', '\n')
      if (createHash('sha256').update(normalized).digest('hex') !== entry.sourceSha256)
        errors.push('Assertion file changed ' + entry.id)
      if (/\b(?:test|it|describe)\.(?:skip|only)\s*\(/.test(source))
        errors.push('Skipped/focused assertions ' + entry.id)
      if (!hasBoundAssertions(entry.file, source, entry.testName))
        errors.push('Missing bound assertions ' + entry.id)
      if (scenario.tags.includes('@pre01')) {
        const suffix = scenario.name.startsWith('Forced colors') ? 'forced' : 'normal'
        const wanted =
          'UI-CASCADE:' +
          scenario.parameters.scheme +
          ':' +
          scenario.parameters.theme +
          ':' +
          suffix
        if (entry.testName !== wanted) errors.push('Missing matrix example binding ' + entry.id)
      }
    } else if (
      entry.phase !== 'future' ||
      !entry.owner ||
      !entry.reason ||
      entry.file ||
      entry.testName
    )
      errors.push('Future boundary must not claim executed coverage ' + entry.id)
  }
  for (const scenario of cases)
    if (!seen.has(scenario.id)) errors.push('Missing scenario/example ' + scenario.id)
  return errors
}
export const featurePath = 'docs/ui/bdd/ui-contracts.feature'
export async function checkTraceability(base = root) {
  const feature = await readFile(resolve(base, featurePath), 'utf8')
  const mapping = JSON.parse(
    await readFile(resolve(base, 'docs/ui/decisions/ui-contract-traceability.json'), 'utf8'),
  )
  const sources = {}
  if (mapping.version !== 1) throw new Error('Traceability version mismatch')
  for (const entry of mapping.entries)
    if (entry.file) {
      if (
        !/^(tests\/ui-contract\/[\w.-]+\.test\.mjs|apps\/desktop\/tests\/e2e\/ui-contract-token-cascade\.spec\.ts)$/.test(
          entry.file,
        )
      )
        throw new Error('Unapproved assertion path ' + entry.file)
      sources[entry.file] ??= await readFile(resolve(base, entry.file), 'utf8')
    }
  const errors = validateTraceability(feature, mapping.entries, sources)
  return {
    status: errors.length ? 'FAIL' : 'PASS',
    foundationBindings: mapping.entries.filter((e) => e.phase === 'foundation').length,
    futureBoundariesNotExecuted: mapping.entries.filter((e) => e.phase === 'future').length,
    scope: 'Binding integrity only; actual tests run separately',
    errors,
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await checkTraceability(
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
