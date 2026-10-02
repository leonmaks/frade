import { DatabaseSync, type StatementSync } from 'node:sqlite'
import { createHash, randomUUID } from 'node:crypto'
import { setImmediate } from 'node:timers/promises'
import { objectKey } from '@frade/metamodel-domain'
import {
  canonicalJson,
  decodeObject,
  decodeRelation,
  decodeQuery,
  entityKey,
  failure,
  success,
  compareQueryEntities,
  matchesFilter,
  queryEntities,
  type Entity,
  type EntityKind,
  type ObjectRef,
  type RelationRef,
  type JsonValue,
  type Result,
  type Page,
  type StreamingFacts,
  type Filter,
} from '@frade/repository-domain'
export const pageBucket = (kind: EntityKind, ref: ObjectRef | RelationRef) =>
  parseInt(createHash('sha256').update(entityKey(kind, ref)).digest('hex').slice(0, 3), 16)
const orderKey = (entity: Entity) => {
  const text = canonicalJson(entity.ref as unknown as JsonValue)
  const key = Buffer.allocUnsafe(text.length * 2)
  for (let i = 0; i < text.length; i++) key.writeUInt16BE(text.charCodeAt(i), i * 2)
  return key
}
const secondaryIndexes: Readonly<Record<string, string>> = {
  objects_lookup: 'entities(kind,refkey,type)',
  ordered: 'entities(kind,ord)',
  by_type: 'entities(kind,type,ord)',
  outgoing: 'entities(kind,source,ord)',
  incoming: 'entities(kind,target,ord)',
  buckets: 'entities(bucket,ord)',
  status: "entities(kind,json_extract(body,'$.attributes.status'),ord)",
}
/** A private rebuildable catalog. Callers must pin it to a verified source revision. */
export class PagedCatalog implements StreamingFacts {
  readonly db: DatabaseSync
  private readonly insert: StatementSync
  private readonly lookup: StatementSync
  private readonly pair: StatementSync
  private readonly degree: StatementSync
  private closed = false
  scanned = 0
  private importing = false
  private importStarted = 0
  readonly measurements = { sourceIngestMs: 0, secondaryIndexBuildMs: 0, completeValidationMs: 0 }
  constructor(
    filename: string,
    readonly scope: string = randomUUID(),
  ) {
    this.db = new DatabaseSync(filename)
    this.db.exec(
      'PRAGMA journal_mode=DELETE; PRAGMA synchronous=OFF; PRAGMA cache_size=-16384; PRAGMA temp_store=FILE; CREATE TABLE entities(kind TEXT,key TEXT,refkey TEXT,repo TEXT,id TEXT,type TEXT,bucket INTEGER,ord BLOB,source TEXT,target TEXT,body TEXT,PRIMARY KEY(kind,key)); CREATE TABLE pairs(type TEXT,source TEXT,target TEXT,PRIMARY KEY(type,source,target)); CREATE TABLE degrees(type TEXT,key TEXT,source INTEGER,target INTEGER,incident INTEGER,PRIMARY KEY(type,key));',
    )
    for (const [name, columns] of Object.entries(secondaryIndexes))
      this.db.exec('CREATE INDEX ' + name + ' ON ' + columns)
    this.insert = this.db.prepare('INSERT INTO entities VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    this.lookup = this.db.prepare("SELECT type FROM entities WHERE kind='object' AND refkey=?")
    this.pair = this.db.prepare('INSERT OR IGNORE INTO pairs VALUES(?,?,?)')
    this.degree = this.db.prepare(
      'INSERT INTO degrees VALUES(?,?,?,?,?) ON CONFLICT(type,key) DO UPDATE SET source=source+excluded.source,target=target+excluded.target,incident=incident+excluded.incident',
    )
  }
  readonly targets = {
    get: (key: string) => {
      const row = this.lookup.get(key)
      return row ? String(row.type) : undefined
    },
  }
  /** New disposable catalogs only: bulk-build secondary indexes after ingest, before validation. */
  beginImport() {
    if (this.importing || this.count() !== 0)
      throw Error('Import requires an empty derived catalog')
    this.importing = true
    this.importStarted = performance.now()
    for (const name of Object.keys(secondaryIndexes)) this.db.exec('DROP INDEX ' + name)
  }
  finishImport() {
    if (!this.importing) throw Error('No import in progress')
    this.measurements.sourceIngestMs = performance.now() - this.importStarted
    const started = performance.now()
    for (const [name, columns] of Object.entries(secondaryIndexes))
      this.db.exec('CREATE INDEX ' + name + ' ON ' + columns)
    this.measurements.secondaryIndexBuildMs = performance.now() - started
    this.importing = false
  }
  checkpoint() {
    return setImmediate()
  }
  async hasCycle(type: string, cancelled: () => boolean): Promise<Result<boolean>> {
    this.db.exec(
      'CREATE TEMP TABLE IF NOT EXISTS cycle_nodes(key TEXT PRIMARY KEY,degree INTEGER); CREATE INDEX IF NOT EXISTS cycle_roots ON cycle_nodes(degree); DELETE FROM cycle_nodes',
    )
    this.db
      .prepare(
        "INSERT INTO cycle_nodes SELECT source,0 FROM entities WHERE kind='relation' AND type=? UNION SELECT target,0 FROM entities WHERE kind='relation' AND type=?",
      )
      .run(type, type)
    this.db
      .prepare(
        "UPDATE cycle_nodes SET degree=(SELECT count(*) FROM entities e WHERE e.kind='relation' AND e.type=? AND e.target=cycle_nodes.key)",
      )
      .run(type)
    const select = this.db.prepare('SELECT key FROM cycle_nodes WHERE degree=0 LIMIT 1024'),
      remove = this.db.prepare('DELETE FROM cycle_nodes WHERE key=?'),
      decrement = this.db.prepare('UPDATE cycle_nodes SET degree=degree-? WHERE key=?'),
      edges = this.db.prepare(
        "SELECT target,count(*) AS n FROM entities WHERE kind='relation' AND type=? AND source=? GROUP BY target",
      )
    while (true) {
      if (cancelled()) return failure('CANCELLED')
      const roots = select.all()
      if (!roots.length) break
      for (const row of roots) {
        remove.run(row.key!)
        for (const edge of edges.iterate(type, row.key!)) decrement.run(edge.n!, edge.target!)
      }
      await this.checkpoint()
    }
    return success(Number(this.db.prepare('SELECT count(*) AS n FROM cycle_nodes').get()!.n) > 0)
  }
  put(kind: EntityKind, input: unknown): Result<Entity> {
    const decoded = kind === 'object' ? decodeObject(input) : decodeRelation(input)
    if (!decoded.ok) return decoded
    const e = decoded.value,
      refkey =
        kind === 'object'
          ? objectKey(e.ref as ObjectRef)
          : JSON.stringify([e.ref.repositoryId, (e.ref as RelationRef).relationId])
    try {
      this.insert.run(
        kind,
        entityKey(kind, e.ref),
        refkey,
        e.ref.repositoryId,
        'objectId' in e.ref ? e.ref.objectId : e.ref.relationId,
        e.typeId,
        pageBucket(kind, e.ref),
        orderKey(e),
        'source' in e ? objectKey(e.source) : null,
        'target' in e ? objectKey(e.target) : null,
        JSON.stringify(e),
      )
      return decoded
    } catch {
      return failure('VALIDATION_FAILED', [
        {
          code: 'DUPLICATE_ID',
          message: 'Duplicate canonical identity',
          ref: e.ref,
          path: ['ref'],
        },
      ])
    }
  }
  remove(kind: EntityKind, ref: ObjectRef | RelationRef) {
    this.db.prepare('DELETE FROM entities WHERE kind=? AND key=?').run(kind, entityKey(kind, ref))
  }
  read(kind: EntityKind, ref: ObjectRef | RelationRef): Result<Entity> {
    const row = this.db
      .prepare('SELECT body FROM entities WHERE kind=? AND key=?')
      .get(kind, entityKey(kind, ref))
    return row ? success(JSON.parse(String(row.body)) as Entity) : failure('ENTITY_NOT_FOUND')
  }
  *entities(kind: EntityKind): Iterable<Entity> {
    for (const row of this.db.prepare('SELECT body FROM entities WHERE kind=?').iterate(kind))
      yield JSON.parse(String(row.body)) as Entity
  }
  *bucket(bucket: number): Iterable<{ kind: EntityKind; entity: Entity }> {
    for (const row of this.db
      .prepare('SELECT kind,body FROM entities WHERE bucket=? ORDER BY kind,ord')
      .iterate(bucket))
      yield { kind: row.kind as EntityKind, entity: JSON.parse(String(row.body)) as Entity }
  }
  buckets(): number[] {
    return this.db
      .prepare('SELECT DISTINCT bucket FROM entities ORDER BY bucket')
      .all()
      .map((row) => Number(row.bucket))
  }
  count() {
    return Number(this.db.prepare('SELECT count(*) AS n FROM entities').get()!.n)
  }
  resetFacts() {
    this.db.exec('DELETE FROM pairs; DELETE FROM degrees')
  }
  addEdge(type: string, source: string, target: string, directed: boolean, unique: boolean) {
    const ends = directed ? [source, target] : [source, target].sort()
    if (unique && this.pair.run(type, ...ends).changes === 0) return false
    this.degree.run(type, source, 1, 0, 1)
    this.degree.run(type, target, 0, 1, source === target ? 0 : 1)
    return true
  }
  *degrees(type: string) {
    for (const row of this.db
      .prepare(
        "SELECT e.repo,e.id,e.type,coalesce(d.source,0) AS s,coalesce(d.target,0) AS t,coalesce(d.incident,0) AS i FROM entities e LEFT JOIN degrees d ON d.key=e.refkey AND d.type=? WHERE e.kind='object'",
      )
      .iterate(type))
      yield {
        ref: { repositoryId: String(row.repo), objectId: String(row.id) },
        typeId: String(row.type),
        source: Number(row.s),
        target: Number(row.t),
        incident: Number(row.i),
      }
  }
  async query(
    kind: EntityKind,
    input: unknown,
    revision: string,
    cancelled: () => boolean = () => false,
  ): Promise<Result<Page<Partial<Entity>>>> {
    const started = Date.now()
    if (cancelled()) return failure('CANCELLED')
    const decoded = decodeQuery(input)
    if (!decoded.ok) return decoded
    const { cursor, ...q } = decoded.value,
      signature = canonicalJson({ kind, ...q } as unknown as JsonValue),
      limit = q.limit ?? 100
    let after: Entity | undefined,
      afterKey = ''
    if (cursor)
      try {
        const c = JSON.parse(cursor)
        if (c.scope !== this.scope || c.signature !== signature) return failure('INVALID_CURSOR')
        if (c.revision !== revision) return failure('STALE_CURSOR')
        if (typeof c.key !== 'string' || !/^(?:[a-f0-9]{4})+$/.test(c.key))
          return failure('INVALID_CURSOR')
        afterKey = c.key
        if (q.sort?.length) {
          const d = kind === 'object' ? decodeObject(c.last) : decodeRelation(c.last)
          if (!d.ok) return failure('INVALID_CURSOR')
          after = d.value
        }
      } catch {
        return failure('INVALID_CURSOR')
      }
    const clauses = ['kind=?'],
      args: (string | number | Uint8Array)[] = [kind]
    const push = (f: Filter) => {
      if (f.op === 'and') {
        for (const child of f.filters) push(child)
        return
      }
      if (!('field' in f) || f.op !== 'eq' || typeof f.value !== 'string') return
      const columns: Record<string, string> = {
        typeId: 'type',
        'ref.objectId': 'id',
        'ref.relationId': 'id',
        'ref.repositoryId': 'repo',
        'attributes.status': "json_extract(body,'$.attributes.status')",
      }
      if (columns[f.field]) {
        clauses.push(columns[f.field] + '=?')
        args.push(f.value)
      }
    }
    if (q.where) push(q.where)
    // Qualified adjacency constraints collapse to the actual indexed endpoint key.
    if (q.where?.op === 'and')
      for (const side of ['source', 'target']) {
        const values = new Map(
          q.where.filters
            .filter((f) => 'field' in f && f.op === 'eq')
            .map((f) => [(f as any).field, (f as any).value]),
        )
        if (
          typeof values.get(side + '.repositoryId') === 'string' &&
          typeof values.get(side + '.objectId') === 'string'
        ) {
          clauses.push(side + '=?')
          args.push(
            objectKey({
              repositoryId: values.get(side + '.repositoryId'),
              objectId: values.get(side + '.objectId'),
            }),
          )
        }
      }
    if (afterKey && !q.sort?.length) {
      clauses.push('ord>?')
      args.push(Buffer.from(afterKey, 'hex'))
    }
    const kept: Entity[] = []
    this.scanned = 0
    for (const row of this.db
      .prepare(
        'SELECT body,ord FROM entities WHERE ' +
          clauses.join(' AND ') +
          (q.sort?.length ? '' : ' ORDER BY ord'),
      )
      .iterate(...args)) {
      if (++this.scanned > 5000000) return failure('RESOURCE_LIMIT')
      if ((this.scanned & 1023) === 0) {
        await this.checkpoint()
        if (cancelled()) return failure('CANCELLED')
        if (Date.now() - started > 30000) return failure('RESOURCE_LIMIT')
      }
      const entity = JSON.parse(String(row.body)) as Entity
      if (
        (q.where && !matchesFilter(entity, q.where)) ||
        (after && compareQueryEntities(entity, after, q.sort) <= 0)
      )
        continue
      if (!q.sort?.length) {
        kept.push(entity)
        if (kept.length > limit) break
      } else {
        let low = 0,
          high = kept.length
        while (low < high) {
          const mid = (low + high) >>> 1
          if (compareQueryEntities(kept[mid], entity, q.sort) < 0) low = mid + 1
          else high = mid
        }
        kept.splice(low, 0, entity)
        if (kept.length > limit + 1) kept.pop()
      }
    }
    const more = kept.length > limit
    if (more) kept.pop()
    const result = queryEntities(kept, q, this.scope, revision)
    if (!result.ok) return result
    const next = more
      ? JSON.stringify({
          scope: this.scope,
          signature,
          revision,
          key: orderKey(kept.at(-1)!).toString('hex'),
          ...(q.sort?.length ? { last: kept.at(-1) } : {}),
        })
      : undefined
    return next && next.length > 20000
      ? failure('RESOURCE_LIMIT')
      : success({ ...result.value, ...(next ? { cursor: next } : {}) })
  }
  close() {
    if (!this.closed) {
      this.closed = true
      this.db.close()
    }
  }
}
