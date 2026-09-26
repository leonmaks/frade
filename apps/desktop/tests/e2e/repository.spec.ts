import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { createNativeRepository, createPagedNativeRepository } from '@frade/adapter-yaml'
async function* empty() {
  yield* []
}
for (const format of ['native-v1', 'native-v2'] as const) {
  // eslint-disable-next-line no-empty-pattern
  test(`repository IPC ${format}: host-selected files and authorized commands through sandboxed preload`, async ({}) => {
    const root = await mkdtemp(join(tmpdir(), 'frade-ipc-'))
    const created =
      format === 'native-v1'
        ? await createNativeRepository(root, { repositoryId: 'R', displayName: 'IPC fixture' })
        : await createPagedNativeRepository(root, {
            repositoryId: 'R',
            displayName: 'IPC fixture',
            objects: empty(),
            relations: empty(),
          })
    if (format === 'native-v2') expect(created).toMatchObject({ ok: true })
    const app = await electron.launch({ args: [resolve('out/main/index.cjs')] })
    try {
      const page = await app.firstWindow()
      await expect(page.getByRole('status')).toHaveText('Backend: ready')
      await app.evaluate(({ dialog }, path) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
      }, root)
      expect(await page.evaluate(() => (window as any).fradeRepository.open())).toMatchObject({
        ok: true,
        value: { repositoryId: 'R', state: 'READY' },
      })
      const result = await page.evaluate(() =>
        (window as any).fradeRepository.request({
          version: 1,
          operation: 'applyChanges',
          payload: {
            changeSet: {
              repositoryId: 'R',
              idempotencyKey: 'ipc-create',
              commands: [
                {
                  op: 'createObject',
                  object: {
                    ref: { repositoryId: 'R', objectId: 'A' },
                    typeId: 'sample:ApplicationSystem',
                    name: 'IPC object',
                    attributes: { status: 'created' },
                  },
                },
              ],
            },
          },
        }),
      )
      expect(result).toMatchObject({ ok: true })
      if (format === 'native-v1') {
        expect(await readFile(join(root, 'repository.yaml'), 'utf8')).toContain('IPC object')
      } else {
        const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'))
        expect(manifest.pages).toHaveLength(1)
        const persisted = JSON.parse(
          await readFile(join(root, 'pages', manifest.pages[0].hash + '.jsonl'), 'utf8'),
        )
        expect(persisted).toMatchObject({
          kind: 'object',
          entity: {
            name: 'IPC object',
            ref: { repositoryId: 'R', objectId: 'A' },
          },
        })
      }
      expect(
        await page.evaluate(() =>
          (window as any).fradeRepository.request({ operation: 'fs.read', path: 'C:/secret' }),
        ),
      ).toMatchObject({ ok: false })
      expect(
        await page.evaluate(() => ({
          require: typeof (window as any).require,
          ipc: typeof (window as any).fradeRepository.ipcRenderer,
        })),
      ).toEqual({ require: 'undefined', ipc: 'undefined' })
    } finally {
      await app.close()
      await rm(root, { recursive: true, force: true })
    }
  })
}
