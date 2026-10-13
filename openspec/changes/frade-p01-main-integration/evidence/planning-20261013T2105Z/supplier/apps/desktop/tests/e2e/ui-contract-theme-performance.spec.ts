import { test, expect, _electron as electron } from '@playwright/test'
import { writeFile, readFile, mkdir, appendFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { cpus, platform, release, arch, totalmem } from 'node:os'
import { createKaFixture } from '../../../../scripts/ka-fixtures.mjs'
import type { ElectronApplication } from '@playwright/test'
// Fixture helper copied from apps/desktop/tests/e2e/ui-contract-theme.spec.ts, original SHA256 c15411ee7d42f16f1cd17d7517990f061f56be0632976fa3c814555caaa50737.
// Pin actual dataset and hardware before request timing; no production debug API.
async function diagramFixture(kind: 'native' | 'frame') {
  const fixture = await createKaFixture(),
    folder = join(fixture.dataRoot, '_diagrams')
  await mkdir(folder, { recursive: true })
  const name = kind === 'native' ? 'Workshop.frade' : 'Workshop.drawio'
  const authoredDocument =
    kind === 'native'
      ? JSON.stringify(
          {
            format: 'frade-draw',
            version: 1,
            metadata: { id: 'p01-authored', name: 'Workshop' },
            graph: {
              nodes: [
                {
                  id: 'authored',
                  shape: 'rect',
                  x: 140,
                  y: 120,
                  width: 180,
                  height: 80,
                  label: 'Authored paint',
                  style: { fill: '#77AADD', stroke: '#334455' },
                  labelStyle: { fill: '#112244' },
                },
              ],
              edges: [],
            },
            viewport: { zoom: 1, pan: { x: 0, y: 0 } },
          },
          null,
          2,
        )
      : '<mxfile><diagram id="main" name="Workshop"><mxGraphModel grid="1" gridSize="10" background="#F7E2C2" gridColor="#112233" page="1" pageWidth="700" pageHeight="500"><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="authored" value="Authored paint" style="rounded=0;fillColor=#77AADD;strokeColor=#334455;fontColor=#112244;" vertex="1" parent="1"><mxGeometry x="140" y="120" width="180" height="80" as="geometry"/></mxCell></root></mxGraphModel></diagram></mxfile>'
  const file = join(folder, name)
  await writeFile(file, authoredDocument)
  await writeFile(
    join(folder, 'Companion.frade'),
    JSON.stringify(
      {
        format: 'frade-draw',
        version: 1,
        metadata: { id: 'p01-bench-native', name: 'Companion' },
        graph: {
          nodes: [
            {
              id: 'authored',
              shape: 'rect',
              x: 140,
              y: 120,
              width: 180,
              height: 80,
              label: 'Authored paint',
              style: { fill: '#77AADD', stroke: '#334455' },
              labelStyle: { fill: '#112244' },
            },
          ],
          edges: [],
        },
        viewport: { zoom: 1, pan: { x: 0, y: 0 } },
      },
      null,
      2,
    ),
  )
  const app = await electron.launch({
    args: [resolve('out/main/index.cjs')],
    env: { ...process.env, FRADE_USER_DATA: join(fixture.destination, 'p01-' + kind + '-profile') },
  })
  const page = await app.firstWindow()
  await page.addInitScript(() => {
    const telemetry = ((window as any).__p01Telemetry = {
      messages: [] as unknown[],
      paints: [] as number[],
      visibility: [] as unknown[],
    })
    const tick = (now: number) => {
      if (telemetry.paints.length > 999) telemetry.paints.shift()
      telemetry.paints.push(now)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    document.addEventListener('visibilitychange', () =>
      telemetry.visibility.push({ time: performance.now(), state: document.visibilityState }),
    )
    window.addEventListener('message', (event) => {
      let data
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : undefined
      } catch {
        return
      }
      if (
        data?.action === 'fradePresentation' &&
        data.operation === 'prepare' &&
        data.snapshot?.kind === 'dark' &&
        (window as any).__p01RefuseDark
      ) {
        event.stopImmediatePropagation()
        parent.postMessage(
          JSON.stringify({
            event: 'fradePresentation',
            version: 1,
            participantId: data.participantId,
            participantGeneration: data.participantGeneration,
            context: data.context,
            operation: 'prepare',
            status: 'REFUSED',
            message: 'Controlled current frame refusal',
          }),
          'frade://app',
        )
      }
      if (data?.action === 'fradePresentation' || data?.event === 'fradePresentation')
        telemetry.messages.push({ time: performance.now(), data })
    })
    if (location.host !== 'drawio') return
    window.addEventListener('message', (event) => {
      let value
      try {
        value = typeof event.data === 'string' ? JSON.parse(event.data) : undefined
      } catch {
        return
      }
      const Editor = (window as any).EditorUi
      if (value?.action !== 'configure' || !Editor || Editor.prototype.init.__p01Capture) return
      const original = Editor.prototype.init
      const capture = function (this: any, ...args: unknown[]) {
        const result = original.apply(this, args)
        ;(window as any).__p01Ui = this
        return result
      }
      capture.__p01Capture = true
      Editor.prototype.init = capture
    })
  })
  await expect(page.locator('.wb-statusbar [role="status"]')).toHaveText('Backend: ready')
  await app.evaluate(
    ({ dialog }, paths) => {
      let index = 0
      dialog.showOpenDialog = (async () => ({
        canceled: false,
        filePaths: [paths[index++]],
      })) as typeof dialog.showOpenDialog
    },
    [fixture.dataRoot, fixture.metadataRoot],
  )
  await page.getByRole('button', { name: 'Открыть KA', exact: true }).click()
  await expect(page.locator('.status-message')).toContainText('138 объектов', { timeout: 30000 })
  const diagrams = page.getByRole('treeitem').filter({ hasText: /^_diagrams$/ })
  await diagrams.click()
  await page
    .getByRole('treeitem')
    .filter({ hasText: new RegExp('^' + name.replace('.', '\\.') + '$') })
    .dblclick()
  await expect(
    page
      .locator('.repository-diagram .editor-actions')
      .getByRole('button', { name: 'Сохранить', exact: true }),
  ).toBeEnabled({ timeout: 20000 })
  if (kind === 'frame') {
    await expect(page.locator('iframe')).toHaveAttribute(
      'data-frade-revision',
      (await page.locator('html').getAttribute('data-frade-revision')) as string,
    )
    await expect(page.locator('.frade-theme-commit-barrier')).toBeHidden()
    await expect(page.locator('iframe')).toBeVisible()
    await page
      .frameLocator('iframe')
      .locator('body')
      .evaluate(async () => {
        await document.fonts.ready
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        )
      })
    await expect(page.locator('.diagram-error')).toHaveCount(0)
  }
  return { fixture, app, page, file, name }
}
async function finishDiagramFixture(app: ElectronApplication) {
  // A deliberately blocked recovery must not leak this test's isolated Electron process.
  // Explicit window-close/dirty-guard scenarios use the normal close path separately.
  await app.evaluate(({ app }) => {
    setTimeout(() => app.exit(0), 50)
  })
  await app.close()
}

