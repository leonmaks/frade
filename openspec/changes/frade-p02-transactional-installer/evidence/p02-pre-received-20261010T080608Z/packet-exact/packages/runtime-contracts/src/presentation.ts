/** Separate presentation protocol. The health DesktopApi and channels stay unchanged. */
export const PRESENTATION_CHANNEL = 'frade:presentation'
export const PRESENTATION_BOOT_CHANNEL = 'frade:presentation-boot'
export const PRESENTATION_VERSION = 1 as const
export const PRESENTATION_MAX_BYTES = 32 * 1024
export const presentationRoles = [
  'surface.base',
  'surface.panel',
  'surface.rail',
  'surface.hover',
  'surface.overlay',
  'text.primary',
  'text.secondary',
  'text.disabled',
  'border.subtle',
  'border.control',
  'action.primary',
  'action.primaryHover',
  'action.onPrimary',
  'selection.bg',
  'selection.fg',
  'selection.indicator',
  'focus.ring',
  'status.success',
  'status.successBg',
  'status.warning',
  'status.warningBg',
  'status.error',
  'status.errorBg',
  'status.info',
  'status.infoBg',
  'diagram.canvas',
  'diagram.grid',
  'diagram.nodeBg',
  'diagram.nodeStroke',
  'diagram.edge',
  'diagram.selection',
] as const
export type PresentationRole = (typeof presentationRoles)[number]
export type PresentationKind = 'light' | 'dark' | 'high-contrast'
export interface PresentationChoice {
  readonly mode: PresentationKind | 'system'
  readonly density: 'compact' | 'comfortable'
  readonly preferred: Readonly<Record<PresentationKind, string>>
}
export interface PresentationRecord {
  readonly version: 1
  readonly revision: number
  readonly generation: number
  readonly transactionId: string
  readonly selection: PresentationChoice
}
export interface PresentationPhase {
  readonly version: 1
  readonly requestId: string
  readonly sessionId: string
  readonly generation: number
  readonly transactionId: string
  readonly revision: number
  readonly membership: number
  readonly phase: 'prepare' | 'apply' | 'rollback' | 'join'
}
export interface PresentationSnapshot {
  readonly id: string
  readonly label: string
  readonly kind: PresentationKind
  readonly density: 'compact' | 'comfortable'
  readonly revision: number
  readonly colors: Readonly<Record<PresentationRole, string>>
  readonly effectiveColors: Readonly<Record<PresentationRole, string>>
  readonly forcedColors: boolean
  readonly status: 'VALID' | 'REPAIRED' | 'FALLBACK'
  readonly repairPasses: number
  readonly issues: readonly {
    readonly code: string
    readonly source: string
    readonly role?: string
    readonly message: string
  }[]
  readonly compatibility: {
    readonly recognized: readonly string[]
    readonly ignored: readonly string[]
    readonly repaired: readonly PresentationRole[]
  }
}
export interface PresentationBoot {
  readonly version: 1
  readonly sessionId: string
  readonly bootRevision: number
  readonly snapshot: PresentationSnapshot
  readonly durable: PresentationRecord
  readonly diagnostics: readonly string[]
}
export type PresentationRequest = {
  readonly version: 1
  readonly sessionId: string
  readonly requestId: string
} & (
  | { readonly operation: 'intent'; readonly payload: Record<string, never> }
  | {
      readonly operation: 'persist'
      readonly payload: {
        readonly context: PresentationPhase
        readonly selection: PresentationChoice
        readonly expectedRevision: number
      }
    }
  | {
      readonly operation: 'reconcile'
      readonly payload: {
        readonly context: PresentationPhase
        readonly lastPublished: PresentationRecord
      }
    }
  | {
      readonly operation: 'ready'
      readonly payload: { readonly bootRevision: number; readonly rootRevision: number }
    }
)

