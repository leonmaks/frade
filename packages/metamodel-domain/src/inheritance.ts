import type {
  AttributeDefinition,
  Diagnostic,
  EffectiveObjectType,
  ModelAnalysis,
  Result,
  ValueSchema,
  Path,
} from './types'
import { decodeModel } from './definitions'
import { canonical, compare, diagnostic, result } from './diagnostics'
function semanticSchema(schema: ValueSchema): unknown {
  const common = { ...schema, nullable: schema.nullable ?? false }
  switch (schema.kind) {
    case 'object':
      return {
        ...common,
        fields: [...schema.fields].sort((a, b) => compare(a.id, b.id)).map(semanticField),
      }
    case 'list':
      return { ...common, items: semanticSchema(schema.items) }
    case 'enum':
      return { ...common, values: [...schema.values].sort(compare) }
    case 'reference':
      return {
        ...common,
        targets: { ...schema.targets, typeIds: [...schema.targets.typeIds].sort(compare) },
      }
    default:
      return common
  }
}
function semanticField(field: AttributeDefinition): unknown {
  return {
    ...field,
    required: field.required ?? false,
    schema: semanticSchema(field.schema),
    ui: { group: field.ui?.group, order: field.ui?.order },
  }
}
function lifecycleKey(v: EffectiveObjectType['lifecycle']) {
  if (!v) return ''
  return canonical({
    ...v,
    states: [...v.states].sort(compare),
    transitions: [...v.transitions].sort((a, b) => compare(canonical(a), canonical(b))),
  })
}
export function analyzeModel(input: unknown): Result<ModelAnalysis> {
  const decoded = decodeModel(input)
  if (!decoded.ok) return decoded
  const m = decoded.value,
    errors: Diagnostic[] = []
  const raw = new Map(m.objectTypes.map((t) => [t.id, t])),
    effective = new Map<string, EffectiveObjectType>()
  const failed = new Set<string>()
  const add = (id: string, path: Path, code: Diagnostic['code'], message: string) =>
    errors.push(diagnostic(code, path, message, id))
  for (const type of [...raw.values()].sort((a, b) => compare(a.id, b.id))) {
    if (effective.has(type.id) || failed.has(type.id)) continue
    const chain: string[] = [],
      seen = new Map<string, number>()
    let current: string | undefined = type.id
    while (current !== undefined && !effective.has(current) && !failed.has(current)) {
      const cycleIndex = seen.get(current)
      if (cycleIndex !== undefined) {
        for (const id of chain.slice(cycleIndex))
          add(id, ['extends'], 'INHERITANCE_CYCLE', 'Cyclic inheritance')
        chain.forEach((id) => failed.add(id))
        break
      }
      const node = raw.get(current)
      if (!node) {
        const id = chain.at(-1)!
        add(id, ['extends'], 'UNKNOWN_TYPE', 'Unknown parent ' + current)
        chain.forEach((id) => failed.add(id))
        break
      }
      seen.set(current, chain.length)
      chain.push(current)
      current = node.extends
    }
    if (current !== undefined && failed.has(current)) chain.forEach((id) => failed.add(id))
    while (chain.length) {
      const id = chain.pop()!
      if (failed.has(id)) continue
      const own = raw.get(id)!,
        parent = own.extends ? effective.get(own.extends) : undefined
      if (own.extends && !parent) {
        failed.add(id)
        continue
      }
      const fields = new Map(parent?.attributes.map((f) => [f.id, f]) ?? [])
      for (const field of own.attributes) {
        const inherited = fields.get(field.id)
        if (inherited && canonical(semanticField(inherited)) !== canonical(semanticField(field)))
          add(
            id,
            ['attributes', field.id],
            'CONFLICTING_OVERRIDE',
            'Inherited attribute semantics differ',
          )
        fields.set(field.id, field)
      }
      if (
        parent?.lifecycle &&
        own.lifecycle &&
        lifecycleKey(parent.lifecycle) !== lifecycleKey(own.lifecycle)
      )
        add(id, ['lifecycle'], 'CONFLICTING_OVERRIDE', 'Inherited lifecycle differs')
      const lifecycle = own.lifecycle ?? parent?.lifecycle
      effective.set(id, {
        ...own,
        abstract: own.abstract ?? false,
        ...((own.integrationFlow ?? parent?.integrationFlow)
          ? { integrationFlow: own.integrationFlow ?? parent?.integrationFlow }
          : {}),
        attributes: [...fields.values()].sort((a, b) => compare(a.id, b.id)),
        ancestors: parent ? [parent.id, ...parent.ancestors] : [],
        ...(lifecycle ? { lifecycle } : {}),
      })
    }
  }
  const typeReference = (id: string, p: Path, target: string) => {
    if (!raw.has(target)) add(id, p, 'UNKNOWN_TYPE', 'Unknown object type ' + target)
  }
  const scanSchema = (id: string, p: Path, s: ValueSchema) => {
    if (s.kind === 'reference')
      for (const target of s.targets.typeIds) typeReference(id, [...p, 'targets', target], target)
    if (s.kind === 'list') scanSchema(id, [...p, 'items'], s.items)
    if (s.kind === 'object')
      for (const f of s.fields) scanSchema(id, [...p, 'fields', f.id], f.schema)
  }
  for (const t of m.objectTypes)
    for (const f of t.attributes) scanSchema(t.id, ['attributes', f.id], f.schema)
  for (const t of effective.values())
    if (t.integrationFlow && t.attributes.length) {
      if (t.integrationFlow.status && !t.attributes.some((f) => f.id === t.integrationFlow?.status))
        add(
          t.id,
          ['integrationFlow', 'status'],
          'UNKNOWN_ATTRIBUTE',
          'Flow status must name an attribute',
        )
      for (const role of [t.integrationFlow.source, t.integrationFlow.consumer]) {
        const field = t.attributes.find((f) => f.id === role)
        if (!field)
          add(
            t.id,
            ['integrationFlow', role],
            'UNKNOWN_ATTRIBUTE',
            'Flow role must name an attribute',
          )
        else if (field.schema.kind !== 'reference')
          add(
            t.id,
            ['integrationFlow', role],
            'CONSTRAINT',
            'Flow endpoint role must be a reference',
          )
      }
    }
  const relations = new Map(m.relationTypes.map((r) => [r.id, r]))
  for (const r of m.relationTypes) {
    for (const end of ['source', 'target'] as const)
      for (const id of r[end].typeIds) typeReference(r.id, [end, id], id)
    for (const f of r.attributes) scanSchema(r.id, ['attributes', f.id], f.schema)
  }
  for (const selection of [...m.profiles, ...m.viewpoints]) {
    for (const id of selection.objectTypes) typeReference(selection.id, ['objectTypes', id], id)
    for (const id of selection.relationTypes)
      if (!relations.has(id))
        add(selection.id, ['relationTypes', id], 'UNKNOWN_TYPE', 'Unknown relation type ' + id)
  }
  for (const v of m.viewpoints)
    for (const item of v.presentation ?? [])
      if (!raw.has(item.typeId) && !relations.has(item.typeId))
        add(v.id, ['presentation', item.typeId], 'UNKNOWN_TYPE', 'Unknown presentation type')
  return result(
    {
      objectTypes: new Map([...effective].sort(([a], [b]) => compare(a, b))),
      relationTypes: new Map([...relations].sort(([a], [b]) => compare(a, b))),
    },
    errors,
  )
}
