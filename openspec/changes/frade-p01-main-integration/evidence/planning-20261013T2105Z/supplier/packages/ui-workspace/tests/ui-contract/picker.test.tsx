// @vitest-environment jsdom
import { useState } from 'react'
import { Workbench } from '../../src/Workbench'
import { ThemeControllerContext } from '../../src/design/theme/index'
import { it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup as reactCleanup } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { createThemeController } from '../../src/design/theme/index'
import { ThemePicker, PresentationSettings } from '../../src/design/theme/ThemePicker'
import { BUILTIN_IDS, createThemeRegistry } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'
import type { PresentationSelection } from '../../src/design/theme/types'
import type {
  DurablePresentation,
  PhaseContext,
  PersistenceOutcome,
} from '../../src/design/theme/service'
// No native document is mounted in these Workbench ownership examples. Actual native behavior belongs to Electron tests.
vi.mock('../../src/FradeDiagramView', () => ({ FradeDiagramView: () => null }))
const feature = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../../docs/ui/bdd/p01-theme-core.feature',
    ),
    'utf8',
  ),
  dispose: (() => void)[] = []
afterEach(() => {
  reactCleanup()
  for (const off of dispose.splice(0)) off()
})
function story(id: string, name: string, run: () => Promise<void>) {
  if (!feature.includes('@' + id + ' @component') || !feature.includes('Scenario: ' + name))
    throw Error('Missing approved component BDD example: ' + id)
  it(id + ' ' + name, run)
}
async function fixture(mode: 'picker' | 'settings' | 'workbench' = 'picker') {
  const root = document.createElement('div'),
    editor = document.createElement('textarea'),
    opener = document.createElement('button'),
    hostNode = document.createElement('div'),
    slot = document.createElement('div')
  root.className = 'ka-workbench'
  editor.value = 'dirty architectural note'
  opener.textContent = 'Presentation opener'
  hostNode.id = 'frade-overlay-host'
  hostNode.append(slot)
  root.append(editor, opener, mode === 'workbench' ? slot : hostNode)
  document.body.append(root)
  opener.focus()
  const selection: PresentationSelection = {
      mode: 'light',
      density: 'compact',
      preferred: { ...BUILTIN_IDS },
    },
    registry = createThemeRegistry()
  let generation = 0,
    durable: DurablePresentation = { revision: 0, generation: 0, transactionId: 'boot', selection }
  const host = {
    announceIntent: vi.fn(async () => ({ generation: ++generation })),
    persist: vi.fn(
      async (
        ctx: PhaseContext,
        choice: PresentationSelection,
        _expected: number,
      ): Promise<PersistenceOutcome> => {
        durable = {
          revision: durable.revision + 1,
          generation: ctx.generation,
          transactionId: ctx.transactionId,
          selection: choice,
        }
        return { status: 'ACK', durable }
      },
    ),
    reconcile: vi.fn(async (_ctx: PhaseContext, published: DurablePresentation) => {
      durable = published
      return published
    }),
  }
  const controller = createThemeController({
      sessionId: 'picker-window',
      root,
      initialSnapshot: resolveTheme({ registry, selection }),
      initialDurable: durable,
      host,
      registry,
      environment: { colorScheme: 'light' },
      paint: async () => {},
    }),
    overlays = mode === 'workbench' ? undefined : controller.mountHost(hostNode),
    closed = vi.fn(),
    openPicker = vi.fn()
  if (mode !== 'workbench') await controller.whenReady()
  let closeRequest = () => {}
  const approvedViews: string[] = []
  const client = {
    command: vi.fn(async (command: { operation: string }) => {
      if (command.operation === 'approveClose')
        approvedViews.push(root.dataset.fradeTheme ?? 'missing')
      return { ok: true as const, value: { roots: [] } }
    }),
    request: vi.fn(async () => ({ ok: true as const, value: {} })),
    subscribe: () => () => {},
    onCloseRequested: (listener: () => void) => {
      closeRequest = listener
      return () => {
        closeRequest = () => {}
      }
    },
  }
  function View() {
    const [open, setOpen] = useState(true),
      onClosed = () => {
        closed()
        setOpen(false)
      }
    if (mode === 'workbench')
      return (
        <ThemeControllerContext.Provider value={controller}>
          <Workbench client={client} health="ready" />
        </ThemeControllerContext.Provider>
      )
    return open ? (
      mode === 'picker' ? (
        <ThemePicker
          controller={controller}
          overlays={overlays!}
          opener={opener}
          onClosed={onClosed}
        />
      ) : (
        <PresentationSettings
          controller={controller}
          overlays={overlays!}
          opener={opener}
          onClosed={onClosed}
          onOpenPicker={openPicker}
        />
      )
    ) : null
  }
  render(<View />, { container: slot })
  const key = (event: KeyboardEvent) => {
    overlays?.handleKey(event)
  }
  window.addEventListener('keydown', key)
  dispose.push(() => {
    window.removeEventListener('keydown', key)
    controller.dispose()
    root.remove()
  })
  return {
    root,
    editor,
    opener,
    host,
    controller,
    overlays,
    closed,
    openPicker,
    client,
    approvedViews,
    closeRequest: () => closeRequest(),
  }
}
story(
  'P01-UI-001',
  'picker arrows preview and Enter persists only the selected candidate while dirty editor identity survives',
  async () => {
    const f = await fixture(),
      list = screen.getByRole('listbox', { name: 'Тема интерфейса' }),
      original = f.editor
    expect(screen.getAllByRole('option')).toHaveLength(4)
    expect(screen.getByRole('option', { name: /Light/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Dark/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /HC/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /System/ })).toBeTruthy()
    fireEvent.keyDown(list, { key: 'ArrowDown' })
    await waitFor(() => expect(f.root.dataset.fradeTheme).toBe('dark'))
    expect(f.host.persist).not.toHaveBeenCalled()
    expect(f.controller.state().preview).toBe(true)
    expect(f.controller.state().durableSelection.mode).toBe('light')
    fireEvent.keyDown(list, { key: 'Enter' })
    await waitFor(() => expect(f.closed).toHaveBeenCalledTimes(1))
    expect(f.host.persist).toHaveBeenCalledTimes(1)
    expect(f.controller.state().durableSelection.mode).toBe('dark')
    expect(f.root.contains(original)).toBe(true)
    expect(original.value).toBe('dirty architectural note')
    expect(f.root.dataset.fradeDensity).toBe('compact')
  },
)
story(
  'P01-UI-002',
  'Escape and outside cancellation restore the current committed environment before dismissal',
  async () => {
    const f = await fixture()
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })
    await waitFor(() => expect(f.root.dataset.fradeTheme).toBe('dark'))
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(f.closed).toHaveBeenCalledTimes(1))
    expect(f.root.dataset.fradeTheme).toBe('light')
    expect(f.host.persist).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(f.opener)
    const outside = await fixture()
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })
    await waitFor(() => expect(outside.root.dataset.fradeTheme).toBe('dark'))
    fireEvent.pointerDown(outside.opener)
    await waitFor(() => expect(outside.closed).toHaveBeenCalledTimes(1))
    expect(outside.root.dataset.fradeTheme).toBe('light')
    expect(outside.editor.value).toBe('dirty architectural note')
    expect(outside.host.persist).not.toHaveBeenCalled()
  },
)
story(
  'P01-UI-003',
  'distinct presentation Settings preview named modes and independent density through the same controller',
  async () => {
    const f = await fixture('settings')
    expect(screen.getByRole('dialog', { name: 'Настройки интерфейса' })).toBeTruthy()
    expect(screen.getAllByRole('radio')).toHaveLength(6)
    fireEvent.click(screen.getByRole('radio', { name: /Dark/ }))
    await waitFor(() => expect(f.root.dataset.fradeTheme).toBe('dark'))
    fireEvent.click(screen.getByRole('radio', { name: 'Комфортная' }))
    await waitFor(() => expect(f.root.dataset.fradeDensity).toBe('comfortable'))
    expect(f.host.persist).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать тему…' }))
    expect(f.openPicker).toHaveBeenCalledWith(screen.getByRole('button', { name: 'Выбрать тему…' }))
    fireEvent.click(screen.getByRole('button', { name: 'Применить' }))
    await waitFor(() =>
      expect(f.controller.state().durableSelection).toMatchObject({
        mode: 'dark',
        density: 'comfortable',
      }),
    )
    expect(f.host.persist).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status').textContent).toContain('Сохранено')
    expect(f.editor.value).toBe('dirty architectural note')
  },
)
story(
  'P01-UI-004',
  'failed persistence remains truthful and keeps the dialog available with dirty context intact',
  async () => {
    const f = await fixture()
    f.host.persist.mockImplementation(async () => ({
      status: 'REFUSED',
      message: 'Profile write refused',
    }))
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })
    await waitFor(() => expect(f.root.dataset.fradeTheme).toBe('dark'))
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Enter' })
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('Profile write refused'),
    )
    expect(f.closed).not.toHaveBeenCalled()
    expect(f.root.dataset.fradeTheme).toBe('light')
    expect(f.controller.state().durableSelection.mode).toBe('light')
    expect(screen.queryByText('Сохранено')).toBeNull()
    expect(f.editor.value).toBe('dirty architectural note')
  },
)
story(
  'P01-UI-005',
  'controller follows System and forced environment while preserving explicit live preview and current cancellation baseline',
  async () => {
    const f = await fixture()
    await f.controller.commit({
      ...f.controller.state().selection,
      mode: 'system',
      density: 'comfortable',
    })
    await f.controller.preview({ ...f.controller.state().selection, mode: 'light' })
    const writes = f.host.persist.mock.calls.length
    await f.controller.refreshEnvironment({
      colorScheme: 'dark',
      highContrast: true,
      forcedColors: true,
    })
    expect(f.controller.state().selection.mode).toBe('light')
    expect(f.root.style.getPropertyValue('--frade-surface-base')).toBe('Canvas')
    await f.controller.cancel()
    expect(f.controller.state().selection.mode).toBe('system')
    expect(f.root.dataset.fradeTheme).toBe('high-contrast')
    expect(f.root.dataset.fradeDensity).toBe('comfortable')
    expect(f.host.persist).toHaveBeenCalledTimes(writes)
    expect(f.editor.value).toBe('dirty architectural note')
  },
)