const kinds: readonly PresentationKind[] = ['light', 'dark', 'high-contrast']
const roles = new Set<string>(presentationRoles)
function invalid(): never {
  throw new Error('INVALID_PRESENTATION')
}
function data(value: unknown): void {
  let count = 0
  const visiting = new Set<object>()
  function walk(item: unknown, depth: number): void {
    if (++count > 5000 || depth > 16) invalid()
    if (item === null || typeof item === 'boolean') return
    if (typeof item === 'string') {
      if (item.length > 8192) invalid()
      return
    }
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) invalid()
      return
    }
    if (
      !item ||
      typeof item !== 'object' ||
      visiting.has(item) ||
      Object.getOwnPropertySymbols(item).length
    )
      invalid()
    const array = Array.isArray(item),
      prototype = Object.getPrototypeOf(item)
    if (
      prototype !== (array ? Array.prototype : Object.prototype) &&
      !(prototype === null && !array)
    )
      invalid()
    const descriptors = Object.getOwnPropertyDescriptors(item)
    if (Object.values(descriptors).some((descriptor) => !('value' in descriptor))) invalid()
    if (
      array &&
      (Object.keys(item).length !== item.length ||
        Object.keys(item).some((key) => !/^\d+$/.test(key)))
    )
      invalid()
    visiting.add(item)
    for (const [key, descriptor] of Object.entries(descriptors))
      if (descriptor.enumerable) {
        if (key.length > 128) invalid()
        walk(descriptor.value, depth + 1)
      }
    visiting.delete(item)
  }
  walk(value, 0)
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > PRESENTATION_MAX_BYTES) invalid()
}
function fields(
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
  const object = value as Record<string, unknown>
  if (
    required.some((key) => !Object.hasOwn(object, key)) ||
    Object.keys(object).some((key) => !required.includes(key) && !optional.includes(key))
  )
    invalid()
  return object
}
function integer(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) invalid()
}
function text(value: unknown, max = 160): asserts value is string {
  if (
    typeof value !== 'string' ||
    value.length < 1 ||
    value.length > max ||
    [...value].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    invalid()
}
function identity(value: unknown): asserts value is string {
  text(value)
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) ||
    value.split('/').some((part) => !part || part === '.' || part === '..')
  )
    invalid()
}
function themeId(value: unknown): asserts value is string {
  text(value)
  if (
    !kinds.some((kind) => value === 'frade.builtin/' + kind) &&
    !/^[a-z0-9][a-z0-9.-]*\.[a-z0-9][a-z0-9.-]*[/][a-z0-9][a-z0-9._-]*$/i.test(value)
  )
    invalid()
}
function owned<T>(value: unknown): T {
  const result: unknown = structuredClone(value)
  function freeze(item: unknown): void {
    if (item && typeof item === 'object') {
      for (const child of Object.values(item)) freeze(child)
      Object.freeze(item)
    }
  }
  freeze(result)
  return result as T
}
function choice(value: unknown): void {
  const object = fields(value, ['mode', 'density', 'preferred'])
  if (
    !['system', ...kinds].includes(String(object.mode)) ||
    !['compact', 'comfortable'].includes(String(object.density))
  )
    invalid()
  const preferred = fields(object.preferred, kinds)
  for (const kind of kinds) themeId(preferred[kind])
}
function persisted(value: unknown): void {
  const object = fields(value, ['version', 'revision', 'generation', 'transactionId', 'selection'])
  if (object.version !== 1) invalid()
  integer(object.revision)
  integer(object.generation)
  identity(object.transactionId)
  choice(object.selection)
}
function phase(value: unknown): void {
  const object = fields(value, [
    'version',
    'requestId',
    'sessionId',
    'generation',
    'transactionId',
    'revision',
    'membership',
    'phase',
  ])
  if (
    object.version !== 1 ||
    !['prepare', 'apply', 'rollback', 'join'].includes(String(object.phase))
  )
    invalid()
  for (const key of ['requestId', 'sessionId', 'transactionId']) identity(object[key])
  if (object.requestId !== object.transactionId) invalid()
  for (const key of ['generation', 'revision', 'membership']) integer(object[key])
}
export function presentationSystemColor(
  role: PresentationRole,
): 'Canvas' | 'CanvasText' | 'Highlight' | 'HighlightText' {
  if (
    [
      'action.primary',
      'action.primaryHover',
      'selection.bg',
      'selection.indicator',
      'focus.ring',
      'diagram.selection',
    ].includes(role)
  )
    return 'Highlight'
  if (role === 'action.onPrimary' || role === 'selection.fg') return 'HighlightText'
  return role.startsWith('surface.') || role.endsWith('Bg') || role === 'diagram.canvas'
    ? 'Canvas'
    : 'CanvasText'
}
function snapshot(value: unknown): void {
  const object = fields(value, [
    'id',
    'label',
    'kind',
    'density',
    'revision',
    'colors',
    'effectiveColors',
    'forcedColors',
    'status',
    'repairPasses',
    'issues',
    'compatibility',
  ])
  themeId(object.id)
  text(object.label)
  integer(object.revision)
  integer(object.repairPasses)
  if (
    !kinds.includes(object.kind as PresentationKind) ||
    !['compact', 'comfortable'].includes(String(object.density)) ||
    typeof object.forcedColors !== 'boolean' ||
    !['VALID', 'REPAIRED', 'FALLBACK'].includes(String(object.status)) ||
    (object.repairPasses as number) > 10
  )
    invalid()
  const colors = fields(object.colors, presentationRoles),
    effective = fields(object.effectiveColors, presentationRoles)
  for (const role of presentationRoles) {
    if (
      typeof colors[role] !== 'string' ||
      !/^#[0-9a-f]{6}$/i.test(colors[role] as string) ||
      effective[role] !== (object.forcedColors ? presentationSystemColor(role) : colors[role])
    )
      invalid()
  }
  if (!Array.isArray(object.issues) || object.issues.length > 128) invalid()
  for (const item of object.issues) {
    const diagnostic = fields(item, ['code', 'source', 'message'], ['role'])
    text(diagnostic.code)
    text(diagnostic.source)
    text(diagnostic.message, 512)
    if (Object.hasOwn(diagnostic, 'role')) text(diagnostic.role)
  }
  const compatibility = fields(object.compatibility, ['recognized', 'ignored', 'repaired'])
  for (const key of ['recognized', 'ignored', 'repaired']) {
    const values = compatibility[key]
    if (!Array.isArray(values) || values.length > 128 || new Set(values).size !== values.length)
      invalid()
    for (const role of values) {
      text(role)
      if (key !== 'ignored' && !roles.has(role)) invalid()
    }
  }
}
export function parsePresentationChoice(value: unknown): PresentationChoice {
  data(value)
  choice(value)
  return owned(value)
}
export function parsePresentationRecord(value: unknown): PresentationRecord {
  data(value)
  persisted(value)
  return owned(value)
}
export function parsePresentationPhase(value: unknown): PresentationPhase {
  data(value)
  phase(value)
  return owned(value)
}
export function parsePresentationSnapshot(value: unknown): PresentationSnapshot {
  data(value)
  snapshot(value)
  return owned(value)
}
export function parsePresentationBoot(value: unknown): PresentationBoot {
  data(value)
  const object = fields(value, [
    'version',
    'sessionId',
    'bootRevision',
    'snapshot',
    'durable',
    'diagnostics',
  ])
  if (object.version !== 1) invalid()
  identity(object.sessionId)
  integer(object.bootRevision)
  snapshot(object.snapshot)
  persisted(object.durable)
  const snap = object.snapshot as PresentationSnapshot,
    durable = object.durable as PresentationRecord
  if (
    snap.revision !== object.bootRevision ||
    snap.density !== durable.selection.density ||
    (durable.selection.mode !== 'system' && snap.kind !== durable.selection.mode)
  )
    invalid()
  if (!Array.isArray(object.diagnostics) || object.diagnostics.length > 128) invalid()
  for (const diagnostic of object.diagnostics) text(diagnostic, 512)
  return owned(value)
}
export function parsePresentationRequest(value: unknown): PresentationRequest {
  data(value)
  const object = fields(value, ['version', 'sessionId', 'requestId', 'operation', 'payload'])
  if (object.version !== 1) invalid()
  identity(object.sessionId)
  identity(object.requestId)
  switch (object.operation) {
    case 'intent':
      fields(object.payload, [])
      break
    case 'persist': {
      const payload = fields(object.payload, ['context', 'selection', 'expectedRevision'])
      phase(payload.context)
      choice(payload.selection)
      integer(payload.expectedRevision)
      const context = payload.context as PresentationPhase
      if (
        context.sessionId !== object.sessionId ||
        context.requestId !== object.requestId ||
        context.phase !== 'apply'
      )
        invalid()
      break
    }
    case 'reconcile': {
      const payload = fields(object.payload, ['context', 'lastPublished'])
      phase(payload.context)
      persisted(payload.lastPublished)
      const context = payload.context as PresentationPhase
      if (
        context.sessionId !== object.sessionId ||
        context.requestId !== object.requestId ||
        context.phase !== 'rollback'
      )
        invalid()
      break
    }
    case 'ready': {
      const payload = fields(object.payload, ['bootRevision', 'rootRevision'])
      integer(payload.bootRevision)
      integer(payload.rootRevision)
      if (payload.bootRevision !== payload.rootRevision) invalid()
      break
    }
    default:
      invalid()
  }
  return owned(value)
}

