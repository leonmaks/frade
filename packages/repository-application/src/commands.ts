import { validateAttributes, validateSnapshot, objectKey } from '@frade/metamodel-domain'
import {
  copyJson,
  checkDiagnosticRepair,
  decodeSnapshot,
  canonicalJson,
  decodeObject,
  decodeRelation,
  entityKey,
  failure,
  success,
  fields,
  nonblank,
  isReference,
  validationProjection,
  LIMITS,
  applyAttributePolicies,
  validatePolicyChanges,
  type Result,
  type Entity,
  type RepositorySnapshot,
  type Revision,
  type JsonValue,
  type Issue,
} from '@frade/repository-domain'
import type {
  ChangeSet,
  CommitRequest,
  RepositoryModel,
  EntityChange,
} from '@frade/repository-ports'
export function decodeChangeSet(input: unknown): Result<ChangeSet> {
  const copied = copyJson(input)
  if (!copied.ok) return copied
  const value = copied.value
  if (
    !fields(
      value,
      ['repositoryId', 'commands'],
      ['expectedRevision', 'idempotencyKey', 'requireAtomic'],
    ) ||
    !nonblank(value.repositoryId) ||
    !Array.isArray(value.commands) ||
    value.commands.length < 1 ||
    value.commands.length > LIMITS.batch ||
    (value.expectedRevision !== undefined && !nonblank(value.expectedRevision)) ||
    (value.idempotencyKey !== undefined && !nonblank(value.idempotencyKey)) ||
    (value.requireAtomic !== undefined && typeof value.requireAtomic !== 'boolean')
  )
    return failure('INVALID_INPUT')
  const seen = new Set<string>()
  for (const command of value.commands) {
    if (
      !fields(
        command,
        ['op'],
        ['object', 'relation', 'ref', 'expectedRevision', 'deletionPolicy'],
      ) ||
      ![
        'createObject',
        'updateObject',
        'deleteObject',
        'createRelation',
        'updateRelation',
        'deleteRelation',
      ].includes(String(command.op))
    )
      return failure('INVALID_INPUT')
    const kind = String(command.op).endsWith('Object') ? 'object' : 'relation',
      create = String(command.op).startsWith('create'),
      remove = String(command.op).startsWith('delete')
    if (
      (!create && !nonblank(command.expectedRevision)) ||
      (create && command.expectedRevision !== undefined)
    )
      return failure('INVALID_INPUT')
    let ref
    if (remove) {
      if (
        !fields(
          command,
          ['op', 'ref', 'expectedRevision'],
          kind === 'object' ? ['deletionPolicy'] : [],
        ) ||
        !isReference(command.ref, kind) ||
        (command.deletionPolicy !== undefined &&
          !['RESTRICT', 'CASCADE'].includes(String(command.deletionPolicy)))
      )
        return failure('INVALID_INPUT')
      ref = command.ref
    } else {
      if (!fields(command, create ? ['op', kind] : ['op', kind, 'expectedRevision']))
        return failure('INVALID_INPUT')
      const body = command[kind]
      if (
        !fields(
          body,
          kind === 'object'
            ? ['ref', 'typeId', 'name', 'attributes']
            : ['ref', 'typeId', 'source', 'target', 'attributes'],
        )
      )
        return failure('INVALID_INPUT')
      const decoded =
        kind === 'object'
          ? decodeObject({ ...body, revision: 'pending' })
          : decodeRelation({ ...body, revision: 'pending' })
      if (!decoded.ok) return decoded
      ref = decoded.value.ref
    }
    if (ref.repositoryId !== value.repositoryId) return failure('REPOSITORY_MISMATCH')
    const key = entityKey(kind, ref)
    if (seen.has(key)) return failure('INVALID_INPUT')
    seen.add(key)
  }
  return success(value as unknown as ChangeSet)
}
export function prepare(
  changeSet: ChangeSet,
  snapshot: RepositorySnapshot,
  model: RepositoryModel,
  operationId: string,
  allowCascade: boolean,
  pagedTargets?: Pick<ReadonlyMap<string, string>, 'get'>,
): Result<CommitRequest> {
  if (!snapshot.complete && !pagedTargets) return failure('INCOMPLETE_SNAPSHOT')
  if (snapshot.repositoryId !== changeSet.repositoryId) return failure('REPOSITORY_MISMATCH')
  if (
    snapshot.binding.modelId !== model.modelId ||
    snapshot.binding.modelVersion !== model.modelVersion ||
    snapshot.binding.fingerprint !== model.fingerprint
  )
    return failure('BINDING_MISMATCH')
  if (changeSet.expectedRevision !== undefined && changeSet.expectedRevision !== snapshot.revision)
    return failure('REVISION_CONFLICT')
  const objects = new Map(snapshot.objects.map((o) => [entityKey('object', o.ref), o])),
    relations = new Map(snapshot.relations.map((r) => [entityKey('relation', r.ref), r]))
  const changes: EntityChange[] = []
  for (const command of changeSet.commands) {
    const kind = command.op.endsWith('Object') ? 'object' : 'relation'
    const entity =
      'object' in command ? command.object : 'relation' in command ? command.relation : undefined
    const ref = entity?.ref ?? ('ref' in command ? command.ref : undefined)!
    const key = entityKey(kind, ref),
      map: Map<string, Entity> = kind === 'object' ? objects : relations,
      previous = map.get(key)
    const create = command.op.startsWith('create'),
      remove = command.op.startsWith('delete')
    if (
      create
        ? !!previous
        : !previous ||
          previous.revision !==
            ('expectedRevision' in command ? command.expectedRevision : undefined)
    )
      return failure('REVISION_CONFLICT')
    if (remove) {
      if (command.op === 'deleteObject' && command.deletionPolicy === 'CASCADE') {
        if (!allowCascade) return failure('ACCESS_DENIED')
        for (const [relationKey, relation] of relations)
          if (
            entityKey('object', relation.source) === key ||
            entityKey('object', relation.target) === key
          ) {
            relations.delete(relationKey)
            changes.push({ kind: 'relation', action: 'deleted', ref: relation.ref })
          }
      }
      map.delete(key)
      changes.push({ kind, action: 'deleted', ref })
    } else {
      const replacement = {
        ...entity!,
        revision: previous?.revision ?? ('pending' as Revision),
      } as Entity
      map.set(key, replacement)
      changes.push({ kind, action: create ? 'created' : 'updated', ref, entity: replacement })
    }
  }
  if (model.sourceValidation) {
    if (!snapshot.complete || pagedTargets) return failure('INCOMPLETE_SNAPSHOT')
    const raw: RepositorySnapshot = {
      ...snapshot,
      objects: [...objects.values()],
      relations: [...relations.values()],
    }
    const projected = model.sourceValidation.project(raw, snapshot)
    if (!projected.ok) return projected
    const decoded = decodeSnapshot(projected.value)
    if (!decoded.ok) return decoded
    const candidate = decoded.value
    if (
      candidate.repositoryId !== snapshot.repositoryId ||
      candidate.revision !== snapshot.revision ||
      canonicalJson(candidate.binding as unknown as JsonValue) !==
        canonicalJson(snapshot.binding as unknown as JsonValue)
    )
      return failure('ADAPTER_CONTRACT')
    const policy = validatePolicyChanges(model.policy, snapshot, candidate)
    if (!policy.ok) return policy
    const validation = checkDiagnosticRepair(
      model.sourceValidation.diagnostics(snapshot),
      model.sourceValidation.diagnostics(candidate),
      model.sourceValidation.mode,
    )
    if (!validation.ok) return validation
    const projectedChanges: EntityChange[] = []
    for (const kind of ['object', 'relation'] as const) {
      const before = kind === 'object' ? snapshot.objects : snapshot.relations
      const after = kind === 'object' ? candidate.objects : candidate.relations
      const old = new Map(before.map((e) => [entityKey(kind, e.ref), e]))
      for (const entity of after) {
        const key = entityKey(kind, entity.ref),
          previous = old.get(key)
        old.delete(key)
        if (
          !previous ||
          canonicalJson(previous as unknown as JsonValue) !==
            canonicalJson(entity as unknown as JsonValue)
        )
          projectedChanges.push({
            kind,
            action: previous ? 'updated' : 'created',
            ref: entity.ref,
            entity,
          })
      }
      for (const entity of old.values())
        projectedChanges.push({ kind, action: 'deleted', ref: entity.ref })
    }
    return success({
      operationId,
      expectedRevision: snapshot.revision,
      candidate,
      changes: projectedChanges,
    })
  }
  const analysis = model.analysis(),
    localTargets = new Map([...objects.values()].map((o) => [objectKey(o.ref), o.typeId])),
    deletedTargets = new Set(
      changes
        .filter((c) => c.kind === 'object' && c.action === 'deleted')
        .map((c) => objectKey(c.ref as (typeof snapshot.objects)[number]['ref'])),
    ),
    targets = {
      get: (key: string) =>
        deletedTargets.has(key) ? undefined : (localTargets.get(key) ?? pagedTargets?.get(key)),
    }
  const errors: Issue[] = []
  for (const change of changes) {
    if (!change.entity) continue
    const entity = change.entity,
      type =
        change.kind === 'object'
          ? analysis.objectTypes.get(entity.typeId)
          : analysis.relationTypes.get(entity.typeId)
    if (!type) continue
    const rule =
      change.kind === 'object'
        ? model.policy?.objectTypes[entity.typeId]
        : model.policy?.relationTypes[entity.typeId]
    const previous = (change.kind === 'object' ? snapshot.objects : snapshot.relations).find(
      (e) => entityKey(change.kind, e.ref) === entityKey(change.kind, entity.ref),
    )
    const policyResult = applyAttributePolicies(entity, previous, rule)
    if (!policyResult.ok) {
      errors.push(...policyResult.error.issues)
      continue
    }
    const attrs = validateAttributes(type.attributes, policyResult.value.attributes, {
      analysis,
      targets,
    })
    if (!attrs.ok) {
      errors.push(
        ...attrs.diagnostics.map((d) => ({
          code: d.code,
          message: d.message,
          path: ['attributes', ...d.path],
          ref: entity.ref,
        })),
      )
      continue
    }
    const materialized = { ...entity, attributes: attrs.value }
    if (change.kind === 'object' && 'lifecycle' in type && type.lifecycle) {
      const old = snapshot.objects.find(
          (o) => entityKey('object', o.ref) === entityKey('object', entity.ref),
        ),
        stateAttribute = rule?.lifecycleAttribute ?? 'status',
        next = attrs.value[stateAttribute],
        before = old?.attributes[stateAttribute] ?? type.lifecycle.initial
      if (
        next !== undefined &&
        (typeof next !== 'string' ||
          !type.lifecycle.states.includes(next) ||
          (old &&
            typeof before === 'string' &&
            type.lifecycle.states.includes(before) &&
            before !== next &&
            !type.lifecycle.transitions.some((t) => t.from === before && t.to === next)) ||
          (!old && next !== type.lifecycle.initial))
      )
        errors.push({
          code: 'LIFECYCLE',
          message: 'Lifecycle transition is not permitted',
          path: ['attributes', stateAttribute],
          ref: entity.ref,
        })
    }
    if (change.kind === 'object')
      objects.set(
        entityKey('object', entity.ref),
        materialized as (typeof snapshot.objects)[number],
      )
    else
      relations.set(
        entityKey('relation', entity.ref),
        materialized as (typeof snapshot.relations)[number],
      )
    ;(change as { entity: Entity }).entity = materialized
  }
  const candidate: RepositorySnapshot = {
    ...snapshot,
    objects: [...objects.values()],
    relations: [...relations.values()],
  }
  const validated = pagedTargets
    ? { ok: true as const }
    : validateSnapshot(analysis, validationProjection(candidate))
  const policyValidation = validatePolicyChanges(model.policy, snapshot, candidate)
  if (!policyValidation.ok) errors.push(...policyValidation.error.issues)
  if (!validated.ok)
    errors.push(
      ...validated.diagnostics.map((d) => ({
        code: d.code,
        message: d.message,
        path: d.path,
        ...(d.entityId ? { details: { entityKey: d.entityId } } : {}),
      })),
    )
  if (errors.length) return failure('VALIDATION_FAILED', errors)
  return success({ operationId, expectedRevision: snapshot.revision, candidate, changes })
}
export const commandSignature = (changeSet: ChangeSet) =>
  canonicalJson(changeSet as unknown as JsonValue)