story(
  'P01-UI-006',
  'environment supersedes an unpublished candidate without losing explicit choice or writing it',
  async () => {
    for (const action of ['preview', 'commit'] as const) {
      const f = await fixture()
      let began!: () => void
      const started = new Promise<void>((resolve) => {
        began = resolve
      })
      const registration = f.controller.register({
        id: 'pending-environment',
        generation: 1,
        hide: () => {},
        reveal: () => {},
        prepare: async (_snapshot, ctx, signal) => {
          if (ctx.phase === 'prepare' && ctx.generation === 1) {
            began()
            await new Promise<void>((_resolve, reject) =>
              signal.addEventListener('abort', () => reject(Error('superseded')), { once: true }),
            )
          }
          const ack = (phase: PhaseContext) => ({
            ...phase,
            participantId: 'pending-environment',
            participantGeneration: 1,
            painted: true as const,
          })
          return {
            apply: async (phase) => ack(phase),
            rollback: async (_previous, phase) => ack(phase),
            dispose: () => {},
          }
        },
      })
      dispose.push(registration.dispose)
      await registration.ready
      const candidate = {
        ...f.controller.state().selection,
        mode: 'dark' as const,
        density: 'comfortable' as const,
      }
      const first = f.controller[action](candidate)
      await started
      const refreshed = f.controller.refreshEnvironment({ colorScheme: 'dark' })
      expect((await first).status).toBe('SUPERSEDED')
      expect((await refreshed).status).toBe('APPLIED')
      expect(f.controller.state().selection).toEqual(candidate)
      expect(f.controller.state().preview).toBe(true)
      expect(f.root.dataset.fradeTheme).toBe('dark')
      expect(f.root.dataset.fradeDensity).toBe('comfortable')
      expect(f.controller.state().durableSelection.mode).toBe('light')
      expect(f.host.persist).not.toHaveBeenCalled()
      expect(f.controller.state().message).not.toContain('Сохранено')
      await f.controller.cancel()
      expect(f.root.dataset.fradeTheme).toBe('light')
      expect(f.root.dataset.fradeDensity).toBe('compact')
      expect(f.editor.value).toBe('dirty architectural note')
    }
  },
)

