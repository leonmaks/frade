import { objectKey, validateSnapshot } from '@frade/metamodel-domain'
import type { ObjectReference, RelationReference } from '@frade/metamodel-domain'
import type {
  CompiledModel,
  CompilerResult,
  ImpactItem,
  MigrationPreview,
  ModelImpact,
  PreviewContext,
  PreviewDiagnostic,
} from './types'
import {
  canonical,
  clone,
  compare,
  diagnostic,
  failure,
  freeze,
  inspect,
  Failure,
  success,
} from './common'
/** Strip schema presentation, never keys inside a user-supplied default value. */
function semantics(v: any, inDefault = false): any {
  if (Array.isArray(v)) return v.map((x) => semantics(x, inDefault))
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .filter(([k]) => inDefault || (k !== 'ui' && k !== 'presentation'))
        .map(([k, x]) => [k, semantics(x, inDefault || k === 'default')]),
    )
  return v
}
export function compareModels(old: CompiledModel, candidate: CompiledModel): ModelImpact {
  const changes: ImpactItem[] = []
  for (const [group, kind] of [
    ['objectTypes', 'object'],
    ['relationTypes', 'relation'],
    ['profiles', 'profile'],
    ['viewpoints', 'viewpoint'],
  ] as const) {
    const before = new Map<string, any>(old[group].map((t) => [t.id, t])),
      after = new Map<string, any>(candidate[group].map((t) => [t.id, t]))
    for (const id of [...new Set([...before.keys(), ...after.keys()])].sort(compare)) {
      const a = before.get(id),
        b = after.get(id)
      if (a && b && canonical(a) === canonical(b)) continue
      const classification =
        a && b && canonical(semantics(a)) === canonical(semantics(b))
          ? 'presentation'
          : kind === 'profile' || kind === 'viewpoint'
            ? 'projection'
            : 'review'
      changes.push({ kind, id, change: !a ? 'added' : !b ? 'removed' : 'changed', classification })
    }
  }
  if (canonical(old.lock) !== canonical(candidate.lock))
    changes.push({ kind: 'model', id: candidate.id, change: 'changed', classification: 'identity' })
  return freeze({ changes })
}
export function previewMigration(
  old: CompiledModel,
  candidate: CompiledModel,
  context?: PreviewContext,
): CompilerResult<MigrationPreview> {
  const impact = compareModels(old, candidate)
  if (context === undefined)
    return freeze(success({ impact, repositoryStatus: 'not-evaluated', diagnostics: [] }))
  try {
    const safe = inspect(context, 'preview').value
    const binding = safe.binding
    if (
      !binding ||
      binding.modelId !== old.id ||
      binding.modelVersion !== old.version ||
      binding.fingerprint !== old.fingerprint
    )
      return failure([diagnostic('BINDING_MISMATCH', 'preview')])
    const snapshot = safe.snapshot
    // Separate diagnostic identities for object/relation IDs that coincide.
    // Relation IDs are opaque to domain rules; the bijection preserves duplicate detection.
    const objectRefs = new Map<string, ObjectReference>(),
      relationRefs = new Map<string, RelationReference>()
    if (Array.isArray(snapshot?.objects))
      for (const obj of snapshot.objects)
        if (
          obj?.ref &&
          typeof obj.ref.repositoryId === 'string' &&
          typeof obj.ref.objectId === 'string'
        )
          objectRefs.set(objectKey(obj.ref), obj.ref)
    const aliases = new Map<string, string>()
    if (Array.isArray(snapshot?.relations))
      for (const rel of snapshot.relations) {
        if (
          !rel?.ref ||
          typeof rel.ref.repositoryId !== 'string' ||
          typeof rel.ref.relationId !== 'string'
        )
          continue
        const original = clone(rel.ref),
          originalKey = JSON.stringify([original.repositoryId, original.relationId])
        let alias = aliases.get(originalKey)
        if (alias === undefined) {
          let n = aliases.size
          do {
            alias = 'compiler-preview:' + n++
          } while (
            objectRefs.has(JSON.stringify([original.repositoryId, alias])) ||
            relationRefs.has(JSON.stringify([original.repositoryId, alias]))
          )
          aliases.set(originalKey, alias)
          relationRefs.set(JSON.stringify([original.repositoryId, alias]), original)
        }
        rel.ref = { repositoryId: original.repositoryId, relationId: alias }
      }
    const checked = validateSnapshot(candidate.analysis(), snapshot)
    const diagnostics: PreviewDiagnostic[] = checked.diagnostics.map((d) => {
      const rel = d.entityId ? relationRefs.get(d.entityId) : undefined,
        obj = d.entityId ? objectRefs.get(d.entityId) : undefined
      return {
        ...d,
        stage: 'preview',
        ...(rel
          ? { entityId: JSON.stringify([rel.repositoryId, rel.relationId]), relationRef: rel }
          : {}),
        ...(obj ? { objectRef: obj } : {}),
      }
    })
    return freeze(
      success({ impact, repositoryStatus: checked.ok ? 'valid' : 'invalid', diagnostics }),
    )
  } catch (error) {
    return failure(
      error instanceof Failure ? error.diagnostics : [diagnostic('INVALID_SOURCE', 'preview')],
    )
  }
}
