// Same awaited parser/runner pattern as metamodel-compiler/tests/bdd/runner.ts.
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin'
import { IdGenerator } from '@cucumber/messages'
export interface Case {
  name: string
  tags: string[]
  steps: string[]
}
export interface Step {
  pattern: RegExp
  run: (world: any, ...captures: string[]) => unknown
}
export function cases(source: string): Case[] {
  const feature = new Parser(
    new AstBuilder(IdGenerator.incrementing()),
    new GherkinClassicTokenMatcher(),
  ).parse(source).feature
  if (!feature) throw Error('Missing feature')
  const output: Case[] = []
  for (const child of feature.children) {
    const scenario = child.scenario
    if (!scenario) throw Error('Unsupported child')
    const tags = [...feature.tags, ...scenario.tags].map((t) => t.name)
    if (!tags.some((t) => /^@(RE|RP|RC)-\d+$/.test(t))) throw Error('Missing requirement tag')
    if (scenario.keyword.includes('Outline') && !scenario.examples.length)
      throw Error('Empty outline')
    const rows = scenario.examples.length
      ? scenario.examples.flatMap((ex) => {
          if (!ex.tableHeader || !ex.tableBody.length) throw Error('Empty outline')
          const names = ex.tableHeader.cells.map((c) => c.value)
          if (new Set(names).size !== names.length) throw Error('Duplicate example header')
          return ex.tableBody.map((row) => {
            if (row.cells.length !== names.length) throw Error('Example width')
            return Object.fromEntries(row.cells.map((c, i) => [names[i], c.value]))
          })
        })
      : [{}]
    for (const [i, row] of rows.entries())
      output.push({
        name: feature.name + ' / ' + scenario.name + ' #' + (i + 1),
        tags,
        steps: scenario.steps.map((step) => {
          if (step.dataTable || step.docString) throw Error('Unsupported argument')
          return step.text.replace(/<([^>]+)>/g, (_, key) => {
            if (!(key in row)) throw Error('Unexpanded placeholder')
            return row[key]
          })
        }),
      })
  }
  return output
}
export async function runSteps(c: Case, definitions: readonly Step[], world: any = {}) {
  for (const text of c.steps) {
    const matches = definitions.flatMap((step) => {
      step.pattern.lastIndex = 0
      const match = step.pattern.exec(text)
      return match ? [{ step, captures: match.slice(1) }] : []
    })
    if (matches.length !== 1) throw Error('Expected exactly one binding: ' + text)
    await matches[0].step.run(world, ...matches[0].captures)
  }
}
