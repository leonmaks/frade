import { drawioRepositoryBridge } from './drawio-bridge'
import { drawioFlowBridge } from './drawio-flow-bridge'
import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  net,
  session,
  utilityProcess,
  dialog,
} from 'electron'
import { join } from 'node:path'
import { WorkbenchHost, WorkbenchRelay } from './workbench'
import {
  WORKBENCH_CHANNEL,
  WORKBENCH_REQUEST_CHANNEL,
  WORKBENCH_EVENT_CHANNEL,
  WORKBENCH_CLOSE_CHANNEL,
} from '@frade/repository-api/workbench'
import { REPOSITORY_CHANNEL, REPOSITORY_OPEN_CHANNEL } from '@frade/repository-api/protocol'
import { failure as repositoryFailure } from '@frade/repository-domain'
import { RepositoryDesktopController } from './repository'
import { pathToFileURL } from 'node:url'
import { BackendSupervisor } from '@frade/runtime-electron'
import {
  REQUEST_CHANNEL,
  EVENT_CHANNEL,
  parseRequest,
  failure,
  RuntimeError,
  validId,
  record,
} from '@frade/runtime-contracts'
import { authorizedSender, resourcePath, trustedPage, productionCsp } from './security'

protocol.registerSchemesAsPrivileged([
  { scheme: 'frade', privileges: { standard: true, secure: true, supportFetchAPI: true } },
])
let window: BrowserWindow | undefined
let quitting = false
let closeApproved = false
if (process.env.FRADE_USER_DATA) app.setPath('userData', process.env.FRADE_USER_DATA)
const workbenchRelay = new WorkbenchRelay((value) => {
  workbench?.observe(value)
  if (window && !window.isDestroyed()) window.webContents.send(WORKBENCH_EVENT_CHANNEL, value)
})
let workbench: WorkbenchHost
const repository = new RepositoryDesktopController(
  async () => {
    if (!window) return undefined
    const selected = await dialog.showOpenDialog(window, { properties: ['openDirectory'] })
    return selected.canceled ? undefined : selected.filePaths[0]
  },
  (command) => workbenchRelay.request(command),
  join(app.getPath('userData'), 'repository-indexes'),
)
const backend = new BackendSupervisor(() => {
  const child = utilityProcess.fork(join(__dirname, '../utility/index.cjs'), [], {
    serviceName: 'Frade Backend',
  })
  workbenchRelay.attach(child)
  return {
    send: (message) => child.postMessage(message),
    kill: () => {
      child.kill()
    },
    onMessage: (listener) => {
      const filtered = (message: unknown) => {
        if (
          record(message) &&
          typeof message.type === 'string' &&
          message.type.startsWith('workbench-')
        )
          return
        listener(message)
      }
      child.on('message', filtered)
      return () => {
        child.off('message', filtered)
      }
    },
    onExit: (listener) => {
      child.on('exit', listener)
      return () => {
        child.off('exit', listener)
      }
    },
  }
})
const devUrl = !app.isPackaged ? process.env.ELECTRON_RENDERER_URL : undefined
app
  .whenReady()
  .then(async () => {
    if (devUrl && !trustedPage(devUrl, devUrl)) throw new Error('Invalid local development URL')
    const rendererRoot = join(__dirname, '../renderer')
    await protocol.handle('frade', async (request) => {
      try {
        const requested = new URL(request.url)
        const drawio = requested.host === 'drawio'
        if (drawio && requested.pathname === '/frade-repository-bridge.js') {
          const parentOrigin = devUrl ? new URL(devUrl).origin : 'frade://app'
          return new Response(
            '(' +
              drawioRepositoryBridge.toString() +
              ')(' +
              JSON.stringify(parentOrigin) +
              ');' +
              '(' +
              drawioFlowBridge.toString() +
              ')(' +
              JSON.stringify(parentOrigin) +
              ');',
            {
              headers: {
                'Content-Type': 'application/javascript; charset=utf-8',
                'X-Content-Type-Options': 'nosniff',
              },
            },
          )
        }
        const path = await resourcePath(
          drawio ? join(__dirname, '../../vendor/drawio') : rendererRoot,
          drawio ? 'frade://app' + requested.pathname : request.url,
        )
        const response = await net.fetch(pathToFileURL(path).href)
        const headers = new Headers(response.headers)
        headers.set(
          'Content-Security-Policy',
          drawio
            ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-src 'self'; form-action 'none'"
            : productionCsp,
        )
        headers.set('X-Content-Type-Options', 'nosniff')
        if (drawio && requested.pathname === '/index.html') {
          const html = (await response.text()).replace(
            '<script src="js/main.js"></script>',
            '<script src="frade-repository-bridge.js"></script><script src="js/main.js"></script>',
          )
          headers.delete('Content-Length')
          return new Response(html, { status: response.status, headers })
        }
        return new Response(response.body, { status: response.status, headers })
      } catch {
        return new Response('Not found', { status: 404 })
      }
    })
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) =>
      callback(false),
    )
    session.defaultSession.setPermissionCheckHandler(() => false)
    window = new BrowserWindow({
      width: 1280,
      minWidth: 620,
      minHeight: 450,
      titleBarStyle: 'hidden',
      titleBarOverlay: { color: '#181818', symbolColor: '#cccccc', height: 35 },
      autoHideMenuBar: true,
      backgroundColor: '#1f1f1f',
      height: 850,
      show: false,
      webPreferences: {
        preload: join(__dirname, '../preload/index.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        webviewTag: false,
      },
    })
    const wc = window.webContents
    workbench = new WorkbenchHost({
      settingsFile: join(app.getPath('userData'), 'frade-workspace.json'),
      request: (command) => workbenchRelay.request(command),
      pick: async (kind) => {
        const selected = await dialog.showOpenDialog(window!, {
          title:
            kind === 'catalog'
              ? 'Подключить внешний каталог объектов'
              : kind === 'data'
                ? 'Выбрать папку данных KA (содержит root.yaml)'
                : kind === 'metadata'
                  ? 'Выбрать папку метаописания (_ecosystems_, содержит kadzo)'
                  : 'Открыть рабочее пространство',
          properties: ['workspace', 'catalog'].includes(kind) ? ['openFile'] : ['openDirectory'],
          ...(kind === 'workspace'
            ? { filters: [{ name: 'Frade Workspace', extensions: ['frade-workspace'] }] }
            : {}),
        })
        return selected.canceled ? undefined : selected.filePaths[0]
      },
      save: async () => {
        const selected = await dialog.showSaveDialog(window!, {
          title: 'Сохранить рабочее пространство',
          filters: [{ name: 'Frade Workspace', extensions: ['frade-workspace'] }],
        })
        return selected.canceled ? undefined : selected.filePath
      },
      close: () => {
        closeApproved = true
        window?.close()
      },
    })
    window.on('close', (event) => {
      if (!closeApproved && !quitting) {
        event.preventDefault()
        wc.send(WORKBENCH_CLOSE_CHANNEL)
      }
    })
    const repositorySender = (event: Electron.IpcMainInvokeEvent) =>
      !!window &&
      !window.isDestroyed() &&
      authorizedSender(
        event.sender.id,
        event.senderFrame === wc.mainFrame,
        event.senderFrame?.url ?? '',
        wc.id,
        devUrl,
      )
    ipcMain.handle(REPOSITORY_OPEN_CHANNEL, async (event, ...args: unknown[]) =>
      repositorySender(event) && args.length === 0
        ? repository.open()
        : repositoryFailure('ACCESS_DENIED'),
    )
    ipcMain.handle(REPOSITORY_CHANNEL, async (event, value: unknown) =>
      repositorySender(event) ? repository.request(value) : repositoryFailure('ACCESS_DENIED'),
    )
    ipcMain.handle(WORKBENCH_CHANNEL, (event, value: unknown) =>
      repositorySender(event) ? workbench.command(value) : repositoryFailure('ACCESS_DENIED'),
    )
    ipcMain.handle(WORKBENCH_REQUEST_CHANNEL, (event, value: unknown) =>
      repositorySender(event) ? workbench.request(value) : repositoryFailure('ACCESS_DENIED'),
    )
    wc.setWindowOpenHandler(() => ({ action: 'deny' }))
    wc.on('will-navigate', (event, url) => {
      if (!trustedPage(url, devUrl)) event.preventDefault()
    })
    wc.on('will-redirect', (event, url) => {
      if (!trustedPage(url, devUrl)) event.preventDefault()
    })
    wc.on('will-frame-navigate', (event) => {
      if (
        event.isMainFrame
          ? !trustedPage(event.url, devUrl)
          : !event.url.startsWith('frade://drawio/')
      )
        event.preventDefault()
    })
    wc.on('will-attach-webview', (event) => event.preventDefault())
    ipcMain.handle(REQUEST_CHANNEL, async (event, value: unknown) => {
      const id = record(value) && validId(value.requestId) ? value.requestId : 'invalid'
      if (
        !window ||
        window.isDestroyed() ||
        !authorizedSender(
          event.sender.id,
          event.senderFrame === wc.mainFrame,
          event.senderFrame?.url ?? '',
          wc.id,
          devUrl,
        )
      )
        return failure(id, 'UNAUTHORIZED')
      try {
        const request = parseRequest(value)
        const result =
          backend.snapshot().state === 'ready' ? await backend.request(request) : backend.snapshot()
        return {
          type: 'response',
          protocolVersion: 1,
          requestId: request.requestId,
          ok: true,
          result,
        }
      } catch (error) {
        return failure(id, error instanceof RuntimeError ? error.code : 'UNAVAILABLE')
      }
    })
    const unsubscribe = backend.subscribe((event) => {
      if (!wc.isDestroyed()) wc.send(EVENT_CHANNEL, event)
    })
    window.on('closed', () => {
      unsubscribe()
      ipcMain.removeHandler(REPOSITORY_CHANNEL)
      ipcMain.removeHandler(REPOSITORY_OPEN_CHANNEL)
      void repository.close()
      window = undefined
    })
    window.once('ready-to-show', () => window?.show())
    backend.start()
    await window.loadURL(devUrl ?? 'frade://app/index.html')
  })
  .catch((error) => {
    console.error('Desktop startup failed', error)
    app.quit()
  })
app.on('window-all-closed', () => app.quit())
app.on('before-quit', (event) => {
  if (quitting) return
  if (window && !closeApproved) {
    event.preventDefault()
    window.webContents.send(WORKBENCH_CLOSE_CHANNEL)
    return
  }
  event.preventDefault()
  quitting = true
  void Promise.allSettled([backend.stop(), repository.close()]).finally(() => app.quit())
})