export type PresentationOutcome =
  | { readonly status: 'ACK'; readonly durable: PresentationRecord }
  | { readonly status: 'REFUSED' | 'UNKNOWN'; readonly message: string }
export interface PresentationApi {
  getBoot(): PresentationBoot
  announceIntent(requestId: string): Promise<{ readonly generation: number }>
  persist(
    context: PresentationPhase,
    selection: PresentationChoice,
    expectedRevision: number,
  ): Promise<PresentationOutcome>
  reconcile(
    context: PresentationPhase,
    lastPublished: PresentationRecord,
  ): Promise<PresentationRecord>
  ready(bootRevision: number, rootRevision: number): Promise<void>
}
export type PresentationResponse =
  | { readonly generation: number }
  | PresentationOutcome
  | PresentationRecord
  | { readonly version: 1; readonly ready: true }
function sameChoice(a: PresentationChoice, b: PresentationChoice): boolean {
  return (
    a.mode === b.mode &&
    a.density === b.density &&
    kinds.every((kind) => a.preferred[kind] === b.preferred[kind])
  )
}
export function parsePresentationResponse(
  value: unknown,
  requestInput: PresentationRequest,
): PresentationResponse {
  const request = parsePresentationRequest(requestInput)
  data(value)
  switch (request.operation) {
    case 'intent': {
      const response = fields(value, ['generation'])
      integer(response.generation)
      if (response.generation === 0) invalid()
      break
    }
    case 'persist': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) invalid()
      const status = (value as Record<string, unknown>).status
      if (status === 'ACK') {
        const response = fields(value, ['status', 'durable'])
        persisted(response.durable)
        const durable = response.durable as PresentationRecord,
          context = request.payload.context
        if (
          durable.revision <= request.payload.expectedRevision ||
          durable.generation !== context.generation ||
          durable.transactionId !== context.transactionId ||
          !sameChoice(durable.selection, request.payload.selection)
        )
          invalid()
      } else if (status === 'REFUSED' || status === 'UNKNOWN') {
        const response = fields(value, ['status', 'message'])
        text(response.message, 512)
      } else invalid()
      break
    }
    case 'reconcile': {
      persisted(value)
      const durable = value as PresentationRecord,
        published = request.payload.lastPublished,
        context = request.payload.context
      if (
        !sameChoice(durable.selection, published.selection) ||
        durable.revision < published.revision
      )
        invalid()
      if (durable.revision === published.revision) {
        if (
          durable.generation !== published.generation ||
          durable.transactionId !== published.transactionId
        )
          invalid()
      } else if (
        durable.generation !== context.generation ||
        durable.transactionId !== context.transactionId
      )
        invalid()
      break
    }
    case 'ready': {
      const response = fields(value, ['version', 'ready'])
      if (response.version !== 1 || response.ready !== true) invalid()
    }
  }
  return owned(value)
}
