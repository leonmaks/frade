import { decodeModel } from '@frade/metamodel-domain'
import type { ModelImport } from '@frade/metamodel-domain'
import type { ModelSource, ModelLock } from './types'
import { fail, Failure, inspect, keys, LIMITS } from './common'
export function decodeSource(
  input: unknown,
  expected?: ModelImport,
): { source: ModelSource; count: number } {
  if (typeof input === 'string') {
    if (input.length > LIMITS.text) fail('RESOURCE_LIMIT', 'source', [], expected)
    try {
      input = JSON.parse(input)
    } catch {
      fail('INVALID_SOURCE', 'source', [], expected)
    }
  }
  const checked = inspect(input, 'source', expected),
    v = checked.value
  keys(v, ['sourceSchemaVersion', 'definition', 'extensions'], 'source', [], expected)
  if (v.sourceSchemaVersion !== 1)
    fail('UNSUPPORTED_VERSION', 'source', ['sourceSchemaVersion'], expected)
  const decoded = decodeModel(v.definition)
  if (!decoded.ok)
    throw new Failure(
      decoded.diagnostics.map((d) => ({
        ...d,
        stage: 'source' as const,
        ...(expected ? { modelId: expected.id, modelVersion: expected.version } : {}),
      })),
    )
  const identity = { id: decoded.value.id, version: decoded.value.version }
  const ext = v.extensions === undefined ? [] : v.extensions
  if (!Array.isArray(ext)) fail('INVALID_SOURCE', 'extensions', ['extensions'], identity)
  for (const [i, e] of ext.entries()) {
    const path = ['extensions', i]
    keys(e, ['targetKind', 'targetId', 'attributes'], 'extensions', path, identity)
    if (
      !['object', 'relation'].includes(e.targetKind) ||
      typeof e.targetId !== 'string' ||
      !Array.isArray(e.attributes)
    )
      fail('INVALID_SOURCE', 'extensions', path, identity)
    const sample = decodeModel({
      ...decoded.value,
      imports: [],
      objectTypes: [{ id: e.targetId, attributes: e.attributes }],
      relationTypes: [],
      profiles: [],
      viewpoints: [],
    })
    if (!sample.ok)
      throw new Failure(
        sample.diagnostics.map((d) => ({
          ...d,
          stage: 'extensions' as const,
          modelId: identity.id,
          modelVersion: identity.version,
          path: [...path, ...d.path],
        })),
      )
  }
  return {
    source: { sourceSchemaVersion: 1, definition: decoded.value, extensions: ext },
    count: checked.count,
  }
}
export function decodeLock(input: unknown): ModelLock {
  const v = inspect(input, 'lock').value
  keys(
    v,
    ['lockSchemaVersion', 'fingerprintFormatVersion', 'root', 'packages', 'fingerprint'],
    'lock',
  )
  if (v.lockSchemaVersion !== 1 || v.fingerprintFormatVersion !== 1)
    fail('UNSUPPORTED_VERSION', 'lock')
  keys(v.root, ['id', 'version'], 'lock', ['root'])
  if (!Array.isArray(v.packages) || v.packages.length > LIMITS.packages)
    fail('LOCK_MISMATCH', 'lock', ['packages'])
  const hash = (s: unknown) => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s)
  const identity = (i: any) => {
    const r = decodeModel({
      schemaVersion: 1,
      id: i.id,
      version: i.version,
      imports: [],
      objectTypes: [],
      relationTypes: [],
      profiles: [],
      viewpoints: [],
    })
    if (!r.ok) fail('LOCK_MISMATCH', 'lock')
  }
  identity(v.root)
  if (!hash(v.fingerprint)) fail('LOCK_MISMATCH', 'lock', ['fingerprint'])
  const ids = new Set<string>()
  for (const [index, p] of v.packages.entries()) {
    keys(p, ['id', 'version', 'contentHash'], 'lock', ['packages', index])
    identity(p)
    if (!hash(p.contentHash) || ids.has(p.id)) fail('LOCK_MISMATCH', 'lock', ['packages', index])
    ids.add(p.id)
  }
  return v as ModelLock
}
