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
    const s = child.scenario
    if (!s) throw Error('Unsupported child')
    const tags = [...feature.tags, ...s.tags].map((t) => t.name)
    if (!tags.some((t) => /^@M[CPV]-\d+$/.test(t))) throw Error('Missing requirement tag')
    const rows = s.examples.length
      ? s.examples.flatMap((ex) => {
          if (!ex.tableHeader || !ex.tableBody.length) throw Error('Empty outline')
          const names = ex.tableHeader.cells.map((c) => c.value)
          return ex.tableBody.map((row) =>
            Object.fromEntries(row.cells.map((c, i) => [names[i], c.value])),
          )
        })
      : [{}]
    for (const [i, row] of rows.entries())
      output.push({
        name: feature.name + ' / ' + s.name + ' #' + (i + 1),
        tags,
        steps: s.steps.map((step) => {
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
export interface Step {
  pattern: RegExp
  run: (world: any, ...captures: string[]) => unknown
}
export async function runSteps(c: Case, definitions: readonly Step[], world: any = {}) {
  for (const text of c.steps) {
    const matches = definitions.flatMap((step) => {
      step.pattern.lastIndex = 0
      const m = step.pattern.exec(text)
      return m ? [{ step, captures: m.slice(1) }] : []
    })
    if (matches.length !== 1) throw Error('Expected exactly one binding: ' + text)
    await matches[0].step.run(world, ...matches[0].captures)
  }
}
