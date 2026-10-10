import { join } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { ExtensionInstallerHost } from '../../src/main/extension-installer'
import type { VerifiedFilesystem, createVerifiedFilesystem } from '@frade/extension-service'
const context = (names = ['.coordinator.lock']) => ({ state: 'VERIFIED', rootEntries: names.map(name => ({ name })), dispose: vi.fn(async () => {}), request: vi.fn() }) as unknown as VerifiedFilesystem
const unavailable = () => Object.assign(Error('WINDOWS_BACKEND_UNAVAILABLE'), { status: 'BACKEND_UNAVAILABLE' })
describe('P02 S1 Main ownership and pre-paint boundary', () => {
  it('owns fixed root, trusted source, one generation/context and idempotent actual disposal', async () => {
    const live = context(), open = vi.fn(async (options: Parameters<typeof createVerifiedFilesystem>[0]) => { void options; return live }), host = new ExtensionInstallerHost('C:/profile', 'C:/built/extension-filesystem', { open })
    const a = host.initialize(); expect(host.initialize()).toBe(a)
    expect(await a).toEqual({ state: 'BACKEND_VERIFIED', installer: 'NOT_IMPLEMENTED' })
    expect(open).toHaveBeenCalledTimes(1)
    expect(open.mock.calls[0][0]).toMatchObject({ installationRoot: join('C:/profile', 'extensions'), distributionDirectory: 'C:/built/extension-filesystem', generation: 1 })
    expect(open.mock.calls[0][0].sourceSha256).toMatch(/^[a-f0-9]{64}$/)
    const closing = host.dispose(); expect(host.dispose()).toBe(closing); await closing
    expect(live.dispose).toHaveBeenCalledTimes(1); await expect(host.initialize()).rejects.toThrow('EXTENSION_HOST_CLOSED')
  })
  it('invalidates pending generation before late completion; shutdown waits for real close', async () => {
    let ready!: (c: VerifiedFilesystem) => void, closed!: () => void
    const live = context(); live.dispose = vi.fn(() => new Promise<void>(resolve => { closed = resolve }))
    const host = new ExtensionInstallerHost('C:/profile', 'C:/built', { open: () => new Promise(resolve => { ready = resolve }) })
    const opening = host.initialize(), rejected = expect(opening).rejects.toThrow('EXTENSION_HOST_CLOSED')
    let settled = false; const disposal = host.dispose().then(() => { settled = true })
    ready(live); await Promise.resolve(); await Promise.resolve(); expect(settled).toBe(false)
    closed(); await rejected; await disposal; expect(live.dispose).toHaveBeenCalledTimes(1)
  })
  for (const name of ['journal', 'registry.json', '.frade-runtime-probe']) it('blocks installed/ambiguous ' + name + ' before paint and releases context', async () => {
    const live = context(['.coordinator.lock', name]), host = new ExtensionInstallerHost('C:/profile', 'C:/built', { open: async () => live })
    await expect(host.initialize()).rejects.toThrow('EXTENSION_RECOVERY_REQUIRED'); await host.dispose()
    expect(live.dispose).toHaveBeenCalled()
  })
  it('permits built-ins only on typed pre-effect unavailable and absence diagnostic; never certifies', async () => {
    const host = new ExtensionInstallerHost('C:/profile', 'C:/built', { open: async () => { throw unavailable() }, rootAbsent: async () => true })
    expect(await host.initialize()).toEqual({ state: 'UNAVAILABLE', code: 'WINDOWS_BACKEND_UNAVAILABLE' }); await host.dispose()
  })
  it('blocks unavailable with existing/uncertain state without resetting preferences', async () => {
    const host = new ExtensionInstallerHost('C:/profile', 'C:/built', { open: async () => { throw unavailable() }, rootAbsent: async () => false })
    await expect(host.initialize()).rejects.toThrow('WINDOWS_BACKEND_UNAVAILABLE'); await host.dispose()
  })
  it('never treats UNKNOWN as unavailable fallback even on absent root', async () => {
    const rootAbsent = vi.fn(async () => true), host = new ExtensionInstallerHost('C:/profile', 'C:/built', { open: async () => { throw Object.assign(Error('UNCERTAIN_EFFECT'), { status: 'UNKNOWN' }) }, rootAbsent })
    await expect(host.initialize()).rejects.toThrow('UNCERTAIN_EFFECT'); expect(rootAbsent).not.toHaveBeenCalled(); await host.dispose()
  })
})

