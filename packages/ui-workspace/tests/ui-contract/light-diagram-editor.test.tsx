// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { createNativeParticipant } from '../../src/design/theme/nativeParticipant'
import type { NativePresentationGraph } from '../../src/design/theme/nativeParticipant'
import { applyRootSnapshot } from '../../src/design/theme/rootParticipant'
import { createApplicationThemeRegistry, BUILTIN_IDS } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'
import { builtinTokens } from '../../src/design/generated/tokens'
import { referenceTheme } from '../../src/design/reference/vscode-dark-2026/generated'
import type { PhaseContext } from '../../src/design/theme/service'
import type { Density, ThemeMode } from '../../src/design/theme/types'

const phase = (revision: number, stage: PhaseContext['phase'] = 'apply'): PhaseContext => ({
  version: 1,
  requestId: 'window-lde/intent-1',
  sessionId: 'window-lde',
  generation: 1,
  transactionId: 'window-lde/intent-1',
  revision,
  membership: 1,
  phase: stage,
})
const choices = [
  'light',
  'dark',
  'high-contrast',
  'system-light',
  'system-dark',
  'reference',
] as const
function value(
  choice: (typeof choices)[number],
  density: Density,
  forcedColors: boolean,
  revision = 7,
) {
  const mode: ThemeMode =
    choice === 'reference'
      ? 'dark'
      : choice.startsWith('system-')
        ? 'system'
        : (choice as ThemeMode)
  return resolveTheme({
    registry: createApplicationThemeRegistry(),
    selection: {
      mode,
      density,
      preferred: { ...BUILTIN_IDS, ...(choice === 'reference' ? { dark: referenceTheme.id } : {}) },
    },
    environment: { colorScheme: choice === 'system-dark' ? 'dark' : 'light', forcedColors },
    revision,
  })
}
function gate() {
  let resolve!: () => void
  const promise = new Promise<void>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}
function fixture() {
  const app = document.createElement('main'),
    editor = document.createElement('section'),
    canvas = document.createElement('div')
  const authored = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  authored.setAttribute('fill', '#C14F71')
  authored.setAttribute('stroke', '#207D63')
  authored.setAttribute('opacity', '0.65')
  authored.setAttribute('d', 'M 10 10 L 30 40')
  canvas.append(authored)
  editor.append(canvas)
  app.append(editor)
  document.body.append(app)
  editor.setAttribute('data-editor-identity', 'retained')
  editor.style.setProperty('--unrelated-owner', 'kept')
  const model = Object.freeze({
    document: '<authored fill="rose" opacity="0.65"/>',
    dirty: true,
    undo: ['user-edit'],
    selection: ['node-1'],
  })
  const forbidden = vi.fn(() => {
    throw Error('Presentation must not enter model APIs')
  })
  const graph = {
    container: canvas,
    options: {
      background: { color: 'original-canvas' },
      grid: {
        size: 10,
        visible: true,
        type: 'dot',
        args: { color: 'original-grid', thickness: 1.2 },
      },
    },
    drawBackground: vi.fn((background: { color: string }) => {
      graph.options.background = background
      return graph
    }),
    drawGrid: vi.fn((grid: Partial<typeof graph.options.grid>) => {
      Object.assign(graph.options.grid, grid)
      return graph
    }),
    loadDocument: forbidden,
    fromJSON: forbidden,
    setCellStyles: forbidden,
    modelBeginUpdate: forbidden,
  }
  return { app, editor, canvas, authored, graph, model, forbidden }
}
afterEach(() => {
  document.body.replaceChildren()
})

