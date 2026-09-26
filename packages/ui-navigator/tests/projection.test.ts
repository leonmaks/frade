import type { Revision, RepositoryObject } from '@frade/repository-domain'
import { it, expect } from 'vitest'
import { projectTree, type TreeNode } from '../src/Navigator'
const object = (id: string, parent?: string): RepositoryObject => ({
  ref: { repositoryId: 'A', objectId: id },
  typeId: 's:T',
  name: id,
  revision: '1' as Revision,
  attributes: parent ? { parent: { repositoryId: 'A', objectId: parent } } : {},
})
it('NAV-001/004 projects each object once including orphan and cycles and separates duplicate IDs', () => {
  const root = {
    repositoryId: 'A',
    label: 'A',
    adapterKind: 'sberea',
    dataRoot: 'A',
    entry: 'root.yaml',
    metadataSets: [],
    activeMetadataSet: '',
  }
  const objects = [
    object('top'),
    object('child', 'top'),
    object('orphan', 'absent'),
    object('cycle1', 'cycle2'),
    object('cycle2', 'cycle1'),
  ]
  for (const projection of ['types', 'sources'] as const) {
    const tree = projectTree(
      [
        { root, objects },
        {
          root: { ...root, repositoryId: 'B' },
          objects: objects.map((o) => ({ ...o, ref: { ...o.ref, repositoryId: 'B' } })),
        },
      ],
      projection,
    )
    const flattened: TreeNode[] = []
    const walk = (n: TreeNode) => {
      flattened.push(n)
      n.children.forEach(walk)
    }
    tree.forEach(walk)
    expect(flattened.filter((n) => n.kind === 'object')).toHaveLength(10)
    expect(new Set(flattened.map((n) => n.key)).size).toBe(flattened.length)
    if (projection === 'types') {
      expect(flattened.some((n) => n.label === 'Циклические связи')).toBe(true)
      expect(flattened.some((n) => n.label === 'Без доступного родителя')).toBe(true)
    }
  }
})
