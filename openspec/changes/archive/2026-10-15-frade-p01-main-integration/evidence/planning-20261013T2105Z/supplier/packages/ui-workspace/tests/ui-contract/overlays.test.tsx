// @vitest-environment jsdom
import { it, expect, vi } from 'vitest'
import { createManagedOverlays } from '../../src/design/theme/overlays'
const key = (name: string, shiftKey = false) =>
  new KeyboardEvent('keydown', { key: name, shiftKey, cancelable: true })
function fixture() {
  const owner = document.createElement('div'),
    background = document.createElement('button'),
    host = document.createElement('div')
  background.textContent = 'Open settings'
  owner.append(background, host)
  document.body.append(owner)
  background.focus()
  const manager = createManagedOverlays(owner, host)
  const dialog = (name: string) => {
    const node = document.createElement('section'),
      first = document.createElement('button'),
      last = document.createElement('button')
    node.setAttribute('role', 'dialog')
    node.setAttribute('aria-label', name)
    first.textContent = 'first'
    last.textContent = 'last'
    node.append(first, last)
    host.append(node)
    return { node, first, last }
  }
  return {
    owner,
    background,
    host,
    manager,
    dialog,
    cleanup: () => {
      manager.dispose()
      owner.remove()
    },
  }
}
it('managed modal owns initial focus, traps Tab, inerts background and restores exact opener/attributes on disposal', () => {
  const f = fixture(),
    d = f.dialog('Settings'),
    cancel = vi.fn(() => true),
    off = f.manager.register({
      id: 'settings',
      element: d.node,
      priority: 100,
      modal: true,
      opener: f.background,
      outside: 'cancel',
      cancel,
    })
  expect(document.activeElement).toBe(d.first)
  expect(d.node.getAttribute('aria-modal')).toBe('true')
  expect(f.background.hasAttribute('inert')).toBe(true)
  d.last.focus()
  const tab = key('Tab')
  expect(f.manager.handleKey(tab)).toBe(true)
  expect(tab.defaultPrevented).toBe(true)
  expect(document.activeElement).toBe(d.first)
  f.manager.handleKey(key('Tab', true))
  expect(document.activeElement).toBe(d.last)
  off()
  expect(f.background.hasAttribute('inert')).toBe(false)
  expect(d.node.hasAttribute('aria-modal')).toBe(false)
  expect(document.activeElement).toBe(f.background)
  f.cleanup()
})
it('nested picker returns focus to its Settings opener; dirty guard outranks and pauses both', () => {
  const f = fixture(),
    settings = f.dialog('Settings'),
    offSettings = f.manager.register({
      id: 'settings',
      element: settings.node,
      priority: 100,
      modal: true,
      outside: 'cancel',
      cancel: () => true,
    }),
    picker = f.dialog('Picker')
  settings.last.focus()
  const offPicker = f.manager.register({
      id: 'picker',
      element: picker.node,
      priority: 200,
      modal: true,
      opener: settings.last,
      outside: 'cancel',
      cancel: () => true,
    }),
    guard = f.dialog('Unsaved'),
    offGuard = f.manager.register({
      id: 'dirty',
      element: guard.node,
      priority: 1000,
      modal: true,
      outside: 'retain',
      cancel: () => true,
    })
  expect(f.manager.top()?.id).toBe('dirty')
  expect(settings.node.hasAttribute('inert')).toBe(true)
  expect(picker.node.hasAttribute('inert')).toBe(true)
  expect(document.activeElement).toBe(guard.first)
  offGuard()
  guard.node.remove()
  expect(f.manager.top()?.id).toBe('picker')
  expect(document.activeElement).toBe(picker.first)
  offPicker()
  picker.node.remove()
  expect(document.activeElement).toBe(settings.last)
  offSettings()
  f.cleanup()
})
it('outside dismissal awaits successful cancellation and retains dirty editor DOM through pending/failed result', async () => {
  const f = fixture(),
    d = f.dialog('Picker'),
    editor = document.createElement('textarea')
  editor.value = 'dirty'
  f.owner.insertBefore(editor, f.host)
  let resolve!: (ok: boolean) => void
  const gate = new Promise<boolean>((yes) => {
      resolve = yes
    }),
    cancel = vi.fn(() => gate),
    off = f.manager.register({
      id: 'picker',
      element: d.node,
      priority: 100,
      modal: true,
      outside: 'cancel',
      cancel,
    })
  f.host.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  expect(cancel).toHaveBeenCalledTimes(1)
  expect(f.manager.top()?.id).toBe('picker')
  expect(f.owner.contains(editor)).toBe(true)
  f.host.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  expect(cancel).toHaveBeenCalledTimes(1)
  resolve(false)
  await gate
  await Promise.resolve()
  expect(f.manager.top()?.id).toBe('picker')
  expect(editor.value).toBe('dirty')
  off()
  f.cleanup()
})
it('dirty guard outside click stays owned; Escape invokes only topmost cancellation', async () => {
  const f = fixture(),
    lower = f.dialog('Settings'),
    upper = f.dialog('Dirty'),
    a = vi.fn(() => true),
    b = vi.fn(() => true)
  f.manager.register({
    id: 'settings',
    element: lower.node,
    priority: 100,
    modal: true,
    outside: 'cancel',
    cancel: a,
  })
  f.manager.register({
    id: 'dirty',
    element: upper.node,
    priority: 1000,
    modal: true,
    outside: 'retain',
    cancel: b,
  })
  f.host.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  expect(b).not.toHaveBeenCalled()
  const event = key('Escape')
  expect(f.manager.handleKey(event)).toBe(true)
  await Promise.resolve()
  expect(b).toHaveBeenCalledTimes(1)
  expect(a).not.toHaveBeenCalled()
  expect(event.defaultPrevented).toBe(true)
  f.cleanup()
})
it('preexisting inert state remains after modal closes and disposed owner no longer handles events', () => {
  const f = fixture(),
    d = f.dialog('Settings')
  f.background.setAttribute('inert', '')
  const off = f.manager.register({
    id: 'settings',
    element: d.node,
    priority: 100,
    modal: true,
    outside: 'cancel',
    cancel: () => true,
  })
  off()
  expect(f.background.hasAttribute('inert')).toBe(true)
  f.manager.dispose()
  expect(f.manager.handleKey(key('Escape'))).toBe(false)
  expect(() =>
    f.manager.register({
      id: 'late',
      element: d.node,
      priority: 1,
      modal: false,
      outside: 'retain',
      cancel: () => true,
    }),
  ).toThrow()
  f.owner.remove()
})
it('visible transaction curtain pauses overlay key/outside/focus ownership so recovery remains reachable', () => {
  const f = fixture(),
    d = f.dialog('Settings'),
    cancel = vi.fn(() => true)
  f.manager.register({
    id: 'settings',
    element: d.node,
    priority: 100,
    modal: true,
    outside: 'cancel',
    cancel,
  })
  const curtain = document.createElement('div'),
    recover = document.createElement('button')
  curtain.className = 'frade-theme-commit-barrier'
  curtain.append(recover)
  f.host.append(curtain)
  recover.focus()
  expect(document.activeElement).toBe(recover)
  expect(f.manager.handleKey(key('Escape'))).toBe(false)
  f.host.dispatchEvent(new Event('pointerdown', { bubbles: true }))
  expect(cancel).not.toHaveBeenCalled()
  f.cleanup()
})

