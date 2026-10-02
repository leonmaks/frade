import { open, realpath, lstat } from 'node:fs/promises'
import { resolve, relative, isAbsolute, sep } from 'node:path'
import { createHash } from 'node:crypto'
import { parseDocument, visit, isAlias, isNode, type Document } from 'yaml'
import { copyJson, record, type JsonValue, type ErrorCode } from '@frade/repository-domain'
import { resolveEntry } from '@frade/metamodel-config'
export const hash = (v: string | Buffer) => createHash('sha256').update(v).digest('hex')
export class SourceError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
  }
}
export function fail(code: ErrorCode, message: string): never {
  throw new SourceError(code, message)
}
export async function contained(root: string, entry: string): Promise<string> {
  const logical = resolveEntry(entry)
  const target = resolve(root, logical),
    actual = await realpath(target),
    rel = relative(root, actual)
  if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel))
    fail('ACCESS_DENIED', 'Path leaves the granted folder: ' + entry)
  // Reject symlink components as well as out-of-root resolution, including junctions.
  let current = root
  for (const part of relative(root, target).split(sep)) {
    current = resolve(current, part)
    if ((await lstat(current)).isSymbolicLink())
      fail('ACCESS_DENIED', 'Symbolic source path: ' + entry)
  }
  return target
}
export async function textFile(root: string, entry: string, max = 2_000_000): Promise<string> {
  const path = await contained(root, entry),
    handle = await open(path, 'r')
  try {
    const stat = await handle.stat()
    if (!stat.isFile() || stat.size > max) fail('RESOURCE_LIMIT', 'File size limit: ' + entry)
    const bytes = Buffer.alloc(stat.size + 1)
    let length = 0
    while (length < bytes.length) {
      const read = await handle.read(bytes, length, bytes.length - length, null)
      if (!read.bytesRead) break
      length += read.bytesRead
    }
    if (length !== stat.size || (await handle.stat()).size !== stat.size)
      fail('REVISION_CONFLICT', 'File changed while reading')
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
      bytes.subarray(0, length),
    )
    return text
  } finally {
    await handle.close()
  }
}
export interface SourceFile {
  readonly entry: string
  readonly text: string
  readonly digest: string
  readonly doc: Document
  readonly value: Record<string, JsonValue>
  readonly preservable: boolean
}
export function parseFile(entry: string, text: string): SourceFile {
  const doc = parseDocument(text, { uniqueKeys: true, strict: true, keepSourceTokens: true })
  if (doc.errors.length)
    fail('INVALID_INPUT', entry + ': ' + doc.errors.map((e) => e.message).join('; '))
  let value: unknown
  try {
    value = doc.toJS({ maxAliasCount: 100 })
  } catch {
    fail('RESOURCE_LIMIT', 'Alias expansion limit: ' + entry)
  }
  const safe = copyJson(value)
  if (!safe.ok || !record(safe.value)) fail('INVALID_INPUT', 'Expected safe mapping: ' + entry)
  let preservable = !doc.warnings.length
  visit(doc, {
    Node(_key, node) {
      if (isAlias(node) || (isNode(node) && (node.anchor || node.tag))) preservable = false
    },
  })
  return {
    entry,
    text,
    digest: hash(text),
    doc,
    value: safe.value as Record<string, JsonValue>,
    preservable,
  }
}
export async function loadGraph(
  root: string,
  entries: readonly string[],
): Promise<ReadonlyMap<string, SourceFile>> {
  const files = new Map<string, SourceFile>(),
    active = new Set<string>()
  let bytes = 0
  const load = async (entry: string, depth: number): Promise<void> => {
    if (active.has(entry)) fail('INVALID_INPUT', 'Import cycle at ' + entry)
    if (files.has(entry)) return
    if (depth > 64 || files.size >= 4096) fail('RESOURCE_LIMIT', 'Import graph limit')
    active.add(entry)
    const file = parseFile(entry, await textFile(root, entry))
    bytes += Buffer.byteLength(file.text)
    if (bytes > 32_000_000) fail('RESOURCE_LIMIT', 'Repository size limit')
    files.set(entry, file)
    const imports = file.value.imports ?? []
    if (!Array.isArray(imports) || imports.some((v) => typeof v !== 'string'))
      fail('INVALID_INPUT', 'Invalid imports: ' + entry)
    for (const item of imports) await load(resolveEntry(item as string, entry), depth + 1)
    active.delete(entry)
  }
  for (const entry of entries) await load(resolveEntry(entry), 0)
  return files
}
