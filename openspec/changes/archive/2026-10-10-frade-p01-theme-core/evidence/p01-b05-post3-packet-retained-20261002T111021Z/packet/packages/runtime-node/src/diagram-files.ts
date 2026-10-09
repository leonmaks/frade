import { createHash, randomUUID } from 'node:crypto'
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  unlink,
  realpath,
  link,
} from 'node:fs/promises'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'
import { deserializeDocument } from '@frade/draw/document'
import { SaxesParser } from 'saxes'
import {
  failure,
  success,
  type JsonValue,
  type Result,
  type ErrorCode,
} from '@frade/repository-domain'

export const EMPTY_DIAGRAM =
  '<mxfile host="Frade"><diagram id="page-1" name="Page-1"><mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel></diagram></mxfile>'
const limit = 4 * 1024 * 1024
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const fail = (code: string): never => {
  throw new Error(code)
}
export function diagramParts(path: string): string[] {
  const parts = path.split('/')
  if (
    parts[0] !== '_diagrams' ||
    parts.length > 32 ||
    parts.some(
      (p) =>
        !p ||
        p === '.' ||
        p === '..' ||
        /[\\:<>"|?*]/.test(p) ||
        [...p].some((c) => c.charCodeAt(0) < 32) ||
        /[. ]$/.test(p) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p) ||
        p.startsWith('.frade-'),
    )
  )
    fail('INVALID_PATH')
  return parts
}
export function validateDiagram(xml: string, modelOnly = false) {
  if (Buffer.byteLength(xml) > limit || /<!DOCTYPE/i.test(xml)) fail('INVALID_DIAGRAM')
  let root = '',
    depth = 0,
    pages = 0,
    model = 0,
    text = '',
    embedded = false,
    expanded = 0
  const parser = new SaxesParser({ xmlns: false })
  parser.on('opentag', (t) => {
    if (!depth++) root = t.name
    if (depth > 128 || (modelOnly && root !== 'mxGraphModel')) fail('INVALID_DIAGRAM')
    if (t.name === 'diagram') {
      if (++pages > 100) fail('INVALID_DIAGRAM')
      text = ''
      embedded = false
    }
    if (t.name === 'mxGraphModel') {
      model++
      embedded = true
    }
  })
  parser.on('text', (value) => {
    if (depth === 2 && root === 'mxfile') text += value
  })
  parser.on('closetag', (t) => {
    if (t.name === 'diagram' && !embedded) {
      if (!text.trim()) fail('INVALID_DIAGRAM')
      const decoded = decodeURIComponent(
        inflateRawSync(Buffer.from(text.trim(), 'base64'), {
          maxOutputLength: 16 * 1024 * 1024,
        }).toString('utf8'),
      )
      expanded += Buffer.byteLength(decoded)
      if (expanded > 16 * 1024 * 1024) fail('INVALID_DIAGRAM')
      validateDiagram(decoded, true)
    }
    depth--
  })
  try {
    parser.write(xml).close()
  } catch {
    fail('INVALID_DIAGRAM')
  }
  if ((root !== 'mxfile' && root !== 'mxGraphModel') || (root === 'mxfile' ? !pages : !model))
    fail('INVALID_DIAGRAM')
}
export class DiagramFiles {
  private tail: Promise<unknown> = Promise.resolve()
  constructor(
    private root: string,
    private readOnly = false,
  ) {}
  private async path(entry: string, parents = false) {
    const parts = diagramParts(entry)
    let path = await realpath(this.root)
    for (let i = 0; i < parts.length; i++) {
      path = join(path, parts[i])
      try {
        const stat = await lstat(path)
        if (stat.isSymbolicLink() || (i < parts.length - 1 && !stat.isDirectory()))
          fail('INVALID_PATH')
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
        if (parents && i < parts.length - 1) await mkdir(path)
      }
    }
    return path
  }
  private async read(entry: string) {
    const path = await this.path(entry),
      stat = await lstat(path)
    if (!stat.isFile() || stat.size > limit) fail('INVALID_DIAGRAM')
    const xml = await readFile(path, 'utf8')
    if (entry.toLowerCase().endsWith('.frade')) deserializeDocument(xml)
    else validateDiagram(xml)
    return { path: entry, xml, revision: hash(xml) }
  }
  execute(payload: Readonly<Record<string, JsonValue>>): Promise<Result<unknown>> {
    const run = this.tail
      .then(() => this.perform(payload))
      .catch((e) =>
        failure(
          e instanceof Error &&
            [
              'INVALID_PATH',
              'INVALID_DIAGRAM',
              'REVISION_CONFLICT',
              'REPOSITORY_READ_ONLY',
              'LIMIT_EXCEEDED',
            ].includes(e.message)
            ? (e.message as ErrorCode)
            : (e as NodeJS.ErrnoException).code === 'ENOENT'
              ? 'ENTITY_NOT_FOUND'
              : (e as NodeJS.ErrnoException).code === 'EEXIST'
                ? 'ALREADY_EXISTS'
                : 'REPOSITORY_UNAVAILABLE',
        ),
      )
    this.tail = run
    return run
  }
  private async perform(p: Readonly<Record<string, JsonValue>>): Promise<Result<unknown>> {
    const action = String(p.action),
      entry = typeof p.path === 'string' ? p.path : '_diagrams'
    if (action === 'list') {
      const entries: { path: string; kind: 'file' | 'folder' }[] = []
      const visit = async (folder: string) => {
        const path = await this.path(folder)
        let children
        try {
          children = await readdir(path, { withFileTypes: true })
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code === 'ENOENT') return
          throw e
        }
        for (const child of children.sort((a, b) => a.name.localeCompare(b.name))) {
          if (child.isSymbolicLink() || child.name.startsWith('.frade-')) continue
          const path = folder + '/' + child.name
          diagramParts(path)
          if (entries.length >= 2000) fail('LIMIT_EXCEEDED')
          if (child.isDirectory()) {
            entries.push({ path, kind: 'folder' })
            await visit(path)
          } else if (child.isFile()) entries.push({ path, kind: 'file' })
        }
      }
      await visit('_diagrams')
      return success({ entries })
    }
    if (action === 'read') return success(await this.read(entry))
    if (this.readOnly) fail('REPOSITORY_READ_ONLY')
    if (entry === '_diagrams' && action !== 'folder') fail('INVALID_PATH')
    if (action === 'folder') {
      await mkdir(await this.path(entry, true), { recursive: false })
      return success({ path: entry })
    }
    if (action === 'rename') {
      const source = await this.path(entry),
        destination = String(p.destination)
      if (entry.toLowerCase().endsWith('.frade') !== destination.toLowerCase().endsWith('.frade'))
        fail('INVALID_DIAGRAM')
      if (entry === destination) return success({ path: entry })
      const before = await this.read(entry)
      if (p.revision !== before.revision) fail('REVISION_CONFLICT')
      const target = await this.path(destination, true)
      // Hard-link creation is exclusive: renaming never overwrites an existing file.
      await link(source, target)
      try {
        await unlink(source)
      } catch (e) {
        await unlink(target)
        throw e
      }
      return success({ path: destination })
    }
    const xml =
      action === 'create'
        ? typeof p.xml === 'string'
          ? p.xml
          : entry.toLowerCase().endsWith('.frade')
            ? JSON.stringify({
                format: 'frade-draw',
                version: 1,
                metadata: { id: randomUUID(), name: entry.split('/').at(-1) },
                graph: { nodes: [], edges: [] },
              })
            : EMPTY_DIAGRAM
        : String(p.xml)
    if (Buffer.byteLength(xml) > limit) fail('INVALID_DIAGRAM')
    if (entry.toLowerCase().endsWith('.frade')) {
      try {
        deserializeDocument(xml)
      } catch {
        fail('INVALID_DIAGRAM')
      }
    } else validateDiagram(xml)
    const target = await this.path(entry, true)
    if (action === 'create') {
      const handle = await open(target, 'wx')
      try {
        await handle.writeFile(xml, 'utf8')
        await handle.sync()
      } finally {
        await handle.close()
      }
    } else if (action === 'write') {
      const before = await this.read(entry)
      if (before.revision !== p.revision) fail('REVISION_CONFLICT')
      if (before.xml === xml) return success(before)
      const stage = join(
        target.substring(0, target.lastIndexOf(process.platform === 'win32' ? '\\' : '/')),
        '.frade-' + randomUUID() + '.tmp',
      )
      try {
        const handle = await open(stage, 'wx')
        try {
          await handle.writeFile(xml, 'utf8')
          await handle.sync()
        } finally {
          await handle.close()
        }
        if ((await this.read(entry)).revision !== before.revision) fail('REVISION_CONFLICT')
        await rename(stage, target)
      } finally {
        await unlink(stage).catch(() => {})
      }
    } else fail('INVALID_PATH')
    return success({ path: entry, xml, revision: hash(xml) })
  }
}
