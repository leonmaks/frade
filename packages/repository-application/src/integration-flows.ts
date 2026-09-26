import {
  copyJson,
  fields,
  record,
  isReference,
  success,
  failure,
  flowRefKey,
  flowPairKey,
  classifyFlowDirection,
  type ObjectRef,
  type RepositoryObject,
  type IntegrationFlowCapability,
  type Result,
  type JsonValue,
} from '@frade/repository-domain'
import type { RepositorySession } from './session'
import type { CancellationToken } from '@frade/repository-ports'
export type { FlowQuery, FlowRow, FlowPage } from '@frade/repository-domain'
import type { FlowQuery, FlowPage } from '@frade/repository-domain'
const asRef = (v: unknown): ObjectRef | undefined => (isReference(v) ? (v as ObjectRef) : undefined)
export class IntegrationFlowService {
  private disposed = false
  private rows = new Map<string, RepositoryObject>()
  private pairs = new Map<string, RepositoryObject[]>()
  private texts = new Map<string, string>()
  private values = new Map<string, Record<string, string>>()
  private configurations = new Map<string, IntegrationFlowCapability>()
  private generation = 0
  private loaded = -1
  private rebuilding?: Promise<Result<true>>
  private off: () => void
  constructor(
    private readonly core: RepositorySession,
    private readonly capabilities: readonly IntegrationFlowCapability[],
  ) {
    for (const c of capabilities) this.configurations.set(c.typeId, c)
    this.off = core.subscribe(() => {
      this.generation++
    })
  }
  dispose() {
    this.disposed = true
    this.off()
    this.generation++
    this.rows.clear()
    this.pairs.clear()
    this.texts.clear()
    this.values.clear()
  }
  private async ensure(token?: CancellationToken): Promise<Result<true>> {
    if (this.disposed) return failure('CANCELLED')
    if (this.loaded === this.generation) return success(true)
    if (this.rebuilding) {
      await this.rebuilding
      return this.ensure(token)
    }
    const generation = this.generation
    const work = async (): Promise<Result<true>> => {
      let snapshot: Result<{ objects: readonly RepositoryObject[] }> =
        typeof this.core.queryObjects === 'function'
          ? failure('UNSUPPORTED_CAPABILITY')
          : await this.core.exportSnapshot(token)
      if (!snapshot.ok && snapshot.error.code === 'UNSUPPORTED_CAPABILITY') {
        const objects: RepositoryObject[] = []
        let cursor: string | undefined, revision: string | undefined
        const cursors = new Set<string>()
        do {
          const page = await this.core.queryObjects(
            { limit: 1000, ...(cursor ? { cursor } : {}) },
            token,
          )
          if (!page.ok) return page
          if (revision !== undefined && revision !== page.value.revision)
            return failure('REVISION_CONFLICT')
          revision = page.value.revision
          objects.push(...(page.value.items as RepositoryObject[]))
          cursor = page.value.cursor
          if (cursor) {
            if (cursors.has(cursor)) return failure('ADAPTER_CONTRACT')
            cursors.add(cursor)
          }
        } while (cursor)
        const final = await this.core.queryObjects({ limit: 1, projection: [] }, token)
        if (!final.ok) return final
        if (final.value.revision !== revision) return failure('REVISION_CONFLICT')
        snapshot = success({ objects })
      }
      if (!snapshot.ok) return snapshot
      if (token?.isCancellationRequested) return failure('CANCELLED')
      const objects = new Map(snapshot.value.objects.map((o) => [flowRefKey(o.ref), o])),
        rows = new Map<string, RepositoryObject>(),
        pairs = new Map<string, RepositoryObject[]>(),
        texts = new Map<string, string>(),
        values = new Map<string, Record<string, string>>()
      const label = (v: JsonValue): string => {
        const r = asRef(v)
        if (r) return objects.get(flowRefKey(r))?.name ?? r.objectId
        if (Array.isArray(v)) return v.map(label).join(', ')
        if (record(v))
          return Object.entries(v)
            .map(([k, x]) => k + ': ' + label(x as JsonValue))
            .join('; ')
        return v === null ? 'null' : String(v)
      }
      for (const object of snapshot.value.objects) {
        const c = this.configurations.get(object.typeId)
        if (!c) continue
        const key = flowRefKey(object.ref)
        rows.set(key, object)
        const vals = Object.fromEntries(
          [...new Set([c.source, c.consumer, ...c.search, ...c.columns.map((x) => x.field)])].map(
            (k) => [k, object.attributes[k] === undefined ? '' : label(object.attributes[k])],
          ),
        )
        values.set(key, vals)
        texts.set(
          key,
          [
            object.ref.objectId,
            object.name,
            ...c.search.map((k) => vals[k]),
            vals[c.source],
            vals[c.consumer],
          ]
            .join(' ')
            .toLocaleLowerCase(),
        )
        const a = asRef(object.attributes[c.source]),
          b = asRef(object.attributes[c.consumer])
        if (a && b) {
          const pair = flowPairKey(a, b)
          const bucket = pairs.get(pair) ?? []
          bucket.push(object)
          pairs.set(pair, bucket)
        }
      }
      if (generation !== this.generation) return success(true)
      this.rows = rows
      this.pairs = pairs
      this.texts = texts
      this.values = values
      this.loaded = generation
      return success(true)
    }
    this.rebuilding = work()
    try {
      const result = await this.rebuilding
      if (!result.ok) return result
    } finally {
      this.rebuilding = undefined
    }
    return this.loaded === this.generation ? success(true) : this.ensure(token)
  }
  async search(input: unknown, token?: CancellationToken): Promise<Result<FlowPage>> {
    const safe = copyJson(input)
    if (!safe.ok) return safe
    const p = safe.value
    if (
      !fields(
        p,
        ['endpointA', 'endpointB'],
        [
          'scope',
          'text',
          'filters',
          'direction',
          'membership',
          'members',
          'offset',
          'limit',
          'sort',
          'descending',
        ],
      ) ||
      !isReference(p.endpointA) ||
      !isReference(p.endpointB) ||
      p.endpointA.repositoryId !== this.core.repositoryId ||
      p.endpointB.repositoryId !== this.core.repositoryId ||
      (p.scope !== undefined && !['PAIR', 'ALL'].includes(String(p.scope))) ||
      (p.text !== undefined && (typeof p.text !== 'string' || p.text.length > 1000)) ||
      (p.members !== undefined &&
        (!Array.isArray(p.members) ||
          p.members.length > 100000 ||
          !p.members.every((x) => isReference(x)))) ||
      (p.filters !== undefined &&
        (!record(p.filters) || Object.values(p.filters).some((x) => typeof x !== 'string'))) ||
      (p.offset !== undefined && (!Number.isSafeInteger(p.offset) || (p.offset as number) < 0)) ||
      (p.limit !== undefined &&
        (!Number.isInteger(p.limit) || (p.limit as number) < 1 || (p.limit as number) > 100)) ||
      (p.direction !== undefined && !['ANY', 'A_TO_B', 'B_TO_A'].includes(String(p.direction))) ||
      (p.membership !== undefined &&
        !['ALL', 'INCLUDED', 'EXCLUDED'].includes(String(p.membership))) ||
      (p.sort !== undefined &&
        (typeof p.sort !== 'string' ||
          ![
            'name',
            'direction',
            ...this.capabilities.flatMap((c) => [
              c.source,
              c.consumer,
              ...c.columns.map((col) => col.field),
            ]),
          ].includes(p.sort))) ||
      (p.descending !== undefined && typeof p.descending !== 'boolean')
    )
      return failure('INVALID_INPUT')
    const access = this.core.checkReadAccess?.()
    if (access && !access.ok) return access
    if (token?.isCancellationRequested) return failure('CANCELLED')
    const query = p as unknown as FlowQuery,
      ready = await this.ensure(token)
    if (!ready.ok) return ready
    const pair = this.pairs.get(flowPairKey(query.endpointA, query.endpointB)) ?? [],
      selected = new Set((query.members ?? []).map(flowRefKey)),
      text = query.text?.trim().toLocaleLowerCase() ?? ''
    const direction = (f: RepositoryObject) =>
      classifyFlowDirection(f, this.configurations.get(f.typeId)!, query.endpointA, query.endpointB)
    const matches = (f: RepositoryObject) => {
      const key = flowRefKey(f.ref),
        d = direction(f)
      return (
        (!text || this.texts.get(key)!.includes(text)) &&
        (!query.direction || query.direction === 'ANY' || query.direction === d) &&
        (!query.membership ||
          query.membership === 'ALL' ||
          (query.membership === 'INCLUDED') === selected.has(key)) &&
        Object.entries(query.filters ?? {}).every(
          ([k, v]) =>
            !v ||
            (this.values.get(key)?.[k] ?? '').toLocaleLowerCase().includes(v.toLocaleLowerCase()),
        )
      )
    }
    const found = (query.scope === 'ALL' ? [...this.rows.values()] : pair).filter(matches)
    found.sort((a, b) => {
      if (query.scope === 'ALL') {
        const rank = Number(direction(b) !== 'OTHER') - Number(direction(a) !== 'OTHER')
        if (rank) return rank
        if (text && !query.sort) {
          const score = (f: RepositoryObject) => {
            const id = f.ref.objectId.toLocaleLowerCase(),
              name = f.name.toLocaleLowerCase()
            return id === text
              ? 200
              : id.startsWith(text)
                ? 100
                : name === text
                  ? 80
                  : name.startsWith(text)
                    ? 50
                    : 0
          }
          const relevance = score(b) - score(a)
          if (relevance) return relevance
        }
      } else if (!query.sort) {
        const rank =
          Number(selected.has(flowRefKey(b.ref))) - Number(selected.has(flowRefKey(a.ref)))
        if (rank) return rank
        const d = direction(a).localeCompare(direction(b))
        if (d) return d
      }
      const order =
        query.sort === 'direction'
          ? direction(a).localeCompare(direction(b))
          : query.sort && query.sort !== 'name'
            ? (this.values.get(flowRefKey(a.ref))?.[query.sort] ?? '').localeCompare(
                this.values.get(flowRefKey(b.ref))?.[query.sort] ?? '',
              )
            : a.name.localeCompare(b.name)
      return (
        (query.descending ? -order : order) || flowRefKey(a.ref).localeCompare(flowRefKey(b.ref))
      )
    })
    const offset = query.offset ?? 0,
      limit = query.limit ?? 50
    return success({
      items: found.slice(offset, offset + limit).map((flow) => ({
        flow,
        eligible: direction(flow) !== 'OTHER',
        direction: direction(flow),
        values: this.values.get(flowRefKey(flow.ref))!,
      })),
      total: found.length,
      totalEligible: pair.length,
      offset,
      capabilities: [...this.capabilities],
      members: (query.members ?? []).map((ref) => {
        const flow = this.rows.get(flowRefKey(ref))
        return {
          ref,
          state: !flow ? 'missing' : direction(flow) === 'OTHER' ? 'incompatible' : 'valid',
          ...(flow ? { flow } : {}),
        }
      }),
    })
  }
}
