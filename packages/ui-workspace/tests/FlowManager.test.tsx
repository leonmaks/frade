// @vitest-environment jsdom
import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { FlowManager } from '../src/FlowManager'
import type { FlowRepository } from '../src/flowContracts'
const ref = (objectId: string) => ({ repositoryId: 'r', objectId })
const bundle = { id: 'bundle', endpointA: ref('A'), endpointB: ref('B'), members: [] }
const flow = {
  ref: ref('F1'),
  typeId: 'custom:Flow',
  name: 'Payload',
  revision: 'v1',
  attributes: { producer: ref('A'), receiver: ref('B'), description: 'Payload', tech: ['HTTP'] },
}
const config = {
  typeId: 'custom:Flow',
  source: 'producer',
  consumer: 'receiver',
  search: ['description'],
  columns: [{ field: 'tech', label: 'Technology' }],
  nonCloneable: [],
}
const make = (request: any): FlowRepository => ({
  types: [
    {
      id: 'custom:Flow',
      label: 'Flow',
      nameFields: ['description'],
      rule: { type: 'object', properties: { description: { type: 'string' } } },
      fields: [],
      integrationFlow: config,
    } as any,
  ],
  objects: [],
  readOnly: false,
  available: true,
  revision: 'v1',
  request,
})
it('membership uses immediate diagram command; details are separate and keyboard compatible', async () => {
  const update = vi.fn(async () => {}),
    request = vi.fn(async () => ({
      ok: true,
      value: {
        items: [{ flow, eligible: true, direction: 'A_TO_B', values: { tech: 'HTTP' } }],
        total: 1,
        totalEligible: 1,
        members: [],
        capabilities: [config],
      },
    }))
  render(
    <FlowManager
      repository={make(request)}
      bundle={bundle}
      readOnly={false}
      onMembers={update}
      onClose={() => {}}
      onCounts={() => {}}
    />,
  )
  const checkbox = await screen.findByRole('checkbox', { name: 'В жгуте: Payload' })
  fireEvent.click(checkbox)
  await waitFor(() => expect(update).toHaveBeenCalledWith([ref('F1')]))
  fireEvent.click(screen.getByRole('button', { name: 'Подробнее: Payload' }))
  expect(((await screen.findByLabelText('tech 1')) as HTMLTextAreaElement).value).toBe('HTTP')
  cleanup()
})
it('incompatible extended rows cannot be included; errors differ from empty and retry exists', async () => {
  const request = vi.fn(async () => ({
    ok: false,
    error: { code: 'REPOSITORY_UNAVAILABLE', message: 'unavailable', issues: [] },
  }))
  render(
    <FlowManager
      repository={make(request) as any}
      bundle={bundle}
      readOnly={false}
      onMembers={async () => {}}
      onClose={() => {}}
      onCounts={() => {}}
    />,
  )
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Повторить запрос' })).toBeTruthy()
  expect(screen.queryByText(/интеграционных потоков в репозитории нет/)).toBeNull()
  cleanup()
})

it('damaged membership is protected until explicit recovery, respecting diagram read-only', async () => {
  const update = vi.fn(async () => {}),
    request = vi.fn(async () => ({
      ok: true,
      value: {
        items: [{ flow, eligible: true, direction: 'A_TO_B', values: { tech: 'HTTP' } }],
        total: 1,
        totalEligible: 1,
        members: [],
        capabilities: [config],
      },
    }))
  const props = {
    repository: make(request),
    bundle: { ...bundle, invalidMembership: true },
    readOnly: false,
    onMembers: update,
    onClose: () => {},
    onCounts: () => {},
  }
  const rendered = render(<FlowManager {...props} />)
  expect(
    ((await screen.findByRole('checkbox', { name: 'В жгуте: Payload' })) as HTMLInputElement)
      .disabled,
  ).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Очистить повреждённый состав' }))
  await waitFor(() => expect(update).toHaveBeenCalledWith([]))
  rendered.rerender(<FlowManager {...props} readOnly={true} />)
  expect(
    (screen.getByRole('button', { name: 'Очистить повреждённый состав' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  cleanup()
})
