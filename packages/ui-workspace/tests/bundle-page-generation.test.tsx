// @vitest-environment jsdom
import { act, renderHook, cleanup } from '@testing-library/react'
import { isValidElement } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { useBundleManager } from '../src/useBundleManager'
import type { DiagramViewProps } from '../src/DiagramView'
import type { ObjectRef } from '@frade/repository-domain'
afterEach(cleanup)
it('invalidates queued membership and late annotations before another page reuses a cell ID', async () => {
  const pending: ((value: unknown) => void)[] = [],
    change = vi.fn(),
    badge = vi.fn()
  const props = {
    draft: {
      repositoryId: 'repo',
      path: 'd.frade',
      xml: '',
      revision: 'r',
      current: '',
      dirty: false,
      epoch: 0,
    },
    target: null,
    objects: [],
    readOnly: false,
    onBaseline: vi.fn(),
    onChange: vi.fn(),
    onError: vi.fn(),
    onSave: vi.fn(),
    onDiscard: vi.fn(),
    onOpenObject: vi.fn(),
    onShortcut: vi.fn(),
    register: vi.fn(),
    flowRepository: {
      types: [],
      objects: [],
      readOnly: false,
      available: true,
      revision: 'r',
      request: vi.fn(() => new Promise((resolve) => pending.push(resolve))),
    },
  } as unknown as DiagramViewProps
  const { result } = renderHook(() => useBundleManager(props, change, badge))
  const bundle = {
    id: 'reused-cell',
    endpointA: { repositoryId: 'repo', objectId: 'a' },
    endpointB: { repositoryId: 'repo', objectId: 'b' },
    members: [],
  }
  await act(async () => {
    result.current.open(bundle)
  })
  const panel = result.current.panel
  if (!isValidElement<{ onMembers(refs: ObjectRef[]): Promise<void> }>(panel))
    throw Error('Panel unavailable')
  let work: Promise<void>
  await act(async () => {
    work = panel.props.onMembers([{ repositoryId: 'repo', objectId: 'flow' }])
    await Promise.resolve()
  })
  const rejected = expect(work!).rejects.toThrow('Контекст диаграммы изменился')
  act(() => result.current.reset())
  await act(async () => {
    for (const resolve of pending)
      resolve({
        ok: true,
        value: {
          members: [
            {
              ref: { repositoryId: 'repo', objectId: 'flow' },
              state: 'valid',
              flow: { name: 'Flow', attributes: {} },
            },
          ],
          capabilities: [],
          totalEligible: 1,
        },
      })
    await rejected
  })
  expect(change).not.toHaveBeenCalled()
  expect(badge).not.toHaveBeenCalled()
  expect(result.current.current.current).toBeUndefined()
  expect(result.current.isOpen).toBe(false)
})
