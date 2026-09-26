import { expect } from 'vitest'
import { validateSnapshot } from '@frade/metamodel-domain'
import type { Step } from './runner'
import {
  init,
  projections,
  unsafe,
  graph,
  badExtension,
  semanticError,
  changed,
  repository,
  assertNoCandidate,
  compile,
  race,
  source,
  setup,
  extend,
  attribute,
  value,
  copy,
  compileModel,
  createModelPublisher,
  compareModels,
  previewMigration,
} from '../support/scenarios'
const exact = (text: string, run: Step['run']): Step => ({
  pattern: new RegExp('^' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'),
  run,
})
const regex = (pattern: RegExp, run: Step['run']): Step => ({ pattern, run })
const candidate = (w: any) => value<any>(w.result)
const compileCandidate = async (w: any) => {
  await compile(w)
  w.candidate = candidate(w)
}
const mutate = (fn: () => unknown) => {
  try {
    fn()
  } catch (e) {
    expect(e).toBeInstanceOf(TypeError)
  }
}
const fields = (w: any, id: string) =>
  candidate(w).objectTypes.find((t: any) => t.id === id).attributes
export const steps: Step[] = [
  regex(/^a valid organization envelope supplied as "([^"]+)"$/, (w, format) => {
    init(w)
    if (format === 'JSON') w.org = JSON.stringify(w.org)
    w.before = copy(w.org)
  }),
  exact('I compile the organization', compile),
  exact('the candidate contains its declared types', (w) =>
    expect(candidate(w).objectTypes.map((t: any) => t.id)).toEqual([
      'base:asset',
      'base:child',
      'base:target',
    ]),
  ),
  exact('the input is unchanged', (w) => expect(w.org).toEqual(w.before)),
  regex(/^an organization source with "([^"]+)"$/, unsafe),
  exact('compilation fails without a candidate', (w) => assertNoCandidate(w.result)),
  exact('no source accessor or function was executed', (w) => expect(w.executed).toBe(0)),
  exact('two imports share the same exact base package', (w) => {
    init(w)
    const m: any = source('second:model')
    m.definition.imports = copy(w.org.definition.imports)
    w.sources.set('second:model', m)
    w.org.definition.imports.push({ id: 'second:model', version: '1.0.0' })
  }),
  exact('the base package was loaded once', (w) =>
    expect(w.calls.filter((id: string) => id === 'base:model')).toHaveLength(1),
  ),
  exact('its types occur once in the candidate', (w) =>
    expect(candidate(w).objectTypes.filter((t: any) => t.id === 'base:asset')).toHaveLength(1),
  ),
  regex(/^an import graph with "([^"]+)"$/, graph),
  exact('the diagnostic identifies the failing package', (w) => {
    expect(w.result.diagnostics[0].modelId).toBeTruthy()
    expect(w.result.diagnostics[0].modelVersion).toBeTruthy()
  }),
  exact(
    'an organization adds a required attribute with a valid default to an imported parent',
    (w) => {
      init(w)
      extend(w)
      w.original = copy(w.base)
    },
  ),
  exact('the parent and descendants contain the added attribute', (w) => {
    for (const id of ['base:asset', 'base:child']) expect(fields(w, id)).toContainEqual(attribute())
  }),
  exact('all original attributes and constraints are retained', (w) => {
    for (const t of w.original.definition.objectTypes)
      for (const a of t.attributes) expect(fields(w, t.id)).toContainEqual(a)
    expect(w.base).toEqual(w.original)
  }),
  exact('an organization adds an attribute to an imported relation', (w) => {
    init(w)
    extend(w, 'relation', 'base:uses')
    Object.assign(w.base.definition.relationTypes[0], {
      direction: 'directed',
      allowSelfReference: true,
      duplicates: 'allow',
      sourceCardinality: { min: 1, max: 4 },
      targetCardinality: { min: 0, max: 8 },
    })
    w.original = copy(w.base.definition.relationTypes[0])
  }),
  exact('the relation contains the added attribute', (w) =>
    expect(candidate(w).relationTypes[0].attributes).toContainEqual(attribute()),
  ),
  exact(
    'endpoint cardinality direction duplicate and self-reference policies are unchanged',
    (w) => {
      for (const k of [
        'source',
        'target',
        'direction',
        'allowSelfReference',
        'duplicates',
        'sourceCardinality',
        'targetCardinality',
      ])
        expect(candidate(w).relationTypes[0][k]).toEqual(w.original[k])
    },
  ),
  regex(/^an organization extension with "([^"]+)"$/, badExtension),
  exact('I compile the organization in both package orders', async (w) => {
    await compile(w)
    w.org.definition.imports.reverse()
    w.org.extensions?.reverse()
    w.result2 = await compileModel(w.org, w.ports)
  }),
  exact('both compilations fail without a candidate', (w) => {
    assertNoCandidate(w.result)
    assertNoCandidate(w.result2)
  }),
  exact('a local type inherits from a valid imported parent', (w) => {
    init(w)
    w.org.definition.objectTypes = [{ id: 'org:child', extends: 'base:asset', attributes: [] }]
  }),
  exact('the candidate contains the inherited attributes and lineage', (w) => {
    const t = candidate(w).objectTypes.find((t: any) => t.id === 'org:child')
    expect(t.ancestors).toEqual(['base:asset'])
    expect(t.attributes[0].id).toBe('name')
  }),
  regex(/^composed model definitions with "([^"]+)"$/, semanticError),
  exact('compilation fails with the corresponding domain diagnostic', (w) => {
    assertNoCandidate(w.result)
    expect(w.result.diagnostics.map((d: any) => d.code)).toContain(w.expected)
  }),
  exact('the diagnostic identifies the responsible entity', (w) => {
    expect(w.result.diagnostics[0].entityId).toBeTruthy()
    expect(w.result.diagnostics[0].modelId).toBeTruthy()
  }),
  exact('the import loader throws an error containing private host details', (w) => {
    init(w)
    w.ports.load = async () => {
      throw Error('private host details /secret/path')
    }
  }),
  exact('a load-stage diagnostic is returned without private host details', (w) => {
    expect(w.result.diagnostics[0]).toMatchObject({ stage: 'load', code: 'LOAD_FAILED' })
    expect(JSON.stringify(w.result)).not.toContain('secret')
    expect(JSON.stringify(w.result)).not.toContain('private')
  }),
  exact('compilation has no candidate', (w) => assertNoCandidate(w.result)),
  exact('semantically identical invalid models with reordered declarations', (w) => {
    init(w)
    w.base.definition.objectTypes[0].extends = 'unknown:parent'
    w.other = setup()
    w.other.base.definition.objectTypes = copy(w.base.definition.objectTypes).reverse()
  }),
  exact('I compile both models', async (w) => {
    w.result = await compileModel(w.org, w.ports)
    w.result2 = await compileModel(w.other.org, w.other.ports)
  }),
  exact('their package-qualified semantic diagnostics are identical', (w) => {
    assertNoCandidate(w.result)
    expect(w.result.diagnostics).toEqual(w.result2.diagnostics)
  }),

  exact('a profile selecting a parent but not its child', projections),
  exact('I compile and request that profile', async (w) => {
    await compileCandidate(w)
    w.projection = value(w.candidate.project('org:profile'))
  }),
  exact('the projection selects only the parent', (w) =>
    expect(w.projection.objectTypes).toEqual(['base:asset']),
  ),
  exact('full domain analysis still contains the child', (w) =>
    expect(w.candidate.analysis().objectTypes.has('base:child')).toBe(true),
  ),
  exact('a profile with empty type selections', (w) => {
    projections(w)
    w.org.definition.profiles[0].objectTypes = []
    w.org.definition.profiles[0].relationTypes = []
  }),
  exact('the projection selects no types', (w) => {
    expect(w.projection.objectTypes).toEqual([])
    expect(w.projection.relationTypes).toEqual([])
  }),
  exact('a profile selecting an unknown type', (w) => {
    projections(w)
    w.org.definition.profiles[0].objectTypes = ['bad:type']
  }),
  exact('a viewpoint selecting a type excluded by a profile', projections),
  exact('I compile and request their combined projection', async (w) => {
    await compileCandidate(w)
    w.projection = value(w.candidate.project('org:profile', 'org:view'))
  }),
  exact('the excluded type is absent from the projection', (w) =>
    expect(w.projection.objectTypes).not.toContain('base:child'),
  ),
  exact('full domain analysis still contains the excluded type', (w) =>
    expect(w.candidate.analysis().objectTypes.has('base:child')).toBe(true),
  ),
  exact('a viewpoint styles a known but unselected type', (w) => {
    projections(w)
    w.org.definition.viewpoints[0].presentation = [{ typeId: 'base:target', ui: { label: 'Bad' } }]
  }),
  exact('compilation fails with a viewpoint diagnostic', (w) => {
    assertNoCandidate(w.result)
    expect(w.result.diagnostics[0]).toMatchObject({
      stage: 'projection',
      code: 'INVALID_PROJECTION',
    })
  }),
  exact('a viewpoint relabels a relation and hides one endpoint type', (w) => {
    projections(w)
    w.org.definition.viewpoints[0].presentation = [{ typeId: 'base:uses', ui: { label: 'Use' } }]
    w.base.definition.relationTypes[0].sourceCardinality = { min: 1, max: 2 }
  }),
  exact('I validate invalid repository relations against the compiled full model', async (w) => {
    await compileCandidate(w)
    w.projection = value(w.candidate.project(undefined, 'org:view'))
    w.validation = validateSnapshot(w.candidate.analysis(), {
      objects: [
        {
          ref: { repositoryId: 'R', objectId: 'A' },
          typeId: 'base:asset',
          attributes: { name: 'A' },
        },
        {
          ref: { repositoryId: 'R', objectId: 'B' },
          typeId: 'base:asset',
          attributes: { name: 'B' },
        },
      ],
      relations: [
        {
          ref: { repositoryId: 'R', relationId: 'edge' },
          typeId: 'base:uses',
          source: { repositoryId: 'R', objectId: 'A' },
          target: { repositoryId: 'R', objectId: 'B' },
          attributes: {},
        },
      ],
    })
  }),
  exact('original endpoint and cardinality violations are reported', (w) => {
    expect(w.validation.diagnostics.map((d: any) => d.code)).toEqual(
      expect.arrayContaining(['FORBIDDEN_PAIR', 'CARDINALITY']),
    )
    expect(w.projection.objectTypes).not.toContain('base:target')
  }),
  exact('a compiled organization model with a profile and viewpoint', async (w) => {
    projections(w)
    await compileCandidate(w)
  }),
  regex(/^I request projection selectors "([^"]+)"$/, (w, s) => {
    w.projectionResult = w.candidate.project(
      s === 'profile only' ? 'org:profile' : s === 'unknown profile' ? 'bad:profile' : undefined,
      s === 'viewpoint only' ? 'org:view' : s === 'unknown viewpoint' ? 'bad:view' : undefined,
    )
  }),
  regex(/^the projection result is "([^"]+)"$/, (w, r) => {
    if (r === 'diagnostic without selection') {
      assertNoCandidate(w.projectionResult)
      return
    }
    const p = value<any>(w.projectionResult)
    expect(p.objectTypes).toEqual(
      r === 'all types'
        ? ['base:asset', 'base:child', 'base:target']
        : r === 'exact profile selection'
          ? ['base:asset']
          : ['base:asset', 'base:child'],
    )
  }),
  exact('I attempt to mutate returned projection selections and presentation', (w) => {
    const p: any = value(w.candidate.project('org:profile', 'org:view'))
    w.projectionBefore = copy(p)
    mutate(() => p.objectTypes.push('bad:type'))
    mutate(() => (p.presentation[0].ui.label = 'Corrupt'))
  }),
  exact('a fresh projection and full model remain unchanged', (w) => {
    expect(value(w.candidate.project('org:profile', 'org:view'))).toEqual(w.projectionBefore)
    expect(w.candidate.analysis().objectTypes.size).toBe(3)
    expect(w.candidate.objectTypes[0].ui).toBeUndefined()
  }),

  exact(
    'equivalent envelopes with reordered keys imports types attributes and selection sets',
    (w) => {
      projections(w)
      w.base.definition.objectTypes[0].attributes.push({
        id: 'z',
        schema: { kind: 'enum', values: ['a', 'b'] },
      })
      w.other = setup()
      w.other.org = copy(w.org)
      w.other.base.definition = copy(w.base.definition)
      w.other.base.definition.objectTypes.reverse()
      w.other.base.definition.objectTypes
        .find((t: any) => t.id === 'base:asset')
        .attributes.reverse()
      w.other.org.definition.viewpoints[0].objectTypes.reverse()
      w.other.org = Object.fromEntries(Object.entries(w.other.org).reverse())
    },
  ),
  exact('their fingerprints and locks are identical', (w) => {
    expect(candidate(w).fingerprint).toBe(value<any>(w.result2).fingerprint)
    expect(candidate(w).lock).toEqual(value<any>(w.result2).lock)
  }),
  regex(/^two otherwise identical models differing in "([^"]+)"$/, (w, c) => {
    init(w)
    w.other = setup()
    if (c === 'ordered default list') {
      w.base.definition.objectTypes[0].attributes.push({
        id: 'list',
        schema: { kind: 'list', items: { kind: 'string' } },
        default: ['a', 'b'],
      })
    }
    changed(w.other, c)
  }),
  exact('their fingerprints differ', (w) =>
    expect(candidate(w).fingerprint).not.toBe(value<any>(w.result2).fingerprint),
  ),
  exact('a successful compilation and its generated model lock', async (w) => {
    init(w)
    w.first = value(await compileModel(w.org, w.ports))
    w.options = { lock: copy(w.first.lock) }
    w.lockBefore = copy(w.options.lock)
  }),
  exact('I compile the same sources in locked mode', compile),
  exact('the fingerprint matches the first compilation', (w) =>
    expect(candidate(w).fingerprint).toBe(w.first.fingerprint),
  ),
  exact('the supplied lock is unchanged', (w) => expect(w.options.lock).toEqual(w.lockBefore)),
  regex(/^locked compilation with "([^"]+)"$/, async (w, d) => {
    init(w)
    w.first = value(await compileModel(w.org, w.ports))
    w.options = { lock: copy(w.first.lock) }
    const l = w.options.lock
    switch (d) {
      case 'same-version content drift':
        changed(w, 'presentation label')
        break
      case 'missing package entry':
        l.packages.pop()
        break
      case 'extra package entry':
        l.packages.push({ id: 'extra:model', version: '1.0.0', contentHash: '0'.repeat(64) })
        break
      case 'duplicate package entry':
        l.packages.push(copy(l.packages[0]))
        break
      case 'incorrect fingerprint':
        l.fingerprint = '0'.repeat(64)
        break
      case 'incorrect root identity':
        l.root.id = 'wrong:model'
        break
      case 'malformed content hash':
        l.packages[0].contentHash = 'not-a-hash'
        break
      case 'unsupported lock version':
        l.lockSchemaVersion = 2
        break
      default:
        throw Error('Unknown lock fixture')
    }
    w.lockBefore = copy(l)
  }),
  exact('a successfully published model', async (w) => {
    init(w)
    w.publisher = createModelPublisher(w.ports)
    w.first = value(await w.publisher.compileAndPublish(w.org))
    w.serial = JSON.stringify(w.first)
  }),
  regex(/^a new publication fails at "([^"]+)"$/, async (w, stage) => {
    let input = w.org,
      options
    switch (stage) {
      case 'load':
        w.sources.clear()
        break
      case 'source decode':
        input = '{'
        break
      case 'domain analysis':
        w.base.definition.objectTypes[0].extends = 'bad:type'
        break
      case 'extension merge':
        extend(w, 'object', 'base:asset', attribute('name'))
        break
      case 'projection':
        w.org.definition.viewpoints = [
          {
            id: 'org:view',
            objectTypes: [],
            relationTypes: [],
            presentation: [{ typeId: 'base:asset', ui: { label: 'bad' } }],
          },
        ]
        break
      case 'hash exception':
        w.ports.sha256 = async () => {
          throw Error('private hash secret')
        }
        break
      case 'malformed hash':
        w.ports.sha256 = async () => 'bad'
        break
      case 'lock validation':
        options = { lock: {} }
        break
      default:
        throw Error('Unknown failure stage')
    }
    w.failed = await w.publisher.compileAndPublish(input, options)
    assertNoCandidate(w.failed)
  }),
  exact('readers still observe the original complete snapshot', (w) => {
    expect(w.publisher.current()).toBe(w.first)
    expect(JSON.stringify(w.publisher.current())).toBe(w.serial)
  }),
  exact('a published model and two overlapping compilation requests', init),
  regex(/^the newer request "([^"]+)" before the older succeeds$/, race),
  exact('the older request reports superseded', (w) =>
    expect(w.stale.diagnostics[0].code).toBe('SUPERSEDED'),
  ),
  exact('the published state reflects only the newer outcome', (w) =>
    expect(w.current).toBe(w.expectedCurrent),
  ),
  regex(/^I attempt to mutate "([^"]+)"$/, async (w, target) => {
    // Each fixture includes nested defaults so the mutation test cannot pass vacuously.
    if (target === 'nested default values') {
      w.base.definition.objectTypes[0].attributes.push({
        id: 'nested',
        schema: { kind: 'list', items: { kind: 'string' } },
        default: ['original'],
      })
      w.first = value(await w.publisher.compileAndPublish(w.org))
      w.serial = JSON.stringify(w.first)
    }
    mutate(() => {
      switch (target) {
        case 'caller input':
          w.base.definition.objectTypes[0].attributes[0].id = 'corrupt'
          break
        case 'returned type attributes':
          ;(w.first.objectTypes[0].attributes as any[]).push(attribute())
          break
        case 'nested default values':
          ;(
            w.first.objectTypes[0].attributes.find((a: any) => a.id === 'nested').default as any[]
          ).push('bad')
          break
        case 'exposed lookup collection':
          ;(w.first.analysis().objectTypes as Map<string, unknown>).clear()
          break
        case 'returned model lock':
          ;(w.first.lock.packages as any[]).pop()
          break
        case 'copied domain analysis':
          w.first.analysis().objectTypes.get('base:asset').attributes[0].id = 'bad'
          break
        default:
          throw Error('Unknown mutation target')
      }
    })
  }),
  exact('subsequent reads retain the original content and fingerprint', (w) => {
    expect(JSON.stringify(w.publisher.current())).toBe(w.serial)
    expect(w.publisher.current().analysis().objectTypes.size).toBe(3)
  }),
  regex(/^old and candidate models differing by "([^"]+)"$/, async (w, c) => {
    init(w)
    if (c === 'changed profile selection')
      w.org.definition.profiles = [
        { id: 'org:profile', objectTypes: ['base:asset'], relationTypes: [] },
      ]
    w.old = value(await compileModel(w.org, w.ports))
    changed(w, c)
    w.next = value(await compileModel(w.org, w.ports))
  }),
  exact('I compare the models', (w) => {
    w.impact = compareModels(w.old, w.next)
  }),
  regex(/^impact reports "([^"]+)"$/, (w, c) => {
    const expected: any = {
      'removed and review': { change: 'removed', classification: 'review' },
      'changed and review': { change: 'changed', classification: 'review' },
      'presentation only': { classification: 'presentation' },
      'projection change': { classification: 'projection' },
      'model identity change': { kind: 'model', classification: 'identity' },
    }
    expect(w.impact.changes).toEqual(expect.arrayContaining([expect.objectContaining(expected[c])]))
  }),
  exact('repository compatibility is not claimed', (w) => {
    expect(w.impact).not.toHaveProperty('compatible')
    expect(w.impact).not.toHaveProperty('repositoryStatus')
  }),
  exact(
    'a complete repository snapshot containing an object whose type the candidate removes',
    async (w) => {
      init(w)
      w.old = value(await compileModel(w.org, w.ports))
      changed(w, 'removed type')
      w.next = value(await compileModel(w.org, w.ports))
      repository(w)
    },
  ),
  exact('its model binding matches the old model', (w) =>
    expect(w.context.binding.fingerprint).toBe(w.old.fingerprint),
  ),
  exact('I preview migration', (w) => {
    w.preview = previewMigration(w.old, w.next, w.context)
  }),
  exact('the preview reports that repository-qualified object and unknown type', (w) =>
    expect(value<any>(w.preview).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'UNKNOWN_TYPE',
          objectRef: { repositoryId: 'R', objectId: 'A' },
        }),
      ]),
    ),
  ),
  exact('repository data and binding are unchanged', (w) => expect(w.context).toEqual(w.before)),
  exact(
    'two repositories contain objects with the same object ID but different candidate validity',
    async (w) => {
      init(w)
      w.old = value(await compileModel(w.org, w.ports))
      changed(w, 'removed type')
      w.next = value(await compileModel(w.org, w.ports))
      repository(w)
      w.context.snapshot.objects.push({
        ref: { repositoryId: 'other', objectId: 'A' },
        typeId: 'base:asset',
        attributes: { name: 'Valid' },
      })
      w.before = copy(w.context)
    },
  ),
  exact('their supplied model binding matches the old model', (w) =>
    expect(w.context.binding.fingerprint).toBe(w.old.fingerprint),
  ),
  exact('diagnostics identify only the invalid repository-qualified object', (w) => {
    const ds = value<any>(w.preview).diagnostics
    expect(ds).toHaveLength(1)
    expect(ds[0].objectRef).toEqual({ repositoryId: 'R', objectId: 'A' })
  }),
  exact(
    'a complete repository snapshot omits an attribute default introduced by the candidate',
    async (w) => {
      init(w)
      w.old = value(await compileModel(w.org, w.ports))
      extend(w)
      w.next = value(await compileModel(w.org, w.ports))
      repository(w)
    },
  ),
  exact('the stored attribute remains absent', (w) => {
    expect(value<any>(w.preview).repositoryStatus).toBe('valid')
    expect(w.context.snapshot.objects[0].attributes).not.toHaveProperty('owner')
  }),
  exact('repository data with a binding that does not match the old model', async (w) => {
    init(w)
    w.old = value(await compileModel(w.org, w.ports))
    w.next = w.old
    repository(w)
    w.context.binding.fingerprint = 'bad'
  }),
  exact('a binding-mismatch diagnostic is returned without a compatibility claim', (w) => {
    assertNoCandidate(w.preview)
    expect(w.preview.diagnostics[0].code).toBe('BINDING_MISMATCH')
  }),
  exact('only old and candidate models without repository data', async (w) => {
    init(w)
    w.old = value(await compileModel(w.org, w.ports))
    w.next = w.old
  }),
  exact('model impact is returned and repository compatibility is not evaluated', (w) => {
    expect(value<any>(w.preview)).toMatchObject({
      impact: { changes: [] },
      repositoryStatus: 'not-evaluated',
    })
  }),
]
