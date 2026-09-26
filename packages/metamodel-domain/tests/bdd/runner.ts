import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin'
import { IdGenerator } from '@cucumber/messages'
export interface Case {
  name: string
  tags: string[]
  steps: string[]
}
export function cases(source: string): Case[] {
  const feature = new Parser(
    new AstBuilder(IdGenerator.incrementing()),
    new GherkinClassicTokenMatcher(),
  ).parse(source).feature
  if (!feature) throw Error('Missing feature')
  const output: Case[] = []
  for (const child of feature.children) {
    if (!child.scenario) throw Error('Unsupported Gherkin child; add explicit runner support')
    const scenario = child.scenario
    const tags = [...feature.tags, ...scenario.tags].map((t) => t.name)
    if (!tags.some((t) => /^@M[ADR]-\d+$/.test(t))) throw Error('Missing requirement tag')
    const rows = scenario.examples.length
      ? scenario.examples.flatMap((ex) => {
          if (!ex.tableHeader || !ex.tableBody.length) throw Error('Empty outline examples')
          const names = ex.tableHeader.cells.map((c) => c.value)
          return ex.tableBody.map((row) =>
            Object.fromEntries(row.cells.map((c, i) => [names[i], c.value])),
          )
        })
      : [{}]
    for (const [index, row] of rows.entries()) {
      const steps = scenario.steps.map((s) => {
        if (s.dataTable || s.docString) throw Error('Unsupported step argument')
        const text = s.text.replace(/<([^>]+)>/g, (_all, k) => {
          if (!(k in row)) throw Error('Unexpanded outline ' + k)
          return row[k]
        })
        return text
      })
      output.push({ name: feature.name + ' / ' + scenario.name + ' #' + (index + 1), tags, steps })
    }
  }
  return output
}
export type Step = { pattern: RegExp; run(world: any, ...captures: string[]): void }
export function runSteps(testCase: Case, definitions: readonly Step[], world: any = {}) {
  for (const text of testCase.steps) {
    const matches = definitions.flatMap((step) => {
      const match = step.pattern.exec(text)
      return match ? [{ step, captures: match.slice(1) }] : []
    })
    if (matches.length !== 1)
      throw Error('Expected exactly one step binding: ' + text + '; found ' + matches.length)
    matches[0].step.run(world, ...matches[0].captures)
  }
}
