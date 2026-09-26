import { DatabaseSync } from 'node:sqlite'
export { PagedCatalog, pageBucket } from './paged'
import { existsSync, renameSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import {
  canonicalJson,
  decodeObject,
  decodeRelation,
  decodeSnapshot,
  decodeQuery,
  compareQueryEntities,
  matchesFilter,
  queryEntities,
  failure,
  success,
  type Result,
  type Entity,
  type EntityKind,
  type ObjectRef,
  type RepositorySnapshot,
  type JsonValue,
  type Page,
} from '@frade/repository-domain'
import type { ChangeResult } from '@frade/repository-ports'
export class SqliteIndex {
  private db: DatabaseSync
  private status: 'OUT_OF_SYNC' | 'READY' | 'CLOSED' = 'OUT_OF_SYNC'
  private readonly scope = randomUUID()
  private currentRevision = ''
  private repositoryId = ''
  constructor(private readonly filename: string) {
    if (filename !== ':memory:' && !filename.endsWith('.sqlite'))
      throw Error('Derived index requires a dedicated .sqlite path')
    let db: DatabaseSync | undefined
    try {
      db = new DatabaseSync(filename)
      this.schema(db)
      if (db.prepare('PRAGMA quick_check').get()?.quick_check !== 'ok') throw Error('Corrupt index')
    } catch {
      try {
        db?.close()
      } catch {
        /* corrupted handle */
      }
      if (existsSync(filename)) renameSync(filename, filename + '.corrupt-' + randomUUID())
      db = new DatabaseSync(filename)
      this.schema(db)
    }
    this.db = db
    // Persisted derived data is not trusted until compared with/rebuilt from the source.
  }
  get state() {
    return this.status
  }
  private schema(db: DatabaseSync) {
    db.exec(
      'CREATE TABLE IF NOT EXISTS entities(kind TEXT NOT NULL, repo TEXT NOT NULL, id TEXT NOT NULL, type TEXT NOT NULL, source TEXT, target TEXT, revision TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(kind,repo,id)); CREATE INDEX IF NOT EXISTS by_type ON entities(kind,type); CREATE INDEX IF NOT EXISTS incoming ON entities(target); CREATE INDEX IF NOT EXISTS outgoing ON entities(source); CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL)',
    )
  }
  private put(kind: EntityKind, entity: Entity) {
    const id = 'objectId' in entity.ref ? entity.ref.objectId : entity.ref.relationId
    this.db
      .prepare(
        'INSERT OR REPLACE INTO entities(kind,repo,id,type,source,target,revision,body) VALUES(?,?,?,?,?,?,?,?)',
      )
      .run(
        kind,
        entity.ref.repositoryId,
        id,
        entity.typeId,
        'source' in entity ? canonicalJson(entity.source as unknown as JsonValue) : null,
        'target' in entity ? canonicalJson(entity.target as unknown as JsonValue) : null,
        entity.revision,
        canonicalJson(entity as unknown as JsonValue),
      )
  }
  async rebuild(snapshot: RepositorySnapshot): Promise<Result<true>> {
    if (this.status === 'CLOSED') return failure('SESSION_CLOSED')
    this.status = 'OUT_OF_SYNC'
    try {
      const decodedSnapshot = decodeSnapshot(snapshot)
      if (!decodedSnapshot.ok || !decodedSnapshot.value.complete)
        return failure('INDEX_OUT_OF_SYNC')
      snapshot = decodedSnapshot.value
      this.db.exec('BEGIN IMMEDIATE; DELETE FROM entities; DELETE FROM metadata')
      const seen = new Set<string>()
      for (const [kind, entities] of [
        ['object', snapshot.objects],
        ['relation', snapshot.relations],
      ] as const)
        for (const input of entities) {
          const decoded = kind === 'object' ? decodeObject(input) : decodeRelation(input)
          if (!decoded.ok || decoded.value.ref.repositoryId !== snapshot.repositoryId)
            throw Error('Invalid source')
          const key = kind + canonicalJson(decoded.value.ref as unknown as JsonValue)
          if (seen.has(key)) throw Error('Duplicate source identity')
          seen.add(key)
          this.put(kind, decoded.value)
        }
      this.db.prepare('INSERT INTO metadata VALUES(?,?)').run('revision', snapshot.revision)
      this.db.exec('COMMIT')
      this.currentRevision = snapshot.revision
      this.repositoryId = snapshot.repositoryId
      this.status = 'READY'
      return success(true)
    } catch {
      try {
        this.db.exec('ROLLBACK')
      } catch {
        /* no active transaction */
      }
      return failure('INDEX_OUT_OF_SYNC')
    }
  }
  invalidate() {
    if (this.status !== 'CLOSED') this.status = 'OUT_OF_SYNC'
  }
  async applyChanges(result: ChangeResult, expectedRevision: string): Promise<Result<true>> {
    if (this.status !== 'READY' || expectedRevision !== this.currentRevision) {
      this.invalidate()
      return failure('INDEX_OUT_OF_SYNC')
    }
    try {
      this.db.exec('BEGIN IMMEDIATE')
      for (const change of result.changes) {
        if (change.ref.repositoryId !== this.repositoryId) throw Error('Wrong repository')
        if (change.action === 'deleted')
          this.db
            .prepare('DELETE FROM entities WHERE kind=? AND repo=? AND id=?')
            .run(
              change.kind,
              change.ref.repositoryId,
              'objectId' in change.ref ? change.ref.objectId : change.ref.relationId,
            )
        else {
          const decoded =
            change.kind === 'object' ? decodeObject(change.entity) : decodeRelation(change.entity)
          if (!decoded.ok) throw Error('Invalid entity')
          this.put(change.kind, decoded.value)
        }
      }
      this.db
        .prepare('INSERT OR REPLACE INTO metadata VALUES(?,?)')
        .run('revision', result.revision)
      this.db.exec('COMMIT')
      this.currentRevision = result.revision
      return success(true)
    } catch {
      try {
        this.db.exec('ROLLBACK')
      } catch {
        /* no active transaction */
      }
      this.invalidate()
      return failure('INDEX_OUT_OF_SYNC')
    }
  }
  async getObject(ref: ObjectRef) {
    if (this.status !== 'READY') return failure('INDEX_OUT_OF_SYNC')
    try {
      const row = this.db
        .prepare('SELECT body FROM entities WHERE kind=? AND repo=? AND id=?')
        .get('object', ref.repositoryId, ref.objectId)
      return row ? decodeObject(JSON.parse(String(row.body))) : failure('ENTITY_NOT_FOUND')
    } catch {
      this.invalidate()
      return failure('INDEX_OUT_OF_SYNC')
    }
  }
  async queryObjects(query: unknown = {}) {
    return this.query('object', query)
  }
  async queryRelations(query: unknown = {}) {
    return this.query('relation', query)
  }
  private async query(kind: EntityKind, input: unknown): Promise<Result<Page<Partial<Entity>>>> {
    if (this.status !== 'READY') return failure('INDEX_OUT_OF_SYNC')
    const parsed = decodeQuery(input)
    if (!parsed.ok) return parsed
    const { cursor, ...query } = parsed.value,
      signature = canonicalJson(query as unknown as JsonValue),
      limit = query.limit ?? 100
    let after: Entity | undefined
    if (cursor) {
      try {
        const c = JSON.parse(cursor)
        if (c.scope !== this.scope || c.signature !== signature) return failure('INVALID_CURSOR')
        if (c.revision !== this.currentRevision) return failure('STALE_CURSOR')
        const decoded = kind === 'object' ? decodeObject(c.last) : decodeRelation(c.last)
        if (!decoded.ok) return failure('INVALID_CURSOR')
        after = decoded.value
      } catch {
        return failure('INVALID_CURSOR')
      }
    }
    const kept: Entity[] = []
    let scanned = 0
    try {
      // Stream rows: at most page-size + 1 full entities retained, regardless of source size.
      for (const row of this.db.prepare('SELECT body FROM entities WHERE kind=?').iterate(kind)) {
        if (++scanned > 2000000) return failure('RESOURCE_LIMIT')
        const entity = JSON.parse(String(row.body)) as Entity
        if (
          (query.where && !matchesFilter(entity, query.where)) ||
          (after && compareQueryEntities(entity, after, query.sort) <= 0)
        )
          continue
        let low = 0,
          high = kept.length
        while (low < high) {
          const middle = (low + high) >>> 1
          if (compareQueryEntities(kept[middle], entity, query.sort) < 0) low = middle + 1
          else high = middle
        }
        kept.splice(low, 0, entity)
        if (kept.length > limit + 1) kept.pop()
      }
      const more = kept.length > limit
      if (more) kept.pop()
      const page = queryEntities(kept, query, this.scope, this.currentRevision)
      if (!page.ok) return page
      const next = more
        ? JSON.stringify({
            scope: this.scope,
            signature,
            revision: this.currentRevision,
            last: kept[kept.length - 1],
          })
        : undefined
      if (next && next.length > 20000) return failure('RESOURCE_LIMIT')
      return success({ ...page.value, ...(next ? { cursor: next } : {}) })
    } catch {
      this.invalidate()
      return failure('INDEX_OUT_OF_SYNC')
    }
  }
  async checkConsistency(revision: string) {
    if (this.status !== 'READY' || revision !== this.currentRevision) {
      this.invalidate()
      return failure('INDEX_OUT_OF_SYNC')
    }
    return success(true)
  }
  async close() {
    if (this.status === 'CLOSED') return
    this.db.close()
    this.status = 'CLOSED'
  }
}
