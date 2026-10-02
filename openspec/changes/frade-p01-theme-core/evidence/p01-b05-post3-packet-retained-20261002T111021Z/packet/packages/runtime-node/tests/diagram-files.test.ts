import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, writeFile, rm, mkdir, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deflateRawSync } from 'node:zlib'
import { DiagramFiles, EMPTY_DIAGRAM, validateDiagram } from '../src/diagram-files'
describe('repository diagram files', () => {
  let root: string, files: DiagramFiles
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'frade-diagrams-'))
    files = new DiagramFiles(root)
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })
  it('creates ordinary nested files, saves atomically and guards concurrent writes', async () => {
    expect(await files.execute({ action: 'list' })).toEqual({ ok: true, value: { entries: [] } })
    const path = '_diagrams/Проект 2026/Обзор.drawio'
    const created = await files.execute({ action: 'create', path })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const base = created.value as { revision: string }
    const xml = EMPTY_DIAGRAM.replace('Page-1', 'Edited')
    expect((await files.execute({ action: 'write', path, xml, revision: base.revision })).ok).toBe(
      true,
    )
    expect(await readFile(join(root, path), 'utf8')).toBe(xml)
    const conflict = await files.execute({
      action: 'write',
      path,
      xml: EMPTY_DIAGRAM,
      revision: base.revision,
    })
    expect(conflict.ok ? '' : conflict.error.code).toBe('REVISION_CONFLICT')
    expect(await readFile(join(root, path), 'utf8')).toBe(xml)
    expect((await files.execute({ action: 'create', path })).ok).toBe(false)
  })
  it('rejects escaping paths, symlinks, read-only writes and invalid XML', async () => {
    for (const path of [
      '../oops',
      '_diagrams/../oops',
      '_diagrams/C:/a',
      '_diagrams/a\\b',
      '_diagrams/CON.drawio',
    ])
      expect((await files.execute({ action: 'create', path })).ok).toBe(false)
    expect(
      (await new DiagramFiles(root, true).execute({ action: 'create', path: '_diagrams/a' })).ok,
    ).toBe(false)
    expect(
      (await files.execute({ action: 'create', path: '_diagrams/a', xml: '<not-a-diagram/>' })).ok,
    ).toBe(false)
    const outside = await mkdtemp(join(tmpdir(), 'frade-outside-'))
    try {
      await mkdir(join(root, '_diagrams'))
      await symlink(outside, join(root, '_diagrams', 'link'), 'junction')
      expect(
        (await files.execute({ action: 'create', path: '_diagrams/link/escape.drawio' })).ok,
      ).toBe(false)
    } finally {
      await rm(outside, { recursive: true, force: true })
    }
  })
  it('renames without overwriting and detects external disk edits', async () => {
    const path = '_diagrams/a.drawio',
      created = await files.execute({ action: 'create', path })
    if (!created.ok) throw Error('create failed')
    const revision = (created.value as { revision: string }).revision
    await files.execute({ action: 'create', path: '_diagrams/b.drawio' })
    expect(
      (await files.execute({ action: 'rename', path, destination: '_diagrams/b.drawio', revision }))
        .ok,
    ).toBe(false)
    expect(
      (await files.execute({ action: 'rename', path, destination: '_diagrams/new name', revision }))
        .ok,
    ).toBe(true)
    await writeFile(join(root, '_diagrams/new name'), EMPTY_DIAGRAM.replace('Page-1', 'External'))
    expect(
      (
        await files.execute({
          action: 'write',
          path: '_diagrams/new name',
          xml: EMPTY_DIAGRAM,
          revision,
        })
      ).ok,
    ).toBe(false)
  })
  it('stores .frade as JSON and refuses implicit format conversion', async () => {
    const path = '_diagrams/Native.frade',
      created = await files.execute({ action: 'create', path })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const doc = created.value as { xml: string; revision: string }
    expect(JSON.parse(doc.xml)).toMatchObject({ format: 'frade-draw', version: 1 })
    expect((await files.execute({ action: 'read', path })).ok).toBe(true)
    expect(
      (
        await files.execute({
          action: 'rename',
          path,
          destination: '_diagrams/Native.drawio',
          revision: doc.revision,
        })
      ).ok,
    ).toBe(false)
    expect(
      (await files.execute({ action: 'write', path, xml: EMPTY_DIAGRAM, revision: doc.revision }))
        .ok,
    ).toBe(false)
  })
  it('accepts native compressed multi-page XML and rejects entity declarations', () => {
    const model =
      '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>'
    const compressed = deflateRawSync(encodeURIComponent(model)).toString('base64')
    expect(() =>
      validateDiagram(
        `<mxfile><diagram id="one">${compressed}</diagram><diagram id="two">${model}</diagram></mxfile>`,
      ),
    ).not.toThrow()
    expect(() =>
      validateDiagram(
        '<!DOCTYPE mxfile [<!ENTITY x SYSTEM "file:///secret">]><mxfile>&x;</mxfile>',
      ),
    ).toThrow()
    expect(() =>
      validateDiagram('<mxfile><diagram>bad compressed data</diagram></mxfile>'),
    ).toThrow()
  })
})