for (const choice of choices)
  for (const density of ['compact', 'comfortable'] as const)
    for (const forcedColors of [false, true]) {
      it(`LDE-001 LDE-006 native scope under ${choice}/${density}/forced=${forcedColors} preserves the app and authored state`, async () => {
        const f = fixture(),
          input = value(choice, density, forcedColors),
          beforeInput = JSON.stringify(input),
          beforeModel = JSON.stringify(f.model)
        applyRootSnapshot(f.app, input)
        const appStyle = f.app.style.cssText,
          appMetadata = JSON.stringify(f.app.dataset),
          author = f.authored.outerHTML,
          wait = gate()
        // Structural options permit baseline execution: the old adapter simply ignores editorRoot.
        const options = {
          id: 'native/lde',
          generation: 4,
          editorRoot: f.editor,
          paint: () => wait.promise,
        }
        const participant = createNativeParticipant(
          f.graph as unknown as NativePresentationGraph,
          options,
        )
        const beforePrepare = f.editor.outerHTML
        const handle = await participant.prepare(
          input,
          phase(7, 'prepare'),
          new AbortController().signal,
        )
        expect(f.editor.outerHTML).toBe(beforePrepare)
        expect(f.graph.drawBackground).not.toHaveBeenCalled()
        expect(f.graph.drawGrid).not.toHaveBeenCalled()
        let acknowledged = false
        const applying = handle.apply(phase(7), new AbortController().signal).then((ack) => {
          acknowledged = true
          return ack
        })
        await Promise.resolve()
        expect(acknowledged).toBe(false)
        wait.resolve()
        const ack = await applying
        expect(ack).toEqual({
          ...phase(7),
          participantId: 'native/lde',
          participantGeneration: 4,
          painted: true,
        })
        expect(f.graph.options.background.color).toBe(forcedColors ? 'Canvas' : '#F9FAFC')
        expect(f.graph.options.grid.args.color).toBe(forcedColors ? 'CanvasText' : '#CDD3DC')
        expect(f.editor.dataset.fradeTheme).toBe('light')
        expect(f.editor.dataset.fradeDensity).toBe(density)
        expect(f.editor.dataset.fradeRevision).toBe('7')
        expect(f.editor.style.getPropertyValue('--frade-text-primary')).toBe(
          forcedColors ? 'CanvasText' : builtinTokens.themes.light['text.primary'],
        )
        expect(f.editor.style.getPropertyValue('--unrelated-owner')).toBe('kept')
        expect(f.graph.options.grid.size).toBe(10)
        expect(f.graph.options.grid.visible).toBe(true)
        expect(f.authored.outerHTML).toBe(author)
        expect(f.canvas.firstChild).toBe(f.authored)
        expect(JSON.stringify(f.model)).toBe(beforeModel)
        expect(f.forbidden).not.toHaveBeenCalled()
        expect(f.app.style.cssText).toBe(appStyle)
        expect(JSON.stringify(f.app.dataset)).toBe(appMetadata)
        expect(JSON.stringify(input)).toBe(beforeInput)
        handle.dispose()
        participant.dispose()
      })
    }

it('LDE-006 LDE-007 native forced-colors round trip and rollback retain author/settings/revision ownership', async () => {
  const f = fixture(),
    options = { editorRoot: f.editor, paint: async () => {} }
  const participant = createNativeParticipant(
    f.graph as unknown as NativePresentationGraph,
    options,
  )
  const before = JSON.stringify(f.model),
    off = value('reference', 'comfortable', false, 6),
    on = value('reference', 'comfortable', true, 7)
  const handle = await participant.prepare(on, phase(7, 'prepare'), new AbortController().signal)
  await handle.apply(phase(7), new AbortController().signal)
  expect(f.graph.options.background.color).toBe('Canvas')
  await handle.rollback(off, phase(6, 'rollback'), new AbortController().signal)
  expect(f.graph.options.background.color).toBe('#F9FAFC')
  expect(f.graph.options.grid.args.color).toBe('#CDD3DC')
  expect(f.editor.dataset.fradeTheme).toBe('light')
  expect(f.editor.dataset.fradeRevision).toBe('6')
  expect(f.editor.dataset.fradeDensity).toBe('comfortable')
  expect(off.kind).toBe('dark')
  expect(off.id).toBe(referenceTheme.id)
  expect(on.forcedColors).toBe(true)
  expect(JSON.stringify(f.model)).toBe(before)
  expect(f.forbidden).not.toHaveBeenCalled()
  handle.dispose()
  participant.dispose()
})
it('LDE-007 stale/aborted editor handle cannot paint either root or canvas', async () => {
  const f = fixture(),
    options = { editorRoot: f.editor, paint: async () => {} }
  const participant = createNativeParticipant(
      f.graph as unknown as NativePresentationGraph,
      options,
    ),
    abort = new AbortController()
  const handle = await participant.prepare(
      value('dark', 'compact', false),
      phase(7, 'prepare'),
      abort.signal,
    ),
    before = f.editor.outerHTML
  await expect(
    handle.apply({ ...phase(7), membership: 9 }, new AbortController().signal),
  ).rejects.toThrow()
  expect(f.editor.outerHTML).toBe(before)
  expect(f.graph.drawGrid).not.toHaveBeenCalled()
  abort.abort()
  await expect(handle.apply(phase(7), new AbortController().signal)).rejects.toThrow()
  expect(f.editor.outerHTML).toBe(before)
  expect(f.graph.drawBackground).not.toHaveBeenCalled()
  handle.dispose()
  participant.dispose()
})
it('LDE-003 disposal restores owned root projections and preserves a later unrelated style owner', async () => {
  const f = fixture(),
    editorBefore = f.editor.outerHTML,
    canvasStyle = f.canvas.style.cssText
  const participant = createNativeParticipant(f.graph as unknown as NativePresentationGraph, {
    ...{ editorRoot: f.editor },
    paint: async () => {},
  })
  const handle = await participant.prepare(
    value('dark', 'compact', false),
    phase(7, 'prepare'),
    new AbortController().signal,
  )
  await handle.apply(phase(7), new AbortController().signal)
  f.editor.style.setProperty('--frade-focus-ring', 'later-owner')
  handle.dispose()
  participant.dispose()
  expect(f.editor.style.getPropertyValue('--frade-focus-ring')).toBe('later-owner')
  f.editor.style.removeProperty('--frade-focus-ring')
  expect(f.editor.outerHTML).toBe(editorBefore)
  expect(f.canvas.style.cssText).toBe(canvasStyle)
})
it('LDE-007 covered native join is paintable before ACK and retains reveal/disposal ownership', async () => {
  const f = fixture(),
    wait = gate(),
    options = { editorRoot: f.editor, paint: () => wait.promise }
  f.editor.style.visibility = 'visible'
  f.canvas.style.visibility = 'visible'
  const participant = createNativeParticipant(
    f.graph as unknown as NativePresentationGraph,
    options,
  )
  expect(participant.requiresPaintCover).toBe(true)
  participant.hide()
  expect(f.editor.style.visibility).toBe('hidden')
  expect(f.canvas.style.visibility).toBe('hidden')
  const handle = await participant.prepare(
    value('dark', 'compact', false),
    phase(7, 'join'),
    new AbortController().signal,
  )
  expect(f.editor.style.visibility).toBe('hidden')
  let painted = false
  const applying = handle.apply(phase(7, 'join'), new AbortController().signal).then(() => {
    painted = true
  })
  await Promise.resolve()
  expect(f.editor.style.visibility).toBe('visible')
  expect(f.canvas.style.visibility).toBe('visible')
  expect(painted).toBe(false)
  wait.resolve()
  await applying
  participant.reveal()
  handle.dispose()
  participant.dispose()
  expect(f.editor.style.visibility).toBe('visible')
  expect(f.canvas.style.visibility).toBe('visible')
})

