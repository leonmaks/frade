// @vitest-environment jsdom
import { it, expect, vi } from 'vitest'
import { createShortcutRegistry, registerThemeChord } from '../../src/design/theme/shortcuts'
const key = (name: string, options: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...options })
it('contextual priority picks one command; lifecycle removes registrations and rejects duplicate IDs', () => {
  const registry = createShortcutRegistry(),
    base = vi.fn(),
    picker = vi.fn(),
    off = registry.register({
      id: 'base',
      context: 'workbench',
      priority: 0,
      match: (event) => event.key === 'Escape',
      run: base,
    })
  registry.register({
    id: 'picker',
    context: 'picker',
    priority: 1,
    match: (event) => event.key === 'Escape',
    run: picker,
  })
  expect(registry.dispatch(key('Escape'))).toBe(true)
  expect(base).toHaveBeenCalledTimes(1)
  const leave = registry.activate('picker', 100)
  registry.dispatch(key('Escape'))
  expect(picker).toHaveBeenCalledTimes(1)
  expect(base).toHaveBeenCalledTimes(1)
  leave()
  off()
  expect(registry.dispatch(key('Escape'))).toBe(false)
  const command = { id: 'same', context: 'workbench', priority: 0, match: () => true, run: base }
  registry.register(command)
  expect(() => registry.register(command)).toThrow()
  registry.dispose()
  expect(registry.dispatch(key('Escape'))).toBe(false)
})
it('dirty guard context outranks presentation and blocks lower-context workbench actions', () => {
  const registry = createShortcutRegistry(),
    save = vi.fn(),
    cancel = vi.fn()
  registry.register({
    id: 'save',
    context: 'workbench',
    priority: 0,
    allowEditable: true,
    match: (event) => event.key === 's',
    run: save,
  })
  registry.register({
    id: 'cancel',
    context: 'dirty',
    priority: 0,
    match: (event) => event.key === 'Escape',
    run: cancel,
  })
  const settings = registry.activate('settings', 100),
    guard = registry.activate('dirty', 1000)
  expect(registry.current()).toBe('dirty')
  expect(registry.dispatch(key('s', { ctrlKey: true }))).toBe(false)
  registry.dispatch(key('Escape'))
  expect(cancel).toHaveBeenCalledTimes(1)
  expect(save).not.toHaveBeenCalled()
  guard()
  expect(registry.current()).toBe('settings')
  settings()
  registry.dispose()
})
it('valid Ctrl+K then Ctrl+T chord opens once within one second and consumes only its matching sequence', () => {
  const registry = createShortcutRegistry(),
    open = vi.fn()
  let now = 0
  const off = registerThemeChord(registry, open, () => now)
  expect(registry.dispatch(key('t', { ctrlKey: true }))).toBe(false)
  const first = key('k', { ctrlKey: true })
  expect(registry.dispatch(first)).toBe(true)
  expect(first.defaultPrevented).toBe(true)
  now = 999
  expect(registry.dispatch(key('t', { ctrlKey: true }))).toBe(true)
  expect(open).toHaveBeenCalledTimes(1)
  expect(registry.dispatch(key('t', { ctrlKey: true }))).toBe(false)
  off()
  registry.dispose()
})
it('expired, context-changed and Escape-canceled chords cannot open a picker', () => {
  const registry = createShortcutRegistry(),
    open = vi.fn()
  let now = 0
  registerThemeChord(registry, open, () => now)
  registry.dispatch(key('k', { ctrlKey: true }))
  now = 1000
  expect(registry.dispatch(key('t', { ctrlKey: true }))).toBe(false)
  registry.dispatch(key('k', { ctrlKey: true }))
  const deactivate = registry.activate('settings', 100)
  deactivate()
  expect(registry.dispatch(key('t', { ctrlKey: true }))).toBe(false)
  registry.dispatch(key('k', { ctrlKey: true }))
  expect(registry.dispatch(key('Escape'))).toBe(true)
  expect(registry.dispatch(key('t', { ctrlKey: true }))).toBe(false)
  expect(open).not.toHaveBeenCalled()
  registry.dispose()
})
it('composition/text editing does not start or finish a theme chord; existing editable save remains registered', () => {
  const registry = createShortcutRegistry(),
    open = vi.fn(),
    save = vi.fn()
  registerThemeChord(registry, open, () => 0)
  registry.register({
    id: 'save',
    context: 'workbench',
    priority: 0,
    allowEditable: true,
    match: (event) => event.ctrlKey && event.key === 's',
    run: save,
  })
  expect(registry.dispatch(key('k', { ctrlKey: true, isComposing: true }))).toBe(false)
  const input = document.createElement('textarea')
  document.body.append(input)
  input.focus()
  const editing = key('k', { ctrlKey: true })
  input.dispatchEvent(editing)
  expect(registry.dispatch(editing)).toBe(false)
  const saving = key('s', { ctrlKey: true })
  input.dispatchEvent(saving)
  expect(registry.dispatch(saving)).toBe(true)
  expect(save).toHaveBeenCalledTimes(1)
  expect(open).not.toHaveBeenCalled()
  input.remove()
  registry.dispose()
})
it('unrelated key invalidates a pending chord and priorities are stable within one context', () => {
  const registry = createShortcutRegistry(),
    open = vi.fn(),
    higher = vi.fn(),
    lower = vi.fn()
  registerThemeChord(registry, open, () => 0)
  registry.dispatch(key('k', { ctrlKey: true }))
  registry.dispatch(key('x'))
  expect(registry.dispatch(key('t', { ctrlKey: true }))).toBe(false)
  registry.register({
    id: 'low',
    context: 'workbench',
    priority: 1,
    match: (event) => event.key === 'F1',
    run: lower,
  })
  registry.register({
    id: 'high',
    context: 'workbench',
    priority: 2,
    match: (event) => event.key === 'F1',
    run: higher,
  })
  registry.dispatch(key('F1'))
  expect(higher).toHaveBeenCalledTimes(1)
  expect(lower).not.toHaveBeenCalled()
  registry.dispose()
})
