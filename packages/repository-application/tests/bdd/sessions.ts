import { expect } from 'vitest'
import { success } from '@frade/repository-domain'
import { openRepository, CancellationSource } from '../../src/index'
import { memory, context, deferred } from '../fixtures/memory'
import { setup, seed, object, create, unwrap, errorCode } from './world'
import type { Step } from './runner'
const bind = (pattern: RegExp, run: Step['run']): Step => ({ pattern, run })
const token = () => {
  const source = new CancellationSource()
  let subscriptions = 0
  return {
    get isCancellationRequested() {
      return source.isCancellationRequested
    },
    get subscriptions() {
      return subscriptions
    },
    cancel: () => source.cancel(),
    subscribe: (listener: () => void) => {
      subscriptions++
      const off = source.subscribe(listener)
      return () => {
        subscriptions--
        off()
      }
    },
  }
}
export const sessions: Step[] = [
  bind(/^an adapter with readers and no writer$/, async (w) => {
    await setup(w, { writeMode: 'read-only' })
    seed(w)
  }),
  bind(/^an object is read and then a mutation is requested$/, async (w) => {
    w.read = await w.session.getObject(object().ref)
    w.result = await w.session.applyChanges(create('B'))
  }),
  bind(/^the read succeeds and the mutation is READ_ONLY with zero writes$/, (w) => {
    expect(w.read.ok).toBe(true)
    expect(w.result).toMatchObject({ ok: false, error: { code: 'REPOSITORY_READ_ONLY' } })
    expect(w.fixture.writes).toBe(0)
  }),
  bind(/^an adapter advertising atomic writes without a writer$/, async (w) => {
    w.fixture = await memory()
    Object.assign(w.fixture.session, { writer: undefined })
  }),
  bind(/^an application session is opened$/, async (w) => {
    w.result = await openRepository(w.fixture.adapter, context)
  }),
  bind(/^opening fails with ADAPTER_CONTRACT and the returned session is closed once$/, (w) => {
    expect(w.result).toMatchObject({ ok: false, error: { code: 'ADAPTER_CONTRACT' } })
    expect(w.fixture.closes).toBe(1)
  }),
  bind(/^a delayed reader that ignores cancellation$/, async (w) => {
    await setup(w)
    w.token = token()
    w.pending = deferred()
    w.started = deferred()
    w.reads = 0
    w.fixture.session.read = async () => {
      w.reads++
      w.started.resolve()
      return w.pending.promise
    }
  }),
  bind(/^"([^"]+)" occurs$/, async (w, action) => {
    if (action === 'cancellation before I/O') w.token.cancel()
    w.resultPromise = w.session.getObject(object().ref, w.token)
    if (action !== 'cancellation before I/O') {
      await w.started.promise
      if (action === 'close during I/O') await w.session.close()
      else w.token.cancel()
    }
    w.result = await w.resultPromise
    expect(w.reads).toBe(action === 'cancellation before I/O' ? 0 : 1)
    w.pending.resolve(success(object()))
    await Promise.resolve()
  }),
  bind(
    /^the caller receives "([^"]+)" without publishing late data or leaking listeners$/,
    (w, result) => {
      expect(w.result).toMatchObject({ ok: false, error: { code: result } })
      expect(w.token.subscriptions).toBe(0)
    },
  ),
  bind(/^a delayed adapter open$/, async (w) => {
    w.fixture = await memory()
    w.pending = deferred()
    w.started = deferred()
    w.token = token()
    w.adapter = {
      open: async () => {
        w.started.resolve()
        return w.pending.promise
      },
    }
  }),
  bind(/^the open is cancelled before the adapter returns a session$/, async (w) => {
    const pending = openRepository(w.adapter, context, undefined, w.token)
    await w.started.promise
    w.token.cancel()
    w.result = await pending
    w.pending.resolve(success(w.fixture.session))
    await new Promise((resolve) => setTimeout(resolve, 0))
  }),
  bind(/^the caller is cancelled and the late session is closed once$/, (w) => {
    expect(w.result).toMatchObject({ ok: false, error: { code: 'CANCELLED' } })
    expect(w.fixture.closes).toBe(1)
    expect(w.token.subscriptions).toBe(0)
  }),
  bind(/^an active session whose adapter close rejects$/, async (w) => {
    await setup(w, { watch: true })
    w.closeCalls = 0
    const close = w.fixture.session.close
    w.fixture.session.close = async () => {
      w.closeCalls++
      await close()
      throw Error('/private/secret')
    }
  }),
  bind(/^the application session is closed twice$/, async (w) => {
    w.result = await w.session.close()
    expect(await w.session.close()).toEqual(w.result)
  }),
  bind(
    /^subscriptions are released and adapter close is invoked once with sanitized failure$/,
    (w) => {
      expect(w.result.ok).toBe(false)
      expect(JSON.stringify(w.result)).not.toContain('private')
      expect(w.fixture.listeners).toBe(0)
      expect(w.closeCalls).toBe(1)
    },
  ),
  bind(/^an adapter supporting paged object reads$/, async (w) => {
    await setup(w)
    seed(w, [object('A'), object('B')])
  }),
  bind(/^a page of size (\d+) is requested$/, async (w, size) => {
    w.result = await w.session.queryObjects({ limit: Number(size) })
    if (w.result.ok) expect(w.result.value.items.length).toBeLessThanOrEqual(Number(size))
  }),
  bind(/^the paging result is "([^"]+)"$/, (w, result) => {
    if (result === 'success') expect(w.result.ok).toBe(true)
    else expect(w.result).toMatchObject({ ok: false, error: { code: result } })
  }),
  bind(/^a cursor from a successful repository query$/, async (w) => {
    await setup(w)
    seed(w, [object('A'), object('B')])
    w.cursor = unwrap(await w.session.queryObjects({ limit: 1 })).cursor
    expect(w.cursor).toBeTypeOf('string')
  }),
  bind(/^the cursor is reused with "([^"]+)"$/, async (w, change) => {
    let session = w.session
    const query: any = { limit: 1, cursor: w.cursor }
    if (change === 'a different session') {
      const other = await memory()
      other.replaceState(w.fixture.state)
      session = unwrap(await openRepository(other.adapter, context))
      w.sessions.push(session)
    } else if (change === 'a different filter')
      query.where = { op: 'eq', field: 'name', value: 'A' }
    else w.fixture.replaceState({ ...w.fixture.state, revision: 'new' })
    w.result = await session.queryObjects(query)
  }),
  bind(/^the query fails with "([^"]+)" without returning mixed pages$/, (w, code) => {
    expect(w.result).toMatchObject({ ok: false, error: { code } })
    expect(w.result).not.toHaveProperty('value')
  }),
  bind(/^an adapter returning "([^"]+)"$/, async (w, defect) => {
    await setup(w)
    w.readPage = defect.includes('page')
    if (w.readPage)
      w.fixture.session.query = async () =>
        success({
          items: Array(defect === 'an oversized page' ? 3 : 2).fill(object()),
          revision: 'r',
        })
    else
      w.fixture.session.read = async () =>
        success(
          defect === 'an object from another repo'
            ? { ...object(), ref: { repositoryId: 'other', objectId: 'A' } }
            : { ...object(), revision: 42 },
        )
  }),
  bind(/^an application read is performed$/, async (w) => {
    w.result = await (w.readPage
      ? w.session.queryObjects({ limit: 2 })
      : w.session.getObject(object().ref))
  }),
  bind(/^the result is ADAPTER_CONTRACT without exposing the invalid data$/, (w) => {
    expect(w.result).toMatchObject({ ok: false, error: { code: 'ADAPTER_CONTRACT' } })
    expect(w.result).not.toHaveProperty('value')
  }),
  bind(/^a writer with "([^"]+)"$/, async (w, limitation) => {
    await setup(w)
    Object.assign(
      w.fixture.session.capabilities,
      limitation === 'no snapshot guard'
        ? { guardedSnapshot: false }
        : limitation === 'no atomic batch'
          ? { supportsAtomicBatch: false }
          : { reconciliation: 'none' },
    )
    if (limitation === 'no atomic batch')
      w.command.commands.push({
        op: 'createObject',
        object: { ...object('B'), revision: undefined },
      })
    if (limitation === 'no atomic batch') delete w.command.commands[1].object.revision
  }),
  bind(/^a command requiring the missing guarantee is requested$/, async (w) => {
    w.result = await w.session.applyChanges(w.command)
  }),
  bind(/^the result is UNSUPPORTED and the writer is not called$/, (w) => {
    expect(w.result).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_CAPABILITY' } })
    expect(w.fixture.writes).toBe(0)
  }),
  bind(/^a validated command whose target revision is unchanged$/, async (w) => {
    await setup(w)
    seed(w)
    w.command = {
      repositoryId: 'R',
      commands: [
        {
          op: 'updateObject',
          object: {
            ref: object().ref,
            typeId: object().typeId,
            name: 'new',
            attributes: object().attributes,
          },
          expectedRevision: object().revision,
        },
      ],
    }
    w.oldTarget = object().revision
  }),
  bind(/^another relation changes before guarded commit$/, async (w) => {
    const commit = w.fixture.session.writer.commit
    w.fixture.session.writer.commit = async (request: any) => {
      w.fixture.replaceState({
        ...w.fixture.state,
        revision: 'external',
        relations: [
          {
            ref: { repositoryId: 'R', relationId: 'external' },
            typeId: 'sample:IntegrationFlow',
            source: object().ref,
            target: object().ref,
            attributes: {},
            revision: 'external',
          },
        ],
      })
      w.before = w.fixture.state
      return commit(request)
    }
    w.result = await w.session.applyChanges(w.command)
  }),
  bind(/^the commit returns CONFLICT and applies none of the command$/, (w) => {
    expect(w.result).toMatchObject({ ok: false, error: { code: errorCode('CONFLICT') } })
    expect(w.fixture.state).toEqual(w.before)
    expect(w.fixture.state.objects[0].revision).toBe(w.oldTarget)
    expect(w.fixture.writes).toBe(1)
  }),
  bind(/^a subscribed application session$/, async (w) => {
    await setup(w, { watch: true })
    w.events = []
    w.off = w.session.subscribe((event: any) => w.events.push(event))
  }),
  bind(/^the adapter sends "([^"]+)"$/, async (w, sequence) => {
    if (sequence === 'a change after close') await w.session.close()
    if (sequence === 'a change after unsubscribe') w.off()
    if (sequence === 'a sequence gap') w.fixture.emit({ sequence: 5 })
    else {
      w.fixture.emit({ sequence: 1 })
      if (sequence === 'a repeated sequence') w.fixture.emit({ sequence: 1 })
    }
  }),
  bind(/^subscribers observe "([^"]+)"$/, (w, result) => {
    expect(w.events).toHaveLength(result === 'no callback' ? 0 : 1)
    if (result === 'refresh invalidation') expect(w.events[0].type).toBe('repository.reloaded')
    else if (w.events.length) expect(w.events[0].type).toBe('object.updated')
  }),
  bind(/^two subscribers of which the first throws$/, async (w) => {
    await setup(w, { watch: true })
    w.events = []
    w.session.subscribe(() => {
      throw Error('listener')
    })
    w.session.subscribe((event: any) => w.events.push(event))
  }),
  bind(/^the adapter publishes a committed change$/, async (w) => {
    w.result = await w.session.applyChanges(w.command)
    expect(w.result.ok).toBe(true)
    w.fixture.emit({ revision: w.result.value.revision })
  }),
  bind(/^the second subscriber receives it and the commit remains successful$/, (w) => {
    expect(w.events).toHaveLength(1)
    expect(w.result.ok).toBe(true)
    expect(w.fixture.state.objects).toHaveLength(1)
  }),
  bind(/^an adapter without history capability$/, async (w) => {
    await setup(w)
  }),
  bind(/^history is requested$/, async (w) => {
    w.result = await w.session.history()
  }),
  bind(/^the result is UNSUPPORTED rather than an empty history page$/, (w) => {
    expect(w.result).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED_CAPABILITY' } })
    expect(w.result).not.toHaveProperty('value')
  }),
]