// eslint-disable-next-line no-empty-pattern
test('P01 pinned real root native frame hot commit: 20 warmups and 100 alternating requests p95 <=150ms', async ({}, info) => {
  test.setTimeout(360000)
  const hardwarePath = resolve(
      '../../openspec/changes/frade-p01-theme-core/evidence/p01-benchmark-hardware-20261001T003100Z.json',
    ),
    hardwareRaw = await readFile(hardwarePath),
    referenceHardware = JSON.parse(hardwareRaw.toString().replace(/^\uFEFF/, '')),
    liveCpus = cpus(),
    hardware = {
      timestampUtc: new Date().toISOString(),
      source: 'LIVE_LOCAL_NODE_OS_SAME_HOST_AS_LAUNCHED_ELECTRON',
      cpu: {
        Name: liveCpus[0]?.model,
        logicalProcessors: liveCpus.length,
        models: [...new Set(liveCpus.map((cpu) => cpu.model))],
      },
      os: { platform: platform(), release: release(), arch: arch() },
      totalMemoryBytes: totalmem(),
    },
    hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
  await writeFile(
    info.outputPath('actual-hardware-before-measurement.json'),
    JSON.stringify(hardware, null, 2),
  )
  expect(
    hardware.os.platform,
    'ENVIRONMENT: reference budget requires actual Windows hardware',
  ).toBe('win32')
  expect(
    hardware.cpu.Name,
    'ENVIRONMENT: current CPU must match the identified reference hardware',
  ).toBe(referenceHardware.cpu.Name)
  expect(hardware.cpu.Name).toContain('i9-9880H')
  expect(hardware.cpu.logicalProcessors).toBe(referenceHardware.cpu.NumberOfLogicalProcessors)
  const f = await diagramFixture('frame'),
    nativeFile = join(f.fixture.dataRoot, '_diagrams/Companion.frade')
  try {
    await f.page
      .getByRole('treeitem')
      .filter({ hasText: /^Companion[.]frade$/ })
      .dblclick()
    const root = f.page.locator('html'),
      native = f.page.locator('.frade-canvas .canvas')
    await expect(native).toHaveAttribute(
      'data-frade-revision',
      (await root.getAttribute('data-frade-revision')) as string,
    )
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    const nativeBefore = await readFile(nativeFile),
      frameBefore = await readFile(f.file),
      settings = join(f.fixture.destination, 'p01-frame-profile', 'presentation-settings.json')
    const pin = {
      pinnedAtUtc: new Date().toISOString(),
      hardwarePath,
      hardwareSha256: hash(hardwareRaw),
      referenceHardware,
      referenceHardwareSource: 'HISTORICAL_CALIBRATION_ONLY',
      hardware,
      actualHardwareSha256: hash(
        await readFile(info.outputPath('actual-hardware-before-measurement.json')),
      ),
      ka: {
        path: f.fixture.dataRoot,
        metadataPath: f.fixture.metadataRoot,
        objects: f.fixture.manifest.objects,
        counts: f.fixture.manifest.counts,
        files: f.fixture.manifest.files,
      },
      native: { path: nativeFile, nodes: 1, edges: 0, sha256: hash(nativeBefore) },
      frame: { path: f.file, vertices: 1, edges: 0, sha256: hash(frameBefore) },
      runtime: await f.app.evaluate(({ app }) => ({
        versions: process.versions,
        gpu: app.getGPUFeatureStatus(),
      })),
      window: await f.app.evaluate(({ BrowserWindow }) => {
        const w = BrowserWindow.getAllWindows()[0]
        return {
          visible: w.isVisible(),
          focused: w.isFocused(),
          backgroundThrottling: w.webContents.getBackgroundThrottling(),
        }
      }),
      mainVisibility: await f.page.evaluate(() => document.visibilityState),
      measurement:
        'Browser performance.now immediately before real Enter handler; complete only after successful picker dismissal, neutral curtain hidden and all root/native/frame exact revisions match, followed by durable record readback. Focus/dialog/package load excluded; only OS-owned chrome excluded from required participants.',
      warmups: 20,
      samples: 100,
      budgetMs: 150,
    }
    await writeFile(info.outputPath('dataset-hardware-pin.json'), JSON.stringify(pin, null, 2))
    expect(hardware.cpu.Name).toContain('i9-9880H')
    const samples: {
      index: number
      kind: string
      milliseconds: number
      durableRevision: number
      rootRevision: string | null
    }[] = []
    await f.page.evaluate(() => {
      const data = ((window as any).__p01BenchmarkAcks = [] as unknown[])
      window.addEventListener('message', (event) => {
        let message
        try {
          message = JSON.parse(event.data)
        } catch {
          return
        }
        if (message?.event === 'fradePresentation') {
          const curtain = document.querySelector<HTMLElement>('.frade-theme-commit-barrier')
          let opaqueWitness
          if (message.status === 'PAINTED' && curtain && !curtain.hidden) {
            const style = getComputedStyle(curtain),
              box = curtain.getBoundingClientRect()
            opaqueWitness = {
              opacity: style.opacity,
              backgroundColor: style.backgroundColor,
              box: box.toJSON(),
              width: innerWidth,
              height: innerHeight,
              covered: [
                [8, 8],
                [innerWidth - 8, 8],
                [8, innerHeight - 8],
                [innerWidth - 8, innerHeight - 8],
                [innerWidth / 2, innerHeight / 2],
              ].every(([x, y]) => curtain.contains(document.elementFromPoint(x, y))),
            }
          }
          data.push({ time: performance.now(), message, opaqueWitness })
        }
      })
    })
    for (let index = 0; index < 120; index++) {
      const kind = index % 2 === 0 ? 'dark' : 'light',
        label = kind === 'dark' ? 'Dark' : 'Light'
      expect(await root.getAttribute('data-frade-theme')).not.toBe(kind)
      await f.page.getByRole('button', { name: 'Меню Файл' }).click()
      await f.page.getByRole('menuitem', { name: 'Выбрать тему…' }).click()
      const option = f.page.getByRole('option', { name: new RegExp(label) })
      await option.focus()
      await expect(option).toHaveAttribute('tabindex', '0')
      const milliseconds = await option.evaluate(
        (button) =>
          new Promise<number>((resolve, reject) => {
            const timer = setTimeout(() => {
              observer.disconnect()
              reject(Error('Measured request did not reach durable publication'))
            }, 5000)
            const observer = new MutationObserver(() => {
              const root = document.documentElement,
                curtain = document.querySelector<HTMLElement>('.frade-theme-commit-barrier'),
                native = document.querySelector<HTMLElement>('.frade-canvas .canvas'),
                frame = document.querySelector<HTMLIFrameElement>('iframe'),
                revision = root.dataset.fradeRevision
              if (
                !document.querySelector('[aria-label="Выбор темы"]') &&
                curtain?.hidden &&
                native?.dataset.fradeRevision === revision &&
                frame?.dataset.fradeRevision === revision
              ) {
                clearTimeout(timer)
                observer.disconnect()
                resolve(performance.now() - start)
              }
            })
            observer.observe(document.body, {
              subtree: true,
              attributes: true,
              childList: true,
              characterData: true,
            })
            const start = performance.now()
            button.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
            )
          }),
      )
      await expect(root).toHaveAttribute('data-frade-theme', kind)
      const record = JSON.parse(await readFile(settings, 'utf8'))
      expect(record.selection.mode).toBe(kind)
      expect(record.revision).toBe(index + 1)
      const frameAcks = await f.page.evaluate(
        (id) =>
          (window as any).__p01BenchmarkAcks.filter(
            (item: any) => item.message.context.requestId === id,
          ),
        record.transactionId,
      )
      const witness = frameAcks.find(
        (item: any) =>
          item.message.operation === 'apply' &&
          item.message.status === 'PAINTED' &&
          item.opaqueWitness,
      )?.opaqueWitness
      expect(witness).toBeTruthy()
      expect(witness.opacity).toBe('1')
      expect(witness.backgroundColor).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
      expect(witness.box).toMatchObject({
        x: 0,
        y: 0,
        width: witness.width,
        height: witness.height,
      })
      expect(witness.covered).toBe(true)
      await appendFile(
        info.outputPath('all-observations.ndjson'),
        JSON.stringify({
          index,
          warmup: index < 20,
          kind,
          milliseconds,
          durableRevision: record.revision,
          frameAcks,
        }) + '\n',
      )
      if (index >= 20)
        samples.push({
          index: index - 20,
          kind,
          milliseconds,
          durableRevision: record.revision,
          rootRevision: await root.getAttribute('data-frade-revision'),
        })
    }
    expect(samples).toHaveLength(100)
    const values = samples.map((sample) => sample.milliseconds).sort((a, b) => a - b),
      p95 = values[Math.ceil(0.95 * values.length) - 1]
    const report = {
      measuredAtUtc: new Date().toISOString(),
      pinSha256: hash(Buffer.from(JSON.stringify(pin, null, 2))),
      samples,
      nearestRank: 95,
      p95Ms: p95,
      budgetMs: 150,
      status: p95 <= 150 ? 'PASS' : 'FAIL',
    }
    await writeFile(info.outputPath('performance-result.json'), JSON.stringify(report, null, 2))
    expect(hash(await readFile(nativeFile))).toBe(hash(nativeBefore))
    expect(hash(await readFile(f.file))).toBe(hash(frameBefore))
    expect(p95).toBeLessThanOrEqual(150)
  } finally {
    await finishDiagramFixture(f.app)
  }
})