it('LDE-007 invalid covered handle cannot reveal its parent before refusal', async () => {
  const f = fixture(),
    paint = vi.fn(async () => {}),
    options = { editorRoot: f.editor, paint }
  const participant = createNativeParticipant(
      f.graph as unknown as NativePresentationGraph,
      options,
    ),
    abort = new AbortController()
  participant.hide()
  const handle = await participant.prepare(
    value('dark', 'compact', false),
    phase(7, 'prepare'),
    abort.signal,
  )
  const before = f.editor.outerHTML
  abort.abort()
  await expect(handle.apply(phase(7), new AbortController().signal)).rejects.toThrow()
  expect(f.editor.outerHTML).toBe(before)
  expect(paint).not.toHaveBeenCalled()
  expect(f.graph.drawBackground).not.toHaveBeenCalled()
  handle.dispose()
  participant.dispose()
})

import { createEditorPresentationParticipant } from '../../src/design/theme/editorPresentationParticipant'
import type { PreparedPresentation, PresentationParticipant } from '../../src/design/theme/service'
it('LDE-003 late prepare after owner disposal is rejected and its acquired handle is disposed', async () => {
  const root = document.createElement('section')
  let ready!: (value: PreparedPresentation) => void
  const delay = new Promise<PreparedPresentation>((resolve) => {
    ready = resolve
  })
  const child = { apply: vi.fn(), rollback: vi.fn(), dispose: vi.fn() }
  const delegate: PresentationParticipant & { dispose(): void } = {
    id: 'frame/late',
    generation: 1,
    hide() {},
    reveal() {},
    prepare: async () => delay,
    dispose: vi.fn(),
  }
  const participant = createEditorPresentationParticipant(root, delegate, { paint: async () => {} })
  const pending = participant.prepare(
    value('dark', 'compact', false),
    phase(7, 'prepare'),
    new AbortController().signal,
  )
  await Promise.resolve()
  participant.dispose()
  ready(child)
  await expect(pending).rejects.toThrow()
  expect(child.dispose).toHaveBeenCalledTimes(1)
  expect(child.apply).not.toHaveBeenCalled()
  expect(child.rollback).not.toHaveBeenCalled()
})
