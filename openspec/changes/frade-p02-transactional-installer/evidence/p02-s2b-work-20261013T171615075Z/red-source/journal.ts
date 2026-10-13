import { randomUUID } from 'node:crypto'
import { valid } from 'semver'
import { CheckedFiles, digest } from './storage'
import type { CheckedEntry } from './storage'
import type { VerifiedFilesystem } from './filesystem/factory'
const MAX_RECORD = 1048576,
  MAX_SLOTS = 10000,
  MAX_BYTES = 104857600,
  ENVELOPE_BYTES = 8388608
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  HASH = /^[a-f0-9]{64}$/
const FINAL = /^(\d{20})\.([a-f0-9-]{36})\.([a-f0-9]{64})\.json$/
const PENDING = /^\.pending-([a-f0-9-]{36})-([1-9]\d*)-([1-9]\d*)-([a-f0-9-]{36})\.tmp$/
export const JOURNAL_PHASES = [
  'STAGING',
  'VALIDATED',
  'PREPARED',
  'SWAPPED',
  'PRESENTATION_ACK',
  'COMMITTED',
  'CLEANUP',
] as const
export type JournalPhase = (typeof JOURNAL_PHASES)[number]
export interface PresentationSelection {
  mode: 'light' | 'dark' | 'high-contrast' | 'system'
  density: 'compact' | 'comfortable'
  preferred: { light: string; dark: string; 'high-contrast': string }
}
export interface JournalPresentation {
  version: 1
  revision: number
  generation: number
  transactionId: string
  selection: PresentationSelection
}
export interface RegistryEntry {
  id: string
  version: string
  archiveSha256: string
  enabled: boolean
  previousSha256: string | null
}
export interface JournalRegistry {
  revision: number
  entries: RegistryEntry[]
}
export interface TransactionPlan {
  oldRegistry: JournalRegistry
  newRegistry: JournalRegistry
  oldPresentation: JournalPresentation
  newPresentation: JournalPresentation
  versions: string[]
  cleanup: string[]
  consumedRevision: number
  envelope: { slots: 8; bytes: 8388608; maxRecordBytes: 1048576 }
}
export interface RecoveryInput {
  observed: JournalPresentation
  target: JournalPresentation
  mode: 'WRITE' | 'NO_SETTINGS_WRITE'
  owner: { sessionId: string; windowId: number; generation: number; requestId: string }
  consumedRevision: number
}
export interface DispositionInput {
  outcome: 'RETAINED_COMMITTED' | 'ROLLED_BACK'
  authorityHash: string | null
  registry: JournalRegistry
  presentation: JournalPresentation
  consumedRevision: number
  cleanupPending: string[]
}
export interface JournalRecord {
  schemaVersion: 1
  ordinal: number
  transactionId: string
  expectedRegistryRevision: number
  previousRecordSHA256: string | null
  kind: 'PHASE' | 'RecoveryPlan' | 'RecoveryDisposition'
  phase?: JournalPhase
  payload: any
  payloadSHA256: string
}
export interface ScannedRecord {
  name: string
  sha256: string
  bytes: number
  record: JournalRecord
}
export interface ActiveTransaction {
  transactionId: string
  plan: TransactionPlan
  lastPhase: JournalPhase
  count: number
  bytes: number
  recovery: RecoveryInput | null
  committedHash: string | null
}
export interface JournalScan {
  records: ScannedRecord[]
  pending: CheckedEntry[]
  usedSlots: number
  usedBytes: number
  remainingSlots: number
  remainingBytes: number
  active: ActiveTransaction | null
  authority: { registry: JournalRegistry; presentation: JournalPresentation } | null
  consumedRevision: number
}
function fail(code = 'RECOVERY_BLOCKED'): never {
  throw Error(code)
}
const integer = (n: unknown): n is number =>
  typeof n === 'number' && Number.isSafeInteger(n) && n >= 0
const text = (v: unknown, max = 160): v is string =>
  typeof v === 'string' &&
  v.length > 0 &&
  v.length <= max &&
  ![...v].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)
