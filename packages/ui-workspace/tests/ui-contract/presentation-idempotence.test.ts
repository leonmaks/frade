// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { applyRootSnapshot, createRootParticipant } from '../../src/design/theme/rootParticipant'
import { createThemeRegistry } from '../../src/design/theme/registry'
import { resolveTheme } from '../../src/design/theme/resolver'
const value = (revision: number) =>
  resolveTheme({
    registry: createThemeRegistry(),
    selection: { mode: 'light', density: 'compact' },
    revision,
  })
afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})
it('equal appearance advances the exact revision without redundant owned style or metadata mutations', async () => {
  const root = document.createElement('div')
  document.body.append(root)
  applyRootSnapshot(root, value(0))
  const changed: string[] = [],
    observer = new MutationObserver((records) =>
      changed.push(...records.map((r) => r.attributeName!)),
    )
  observer.observe(root, { attributes: true })
  try {
    applyRootSnapshot(root, value(1))
    await Promise.resolve()
    expect(root.dataset.fradeRevision).toBe('1')
    expect(changed).toEqual(['data-frade-revision'])
    expect(root.style.colorScheme).toBe('light')
  } finally {
    observer.disconnect()
  }
})
it('equal-palette projection repairs actual changed values, priority and metadata instead of trusting cached snapshots', () => {
  const root = document.createElement('div'),
    snapshot = value(0),
    name = '--frade-text-primary'
  applyRootSnapshot(root, snapshot)
  root.style.setProperty(name, snapshot.effectiveColors['text.primary'], 'important')
  root.style.setProperty('--frade-surface-base', 'outside')
  root.dataset.fradeTheme = 'outside'
  root.dataset.fradeRuntime = 'outside'
  applyRootSnapshot(root, value(1))
  expect(root.style.getPropertyValue(name)).toBe(snapshot.effectiveColors['text.primary'])
  expect(root.style.getPropertyPriority(name)).toBe('')
  expect(root.style.getPropertyValue('--frade-surface-base')).toBe(
    snapshot.effectiveColors['surface.base'],
  )
  expect(root.dataset.fradeTheme).toBe('light')
  expect(root.dataset.fradeRuntime).toBe('1')
  const invalid = {
    ...snapshot,
    revision: 2,
    effectiveColors: { ...snapshot.effectiveColors, 'text.primary': 'invalid' },
  }
  expect(() => applyRootSnapshot(root, invalid)).toThrow('Invalid presentation role projection')
  expect(root.dataset.fradeRevision).toBe('1')
})
it('revision-only root application still waits for both original animation-frame boundaries before ACK', async () => {
  const root = document.createElement('div')
  document.body.append(root)
  applyRootSnapshot(root, value(0))
  const callbacks: FrameRequestCallback[] = []
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    callbacks.push(callback)
    return callbacks.length
  })
  const context = {
      version: 1 as const,
      requestId: 'window/1',
      sessionId: 'window',
      generation: 1,
      transactionId: 'window/1',
      revision: 1,
      membership: 1,
    },
    participant = createRootParticipant(root),
    signal = new AbortController().signal,
    handle = await participant.prepare(value(1), { ...context, phase: 'prepare' }, signal)
  let acknowledged = false
  const applying = handle.apply({ ...context, phase: 'apply' }, signal).then((ack) => {
    acknowledged = true
    return ack
  })
  expect(acknowledged).toBe(false)
  expect(callbacks).toHaveLength(1)
  callbacks.shift()!(0)
  await Promise.resolve()
  expect(acknowledged).toBe(false)
  expect(callbacks).toHaveLength(1)
  callbacks.shift()!(16)
  expect(await applying).toMatchObject({ revision: 1, painted: true })
  expect(acknowledged).toBe(true)
  handle.dispose()
})