it('roving negative tabindex buttons are excluded from modal Tab order and initial focus', () => {
  const f = fixture(),
    d = f.dialog('Roving picker')
  d.first.tabIndex = -1
  const off = f.manager.register({
    id: 'picker',
    element: d.node,
    priority: 100,
    modal: true,
    outside: 'cancel',
    cancel: () => true,
  })
  expect(document.activeElement).toBe(d.last)
  f.manager.handleKey(key('Tab'))
  expect(document.activeElement).toBe(d.last)
  off()
  f.cleanup()
})
it('thrown cancellation becomes associated live error and a later retry invokes owner again', async () => {
  const f = fixture(),
    d = f.dialog('Picker'),
    cancel = vi.fn(() => {
      if (cancel.mock.calls.length === 1) throw Error('Readback failure')
      return true
    })
  f.manager.register({
    id: 'picker',
    element: d.node,
    priority: 100,
    modal: true,
    outside: 'cancel',
    cancel,
  })
  expect(await f.manager.cancelTop()).toBe(false)
  expect(d.node.querySelector('[role="status"]')?.textContent).toContain('Readback failure')
  expect(d.node.querySelector('[role="status"]')?.getAttribute('aria-live')).toBe('polite')
  expect(f.manager.top()?.id).toBe('picker')
  expect(await f.manager.cancelTop()).toBe(true)
  expect(cancel).toHaveBeenCalledTimes(2)
  f.cleanup()
})
