import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { historicalFuiOrigin } from './vscode-dark-2026-origin'
const source = (name: string) => readFileSync(new URL('../../../../apps/desktop/tests/e2e/' + name, import.meta.url))
const live = () => source('ui-contract-theme.spec.ts')
const hash = (raw: Buffer) => createHash('sha256').update(raw).digest('hex')
it('selector compatibility retains exact immutable historical origin', () => { expect(hash(historicalFuiOrigin(live()))).toBe('7c3e52a69c1b8346a78f4297774f5c2342a3ecdaeb05a2611465d2f09c546f43') })
for (const name of ['append', 'drop assertion', 'restore ambiguous selector'] as const) {
  it('historical origin rejects current source mutation: ' + name, () => {
    const raw = live().toString('utf8')
    const altered = name === 'append' ? raw + '\n// mutation' : name === 'drop assertion' ? raw.replace('expect(', 'void (') : raw.replace("getByRole('option', { name: 'Тёмная (Dark)', exact: true })", "getByRole('option', { name: /Dark/ })")
    expect(altered).not.toBe(raw)
    expect(() => historicalFuiOrigin(Buffer.from(altered))).toThrow('FUI_CURRENT_SOURCE_DRIFT')
  })
}
it('complete legacy option AST has no generic Dark or constructed regex choice', () => {
  const unsafe: string[] = []
  for (const name of ['ui-contract-theme.spec.ts', 'ui-contract-theme-performance.spec.ts']) {
    const ast = ts.createSourceFile(name, source(name).toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'getByRole' && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'option') {
        const options = node.arguments[1]
        if (options && ts.isObjectLiteralExpression(options)) for (const property of options.properties) {
          if (ts.isPropertyAssignment(property) && property.name.getText(ast) === 'name' && (ts.isNewExpression(property.initializer) || ts.isRegularExpressionLiteral(property.initializer) && property.initializer.getText(ast).includes('Dark'))) unsafe.push(node.getText(ast))
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
  }
  expect(unsafe).toEqual([])
})
it('performance replay source matches the exact accepted selector-only draft', () => { expect(hash(source('ui-contract-theme-performance.spec.ts'))).toBe('1bcd2e294f145a7e18629bca4113f3d9f0f510a3e5a00f047e05313070135781') })