// Diagnostic observations cannot satisfy the required 20+100 performance gate above.
// eslint-disable-next-line no-empty-pattern
test('P01-diagnostic actual parked viewport and frame scheduling', async ({}, info) => {
  test.setTimeout(90000)
  const f = await diagramFixture('frame')
  try {
    await f.page
      .getByRole('treeitem')
      .filter({ hasText: /^Companion[.]frade$/ })
      .dblclick()
    await expect(f.page.locator('.frade-canvas .canvas')).toBeVisible()
    await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    const variant = process.env.FRADE_P01_DIAGNOSTIC_COVER ?? 'opaque'
    if (variant === 'translucent')
      await f.page.addStyleTag({
        content: '.frade-theme-commit-barrier { opacity: .999 !important; }',
      })
    if (variant === 'backdrop')
      await f.page.addStyleTag({
        content: '.frade-theme-commit-barrier { backdrop-filter: blur(1px); }',
      })
    await f.page.evaluate(() => {
      const values = ((window as any).__p01Geometry = [] as unknown[])
      window.addEventListener('message', (event) => {
        let data
        try {
          data = JSON.parse(event.data)
        } catch {
          return
        }
        if (data?.event !== 'fradePresentation') return
        const frame = document.querySelector('iframe')!
        const ancestors = []
        for (let node: Element | null = frame; node; node = node.parentElement) {
          const style = getComputedStyle(node),
            box = node.getBoundingClientRect()
          ancestors.push({
            tag: node.tagName,
            class: node.className,
            hidden: node.hasAttribute('hidden'),
            inert: node.hasAttribute('inert'),
            box: box.toJSON(),
            display: style.display,
            visibility: style.visibility,
            position: style.position,
            overflow: style.overflow,
            transform: style.transform,
            contentVisibility: style.contentVisibility,
          })
        }
        values.push({
          time: performance.timeOrigin + performance.now(),
          data,
          viewport: { width: innerWidth, height: innerHeight },
          ancestors,
        })
      })
    })
    await f.page
      .frameLocator('iframe')
      .locator('body')
      .evaluate(() => {
        const commands = ((window as any).__p01FrameCommands = [] as unknown[])
        window.addEventListener(
          'message',
          (event) => {
            let data
            try {
              data = JSON.parse(event.data)
            } catch {
              return
            }
            if (data?.action !== 'fradePresentation') return
            commands.push({
              time: performance.timeOrigin + performance.now(),
              operation: data.operation,
              context: data.context,
              visibility: document.visibilityState,
              viewport: { width: innerWidth, height: innerHeight },
              rootBox: document.documentElement.getBoundingClientRect().toJSON(),
            })
          },
          true,
        )
      })
    for (let index = 0; index < 8; index++) {
      const kind = index % 2 === 0 ? 'dark' : 'light'
      await f.page.getByRole('button', { name: 'Меню Файл' }).click()
      await f.page.getByRole('menuitem', { name: 'Выбрать тему…' }).click()
      const option = f.page.getByRole('option', {
        name: new RegExp(kind === 'dark' ? 'Dark' : 'Light'),
      })
      await option.focus()
      await expect(option).toHaveAttribute('tabindex', '0')
      await option.press('Enter')
      await expect(f.page.getByRole('dialog', { name: 'Выбор темы' })).toHaveCount(0)
      await expect(f.page.locator('html')).toHaveAttribute('data-frade-theme', kind)
      await expect(f.page.locator('.frade-theme-commit-barrier')).toBeHidden()
    }
  } finally {
    const report = {
      classification: 'DIAGNOSTIC_ONLY_NOT_PERFORMANCE_PASS',
      variant: process.env.FRADE_P01_DIAGNOSTIC_COVER ?? 'opaque',
      geometry: await f.page.evaluate(() => (window as any).__p01Geometry),
      frame: await f.page
        .frameLocator('iframe')
        .locator('body')
        .evaluate(() => ({
          commands: (window as any).__p01FrameCommands,
          messages: (window as any).__p01Telemetry.messages,
          paints: (window as any).__p01Telemetry.paints,
          timeOrigin: performance.timeOrigin,
          visibility: document.visibilityState,
        })),
    }
    await writeFile(info.outputPath('viewport-scheduling.json'), JSON.stringify(report, null, 2))
    await finishDiagramFixture(f.app)
  }
})