function object(v: unknown): v is Record<string, any> {
  return (
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.getPrototypeOf(v) === Object.prototype
  )
}
function exact(v: unknown, keys: string[]): asserts v is Record<string, any> {
  if (!object(v) || Object.keys(v).length !== keys.length || keys.some((k) => !Object.hasOwn(v, k)))
    fail()
}
/** Exact deterministic UTF8 JSON. No getters, prototypes, cycles or lossy JSON values. */
export function canonical(value: unknown): Buffer {
  let count = 0
  const visiting = new Set<object>()
  const encode = (v: unknown, depth: number): string => {
    if (++count > 150000 || depth > 32) fail('INVALID_JOURNAL_DATA')
    if (v === null) return 'null'
    if (typeof v === 'string') return JSON.stringify(v)
    if (typeof v === 'boolean') return v ? 'true' : 'false'
    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v)
    if (!v || typeof v !== 'object' || visiting.has(v) || (!Array.isArray(v) && !object(v)))
      fail('INVALID_JOURNAL_DATA')
    visiting.add(v)
    const d = Object.getOwnPropertyDescriptors(v)
    if (
      Object.values(d).some((p) => p.get || p.set) ||
      Reflect.ownKeys(v).some((k) => typeof k === 'symbol')
    )
      fail('INVALID_JOURNAL_DATA')
    let result: string
    if (Array.isArray(v)) {
      if (Object.keys(v).length !== v.length) fail('INVALID_JOURNAL_DATA')
      result = '[' + v.map((e) => encode(e, depth + 1)).join(',') + ']'
    } else
      result =
        '{' +
        Object.keys(v)
          .sort()
          .map((k) => JSON.stringify(k) + ':' + encode(d[k].value, depth + 1))
          .join(',') +
        '}'
    visiting.delete(v)
    return result
  }
  return Buffer.from(encode(value, 0), 'utf8')
}
const same = (a: unknown, b: unknown) => canonical(a).equals(canonical(b))
function selection(v: unknown): void {
  exact(v, ['mode', 'density', 'preferred'])
  if (
    !['light', 'dark', 'high-contrast', 'system'].includes(v.mode) ||
    !['compact', 'comfortable'].includes(v.density)
  )
    fail()
  exact(v.preferred, ['light', 'dark', 'high-contrast'])
  if (Object.values(v.preferred).some((p) => !text(p))) fail()
}
function presentation(v: unknown): void {
  exact(v, ['version', 'revision', 'generation', 'transactionId', 'selection'])
  if (v.version !== 1 || !integer(v.revision) || !integer(v.generation) || !text(v.transactionId))
    fail()
  selection(v.selection)
}
function hashes(v: unknown): asserts v is string[] {
  if (
    !Array.isArray(v) ||
    v.length > 10000 ||
    v.some((h) => typeof h !== 'string' || !HASH.test(h)) ||
    new Set(v).size !== v.length
  )
    fail()
}
function registry(v: unknown): void {
  exact(v, ['revision', 'entries'])
  if (!integer(v.revision) || !Array.isArray(v.entries) || v.entries.length > 10000) fail()
  const ids = new Set<string>()
  for (const e of v.entries) {
    exact(e, ['id', 'version', 'archiveSha256', 'enabled', 'previousSha256'])
    if (
      !text(e.id) ||
      !/^[a-z0-9][a-z0-9-]*\.[a-z0-9][a-z0-9-]*$/.test(e.id) ||
      !text(e.version) ||
      !valid(e.version) ||
      !HASH.test(e.archiveSha256) ||
      typeof e.enabled !== 'boolean' ||
      (e.previousSha256 !== null && !HASH.test(e.previousSha256)) ||
      ids.has(e.id)
    )
      fail()
    ids.add(e.id)
  }
}
function validatePlan(v: unknown): asserts v is TransactionPlan {
  exact(v, [
    'oldRegistry',
    'newRegistry',
    'oldPresentation',
    'newPresentation',
    'versions',
    'cleanup',
    'consumedRevision',
    'envelope',
  ])
  registry(v.oldRegistry)
  registry(v.newRegistry)
  presentation(v.oldPresentation)
  presentation(v.newPresentation)
  hashes(v.versions)
  hashes(v.cleanup)
  exact(v.envelope, ['slots', 'bytes', 'maxRecordBytes'])
  if (
    v.envelope.slots !== 8 ||
    v.envelope.bytes !== ENVELOPE_BYTES ||
    v.envelope.maxRecordBytes !== MAX_RECORD ||
    !integer(v.consumedRevision) ||
    v.consumedRevision < Math.max(v.oldPresentation.revision, v.newPresentation.revision) ||
    v.newRegistry.revision < v.oldRegistry.revision ||
    v.newRegistry.revision > v.oldRegistry.revision + 1 ||
    v.newPresentation.revision < v.oldPresentation.revision ||
    (v.newPresentation.revision === v.oldPresentation.revision &&
      !same(v.newPresentation, v.oldPresentation))
  )
    fail()
  if (v.newRegistry.revision === v.oldRegistry.revision && !same(v.newRegistry, v.oldRegistry))
    fail()
  for (const e of [...v.oldRegistry.entries, ...v.newRegistry.entries])
    if (
      !v.versions.includes(e.archiveSha256) ||
      (e.previousSha256 && !v.versions.includes(e.previousSha256))
    )
      fail()
  if (v.cleanup.some((h: string) => v.versions.includes(h))) fail()
}
function recovery(v: unknown, p: TransactionPlan): asserts v is RecoveryInput {
  exact(v, ['observed', 'target', 'mode', 'owner', 'consumedRevision'])
  presentation(v.observed)
  presentation(v.target)
  exact(v.owner, ['sessionId', 'windowId', 'generation', 'requestId'])
  if (
    !text(v.owner.sessionId) ||
    !text(v.owner.requestId) ||
    !integer(v.owner.windowId) ||
    !integer(v.owner.generation) ||
    !integer(v.consumedRevision) ||
    !['WRITE', 'NO_SETTINGS_WRITE'].includes(v.mode) ||
    (!same(v.observed, p.oldPresentation) && !same(v.observed, p.newPresentation)) ||
    !same(v.target.selection, p.oldPresentation.selection)
  )
    fail()
  if (v.mode === 'NO_SETTINGS_WRITE') {
    if (
      !same(v.observed, p.oldPresentation) ||
      !same(v.target, p.oldPresentation) ||
      v.consumedRevision !== p.consumedRevision
    )
      fail()
  } else if (
    same(v.observed, p.oldPresentation) ||
    v.target.revision !== p.consumedRevision + 1 ||
    v.consumedRevision !== v.target.revision ||
    v.target.generation !== v.owner.generation ||
    v.target.transactionId !== v.owner.requestId
  )
    fail()
}
export function reserveEnvelope(
  usedSlots: number,
  usedBytes: number,
  remainingSlots = 0,
  remainingBytes = 0,
): { slots: 8; bytes: 8388608 } {
  if (
    ![usedSlots, usedBytes, remainingSlots, remainingBytes].every(integer) ||
    usedSlots + remainingSlots + 8 > MAX_SLOTS ||
    usedBytes + remainingBytes + ENVELOPE_BYTES > MAX_BYTES
  )
    fail('JOURNAL_CAPACITY')
  return { slots: 8, bytes: 8388608 }
}
function boundedRecord(r: JournalRecord): Buffer {
  const b = canonical(r)
  if (b.length > MAX_RECORD) fail('JOURNAL_RECORD_LIMIT')
  return b
}
function makeRecord(
  scan: JournalScan,
  transactionId: string,
  kind: JournalRecord['kind'],
  payload: any,
  phase?: JournalPhase,
): JournalRecord {
  const last = scan.records.at(-1)
  return {
    schemaVersion: 1,
    ordinal: (last?.record.ordinal ?? 0) + 1,
    transactionId,
    expectedRegistryRevision: (kind === 'PHASE' ? payload : payload.plan).oldRegistry.revision,
    previousRecordSHA256: last?.sha256 ?? null,
    kind,
    ...(phase ? { phase } : {}),
    payload,
    payloadSHA256: digest(canonical(payload)),
  }
}
function preflightPlan(plan: TransactionPlan): void {
  if (
    !same(plan.newPresentation, plan.oldPresentation) &&
    plan.consumedRevision === Number.MAX_SAFE_INTEGER
  )
    fail('PRESENTATION_REVISION_CAPACITY')
  const scan: JournalScan = {
    records: [],
    pending: [],
    usedSlots: 0,
    usedBytes: 0,
    remainingSlots: 0,
    remainingBytes: 0,
    active: null,
    authority: null,
    consumedRevision: 0,
  }
  const worst = (kind: JournalRecord['kind'], payload: any, phase?: JournalPhase) => {
    const r = makeRecord(
      scan,
      'f'.repeat(8) + '-ffff-ffff-ffff-' + 'f'.repeat(12),
      kind,
      payload,
      phase,
    )
    r.ordinal = Number.MAX_SAFE_INTEGER
    r.previousRecordSHA256 = 'f'.repeat(64)
    boundedRecord(r)
  }
  for (const phase of JOURNAL_PHASES) worst('PHASE', plan, phase)
  const target = {
    ...plan.oldPresentation,
    revision: Number.MAX_SAFE_INTEGER,
    generation: Number.MAX_SAFE_INTEGER,
    transactionId: 'r'.repeat(160),
  }
  worst('RecoveryPlan', {
    plan,
    observed: plan.newPresentation,
    target,
    mode: 'NO_SETTINGS_WRITE',
    owner: {
      sessionId: 's'.repeat(160),
      windowId: Number.MAX_SAFE_INTEGER,
      generation: Number.MAX_SAFE_INTEGER,
      requestId: 'r'.repeat(160),
    },
    consumedRevision: Number.MAX_SAFE_INTEGER,
  })
  for (const registry of [plan.oldRegistry, plan.newRegistry])
    worst('RecoveryDisposition', {
      plan,
      outcome: 'RETAINED_COMMITTED',
      authorityHash: 'f'.repeat(64),
      registry,
      presentation: target,
      consumedRevision: Number.MAX_SAFE_INTEGER,
      cleanupPending: plan.cleanup,
    })
}
/** Full immutable chain reader/publisher. It selects journal authority; S2b must still reconcile actual stores before a disposition. */
export class InstallerJournal {
  private readonly files: CheckedFiles
  private busy = false
  private unusable = false
  constructor(
    filesystem: VerifiedFilesystem,
    readonly generation: number,
  ) {
    if (!integer(generation) || generation === 0) fail('JOURNAL_GENERATION')
    this.files = new CheckedFiles(filesystem)
  }
  private async exclusive<T>(run: () => Promise<T>): Promise<T> {
    if (this.unusable) fail('JOURNAL_SESSION_UNUSABLE')
    if (this.busy) fail('JOURNAL_BUSY')
    this.busy = true
    try {
      return await run()
    } finally {
      this.busy = false
    }
  }
  scan(): Promise<JournalScan> {
    return this.exclusive(() => this.readScan())
  }
  private async readScan(): Promise<JournalScan> {
    try {
      const root = await this.files.list([])
      if (
        root.some(
          (e) =>
            !['.coordinator.lock', 'journal', 'versions', 'staging'].includes(e.name) ||
            (e.name !== '.coordinator.lock' && e.kind !== 'directory'),
        )
      )
        fail()
      const journal = root.find((e) => e.name === 'journal')
      let entries: CheckedEntry[] = []
      let recordsExist = false
      if (journal) {
        const dirs = await this.files.list(['journal'])
        if (dirs.some((e) => e.name !== 'records' || e.kind !== 'directory')) fail()
        if (dirs.length) {
          recordsExist = true
          entries = await this.files.list(['journal', 'records'])
        }
      }
      const result: JournalScan = {
        records: [],
        pending: [],
        usedSlots: entries.length,
        usedBytes: 0,
        remainingSlots: 0,
        remainingBytes: 0,
        active: null,
        authority: null,
        consumedRevision: 0,
      }
      const finals: Array<{ e: CheckedEntry; match: RegExpMatchArray }> = []
      for (const e of entries) {
        if (e.kind !== 'file' || e.bytes > MAX_RECORD) fail()
        result.usedBytes += e.bytes
        if (result.usedBytes > MAX_BYTES || result.usedSlots > MAX_SLOTS) fail()
        const match = e.name.match(FINAL)
        if (match) {
          if (!UUID.test(match[2])) fail()
          finals.push({ e, match })
        } else if (PENDING.test(e.name)) result.pending.push(e)
        else fail()
      }
      finals.sort((a, b) => a.match[1].localeCompare(b.match[1]))
      let active: ActiveTransaction | null = null,
        authority: JournalScan['authority'] = null,
        consumed = 0,
        priorHash: string | null = null
      const completed = new Set<string>()
      for (const { e, match } of finals) {
        const bytes = await this.files.read(['journal', 'records', e.name], MAX_RECORD, e, false),
          sha256 = digest(bytes)
        if (sha256 !== match[3]) fail()
        const r: JournalRecord = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
        if (!canonical(r).equals(bytes)) fail()
        exact(
          r,
          r.kind === 'PHASE'
            ? [
                'schemaVersion',
                'ordinal',
                'transactionId',
                'expectedRegistryRevision',
                'previousRecordSHA256',
                'kind',
                'phase',
                'payload',
                'payloadSHA256',
              ]
            : [
                'schemaVersion',
                'ordinal',
                'transactionId',
                'expectedRegistryRevision',
                'previousRecordSHA256',
                'kind',
                'payload',
                'payloadSHA256',
              ],
        )
        if (
          r.schemaVersion !== 1 ||
          r.ordinal !== result.records.length + 1 ||
          String(r.ordinal).padStart(20, '0') !== match[1] ||
          r.transactionId !== match[2] ||
          r.previousRecordSHA256 !== priorHash ||
          r.payloadSHA256 !== digest(canonical(r.payload)) ||
          !['PHASE', 'RecoveryPlan', 'RecoveryDisposition'].includes(r.kind)
        )
          fail()
        const p: TransactionPlan = r.kind === 'PHASE' ? r.payload : r.payload.plan
        validatePlan(p)
        if (r.expectedRegistryRevision !== p.oldRegistry.revision) fail()
        if (r.kind === 'PHASE' && r.phase === 'STAGING') {
          preflightPlan(p)
          if (
            active ||
            completed.has(r.transactionId) ||
            (!authority && (p.oldRegistry.revision !== 0 || p.oldRegistry.entries.length !== 0)) ||
            (authority &&
              (!same(p.oldRegistry, authority.registry) ||
                !same(p.oldPresentation, authority.presentation))) ||
            p.consumedRevision < consumed ||
            (!same(p.newPresentation, p.oldPresentation) && p.newPresentation.revision <= consumed)
          )
            fail()
          active = {
            transactionId: r.transactionId,
            plan: p,
            lastPhase: 'STAGING',
            count: 0,
            bytes: 0,
            recovery: null,
            committedHash: null,
          }
          authority ??= { registry: p.oldRegistry, presentation: p.oldPresentation }
        } else {
          if (!active || active.transactionId !== r.transactionId || !same(active.plan, p)) fail()
          if (r.kind === 'PHASE') {
            if (
              !r.phase ||
              r.phase === 'STAGING' ||
              (active.recovery
                ? r.phase !== 'CLEANUP' || active.lastPhase === 'CLEANUP'
                : JOURNAL_PHASES.indexOf(r.phase) !== JOURNAL_PHASES.indexOf(active.lastPhase) + 1)
            )
              fail()
            active.lastPhase = r.phase
            if (r.phase === 'COMMITTED') {
              active.committedHash = sha256
              authority = { registry: p.newRegistry, presentation: p.newPresentation }
            }
          } else if (r.kind === 'RecoveryPlan') {
            exact(r.payload, ['plan', 'observed', 'target', 'mode', 'owner', 'consumedRevision'])
            const value: RecoveryInput = {
              observed: r.payload.observed,
              target: r.payload.target,
              mode: r.payload.mode,
              owner: r.payload.owner,
              consumedRevision: r.payload.consumedRevision,
            }
            recovery(value, p)
            if (
              active.recovery ||
              active.committedHash ||
              JOURNAL_PHASES.indexOf(active.lastPhase) > 4
            )
              fail()
            active.recovery = value
            consumed = Math.max(consumed, value.consumedRevision)
          } else {
            exact(r.payload, [
              'plan',
              'outcome',
              'authorityHash',
              'registry',
              'presentation',
              'consumedRevision',
              'cleanupPending',
            ])
            const d = r.payload
            registry(d.registry)
            presentation(d.presentation)
            hashes(d.cleanupPending)
            if (
              !integer(d.consumedRevision) ||
              d.consumedRevision !== Math.max(consumed, p.consumedRevision) ||
              (d.cleanupPending as string[]).some((h) => !p.cleanup.includes(h))
            )
              fail()
            if (active.committedHash) {
              if (
                d.outcome !== 'RETAINED_COMMITTED' ||
                d.authorityHash !== active.committedHash ||
                active.lastPhase !== 'CLEANUP' ||
                !same(d.registry, p.newRegistry) ||
                !same(d.presentation, p.newPresentation)
              )
                fail()
            } else if (
              d.outcome !== 'ROLLED_BACK' ||
              d.authorityHash !== priorAuthorityHash(result.records) ||
              !active.recovery ||
              !same(d.registry, p.oldRegistry) ||
              !same(d.presentation, active.recovery.target)
            )
              fail()
            authority = { registry: d.registry, presentation: d.presentation }
            completed.add(r.transactionId)
          }
        }
        if (!active) fail()
        active.count++
        active.bytes += bytes.length
        if (active.count > 8 || active.bytes > ENVELOPE_BYTES) fail()
        consumed = Math.max(consumed, p.consumedRevision)
        result.records.push({ name: e.name, sha256, bytes: bytes.length, record: r })
        priorHash = sha256
        if (r.kind === 'RecoveryDisposition') active = null
      }
      if (result.pending.length > 1) fail()
      for (const e of result.pending) {
        const m = e.name.match(PENDING)!
        if (
          !UUID.test(m[1]) ||
          !UUID.test(m[4]) ||
          !integer(Number(m[2])) ||
          !integer(Number(m[3])) ||
          Number(m[3]) !== result.records.length + 1 ||
          (active ? m[1] !== active.transactionId : result.records.length !== 0)
        )
          fail()
      }
      if (!result.records.length) {
        for (const name of ['versions', 'staging'])
          if (root.some((e) => e.name === name) && (await this.files.list([name])).length) fail()
      }
      if (active) {
        result.remainingSlots = 8 - active.count - result.pending.length
        result.remainingBytes =
          ENVELOPE_BYTES - active.bytes - result.pending.reduce((n, e) => n + e.bytes, 0)
        if (
          result.remainingSlots < 0 ||
          result.remainingBytes < 0 ||
          result.usedSlots + result.remainingSlots > MAX_SLOTS ||
          result.usedBytes + result.remainingBytes > MAX_BYTES
        )
          fail()
      }
      // Defer authority until one complete final checked inventory proves every initial identity/name/type/size.
      const inventory = (rows: CheckedEntry[]) =>
        rows.slice().sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
      if (
        recordsExist &&
        !same(inventory(entries), inventory(await this.files.list(['journal', 'records'])))
      )
        fail()
      if (journal && !recordsExist && (await this.files.list(['journal'])).length) fail()
      if (!same(inventory(root), inventory(await this.files.list([])))) fail()
      result.active = active
      result.authority = authority
      result.consumedRevision = consumed
      return result
    } catch (error) {
      if (error instanceof Error && error.message === 'JOURNAL_SESSION_UNUSABLE') throw error
      throw Error('RECOVERY_BLOCKED', { cause: error })
    }
  }
  private async publish(scan: JournalScan, r: JournalRecord): Promise<JournalScan> {
    if (scan.pending.length) fail('PENDING_PUBLICATION')
    const bytes = boundedRecord(r)
    if (scan.active && (scan.remainingSlots < 1 || scan.remainingBytes < bytes.length))
      fail('JOURNAL_CAPACITY')
    const name =
        String(r.ordinal).padStart(20, '0') + '.' + r.transactionId + '.' + digest(bytes) + '.json',
      pending =
        '.pending-' +
        r.transactionId +
        '-' +
        this.generation +
        '-' +
        r.ordinal +
        '-' +
        randomUUID() +
        '.tmp'
    try {
      await this.files.directory(['journal', 'records'])
      await this.files.write(['journal', 'records', pending], bytes, name)
      return await this.readScan()
    } catch (error) {
      this.unusable = true
      throw Error('JOURNAL_PUBLICATION_UNKNOWN', { cause: error })
    }
  }
  begin(transactionId: string, input: unknown): Promise<JournalScan> {
    return this.exclusive(async () => {
      if (!UUID.test(transactionId)) fail('INVALID_TRANSACTION')
      const plan = JSON.parse(canonical(input).toString()) as TransactionPlan
      // Worst case includes full RecoveryPlan / disposition overhead, not only first STAGING.
      if (canonical(plan).length > MAX_RECORD) fail('JOURNAL_RECORD_LIMIT')
      validatePlan(plan)
      preflightPlan(plan)
      const scan = await this.readScan()
      if (scan.active) fail('TRANSACTION_OPEN')
      if (scan.records.some((r) => r.record.transactionId === transactionId))
        fail('TRANSACTION_REUSED')
      if (
        !scan.authority &&
        (plan.oldRegistry.revision !== 0 || plan.oldRegistry.entries.length !== 0)
      )
        fail('STATE_CONFLICT')
      if (scan.pending.length) fail('PENDING_PUBLICATION')
      reserveEnvelope(scan.usedSlots, scan.usedBytes, scan.remainingSlots, scan.remainingBytes)
      this.files.reserveCreations(10)
      if (
        scan.authority &&
        (!same(plan.oldRegistry, scan.authority.registry) ||
          !same(plan.oldPresentation, scan.authority.presentation))
      )
        fail('STATE_CONFLICT')
      if (
        plan.consumedRevision < scan.consumedRevision ||
        (!same(plan.newPresentation, plan.oldPresentation) &&
          plan.newPresentation.revision <= scan.consumedRevision)
      )
        fail('STATE_CONFLICT')
      return this.publish(scan, makeRecord(scan, transactionId, 'PHASE', plan, 'STAGING'))
    })
  }
  phase(transactionId: string, phase: string): Promise<JournalScan> {
    return this.exclusive(async () => {
      const scan = await this.readScan(),
        active = this.active(scan, transactionId)
      if (
        !JOURNAL_PHASES.includes(phase as JournalPhase) ||
        (active.recovery
          ? phase !== 'CLEANUP' || active.lastPhase === 'CLEANUP'
          : JOURNAL_PHASES.indexOf(phase as JournalPhase) !==
            JOURNAL_PHASES.indexOf(active.lastPhase) + 1)
      )
        fail('ILLEGAL_PHASE')
      return this.publish(
        scan,
        makeRecord(scan, transactionId, 'PHASE', active.plan, phase as JournalPhase),
      )
    })
  }
  recoveryPlan(transactionId: string, input: unknown): Promise<JournalScan> {
    return this.exclusive(async () => {
      const scan = await this.readScan(),
        active = this.active(scan, transactionId),
        value = JSON.parse(canonical(input).toString())
      if (active.committedHash || active.recovery || JOURNAL_PHASES.indexOf(active.lastPhase) > 4)
        fail('RECOVERY_PLAN_CONFLICT')
      recovery(value, active.plan)
      return this.publish(
        scan,
        makeRecord(scan, transactionId, 'RecoveryPlan', { plan: active.plan, ...value }),
      )
    })
  }
  disposition(transactionId: string, input: unknown): Promise<JournalScan> {
    return this.exclusive(async () => {
      const scan = await this.readScan(),
        active = this.active(scan, transactionId),
        value = JSON.parse(canonical(input).toString()),
        r = makeRecord(scan, transactionId, 'RecoveryDisposition', { plan: active.plan, ...value })
      const bytes = boundedRecord(r)
      // Validate candidate state/transition against the same parser before any publication effect.
      const validated = validateDisposition(value, active, scan)
      if (!validated || bytes.length > scan.remainingBytes) fail('DISPOSITION_CONFLICT')
      return this.publish(scan, r)
    })
  }
  private active(scan: JournalScan, tx: string): ActiveTransaction {
    if (!scan.active || scan.active.transactionId !== tx) fail('TRANSACTION_CLOSED')
    return scan.active
  }
}
function priorAuthorityHash(records: ScannedRecord[]): string | null {
  for (let i = records.length - 1; i >= 0; i--)
    if (records[i].record.kind === 'RecoveryDisposition') return records[i].sha256
  return null
}
function validateDisposition(d: any, a: ActiveTransaction, s: JournalScan): boolean {
  exact(d, [
    'outcome',
    'authorityHash',
    'registry',
    'presentation',
    'consumedRevision',
    'cleanupPending',
  ])
  registry(d.registry)
  presentation(d.presentation)
  hashes(d.cleanupPending)
  if (
    d.consumedRevision !== s.consumedRevision ||
    d.cleanupPending.some((h: string) => !a.plan.cleanup.includes(h))
  )
    return false
  return a.committedHash
    ? d.outcome === 'RETAINED_COMMITTED' &&
        d.authorityHash === a.committedHash &&
        a.lastPhase === 'CLEANUP' &&
        same(d.registry, a.plan.newRegistry) &&
        same(d.presentation, a.plan.newPresentation)
    : d.outcome === 'ROLLED_BACK' &&
        d.authorityHash === priorAuthorityHash(s.records) &&
        !!a.recovery &&
        same(d.registry, a.plan.oldRegistry) &&
        same(d.presentation, a.recovery.target)
}
