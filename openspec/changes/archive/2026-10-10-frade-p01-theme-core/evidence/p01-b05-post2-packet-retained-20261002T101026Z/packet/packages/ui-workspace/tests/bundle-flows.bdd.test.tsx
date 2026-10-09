// @vitest-environment jsdom
import { afterEach, it, expect, vi } from 'vitest'
import { useState, useLayoutEffect } from 'react'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FlowManager } from '../src/FlowManager'
import { IntegrationFlowService } from '../../repository-application/src/integration-flows'
import {
  setBundleMembers,
  validateBundleMembers,
  success,
  type RepositoryObject,
  type ObjectRef,
} from '@frade/repository-domain'
import type { FlowRepository } from '../src/flowContracts'
const feature = readFileSync(
  resolve(
    '../../openspec/changes/bundle-integration-flow-management/bdd/bundle-integration-flow-management.feature',
  ),
  'utf8',
)
const scenarios = [...feature.matchAll(/@BF-(\d+)\s+Scenario: (.+)/g)].map((m) => ({
  id: Number(m[1]),
  name: m[2],
}))
const ref = (objectId: string) => ({ repositoryId: 'r', objectId })
const capability = {
  typeId: 'custom:Flow',
  source: 'producer',
  consumer: 'receiver',
  search: ['description', 'technology'],
  columns: [{ field: 'technology', label: 'Technology' }],
  nonCloneable: ['audit', 'generated'],
  idPatterns: ['^F[0-9]+$'],
}
const flow = (id: string, a = 'A', b = 'B'): RepositoryObject => ({
  ref: ref(id),
  typeId: capability.typeId,
  name: id,
  revision: 'v1' as any,
  attributes: {
    producer: ref(a),
    receiver: ref(b),
    description: 'customer ' + id,
    technology: ['HTTP'],
    audit: 'secret',
    generated: 'derived',
  },
})
const system = (id: string): RepositoryObject => ({
  ref: ref(id),
  typeId: 'custom:System',
  name: id,
  revision: 'v1' as any,
  attributes: {},
})
const rule = {
  type: 'object',
  required: ['description', 'producer', 'receiver'],
  properties: {
    description: { type: 'string', minLength: 2 },
    producer: { referenceTargets: ['custom:System'] },
    receiver: { referenceTargets: ['custom:System'] },
    technology: { type: 'array', items: { type: 'string' } },
    audit: { type: 'string' },
    generated: { type: 'string' },
  },
} as any
async function setup(
  options: {
    members?: ObjectRef[]
    objects?: RepositoryObject[]
    repoReadOnly?: boolean
    diagramReadOnly?: boolean
    queryError?: boolean
    memberError?: boolean
    validationError?: boolean
    conflict?: boolean
  } = {},
) {
  let objects = options.objects ?? [
      ...['A', 'B', 'C', 'D'].map(system),
      flow('F1'),
      flow('F2', 'B', 'A'),
      flow('F3'),
      flow('F5', 'C', 'D'),
    ],
    revision = 0,
    members = options.members ?? [],
    queryError = options.queryError,
    memberError = options.memberError
  const listeners: (() => void)[] = []
  const service = new IntegrationFlowService(
    {
      repositoryId: 'r',
      subscribe: (fn: () => void) => {
        listeners.push(fn)
        return () => {}
      },
      exportSnapshot: async () => success({ objects }),
    } as any,
    [capability],
  )
  const mutate = vi.fn(async (next: ObjectRef[]) => {
    if (memberError) throw Error('native command failed')
    members = next
  })
  const request = vi.fn(async (op: string, p: any) => {
    if (op === 'integrationFlows')
      return queryError
        ? { ok: false, error: { code: 'REPOSITORY_UNAVAILABLE' } }
        : service.search(p.query)
    if (op === 'validate')
      return success({
        errors: options.validationError
          ? [{ code: 'REQUIRED', path: ['description'], message: 'Required description' }]
          : [],
      })
    if (op === 'getObject') return success(objects.find((o) => o.ref.objectId === p.ref.objectId))
    if (op === 'applyChanges') {
      const c = p.changeSet.commands[0]
      if (options.conflict) return { ok: false, error: { code: 'REVISION_CONFLICT', issues: [] } }
      if (c.op === 'createObject' && objects.some((o) => o.ref.objectId === c.object.ref.objectId))
        return { ok: false, error: { code: 'ALREADY_EXISTS', issues: [] } }
      const object = { ...c.object, revision: 'v' + ++revision }
      objects =
        c.op === 'createObject'
          ? [...objects, object]
          : objects.map((o) => (o.ref.objectId === object.ref.objectId ? object : o))
      listeners.forEach((fn) => fn())
      refreshHost?.()
      return success({ revision: String(revision) })
    }
    throw Error(op)
  })
  let refreshHost: (() => void) | undefined,
    undo: (() => void) | undefined,
    redo: (() => void) | undefined
  const history: ObjectRef[][] = []
  let future: ObjectRef[] | undefined
  function Host() {
    const [state, setState] = useState(members),
      [version, setVersion] = useState(0)
    useLayoutEffect(() => {
      refreshHost = () => setVersion((n) => n + 1)
      undo = () => {
        future = state
        const old = history.pop()
        if (old) {
          members = old
          setState(old)
        }
      }
      redo = () => {
        if (future) {
          members = future
          setState(future)
          future = undefined
        }
      }
    }, [state])
    const repo: FlowRepository = {
      types: [
        {
          id: capability.typeId,
          label: 'Flow',
          nameFields: ['description'],
          rule,
          fields: [{ key: 'description', required: true, rule: { type: 'string' } }],
          integrationFlow: capability,
        } as any,
      ],
      objects,
      readOnly: !!options.repoReadOnly,
      available: true,
      revision: String(version),
      request: request as any,
    }
    return (
      <FlowManager
        repository={repo}
        bundle={{ id: 'bundle', endpointA: ref('A'), endpointB: ref('B'), members: state }}
        readOnly={!!options.diagramReadOnly}
        onMembers={async (next) => {
          await mutate(next)
          history.push(state)
          setState(next)
        }}
        onClose={() => {}}
        onCounts={() => {}}
      />
    )
  }
  render(<Host />)
  await screen.findByRole('checkbox', { name: 'В жгуте: F1' }).catch(() => {})
  const checkbox = (name = 'F1') => screen.getByRole('checkbox', { name: 'В жгуте: ' + name })
  const action = async (name: string, label: string) => {
    const row = screen.getByRole('row', { name: 'Поток: ' + name })
    fireEvent.click(within(row).getByLabelText('Действия: ' + name))
    fireEvent.click(within(row).getByRole('button', { name: label }))
  }
  const create = async (id = 'F6', reverse = false) => {
    fireEvent.click(screen.getByRole('button', { name: '+ Новый поток' }))
    fireEvent.change(screen.getByLabelText('ID потока'), { target: { value: id } })
    fireEvent.change(screen.getByLabelText('description'), { target: { value: 'created ' + id } })
    if (reverse)
      fireEvent.click(screen.getByRole('button', { name: 'Поменять источник и потребителя' }))
  }
  const save = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить поток' }))
    await waitFor(() => expect(screen.queryByText('Сохранение…')).toBeNull())
  }
  return {
    checkbox,
    action,
    create,
    save,
    request,
    mutate,
    service,
    get objects() {
      return objects
    },
    get members() {
      return members
    },
    undo: () => undo?.(),
    redo: () => redo?.(),
    refresh: (next: RepositoryObject[]) => {
      objects = next
      listeners.forEach((fn) => fn())
      refreshHost?.()
    },
    retryQuery: () => {
      queryError = false
    },
    retryMembers: () => {
      memberError = false
    },
    history,
  }
}
afterEach(cleanup)
const cases: Record<number, () => Promise<void>> = {
  1: async () => {
    const s = await setup()
    expect(screen.getAllByRole('checkbox', { name: /В жгуте: / })).toHaveLength(3)
    expect(s.checkbox()).toHaveProperty('checked', false)
    expect(screen.getByText(/В жгуте: 0/)).toBeTruthy()
  },
  2: async () => {
    await setup()
    expect(screen.getByRole('row', { name: 'Поток: F1' }).textContent).toContain('A → B')
    expect(
      screen.getByRole('checkbox', { name: 'В жгуте: F1' }).getAttribute('aria-description'),
    ).toBe('A → B')
    expect(screen.getByRole('row', { name: 'Поток: F2' }).textContent).toContain('B → A')
  },
  3: async () => {
    await setup()
    expect(screen.queryByRole('checkbox', { name: 'В жгуте: F5' })).toBeNull()
  },
  4: async () => {
    const s = await setup({ members: [ref('F2')] })
    expect(s.checkbox('F2')).toHaveProperty('checked', true)
  },
  5: async () => {
    const s = await setup(),
      before = JSON.stringify(s.objects)
    fireEvent.click(s.checkbox())
    await waitFor(() => expect(s.members).toEqual([ref('F1')]))
    expect(JSON.stringify(s.objects)).toBe(before)
    expect(s.mutate).toHaveBeenCalledTimes(1)
  },
  6: async () => {
    const s = await setup({ members: [ref('F1')] })
    fireEvent.click(s.checkbox())
    await waitFor(() => expect(s.members).toEqual([]))
    expect(s.objects.find((o) => o.ref.objectId === 'F1')).toBeTruthy()
  },
  7: async () => {
    expect(setBundleMembers([ref('F1')], ref('F1'), true)).toEqual([ref('F1')])
  },
  8: async () => {
    const s = await setup()
    fireEvent.click(s.checkbox())
    await waitFor(() => expect(s.members).toHaveLength(1))
    s.undo()
    await waitFor(() => expect(s.checkbox()).toHaveProperty('checked', false))
  },
  9: async () => {
    const s = await setup()
    fireEvent.click(s.checkbox())
    await waitFor(() => expect(s.members).toHaveLength(1))
    s.undo()
    await waitFor(() => expect(s.checkbox()).toHaveProperty('checked', false))
    s.redo()
    await waitFor(() => expect(s.checkbox()).toHaveProperty('checked', true))
  },
  10: async () => {
    const refs = setBundleMembers([ref('F1'), ref('F3')])
    const stored = JSON.parse(JSON.stringify({ integrationFlowRefs: refs }))
    expect(stored).toEqual({ integrationFlowRefs: [ref('F1'), ref('F3')] })
    expect(JSON.stringify(stored)).not.toContain('customer')
  },
  11: async () => {
    await setup()
    fireEvent.click(screen.getByRole('button', { name: 'Подробнее: F1' }))
    expect(screen.getByLabelText('technology 1')).toBeTruthy()
    expect(screen.getByLabelText('audit')).toBeTruthy()
    expect(screen.getByLabelText('description')).toBeTruthy()
  },
  12: async () => {
    const s = await setup({ members: [ref('F2')] })
    fireEvent.change(screen.getByLabelText('Поиск потоков'), { target: { value: 'F2' } })
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'В жгуте: F1' })).toBeNull())
    expect(s.checkbox('F2')).toHaveProperty('checked', true)
  },
  13: async () => {
    await setup()
    fireEvent.change(screen.getByLabelText('Направление потока'), { target: { value: 'A_TO_B' } })
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'В жгуте: F2' })).toBeNull())
  },
  14: async () => {
    await setup()
    fireEvent.click(screen.getByLabelText('Искать во всем репозитории'))
    fireEvent.change(screen.getByLabelText('Поиск потоков'), { target: { value: 'F5' } })
    const row = await screen.findByRole('row', { name: 'Поток: F5' })
    expect(row.textContent).toContain('C → D')
    expect(screen.getByRole('columnheader', { name: 'Источник' })).toBeTruthy()
  },
  15: async () => {
    await setup()
    fireEvent.click(screen.getByLabelText('Искать во всем репозитории'))
    const box = await screen.findByRole('checkbox', { name: 'В жгуте: F5' })
    expect(box).toHaveProperty('disabled', true)
    expect(box.getAttribute('title')).toContain('C → D')
  },
  16: async () => {
    await setup()
    fireEvent.click(screen.getByLabelText('Искать во всем репозитории'))
    await screen.findByRole('checkbox', { name: 'В жгуте: F5' })
    fireEvent.click(screen.getByLabelText('Искать во всем репозитории'))
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'В жгуте: F5' })).toBeNull())
  },
  17: async () => {
    await setup({ objects: ['A', 'B'].map(system) })
    expect(screen.getByText(/интеграционных потоков в репозитории нет/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '+ Новый поток' })).toHaveProperty('disabled', false)
    expect(screen.getByLabelText('Искать во всем репозитории')).toBeTruthy()
  },
  18: async () => {
    const s = await setup()
    await s.create()
    await s.save()
    await waitFor(() =>
      expect(s.objects.find((o) => o.ref.objectId === 'F6')?.attributes.producer).toEqual(ref('A')),
    )
    expect(s.objects.find((o) => o.ref.objectId === 'F6')?.attributes.receiver).toEqual(ref('B'))
  },
  19: async () => {
    const s = await setup()
    await s.create('F6', true)
    await s.save()
    await waitFor(() =>
      expect(s.objects.find((o) => o.ref.objectId === 'F6')?.attributes.producer).toEqual(ref('B')),
    )
  },
  20: async () => {
    const s = await setup()
    await s.create()
    await s.save()
    await waitFor(() => expect(s.members).toContainEqual(ref('F6')))
  },
  21: async () => {
    const s = await setup({ validationError: true })
    await s.create()
    await s.save()
    expect(s.request.mock.calls.some((c) => c[0] === 'applyChanges')).toBe(false)
    expect(screen.getByText('Исправьте ошибки формы')).toBeTruthy()
  },
  22: async () => {
    const s = await setup()
    await s.create('F1')
    await s.save()
    expect(s.members).toEqual([])
    expect(screen.getByText('ALREADY_EXISTS')).toBeTruthy()
  },
  23: async () => {
    const s = await setup({ memberError: true })
    await s.create()
    await s.save()
    await screen.findByRole('button', { name: 'Повторить добавление' })
    expect(s.objects.find((o) => o.ref.objectId === 'F6')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить добавление' }))
    await waitFor(() => expect(s.mutate).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('button', { name: 'Повторить добавление' })).toBeTruthy()
    s.retryMembers()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить добавление' }))
    await waitFor(() => expect(s.members).toEqual([ref('F6')]))
    expect(s.request.mock.calls.filter((c) => c[0] === 'applyChanges')).toHaveLength(1)
  },
  24: async () => {
    const s = await setup({ members: [ref('F1')] })
    await s.action('F1', 'Редактировать')
    fireEvent.change(screen.getByLabelText('description'), { target: { value: 'updated' } })
    await s.save()
    expect(s.objects.find((o) => o.ref.objectId === 'F1')?.attributes.description).toBe('updated')
    expect(s.members).toEqual([ref('F1')])
  },
  25: async () => {
    const s = await setup({ members: [ref('F1')] })
    await s.action('F1', 'Поменять направление')
    expect(s.objects.find((o) => o.ref.objectId === 'F1')?.attributes.producer).toEqual(ref('A'))
    await s.save()
    expect(s.objects.find((o) => o.ref.objectId === 'F1')?.attributes.producer).toEqual(ref('B'))
    expect(s.objects.find((o) => o.ref.objectId === 'F1')?.attributes.technology).toEqual(['HTTP'])
    expect(s.members).toEqual([ref('F1')])
  },
  26: async () => {
    const s = await setup({ members: [ref('F1')] })
    await s.action('F1', 'Редактировать')
    fireEvent.click(screen.getByLabelText('receiver'))
    fireEvent.click(screen.getByRole('option', { name: 'C C' }))
    expect(screen.getByRole('button', { name: 'Сохранить поток' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByLabelText('Подтверждаю исключение из текущего жгута'))
    await s.save()
    await waitFor(() => expect(s.members).toEqual([]))
    expect(s.objects.find((o) => o.ref.objectId === 'F1')?.attributes.receiver).toEqual(ref('C'))
  },
  27: async () => {
    const s = await setup({ members: [ref('F1')] })
    await s.action('F1', 'Редактировать')
    fireEvent.click(screen.getByLabelText('receiver'))
    fireEvent.click(screen.getByRole('option', { name: 'C C' }))
    fireEvent.click(screen.getByRole('button', { name: 'Отмена редактирования' }))
    fireEvent.click(screen.getByRole('button', { name: 'Продолжить без сохранения' }))
    expect(s.objects.find((o) => o.ref.objectId === 'F1')?.attributes.receiver).toEqual(ref('B'))
    expect(s.members).toEqual([ref('F1')])
  },
  28: async () => {
    const s = await setup()
    await s.action('F1', 'Клонировать')
    fireEvent.change(screen.getByLabelText('ID потока'), { target: { value: 'F6' } })
    await s.save()
    const cloned = s.objects.find((o) => o.ref.objectId === 'F6')!
    expect(cloned.attributes.producer).toEqual(ref('A'))
    expect(cloned.attributes.technology).toEqual(['HTTP'])
    expect(cloned.attributes).not.toHaveProperty('audit')
  },
  29: async () => {
    const s = await setup()
    fireEvent.click(screen.getByLabelText('Искать во всем репозитории'))
    await screen.findByRole('row', { name: 'Поток: F5' })
    await s.action('F5', 'Клонировать для A ↔ B')
    fireEvent.change(screen.getByLabelText('ID потока'), { target: { value: 'F6' } })
    await s.save()
    expect(s.objects.find((o) => o.ref.objectId === 'F6')?.attributes.producer).toEqual(ref('A'))
    expect(s.objects.find((o) => o.ref.objectId === 'F6')?.attributes.receiver).toEqual(ref('B'))
  },
  30: async () => {
    const s = await setup({ members: [ref('Missing')] })
    expect(screen.getByText('Недоступный поток: Missing')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Исключить из жгута' }))
    await waitFor(() => expect(s.members).toEqual([]))
  },
  31: async () => {
    const s = await setup({ repoReadOnly: true })
    expect(s.checkbox()).toHaveProperty('disabled', false)
    expect(screen.getByRole('button', { name: '+ Новый поток' })).toHaveProperty('disabled', true)
    await s.action('F1', 'Редактировать')
    expect(screen.queryByRole('button', { name: 'Сохранить поток' })).toBeNull()
  },
  32: async () => {
    const s = await setup({ diagramReadOnly: true })
    expect(s.checkbox()).toHaveProperty('disabled', true)
    expect(
      screen.getByRole('checkbox', { name: 'Включить все подходящие потоки из текущей выборки' }),
    ).toHaveProperty('disabled', true)
  },
  33: async () => {
    const s = await setup({ queryError: true })
    expect(screen.getByText('Ошибка запроса: REPOSITORY_UNAVAILABLE')).toBeTruthy()
    expect(screen.queryByText(/интеграционных потоков в репозитории нет/)).toBeNull()
    s.retryQuery()
    fireEvent.click(screen.getByRole('button', { name: 'Повторить запрос' }))
    await screen.findByRole('checkbox', { name: 'В жгуте: F1' })
  },
  34: async () => {
    const s = await setup()
    s.refresh([...s.objects, flow('F4')])
    await screen.findByRole('checkbox', { name: 'В жгуте: F4' })
  },
  35: async () => {
    const f = flow('F1'),
      members = [f.ref]
    const result = validateBundleMembers(
      members,
      new Map([[JSON.stringify(ref('F1')), f]]) as any,
      capability,
      ref('A'),
      ref('C'),
    )
    expect(result.map((m) => m.state)).toEqual(['incompatible'])
    expect(f.attributes.receiver).toEqual(ref('B'))
  },
  36: async () => {
    const s = await setup({ members: [ref('F1')] })
    fireEvent.click(s.checkbox())
    await waitFor(() => expect(s.members).toEqual([]))
    s.undo()
    await waitFor(() => expect(s.members).toEqual([ref('F1')]))
  },
  37: async () => {
    const s = await setup({ members: [ref('F1'), ref('F2')] })
    cleanup()
    expect(s.objects.filter((o) => ['F1', 'F2'].includes(o.ref.objectId))).toHaveLength(2)
    expect(s.request.mock.calls.every((c) => c[0] !== 'applyChanges')).toBe(true)
  },
  38: async () => {
    const s = await setup()
    const box = s.checkbox()
    box.focus()
    expect(document.activeElement).toBe(box)
    fireEvent.click(box)
    await waitFor(() => expect(s.members).toEqual([ref('F1')]))
    expect(document.activeElement).toBe(box)
  },
  39: async () => {
    await setup()
    expect(screen.getByRole('row', { name: 'Поток: F1' }).textContent).toContain('A → B')
  },
  40: async () => {
    const many = Array.from({ length: 100000 }, (_, i) => flow('F' + i))
    const s = await setup({ objects: many })
    expect(screen.getAllByRole('checkbox', { name: /В жгуте: / })).toHaveLength(50)
    expect(screen.getByRole('navigation', { name: 'Страницы потоков' })).toBeTruthy()
    s.service.dispose()
  },
  41: async () => {
    const s = await setup({
      objects: [
        ...['A', 'B'].map(system),
        ...Array.from({ length: 5 }, (_, i) => flow('F' + (i + 1))),
      ],
    })
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Включить все подходящие потоки из текущей выборки' }),
    )
    await waitFor(() => expect(s.members).toHaveLength(5))
    expect(s.mutate).toHaveBeenCalledTimes(1)
    s.undo()
    await waitFor(() => expect(s.members).toEqual([]))
  },
  42: async () => {
    const s = await setup()
    fireEvent.click(screen.getByLabelText('Искать во всем репозитории'))
    await screen.findByRole('checkbox', { name: 'В жгуте: F5' })
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Включить все подходящие потоки из текущей выборки' }),
    )
    await waitFor(() => expect(s.members).toHaveLength(3))
    expect(s.members).not.toContainEqual(ref('F5'))
  },
}
it('all 42 authoritative Gherkin scenarios have executable acceptance bindings', () => {
  expect(scenarios).toHaveLength(42)
  expect(
    Object.keys(cases)
      .map(Number)
      .sort((a, b) => a - b),
  ).toEqual(scenarios.map((s) => s.id))
})
for (const scenario of scenarios)
  it('BF-' + String(scenario.id).padStart(2, '0') + ' ' + scenario.name, cases[scenario.id], 20000)

it('revision conflict preserves dirty editor and does not change membership', async () => {
  const s = await setup({ members: [ref('F1')], conflict: true })
  await s.action('F1', 'Редактировать')
  fireEvent.change(screen.getByLabelText('description'), { target: { value: 'my draft' } })
  await s.save()
  expect((screen.getByLabelText('description') as HTMLTextAreaElement).value).toBe('my draft')
  expect(screen.getByText('Поток был изменен в репозитории.')).toBeTruthy()
  expect(s.members).toEqual([ref('F1')])
  fireEvent.click(
    screen.getByRole('button', { name: 'Загрузить актуальную версию для повторения изменений' }),
  )
  await waitFor(() => expect(screen.queryByText('Поток был изменен в репозитории.')).toBeNull())
  expect((screen.getByLabelText('description') as HTMLTextAreaElement).value).toBe('my draft')
})
it('dirty form close requires explicit discard and preserves the draft on decline', async () => {
  const s = await setup()
  await s.action('F1', 'Редактировать')
  fireEvent.change(screen.getByLabelText('description'), { target: { value: 'dirty' } })
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть менеджер потоков' }))
  expect(screen.getByText('Есть несохранённые изменения формы.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить редактирование' }))
  expect((screen.getByLabelText('description') as HTMLTextAreaElement).value).toBe('dirty')
  expect(s.request.mock.calls.some((c) => c[0] === 'applyChanges')).toBe(false)
})
