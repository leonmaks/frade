import { expect } from 'vitest'
import { success, failure } from '@frade/repository-domain'
import { validateSnapshot } from '@frade/metamodel-domain'
import { validationProjection } from '@frade/repository-domain'
import { CancellationSource } from '../../src/index'
import { deferred } from '../fixtures/memory'
import {
  setup,
  seed,
  object,
  relation,
  body,
  create,
  unwrap,
  errorCode,
  modelFixture,
} from './world'
import type { Step } from './runner'
const bind = (pattern: RegExp, run: Step['run']): Step => ({ pattern, run })
async function policyCase(w: any, condition: string) {
  await setup(
    w,
    {},
    condition === 'missing policy'
      ? null
      : {
          authorize: () => {
            if (condition === 'throwing policy') throw Error('secret policy')
            return condition !== 'denying policy'
          },
        },
  )
  if (condition === 'missing expected revision')
    w.command.commands = [{ op: 'updateObject', object: body(object()) }]
  if (condition === 'wrong repository target')
    w.command.commands[0].object.ref.repositoryId = 'other'
  if (condition === 'closed session') await w.session.close()
  if (condition === 'duplicate batch target')
    w.command.commands.push(structuredClone(w.command.commands[0]))
}
export const commands: Step[] = [
  bind(/^a repository command with "([^"]+)"$/, policyCase),
  bind(/^the command is executed$/, async (w) => {
    w.result = await w.session.applyChanges(w.command)
  }),
  bind(/^execution returns "?([A-Z_]+)"? and the writer call count is zero$/, (w, result) => {
    expect(w.result).toMatchObject({ ok: false, error: { code: errorCode(result) } })
    expect(w.fixture.writes).toBe(0)
  }),
  bind(/^a visible object and a denying authorization policy$/, async (w) => {
    await policyCase(w, 'denying policy')
    seed(w)
    expect((await w.session.getObject(object().ref)).ok).toBe(true)
    w.command.commands = [
      { op: 'updateObject', object: body(object()), expectedRevision: object().revision },
    ]
  }),
  bind(/^the object is replaced$/, async (w) => {
    w.result = await w.session.applyChanges(w.command)
  }),
  bind(/^a command snapshot with "([^"]+)"$/, async (w, defect) => {
    await setup(w)
    const snapshot = w.fixture.state
    if (defect === 'incomplete declaration') snapshot.complete = false
    else if (defect === 'a different model fingerprint')
      snapshot.binding.fingerprint = 'f'.repeat(64)
    else
      snapshot.relations = [{ ...relation(), source: { repositoryId: 'foreign', objectId: 'A' } }]
    w.fixture.replaceState(snapshot)
  }),
  bind(/^no writer is called and validation reports "([^"]+)"$/, (w, code) => {
    expect(w.result).toMatchObject({ ok: false, error: { code } })
    expect(w.fixture.writes).toBe(0)
  }),
  bind(/^a valid repository and a command causing "([^"]+)"$/, async (w, violation) => {
    const model = modelFixture(),
      definition = model.definition as any
    if (violation === 'maximum cardinality overflow')
      definition.relationTypes[0].sourceCardinality = { min: 0, max: 1 }
    if (violation === 'minimum cardinality underflow') {
      definition.relationTypes[0].target = {
        typeIds: ['sample:BusinessProcess'],
        includeSubtypes: false,
      }
      definition.relationTypes[0].sourceCardinality = { min: 1, max: null }
    }
    await setup(w, { model })
    const objects = [object('A'), object('B'), object('C')],
      edge = relation()
    seed(w, objects)
    w.command = { repositoryId: 'R', idempotencyKey: 'op1', commands: [] }
    if (violation === 'an unknown object type')
      w.command.commands = [
        { op: 'createObject', object: { ...body(object('D')), typeId: 'unknown:Type' } },
      ]
    else if (violation === 'an abstract object instance')
      w.command.commands = [
        { op: 'createObject', object: { ...body(object('D')), typeId: 'sample:Base' } },
      ]
    else if (violation === 'an invalid inherited attribute')
      w.command.commands = [
        { op: 'createObject', object: { ...body(object('D')), attributes: { rank: 'wrong' } } },
      ]
    else if (violation === 'a dangling attribute reference')
      w.command.commands = [
        {
          op: 'createObject',
          object: {
            ...body(object('D')),
            attributes: { ref: { repositoryId: 'R', objectId: 'missing' } },
          },
        },
      ]
    else if (violation === 'a dangling endpoint on delete') {
      seed(w, objects, [edge])
      w.command.commands = [
        { op: 'deleteObject', ref: object('B').ref, expectedRevision: object('B').revision },
      ]
    } else if (violation === 'minimum cardinality underflow') {
      seed(w, [])
      w.command.commands = [{ op: 'createObject', object: body(object('D')) }]
    } else {
      let next = relation('new')
      if (violation === 'a missing relation endpoint')
        next = { ...next, target: { repositoryId: 'R', objectId: 'missing' } }
      if (violation === 'a forbidden endpoint pair') {
        seed(w, [object('A'), { ...object('B'), typeId: 'sample:BusinessProcess', attributes: {} }])
        next = relation('new')
      }
      if (violation === 'a forbidden self relation') next = relation('new', 'A', 'A')
      if (violation === 'a duplicate relation pair') seed(w, objects, [edge])
      if (violation === 'maximum cardinality overflow') {
        seed(w, objects, [edge])
        next = relation('new', 'A', 'C')
      }
      w.command.commands = [{ op: 'createRelation', relation: body(next) }]
    }
    expect(
      validateSnapshot(w.fixture.session.model.analysis(), validationProjection(w.fixture.state))
        .ok,
    ).toBe(true)
  }),
  bind(/^the complete prospective state is validated$/, async (w) => {
    w.result = await w.session.applyChanges(w.command)
  }),
  bind(/^the command fails with qualified diagnostics and the stored state is unchanged$/, (w) => {
    expect(w.result).toMatchObject({ ok: false, error: { code: 'VALIDATION_FAILED' } })
    expect(w.result.error.issues.length).toBeGreaterThan(0)
    expect(
      w.result.error.issues.some(
        (issue: any) =>
          issue.ref?.repositoryId === 'R' || typeof issue.details?.entityKey === 'string',
      ),
    ).toBe(true)
    expect(w.fixture.state).toEqual(w.before)
    expect(w.fixture.writes).toBe(0)
  }),
  bind(/^an authorized guarded adapter and a valid "([^"]+)" command$/, async (w, operation) => {
    await setup(w)
    w.beforeRevision = w.fixture.state.revision
    const rel = operation.includes('relation')
    if (rel) seed(w, [object('A'), object('B')], operation.startsWith('create') ? [] : [relation()])
    else if (!operation.startsWith('create')) seed(w)
    const entity = rel ? relation() : object()
    const op =
      (operation.startsWith('replace') ? 'update' : operation.split(' ')[0]) +
      (rel ? 'Relation' : 'Object')
    w.command.commands = [
      op.startsWith('delete')
        ? { op, ref: entity.ref, expectedRevision: entity.revision }
        : {
            op,
            [rel ? 'relation' : 'object']: body(entity),
            ...(!op.startsWith('create') ? { expectedRevision: entity.revision } : {}),
          },
    ]
  }),
  bind(/^exactly one commit returns matching results and a new snapshot revision$/, (w) => {
    const result = unwrap(w.result)
    expect(w.fixture.writes).toBe(1)
    expect(result.revision).not.toBe(w.beforeRevision)
    expect(result.changes).toHaveLength(1)
    const command = w.command.commands[0]
    expect(result.changes[0].ref).toEqual(
      command.ref ?? command.object?.ref ?? command.relation?.ref,
    )
    if (result.changes[0].entity)
      expect(result.changes[0].entity.revision).not.toBe(command.expectedRevision)
    expect(
      validateSnapshot(w.fixture.session.model.analysis(), validationProjection(w.fixture.state))
        .ok,
    ).toBe(true)
  }),
  bind(
    /^an atomic batch creating objects and their required relations and attribute references$/,
    async (w) => {
      const model = modelFixture() as any
      model.definition.relationTypes[0].target = {
        typeIds: ['sample:BusinessProcess'],
        includeSubtypes: false,
      }
      model.definition.relationTypes[0].sourceCardinality = { min: 1, max: 1 }
      await setup(w, { model })
      w.command.commands = [
        {
          op: 'createObject',
          object: { ...body(object('A')), attributes: { ref: object('A').ref } },
        },
        {
          op: 'createObject',
          object: { ...body(object('B')), typeId: 'sample:BusinessProcess', attributes: {} },
        },
        { op: 'createRelation', relation: body(relation()) },
      ]
    },
  ),
  bind(/^the batch is executed$/, async (w) => {
    w.result = await w.session.applyChanges(w.command)
  }),
  bind(/^the final combined state validates and all its resources commit together$/, (w) => {
    expect(w.result.ok).toBe(true)
    expect(w.fixture.writes).toBe(1)
    expect(w.fixture.state.objects).toHaveLength(2)
    expect(w.fixture.state.relations).toHaveLength(1)
    expect(
      validateSnapshot(w.fixture.session.model.analysis(), validationProjection(w.fixture.state))
        .ok,
    ).toBe(true)
  }),
  bind(/^changed and untouched objects both omitting a defaulted attribute$/, async (w) => {
    await setup(w)
    seed(w, [
      { ...object('A'), attributes: {} },
      { ...object('B'), attributes: {} },
    ])
    w.command.commands = [
      {
        op: 'updateObject',
        object: { ...body(object('A')), attributes: {} },
        expectedRevision: object('A').revision,
      },
    ]
  }),
  bind(/^a valid replacement is executed$/, async (w) => {
    w.result = await w.session.applyChanges(w.command)
  }),
  bind(/^only the changed object's committed attributes contain the materialized default$/, (w) => {
    expect(w.result.ok).toBe(true)
    expect(w.fixture.state.objects[0].attributes).toEqual({ status: 'created' })
    expect(w.fixture.state.objects[1]).toEqual(w.before.objects[1])
  }),
  bind(/^a validated command with "([^"]+)" before commit$/, async (w, race) => {
    await setup(w)
    const commit = w.fixture.session.writer.commit
    w.fixture.session.writer.commit = async (request: any) => {
      const next = w.fixture.state
      next.revision = 'external'
      if (race === 'a changed model binding') next.binding.fingerprint = 'f'.repeat(64)
      else if (race === 'a changed unrelated relation') next.relations = [relation()]
      else next.objects = [{ ...object(), name: 'external', revision: 'external' }]
      w.fixture.replaceState(next)
      w.before = next
      return commit(request)
    }
  }),
  bind(/^the guarded commit is dispatched$/, async (w) => {
    w.result = await w.session.applyChanges(w.command)
  }),
  bind(/^it returns CONFLICT with no automatic retry and no partial write$/, (w) => {
    expect(w.result).toMatchObject({ ok: false, error: { code: 'REVISION_CONFLICT' } })
    expect(w.fixture.writes).toBe(1)
    expect(w.fixture.state).toEqual(w.before)
  }),
  bind(/^a dispatched write whose acknowledgement omits committed revisions$/, async (w) => {
    await setup(w)
    const commit = w.fixture.session.writer.commit
    w.fixture.session.writer.commit = async (request: any) => {
      const result = unwrap(await commit(request))
      delete result.changes[0].entity.revision
      return success(result)
    }
    w.resultPromise = w.session.applyChanges(w.command)
  }),
  bind(/^the acknowledgement is received$/, async (w) => {
    w.result = await w.resultPromise
  }),
  bind(/^the result is OUTCOME_UNKNOWN with the original operation ID$/, (w) => {
    expect(w.result).toMatchObject({
      ok: false,
      error: { code: 'OUTCOME_UNKNOWN', operationId: 'op1' },
    })
  }),
  bind(/^a valid command paused at "([^"]+)"$/, async (w, barrier) => {
    w.token = new CancellationSource()
    w.gate = deferred()
    w.started = deferred()
    w.dispatches = 0
    await setup(
      w,
      {},
      barrier === 'before writer dispatch'
        ? {
            authorize: async () => {
              w.started.resolve()
              await w.gate.promise
              return true
            },
          }
        : { authorize: () => true },
    )
    const commit = w.fixture.session.writer.commit
    w.fixture.session.writer.commit = async (request: any) => {
      w.dispatches++
      if (barrier === 'after commit before reply') {
        const result = await commit(request)
        w.started.resolve()
        await w.gate.promise
        return result
      }
      w.started.resolve()
      await w.gate.promise
      return commit(request)
    }
    w.resultPromise = w.session.applyChanges(w.command, w.token)
    await w.started.promise
  }),
  bind(/^the originating caller cancels$/, async (w) => {
    w.token.cancel()
    w.result = await w.resultPromise
    w.gate.resolve()
  }),
  bind(/^the result is "([^"]+)" with writer call count (\d+)$/, (w, code, calls) => {
    expect(w.result).toMatchObject({ ok: false, error: { code } })
    expect(w.dispatches).toBe(Number(calls))
    if (code === 'OUTCOME_UNKNOWN') expect(w.result.error.operationId).toBe('op1')
  }),
  bind(/^a command with an unknown outcome$/, async (w) => {
    await setup(w)
    w.dispatches = 0
    w.commit = w.fixture.session.writer.commit
    w.fixture.session.writer.commit = async (request: any) => {
      w.dispatches++
      w.request = request
      return failure('OUTCOME_UNKNOWN', [], 'op1')
    }
    expect(await w.session.applyChanges(w.command)).toMatchObject({
      ok: false,
      error: { code: 'OUTCOME_UNKNOWN' },
    })
  }),
  bind(/^lookup reports "([^"]+)"$/, async (w, outcome) => {
    if (outcome === 'committed') {
      const committed = unwrap(await w.commit(w.request))
      w.fixture.session.writer.lookup = async () =>
        success({ status: 'committed', result: committed })
    } else w.fixture.session.writer.lookup = async () => success({ status: outcome })
    w.result = await w.session.reconcile('op1')
  }),
  bind(/^reconciliation exposes "([^"]+)" and does not dispatch another write$/, (w, outcome) => {
    expect(w.result).toMatchObject({ ok: true, value: { status: outcome } })
    expect(w.dispatches).toBe(1)
  }),
  bind(/^an accepted command with operation ID op1$/, async (w) => {
    await setup(w, { model: modelFixture() })
    w.command.commands[0].object.attributes = { status: 'created', rank: 1, list: ['a', 'b'] }
    w.gate = deferred()
    w.started = deferred()
    w.dispatches = 0
    const commit = w.fixture.session.writer.commit
    w.fixture.session.writer.commit = async (request: any) => {
      w.dispatches++
      w.started.resolve()
      await w.gate.promise
      return commit(request)
    }
    w.first = w.session.applyChanges(w.command)
    await w.started.promise
  }),
  bind(/^op1 is submitted again with "([^"]+)"$/, async (w, variation) => {
    const next = structuredClone(w.command)
    if (variation === 'identical completed command') {
      w.gate.resolve()
      w.firstResult = await w.first
    } else if (variation === 'reordered attribute keys')
      next.commands[0].object.attributes = { list: ['a', 'b'], rank: 1, status: 'created' }
    else if (variation === 'a different payload') next.commands[0].object.name = 'other'
    else if (variation === 'a different revision') next.expectedRevision = 'different'
    else if (variation === 'reordered attribute array')
      next.commands[0].object.attributes.list.reverse()
    const second = w.session.applyChanges(next)
    w.gate.resolve()
    w.result = await second
    w.firstResult ??= await w.first
  }),
  bind(
    /^the second call yields "([^"]+)" and total writer calls do not exceed one$/,
    (w, result) => {
      if (result === 'OPERATION_ID_CONFLICT')
        expect(w.result).toMatchObject({ ok: false, error: { code: result } })
      else {
        expect(w.result.ok).toBe(true)
        expect(w.result).toEqual(w.firstResult)
      }
      expect(w.dispatches).toBe(1)
      expect(w.fixture.writes).toBe(1)
    },
  ),
  bind(/^a session retaining 1024 accepted operation IDs$/, async (w) => {
    await setup(w, {}, { authorize: () => false })
    for (let i = 0; i < 1024; i++)
      expect(await w.session.applyChanges(create('A', 'op' + i))).toMatchObject({
        ok: false,
        error: { code: 'ACCESS_DENIED' },
      })
  }),
  bind(/^a new distinct operation is submitted$/, async (w) => {
    w.result = await w.session.applyChanges(create('A', 'new'))
  }),
  bind(/^it returns RESOURCE_LIMIT and a prior operation remains replay-protected$/, async (w) => {
    expect(w.result).toMatchObject({ ok: false, error: { code: 'RESOURCE_LIMIT' } })
    expect(await w.session.applyChanges(create('A', 'op0'))).toMatchObject({
      ok: false,
      error: { code: 'ACCESS_DENIED' },
    })
    expect(w.fixture.writes).toBe(0)
  }),
  bind(/^a dispatched write without an acknowledgement$/, async (w) => {
    await setup(w)
    w.started = deferred()
    w.gate = deferred()
    w.dispatches = 0
    w.fixture.session.writer.commit = async () => {
      w.dispatches++
      w.started.resolve()
      return w.gate.promise
    }
    w.resultPromise = w.session.applyChanges(w.command)
    await w.started.promise
  }),
  bind(/^the session closes$/, async (w) => {
    await w.session.close()
    w.result = await w.resultPromise
    w.gate.resolve(failure('OUTCOME_UNKNOWN', [], 'op1'))
  }),
  bind(/^the caller receives OUTCOME_UNKNOWN with its operation ID and no replay occurs$/, (w) => {
    expect(w.result).toMatchObject({
      ok: false,
      error: { code: 'OUTCOME_UNKNOWN', operationId: 'op1' },
    })
    expect(w.dispatches).toBe(1)
  }),
]
