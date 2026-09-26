import {
  copyJson,
  canonicalJson,
  fields,
  record,
  nonblank,
  isReference,
  decodeObject,
  decodeRelation,
  failure,
  success,
  fieldValue,
  entityKey,
  type Result,
  type Entity,
  type EntityKind,
  type ObjectRef,
  type RelationRef,
  type RepositoryObject,
  type RepositoryRelation,
  type JsonValue,
} from '@frade/repository-domain'
import type { RepositoryEvent } from '@frade/repository-ports'
export type BindingState = 'UNBOUND' | 'BOUND' | 'STALE' | 'UNRESOLVED' | 'DETACHED' | 'CONFLICTED'
export interface DiagramBinding {
  readonly elementId: string
  readonly kind: EntityKind
  readonly state: BindingState
  readonly ref: ObjectRef | RelationRef
  readonly snapshot?: Entity
  readonly overrides: Readonly<Record<string, JsonValue>>
  readonly geometry?: Readonly<Record<string, JsonValue>>
}
export interface RepositoryReader {
  getObject(ref: unknown): Promise<Result<RepositoryObject>>
  getRelation(ref: unknown): Promise<Result<RepositoryRelation>>
  subscribe(listener: (event: RepositoryEvent) => void): () => void
}
const clone = <T>(value: T): T => {
  const result = copyJson(value)
  if (!result.ok) throw Error('Invalid binding data')
  return result.value as T
}
export class RepositoryBridge {
  constructor(private readonly repository: RepositoryReader) {}
  private async resolve(kind: EntityKind, ref: ObjectRef | RelationRef): Promise<Result<Entity>> {
    const input = copyJson(ref)
    if (!input.ok || !isReference(input.value, kind)) return failure('MALFORMED_REFERENCE')
    try {
      const result = await (kind === 'object'
        ? this.repository.getObject(input.value)
        : this.repository.getRelation(input.value))
      if (!result.ok) return result
      const decoded = kind === 'object' ? decodeObject(result.value) : decodeRelation(result.value)
      if (!decoded.ok || entityKey(kind, decoded.value.ref) !== entityKey(kind, input.value))
        return failure('ADAPTER_CONTRACT')
      return decoded
    } catch {
      return failure('REPOSITORY_UNAVAILABLE')
    }
  }
  async bindObject(elementId: string, ref: ObjectRef) {
    return this.bind('object', elementId, ref)
  }
  async bindRelation(elementId: string, ref: RelationRef) {
    return this.bind('relation', elementId, ref)
  }
  private async bind(
    kind: EntityKind,
    elementId: string,
    ref: ObjectRef | RelationRef,
  ): Promise<Result<DiagramBinding>> {
    if (!elementId.trim()) return failure('INVALID_INPUT')
    const result = await this.resolve(kind, ref)
    if (!result.ok) return result
    return success(
      clone({
        elementId,
        kind,
        state: 'BOUND',
        ref,
        snapshot: result.value,
        overrides: {},
      } as DiagramBinding),
    )
  }
  detach<T extends DiagramBinding>(binding: T): T {
    return { ...clone(binding), state: 'DETACHED' }
  }
  async reconnect(binding: DiagramBinding): Promise<Result<DiagramBinding>> {
    const copied = clone(binding),
      result = await this.resolve(binding.kind, binding.ref)
    if (!result.ok) {
      if (
        ['ENTITY_NOT_FOUND', 'REPOSITORY_UNAVAILABLE', 'SESSION_CLOSED'].includes(result.error.code)
      )
        return success({ ...copied, state: 'UNRESOLVED' })
      return result
    }
    const decoded =
      binding.kind === 'object' ? decodeObject(result.value) : decodeRelation(result.value)
    if (!decoded.ok) return failure('ADAPTER_CONTRACT')
    const sameRevision = copied.snapshot?.revision === decoded.value.revision
    const sameContent =
      copied.snapshot &&
      canonicalJson(copied.snapshot as unknown as JsonValue) ===
        canonicalJson(decoded.value as unknown as JsonValue)
    return success({
      ...copied,
      state: sameRevision ? (sameContent ? 'BOUND' : 'CONFLICTED') : 'STALE',
    })
  }
  async reconcile(binding: DiagramBinding): Promise<Result<DiagramBinding>> {
    const result = await this.resolve(binding.kind, binding.ref)
    if (!result.ok) return result
    return success({ ...clone(binding), snapshot: clone(result.value), state: 'BOUND' })
  }
  subscribe(listener: (event: RepositoryEvent) => void) {
    return this.repository.subscribe(listener)
  }
  watchBinding(
    binding: DiagramBinding,
    rules: Readonly<Record<string, VisualAttributeRule>>,
    listener: (view: BindingView) => void,
  ): BindingController {
    return new BindingController(this, binding, rules, listener)
  }
}
export interface BindingView {
  readonly binding: DiagramBinding
  readonly style: Readonly<Record<string, JsonValue>>
}
/** Owns only presentation state. UNBOUND retains an advisory cached ref for explicit reconnect. */
export class BindingController {
  private binding: DiagramBinding
  private readonly rules: Readonly<Record<string, VisualAttributeRule>>
  private generation = 0
  private closed = false
  private readonly unsubscribe: () => void
  constructor(
    private readonly bridge: RepositoryBridge,
    binding: DiagramBinding,
    rules: Readonly<Record<string, VisualAttributeRule>>,
    private readonly listener: (view: BindingView) => void,
  ) {
    this.binding = clone(binding)
    this.rules = clone(rules)
    this.unsubscribe = bridge.subscribe((event) => {
      if (
        this.closed ||
        ['DETACHED', 'UNBOUND'].includes(this.binding.state) ||
        event.repositoryId !== this.binding.ref.repositoryId
      )
        return
      if (
        event.ref &&
        entityKey(this.binding.kind, event.ref) !== entityKey(this.binding.kind, this.binding.ref)
      )
        return
      void this.refresh(true)
    })
  }
  current(): BindingView {
    return {
      binding: clone(this.binding),
      style: resolveVisualAttributes(this.binding, this.rules),
    }
  }
  private publish() {
    if (!this.closed)
      try {
        this.listener(this.current())
      } catch {
        /* presentation subscriber cannot affect domain state */
      }
  }
  private async refresh(accept: boolean): Promise<Result<DiagramBinding>> {
    if (this.closed) return failure('SESSION_CLOSED')
    const generation = ++this.generation
    const result = await (accept
      ? this.bridge.reconcile(this.binding)
      : this.bridge.reconnect(this.binding))
    if (this.closed || generation !== this.generation) return failure('CANCELLED')
    if (result.ok) this.binding = result.value
    else if (
      ['ENTITY_NOT_FOUND', 'REPOSITORY_UNAVAILABLE', 'SESSION_CLOSED'].includes(result.error.code)
    )
      this.binding = { ...this.binding, state: 'UNRESOLVED' }
    else this.binding = { ...this.binding, state: 'CONFLICTED' }
    this.publish()
    return result.ok ? success(clone(this.binding)) : result
  }
  detach() {
    if (this.closed) return
    this.generation++
    this.binding = this.bridge.detach(this.binding)
    this.publish()
  }
  unbind() {
    if (this.closed) return
    this.generation++
    this.binding = { ...this.binding, state: 'UNBOUND' }
    this.publish()
  }
  reconnect() {
    return this.refresh(false)
  }
  reconcile() {
    return this.refresh(true)
  }
  setVisual(
    overrides: Readonly<Record<string, JsonValue>>,
    geometry?: Readonly<Record<string, JsonValue>>,
  ) {
    if (this.closed) return failure('SESSION_CLOSED')
    this.binding = {
      ...this.binding,
      overrides: clone(overrides),
      ...(geometry ? { geometry: clone(geometry) } : {}),
    }
    this.publish()
    return success(true)
  }
  close() {
    if (this.closed) return
    this.closed = true
    this.generation++
    this.unsubscribe()
  }
}
export interface DiagramCodec<D> {
  serialize(diagram: D): string
  deserialize(text: string): D
}
export interface RepositoryDiagram<D> {
  readonly format: 'frade-repository-diagram'
  readonly version: 1
  readonly diagram: D
  readonly bindings: readonly DiagramBinding[]
}
export function decodeRepositoryDiagram<D>(
  text: string,
  codec: DiagramCodec<D>,
): Result<RepositoryDiagram<D>> {
  if (text.length > 16000000) return failure('RESOURCE_LIMIT')
  try {
    const safe = copyJson(JSON.parse(text))
    if (!safe.ok) return safe
    const value = safe.value
    if (
      !fields(value, ['format', 'version', 'diagram', 'bindings']) ||
      value.format !== 'frade-repository-diagram' ||
      value.version !== 1
    )
      return failure('SCHEMA_INCOMPATIBLE')
    if (!Array.isArray(value.bindings)) return failure('INVALID_INPUT')
    const seen = new Set<string>()
    for (const binding of value.bindings) {
      if (
        !fields(
          binding,
          ['elementId', 'kind', 'state', 'ref', 'overrides'],
          ['snapshot', 'geometry'],
        ) ||
        !nonblank(binding.elementId) ||
        seen.has(binding.elementId) ||
        !['object', 'relation'].includes(String(binding.kind)) ||
        !['UNBOUND', 'BOUND', 'STALE', 'UNRESOLVED', 'DETACHED', 'CONFLICTED'].includes(
          String(binding.state),
        ) ||
        !isReference(binding.ref, binding.kind as EntityKind) ||
        !record(binding.overrides) ||
        (binding.geometry !== undefined && !record(binding.geometry))
      )
        return failure('INVALID_INPUT')
      seen.add(binding.elementId)
      if (
        binding.snapshot !== undefined &&
        !(
          binding.kind === 'object'
            ? decodeObject(binding.snapshot)
            : decodeRelation(binding.snapshot)
        ).ok
      )
        return failure('INVALID_INPUT')
      if (
        binding.snapshot !== undefined &&
        entityKey(binding.kind as EntityKind, (binding.snapshot as unknown as Entity).ref) !==
          entityKey(binding.kind as EntityKind, binding.ref as ObjectRef | RelationRef)
      )
        return failure('INVALID_INPUT')
    }
    const diagram = codec.deserialize(JSON.stringify(value.diagram))
    return success({
      format: 'frade-repository-diagram',
      version: 1,
      diagram,
      bindings: value.bindings as unknown as DiagramBinding[],
    })
  } catch {
    return failure('INVALID_INPUT')
  }
}
export function encodeRepositoryDiagram<D>(
  diagram: D,
  bindings: readonly DiagramBinding[],
  codec: DiagramCodec<D>,
): Result<string> {
  try {
    const copied = copyJson(diagram)
    if (!copied.ok) return copied
    const encoded = JSON.stringify({
      format: 'frade-repository-diagram',
      version: 1,
      diagram: JSON.parse(codec.serialize(copied.value as D)),
      bindings: clone(bindings),
    })
    const checked = decodeRepositoryDiagram(encoded, codec)
    return checked.ok ? success(encoded) : checked
  } catch {
    return failure('INVALID_INPUT')
  }
}
export interface VisualAttributeRule {
  readonly attribute: string
  readonly values: Readonly<Record<string, JsonValue>>
}
export function resolveVisualAttributes(
  binding: {
    readonly snapshot?: { readonly attributes: Readonly<Record<string, JsonValue>> }
    readonly overrides: Readonly<Record<string, JsonValue>>
  },
  rules: Readonly<Record<string, VisualAttributeRule>>,
): Readonly<Record<string, JsonValue>> {
  const computed: Record<string, JsonValue> = {}
  for (const [property, rule] of Object.entries(rules)) {
    const value = fieldValue(binding.snapshot?.attributes, rule.attribute)
    if (typeof value === 'string' && Object.hasOwn(rule.values, value))
      computed[property] = rule.values[value]
  }
  return clone({ ...computed, ...binding.overrides })
}
