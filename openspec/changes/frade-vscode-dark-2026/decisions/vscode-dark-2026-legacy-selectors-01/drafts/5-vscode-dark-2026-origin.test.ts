import { it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { historicalFuiOrigin } from './vscode-dark-2026-origin'
const live = () => readFileSync(new URL('../../../../apps/desktop/tests/e2e/ui-contract-theme.spec.ts', import.meta.url))
it('selector compatibility retains exact immutable historical origin', () => {
  expect(createHash('sha256').update(historicalFuiOrigin(live())).digest('hex')).toBe('7c3e52a69c1b8346a78f4297774f5c2342a3ecdaeb05a2611465d2f09c546f43')
})
for (const name of ['append', 'drop assertion', 'restore ambiguous selector'] as const) {
  it('historical origin rejects current source mutation: ' + name, () => {
    const raw = live().toString('utf8')
    const altered = name === 'append' ? raw + '\n// mutation' : name === 'drop assertion' ? raw.replace('expect(', 'void (') : raw.replace("getByRole('option', { name: 'Тёмная (Dark)', exact: true })", "getByRole('option', { name: /Dark/ })")
    expect(altered).not.toBe(raw)
    expect(() => historicalFuiOrigin(Buffer.from(altered))).toThrow('FUI_CURRENT_SOURCE_DRIFT')
  })
}
