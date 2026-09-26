import type { Revision } from '@frade/repository-domain'
// @vitest-environment jsdom
import { it, expect, afterEach } from 'vitest'
import { useState, useEffect } from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ObjectInspector } from '../src/Inspector'
import type { Constraint } from '@frade/metamodel-domain'
import type { JsonValue } from '@frade/repository-domain'
afterEach(cleanup)
const rule: Constraint = {
  type: 'object',
  properties: {
    title: { type: 'string', title: 'Имя' },
    count: { type: 'integer' },
    enabled: { type: 'boolean' },
    optional: { type: ['string', 'null'] },
    nested: { type: 'object', properties: { value: { type: 'number' } } },
    list: { type: 'array', items: { type: 'string' } },
    parent: { referenceTargets: ['s:T'] },
    defaulted: { type: 'string', default: 'default' },
    status: { enum: ['active', 'retired'] },
  },
  required: ['title'],
}
let result: Record<string, JsonValue>, raw: Record<string, string>
function Form() {
  const [attributes, set] = useState<Record<string, JsonValue>>({
    title: 'Name',
    count: 0,
    enabled: false,
    optional: null,
    nested: { value: 3 },
    list: ['one'],
    parent: { repositoryId: 'A', objectId: 'missing' },
    status: 'active',
    extra: 'keep',
  })
  const [numeric, setRaw] = useState<Record<string, string>>({})
  useEffect(() => {
    result = attributes
    raw = numeric
  }, [attributes, numeric])
  return (
    <ObjectInspector
      object={{
        ref: { repositoryId: 'A', objectId: 'a' },
        typeId: 's:T',
        name: 'Name',
        revision: '1' as Revision,
        attributes,
      }}
      attributes={attributes}
      objects={[
        {
          ref: { repositoryId: 'A', objectId: 'b' },
          typeId: 's:T',
          name: 'Target',
          revision: '1' as Revision,
          attributes: {},
        },
        {
          ref: { repositoryId: 'A', objectId: 'wrong' },
          typeId: 's:Other',
          name: 'Forbidden',
          revision: '1' as Revision,
          attributes: {},
        },
      ]}
      rule={rule}
      issues={[]}
      raw={numeric}
      onRaw={(p, v) =>
        setRaw((old) => {
          const next = { ...old }
          if (v === undefined) delete next[p]
          else next[p] = v
          return next
        })
      }
      onChange={set}
      onOpenReference={() => {}}
    />
  )
}
it('INS-001/002 retains null, zero, false, unknown fields and does not materialize defaults', () => {
  const { container } = render(<Form />)
  expect(result.defaulted).toBeUndefined()
  expect(result.optional).toBeNull()
  expect(result.enabled).toBe(false)
  fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Changed' } })
  expect(result.extra).toBe('keep')
  fireEvent.change(screen.getByLabelText('count'), { target: { value: '-' } })
  expect(result.count).toBe(0)
  expect(Object.values(raw)).toEqual(['-'])
  fireEvent.change(screen.getByLabelText('count'), { target: { value: '42' } })
  expect(result.count).toBe(42)
  expect(raw).toEqual({})
  fireEvent.click(screen.getByLabelText('enabled'))
  expect(result.enabled).toBe(true)
  fireEvent.change(screen.getByLabelText('value'), { target: { value: '8' } })
  expect(result.nested).toEqual({ value: 8 })
  fireEvent.click(screen.getByText('Добавить элемент: list'))
  expect(result.list).toEqual(['one', ''])
  fireEvent.change(screen.getByLabelText('list 2'), { target: { value: 'two' } })
  fireEvent.click(screen.getByLabelText('Вверх: list 2'))
  expect(result.list).toEqual(['two', 'one'])
  fireEvent.click(screen.getByLabelText('Убрать значение: optional'))
  expect(Object.hasOwn(result, 'optional')).toBe(false)
  expect(container.querySelector('script')).toBeNull()
})
it('INS-001 reference picker preserves unresolved leaves and filters target types', () => {
  render(<Form />)
  expect(screen.getByLabelText('parent').textContent).toContain('missing')
  fireEvent.click(screen.getByLabelText('parent'))
  expect(screen.queryByText('Forbidden')).toBeNull()
  fireEvent.click(screen.getByRole('option', { name: /Target/ }))
  expect(result.parent).toEqual({ repositoryId: 'A', objectId: 'b' })
})
