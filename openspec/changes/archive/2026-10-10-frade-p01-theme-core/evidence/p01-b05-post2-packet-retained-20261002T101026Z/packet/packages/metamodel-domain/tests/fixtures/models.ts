import type { ModelDefinition, RelationTypeDefinition, ProspectiveSnapshot } from '../../src'
export function company(namespace = 'acme'): ModelDefinition {
  return {
    schemaVersion: 1,
    id: namespace + ':model',
    version: '1.2.3',
    imports: [],
    objectTypes: [
      {
        id: namespace + ':asset',
        abstract: true,
        attributes: [{ id: 'name', schema: { kind: 'string', minLength: 1 }, required: true }],
        ui: { label: 'Asset' },
        lifecycle: {
          states: ['draft', 'active'],
          initial: 'draft',
          transitions: [{ from: 'draft', to: 'active' }],
        },
      },
      {
        id: namespace + ':app',
        extends: namespace + ':asset',
        attributes: [],
        ui: { label: 'Application' },
      },
      { id: namespace + ':database', attributes: [] },
    ],
    relationTypes: [relation(namespace)],
    profiles: [
      {
        id: namespace + ':profile',
        objectTypes: [namespace + ':app'],
        relationTypes: [namespace + ':uses'],
      },
    ],
    viewpoints: [
      {
        id: namespace + ':view',
        objectTypes: [namespace + ':app'],
        relationTypes: [namespace + ':uses'],
        presentation: [{ typeId: namespace + ':app', ui: { label: 'App' } }],
      },
    ],
  }
}
export function relation(namespace = 'acme'): RelationTypeDefinition {
  return {
    id: namespace + ':uses',
    source: { typeIds: [namespace + ':asset'], includeSubtypes: true },
    target: { typeIds: [namespace + ':database'], includeSubtypes: false },
    attributes: [],
  }
}
export function snapshot(): ProspectiveSnapshot {
  return {
    objects: [
      { ref: { repositoryId: 'R', objectId: 'A' }, typeId: 'acme:app', attributes: { name: 'A' } },
      { ref: { repositoryId: 'R', objectId: 'B' }, typeId: 'acme:database', attributes: {} },
    ],
    relations: [
      {
        ref: { repositoryId: 'R', relationId: 'edge' },
        typeId: 'acme:uses',
        source: { repositoryId: 'R', objectId: 'A' },
        target: { repositoryId: 'R', objectId: 'B' },
        attributes: {},
      },
    ],
  }
}
export function freeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    Object.freeze(v)
    for (const value of Object.values(v)) freeze(value)
  }
  return v
}
