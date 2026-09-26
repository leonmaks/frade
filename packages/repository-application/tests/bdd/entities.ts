import { expect } from 'vitest'
import * as domain from '@frade/repository-domain'
import { setup, object, unwrap } from './world'
import type { Step } from './runner'
const bind = (pattern: RegExp, run: Step['run']): Step => ({ pattern, run })
const count = (v: any): number =>
  1 + (v && typeof v === 'object' ? Object.values(v).reduce<number>((n, x) => n + count(x), 0) : 0)
export const entities: Step[] = [
  bind(/^repository entities with "([^"]+)"$/, (w, condition) => {
    w.entities = [object()]
    w.kinds = ['object']
    w.provenance = [{ kind: 'object', ref: object().ref, locator: 'old' }]
    if (condition === 'identical local IDs in two sources')
      w.entities.push({ ...object(), ref: { repositoryId: 'S', objectId: 'A' } })
    else if (condition === 'equal object and relation local IDs') {
      w.entities.push({
        ref: { repositoryId: 'R', relationId: 'A' },
        typeId: 'sample:Flow',
        source: object().ref,
        target: object().ref,
        attributes: {},
        revision: '9',
      })
      w.kinds.push('relation')
    } else if (condition === 'delimiters in repository and IDs')
      w.entities = [
        { ...object(), ref: { repositoryId: 'R:A', objectId: 'B' } },
        { ...object(), ref: { repositoryId: 'R', objectId: 'A:B' } },
      ]
    else if (condition === 'a renamed physical resource')
      w.provenance.push({ ...w.provenance[0], locator: 'new' })
    else if (condition === 'revisions 9 and 10 as opaque strings')
      w.entities = [
        { ...object(), revision: '9' },
        { ...object(), revision: '10' },
      ]
    w.condition = condition
  }),
  bind(/^their qualified identities and provenance are decoded$/, (w) => {
    w.decoded = w.entities.map((e: any, i: number) =>
      unwrap(
        (w.kinds[i] ?? 'object') === 'object' ? domain.decodeObject(e) : domain.decodeRelation(e),
      ),
    )
    w.locations = w.provenance.map((v: any) => unwrap(domain.decodeProvenance(v)))
  }),
  bind(/^entity identity is preserved without collisions or revision ordering$/, (w) => {
    w.decoded.forEach((e: any, i: number) => {
      expect(e.ref).toEqual(w.entities[i].ref)
      expect(e.revision).toBe(w.entities[i].revision)
    })
    if (w.condition.includes('IDs') || w.condition.includes('delimiters'))
      expect(
        new Set(
          w.decoded.map((e: any, i: number) => domain.entityKey(w.kinds[i] ?? 'object', e.ref)),
        ).size,
      ).toBe(w.decoded.length)
    if (w.locations.length === 2) {
      expect(w.locations[0].ref).toEqual(w.locations[1].ref)
      expect(w.locations[0].locator).not.toBe(w.locations[1].locator)
    }
  }),
  bind(/^an entity with "([^"]+)"$/, (w, defect) => {
    w.input = object()
    w.getters = 0
    const changes: Record<string, () => void> = {
      'a blank reference': () => {
        w.input.ref.objectId = ' '
      },
      'a blank object name': () => {
        w.input.name = ' '
      },
      'a blank revision': () => {
        w.input.revision = ' '
      },
      'an invalid type ID': () => {
        w.input.typeId = 'invalid'
      },
      'an unknown field': () => {
        w.input.unknown = true
      },
      'a nested accessor': () => {
        w.input.attributes = Object.defineProperty({}, 'value', {
          enumerable: true,
          get: () => {
            w.getters++
            return 1
          },
        })
      },
      'a dangerous key': () => {
        w.input.attributes = JSON.parse('{"__proto__":1}')
      },
      'a custom prototype': () => {
        w.input.attributes = Object.create({ bad: true })
      },
      'a cycle': () => {
        w.input.attributes.self = w.input.attributes
      },
      'a sparse array': () => {
        w.input.attributes = { list: Array(2) }
      },
      'a non-finite number': () => {
        w.input.attributes = { value: Infinity }
      },
      'an undefined value': () => {
        w.input.attributes = { value: undefined }
      },
      'a symbol property': () => {
        w.input.attributes[Symbol('bad')] = 1
      },
    }
    if (!changes[defect]) throw Error(defect)
    changes[defect]()
    w.descriptors = Object.getOwnPropertyDescriptors(w.input)
    w.attributeDescriptors = Object.getOwnPropertyDescriptors(w.input.attributes)
  }),
  bind(/^the entity is decoded$/, (w) => {
    w.result = domain.decodeObject(w.input)
  }),
  bind(/^decoding fails without input mutation or getter execution$/, (w) => {
    expect(w.result.ok).toBe(false)
    expect(w.getters).toBe(0)
    expect(Object.getOwnPropertyDescriptors(w.input)).toEqual(w.descriptors)
    expect(Object.getOwnPropertyDescriptors(w.input.attributes)).toEqual(w.attributeDescriptors)
  }),
  bind(/^a valid object with nested attributes$/, (w) => {
    w.input = { ...object(), attributes: { nested: { value: 1 } } }
  }),
  bind(/^its source attributes are changed after decoding$/, (w) => {
    w.result = domain.decodeObject(w.input)
    w.input.attributes.nested.value = 2
  }),
  bind(/^the decoded attributes keep their original values$/, (w) => {
    expect(unwrap(w.result).attributes.nested.value).toBe(1)
  }),
  bind(/^an otherwise valid snapshot at "([^"]+)"$/, async (w, boundary) => {
    await setup(w)
    w.input = { ...w.fixture.state, objects: [object()] }
    if (boundary.startsWith('depth')) {
      let nested: any = 0
      for (let i = 0; i < Number(boundary.split(' ')[1]) - 4; i++) nested = { x: nested }
      w.input.objects[0].attributes = { deep: nested }
    } else {
      w.input.objects[0].attributes = { list: [] }
      const n = Number(boundary.split(' ')[0])
      w.input.objects[0].attributes.list = Array(n - count(w.input)).fill(null)
      expect(count(w.input)).toBe(n)
    }
  }),
  bind(/^the snapshot envelope is decoded$/, (w) => {
    w.result = domain.decodeSnapshot(w.input)
  }),
  bind(/^the decode outcome is "([^"]+)" without partial data$/, (w, outcome) => {
    if (outcome === 'success') expect(w.result.ok).toBe(true)
    else {
      expect(w.result).toMatchObject({ ok: false, error: { code: outcome } })
      expect(w.result).not.toHaveProperty('value')
    }
  }),
  bind(
    /^a bound snapshot with names revisions provenance and omitted defaulted attributes$/,
    async (w) => {
      await setup(w)
      w.input = { ...w.fixture.state, objects: [{ ...object(), attributes: {} }] }
      w.provenance = { kind: 'object', ref: object().ref, locator: 'opaque' }
      w.original = structuredClone(w.input)
    },
  ),
  bind(/^the snapshot is projected for metamodel validation$/, (w) => {
    w.result = domain.validationProjection(w.input)
  }),
  bind(/^qualified references remain and storage fields and defaults are not added$/, (w) => {
    expect(w.result).toEqual({
      objects: [{ ref: object().ref, typeId: object().typeId, attributes: {} }],
      relations: [],
    })
    expect(w.input).toEqual(w.original)
  }),
  bind(/^a compiled model and a snapshot with a different "([^"]+)"$/, async (w, part) => {
    await setup(w)
    const binding = { ...w.fixture.state.binding }
    binding[part === 'model ID' ? 'modelId' : part === 'version' ? 'modelVersion' : 'fingerprint'] =
      part === 'model ID' ? 'other:model' : part === 'version' ? '2.0.0' : 'f'.repeat(64)
    w.fixture.replaceState({ ...w.fixture.state, binding })
  }),
  bind(/^repository validation is requested$/, async (w) => {
    w.result = await w.session.applyChanges(w.command)
  }),
  bind(/^the result is BINDING_MISMATCH and no writer is called$/, (w) => {
    expect(w.result).toMatchObject({ ok: false, error: { code: 'BINDING_MISMATCH' } })
    expect(w.fixture.writes).toBe(0)
  }),
]
