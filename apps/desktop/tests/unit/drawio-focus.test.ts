import { afterEach, expect, it, vi } from 'vitest'
import { drawioRepositoryBridge } from '../../src/main/drawio-bridge'

afterEach(() => vi.unstubAllGlobals())
function setup() {
  const parent = {},
    result = {}
  let focused = false,
    owner = 'host-search'
  const show = vi.fn(function (this: unknown, ...args: unknown[]) {
    owner = 'typing-shim'
    return { receiver: this, args, result }
  })
  const prototype = { init: vi.fn(), showTypingShim: show }
  let receive: (event: unknown) => void = () => {}
  vi.stubGlobal('document', { hasFocus: () => focused })
  vi.stubGlobal('window', {
    parent,
    EditorUi: { prototype },
    addEventListener: (_name: string, callback: typeof receive) => {
      receive = callback
    },
  })
  drawioRepositoryBridge('frade://app')
  return {
    prototype,
    show,
    result,
    owner: () => owner,
    focus: () => {
      focused = true
    },
    configure: (origin = 'frade://app', source = parent) =>
      receive({
        data: JSON.stringify({ action: 'configure' }),
        origin,
        source,
        stopImmediatePropagation: vi.fn(),
      }),
  }
}
it('a queued passive typing refresh cannot take host-search keyboard focus', async () => {
  const f = setup()
  f.configure()
  await Promise.resolve().then(() => f.prototype.showTypingShim())
  expect(f.owner()).toBe('host-search')
  expect(f.show).not.toHaveBeenCalled()
})
it('an owned editor keeps the original typing-shim receiver, arguments and return value', () => {
  const f = setup()
  f.configure()
  f.focus()
  const receiver = { showTypingShim: f.prototype.showTypingShim },
    arg = { typing: true }
  const result = receiver.showTypingShim(arg)
  expect(f.show).toHaveBeenCalledTimes(1)
  expect(f.show.mock.contexts[0]).toBe(receiver)
  expect(f.show).toHaveBeenCalledWith(arg)
  expect(result).toEqual({ receiver, args: [arg], result: f.result })
})
it('only a trusted configure installs one focus-ownership wrapper', () => {
  const f = setup()
  f.configure('https://untrusted.example')
  expect(f.prototype.showTypingShim).toBe(f.show)
  f.configure('frade://app', {})
  expect(f.prototype.showTypingShim).toBe(f.show)
  f.configure()
  const installed = f.prototype.showTypingShim
  expect(installed).not.toBe(f.show)
  f.configure()
  expect(f.prototype.showTypingShim).toBe(installed)
  f.focus()
  f.prototype.showTypingShim()
  expect(f.show).toHaveBeenCalledTimes(1)
})
it('upstream typing failures still propagate when the editor owns focus', () => {
  const f = setup(),
    failure = new Error('upstream typing failure')
  f.show.mockImplementation(() => {
    throw failure
  })
  f.configure()
  f.focus()
  expect(() => f.prototype.showTypingShim()).toThrow(failure)
})