it('pending Main shutdown propagates unconfirmed late helper close instead of resolving', async () => {
  let ready!: (c: VerifiedFilesystem) => void
  const live = context(); live.dispose = vi.fn(async () => { throw Error('FILESYSTEM_CLOSE_UNCONFIRMED') })
  const host = new ExtensionInstallerHost('C:/profile', 'C:/built', { open: () => new Promise(resolve => { ready = resolve }) })
  const opening = host.initialize(), failedOpening = expect(opening).rejects.toThrow('FILESYSTEM_CLOSE_UNCONFIRMED')
  const closing = host.dispose(), failedClosing = expect(closing).rejects.toThrow('FILESYSTEM_CLOSE_UNCONFIRMED')
  ready(live); await failedOpening; await failedClosing
})

// Execute the actual Main callbacks extracted by TypeScript AST; no mirrored handler implementation.
async function mainCallback(kind: 'quit' | 'visibility', close: () => Promise<void>) {
  const fs = await import('node:fs/promises'), vm = await import('node:vm'), ts = await import('typescript')
  const source = await fs.readFile(new URL('../../src/main/index.ts', import.meta.url), 'utf8')
  const tree = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true), callbacks: import('typescript').Expression[] = []
  const visit = (node: import('typescript').Node) => {
    if (ts.isCallExpression(node)) {
      if (kind === 'quit' && ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(tree) === 'app' && node.expression.name.text === 'on' && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === 'before-quit') callbacks.push(node.arguments[1])
      if (kind === 'visibility' && ts.isIdentifier(node.expression) && node.expression.text === 'createPresentationVisibility') callbacks.push(node.arguments[2])
    }
    ts.forEachChild(node, visit)
  }
  visit(tree); expect(callbacks).toHaveLength(1)
  const app = { quit: vi.fn(), exit: vi.fn() }, backend = { stop: vi.fn(async () => {}) }, repository = { close: vi.fn(async () => {}) }, extensionInstaller = { dispose: vi.fn(close) }, log = { error: vi.fn() }
  const js = ts.transpileModule('(' + callbacks[0].getText(tree) + ')', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const callback = vm.runInNewContext('let quitting = false, quitConfirmed = false; ' + js, { app, backend, repository, extensionInstaller, console: log, window: undefined, closeApproved: true, WORKBENCH_CLOSE_CHANNEL: 'owned-test-close' }, { timeout: 1000 })
  return { app, backend, repository, extensionInstaller, log, callback }
}
const settleMain = () => new Promise<void>(resolve => setImmediate(resolve))
it('actual Main before-quit refuses success and repeated exit when helper close is unconfirmed', async () => {
  const f = await mainCallback('quit', async () => { throw Error('FILESYSTEM_CLOSE_UNCONFIRMED') }), event = { preventDefault: vi.fn() }
  f.callback(event); await settleMain(); expect(f.app.quit).not.toHaveBeenCalled(); expect(f.log.error).toHaveBeenCalled()
  f.callback(event); await settleMain(); expect(event.preventDefault).toHaveBeenCalledTimes(2); expect(f.app.quit).not.toHaveBeenCalled()
})
it('actual Main before-quit blocks concurrent exit until helper close is confirmed', async () => {
  let done!: () => void
  const f = await mainCallback('quit', () => new Promise<void>(resolve => { done = resolve })), event = { preventDefault: vi.fn() }
  f.callback(event); f.callback(event); await settleMain(); expect(event.preventDefault).toHaveBeenCalledTimes(2); expect(f.app.quit).not.toHaveBeenCalled(); expect(f.extensionInstaller.dispose).toHaveBeenCalledTimes(1)
  done(); await settleMain(); expect(f.app.quit).toHaveBeenCalledTimes(1)
  f.callback(event); expect(event.preventDefault).toHaveBeenCalledTimes(2)
})
it('actual startup failure callback cannot force app.exit on unconfirmed helper close', async () => {
  const f = await mainCallback('visibility', async () => { throw Error('FILESYSTEM_CLOSE_UNCONFIRMED') })
  f.callback('owned deterministic presentation refusal'); await settleMain(); expect(f.app.exit).not.toHaveBeenCalled(); expect(f.log.error).toHaveBeenCalled()
})
it('actual startup failure callback exits with failure only after confirmed helper close', async () => {
  let done!: () => void
  const f = await mainCallback('visibility', () => new Promise<void>(resolve => { done = resolve }))
  f.callback('owned deterministic presentation refusal'); await settleMain(); expect(f.app.exit).not.toHaveBeenCalled(); done(); await settleMain(); expect(f.app.exit).toHaveBeenCalledWith(1)
})