it('component BDD bindings match all durable UI stories and their assertion source hash', () => {
  const registry = JSON.parse(
    readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        '../../../../docs/ui/decisions/p01-theme-traceability.json',
      ),
      'utf8',
    ),
  )
  const ids = [...feature.matchAll(/@(P01-UI-\d+) @component/g)].map((match) => match[1])
  expect(registry.componentBindings.map((binding: { id: string }) => binding.id)).toEqual(ids)
  for (const binding of registry.componentBindings) {
    expect(binding.scope).toBe('COMPONENT_BDD_NOT_DESKTOP_RUNTIME')
    expect(
      createHash('sha256')
        .update(
          readFileSync(
            resolve(
              dirname(fileURLToPath(import.meta.url)),
              '../../../../',
              binding.assertion.file,
            ),
          ),
        )
        .digest('hex'),
    ).toBe(binding.assertion.sha256)
  }
})

story(
  'P01-UI-007',
  'Workbench injects one theme controller with a stable managed host and distinct Settings command',
  async () => {
    const f = await fixture('workbench')
    const overlayHost = f.root.querySelector('#frade-overlay-host')
    expect(overlayHost).not.toBeNull()
    await f.controller.whenReady()
    fireEvent.click(screen.getByRole('button', { name: 'Меню Файл' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Настройки интерфейса' }))
    expect(
      overlayHost!.contains(screen.getByRole('dialog', { name: 'Настройки интерфейса' })),
    ).toBe(true)
    expect(screen.getByRole('button', { name: 'Настройки репозитория' })).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: /Dark/ }))
    await waitFor(() => expect(f.root.dataset.fradeTheme).toBe('dark'))
    fireEvent.click(screen.getByRole('button', { name: 'Выбрать тему…' }))
    expect(overlayHost!.contains(screen.getByRole('dialog', { name: 'Выбор темы' }))).toBe(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Выбор темы' })).toBeNull())
    expect(f.root.dataset.fradeTheme).toBe('light')
    expect(f.root.querySelector('#frade-overlay-host')).toBe(overlayHost)
    expect(f.editor.value).toBe('dirty architectural note')
    expect(f.host.persist).not.toHaveBeenCalled()
  },
)
story(
  'P01-UI-008',
  'Workbench contextual chord guards editable input and close restores presentation before the existing guard',
  async () => {
    const f = await fixture('workbench')
    expect(f.root.querySelector('#frade-overlay-host')).not.toBeNull()
    await f.controller.whenReady()
    f.editor.focus()
    fireEvent.keyDown(f.editor, { key: 'k', ctrlKey: true })
    fireEvent.keyDown(f.editor, { key: 't', ctrlKey: true })
    expect(screen.queryByRole('dialog', { name: 'Выбор темы' })).toBeNull()
    f.opener.focus()
    fireEvent.keyDown(f.opener, { key: 'k', ctrlKey: true })
    fireEvent.keyDown(f.opener, { key: 't', ctrlKey: true })
    expect(screen.getByRole('dialog', { name: 'Выбор темы' })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' })
    await waitFor(() => expect(f.root.dataset.fradeTheme).toBe('dark'))
    f.closeRequest()
    await waitFor(() => expect(f.approvedViews).toEqual(['light']))
    expect(f.controller.state().preview).toBe(false)
    expect(f.host.persist).not.toHaveBeenCalled()
    expect(f.editor.value).toBe('dirty architectural note')
  },
)
