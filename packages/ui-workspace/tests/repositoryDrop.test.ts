import { expect, it, vi } from 'vitest'
import { readRepositoryDrag } from '@frade/ui-navigator'
import { droppedObject } from '../src/repositoryDrop'
import type { DiagramViewProps } from '../src/DiagramView'
it('resolves drag identity against the owning repository and explicitly connected sources', () => {
  const local = { id: 'same', name: 'Local' },
    external = { id: 'same', sourceId: 'catalog', name: 'External' }
  const props = {
    draft: { repositoryId: 'A' },
    objects: [local, external],
    readOnly: false,
    onError: vi.fn(),
  } as unknown as DiagramViewProps
  const payload = (repositoryId: string, sourceId?: string) =>
    JSON.stringify({ repositoryId, objectId: 'same', ...(sourceId ? { sourceId } : {}) })
  expect(droppedObject(payload('A'), props)).toBe(local)
  expect(droppedObject(payload('A', 'catalog'), props)).toBe(external)
  expect(droppedObject(payload('B'), props)).toBeUndefined()
  expect(droppedObject(payload('A', 'unconnected'), props)).toBeUndefined()
  expect(droppedObject(payload('A'), { ...props, readOnly: true })).toBeUndefined()
  expect(readRepositoryDrag('{')).toBeUndefined()
  expect(
    readRepositoryDrag(JSON.stringify({ repositoryId: 'A', objectId: 'same', name: '<injected>' })),
  ).toBeUndefined()
  expect(readRepositoryDrag(JSON.stringify({ repositoryId: 'A', objectId: {} }))).toBeUndefined()
})
