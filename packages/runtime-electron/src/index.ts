import {
  parseBackendMessage,
  parseRequest,
  RuntimeError,
  type ClientMessage,
  type Health,
  type HealthEvent,
  type Request,
  type ErrorCode,
} from '@frade/runtime-contracts'

export interface ChildTransport {
  send(message: ClientMessage): void
  kill(): void
  onMessage(listener: (message: unknown) => void): () => void
  onExit(listener: () => void): () => void
}
type Pending = { resolve(value: Health): void; reject(error: RuntimeError): void; cleanup(): void }
export class BackendSupervisor {
  private child?: ChildTransport
  private detach: (() => void)[] = []
  private startupTimer?: ReturnType<typeof setTimeout>
  private restartTimer?: ReturnType<typeof setTimeout>
  private pending = new Map<string, Pending>()
  private listeners = new Set<(event: HealthEvent) => void>()
  private health: Health = { state: 'unavailable', sequence: 0 }
  private retries = 0
  private stopping = false
  private stopPromise?: Promise<void>
  constructor(
    private readonly spawn: () => ChildTransport,
    private readonly options: {
      startupMs?: number
      requestMs?: number
      backoffMs?: number
      shutdownMs?: number
      maxRestarts?: number
    } = {},
  ) {}
  snapshot(): Health {
    return { ...this.health }
  }
  get pendingCount() {
    return this.pending.size
  }
  subscribe(listener: (event: HealthEvent) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
  private publish(state: Health['state']) {
    this.health = { state, sequence: this.health.sequence + 1 }
    for (const listener of this.listeners) {
      try {
        listener({ type: 'health', protocolVersion: 1, health: this.snapshot() })
      } catch {
        /* A consumer cannot break process supervision. */
      }
    }
  }
  start() {
    if (this.stopping || this.child || this.restartTimer) return
    this.publish('starting')
    try {
      const child = this.spawn()
      this.child = child
      this.detach = [
        child.onMessage((message) => {
          if (this.child === child) this.receive(message)
        }),
        child.onExit(() => {
          if (this.child === child) this.failed(false)
        }),
      ]
      this.startupTimer = setTimeout(() => this.failed(true), this.options.startupMs ?? 5000)
    } catch {
      this.failed(true)
    }
  }
  private receive(value: unknown) {
    try {
      const message = parseBackendMessage(value)
      if (message.type === 'ready') {
        if (this.health.state !== 'starting') throw new RuntimeError('PROTOCOL_ERROR')
        clearTimeout(this.startupTimer)
        this.publish('ready')
      } else {
        if (this.health.state !== 'ready') throw new RuntimeError('PROTOCOL_ERROR')
        const entry = this.pending.get(message.requestId)
        if (!entry) return // Late, duplicate and unknown IDs are never replayed.
        this.pending.delete(message.requestId)
        entry.cleanup()
        if (message.ok) entry.resolve({ ...message.result, sequence: this.health.sequence })
        else entry.reject(new RuntimeError(message.error))
      }
    } catch {
      this.failed(true)
    }
  }
  private rejectPending(code: ErrorCode) {
    for (const entry of this.pending.values()) {
      entry.cleanup()
      entry.reject(new RuntimeError(code))
    }
    this.pending.clear()
  }
  private releaseChild(kill: boolean) {
    clearTimeout(this.startupTimer)
    const child = this.child
    this.child = undefined
    for (const off of this.detach) off()
    this.detach = []
    if (kill) {
      try {
        child?.kill()
      } catch {
        /* Already exited. */
      }
    }
  }
  private failed(kill: boolean) {
    this.releaseChild(kill)
    this.rejectPending('UNAVAILABLE')
    if (this.stopping) return
    this.publish('unavailable')
    if (this.retries < (this.options.maxRestarts ?? 2)) {
      const attempt = ++this.retries
      this.restartTimer = setTimeout(
        () => {
          this.restartTimer = undefined
          this.start()
        },
        (this.options.backoffMs ?? 250) * attempt,
      )
    }
  }
  request(value: Request, signal?: AbortSignal): Promise<Health> {
    let request: Request
    try {
      request = parseRequest(value)
    } catch (error) {
      return Promise.reject(error)
    }
    if (signal?.aborted) return Promise.reject(new RuntimeError('CANCELLED'))
    if (this.stopping) return Promise.reject(new RuntimeError('SHUTTING_DOWN'))
    if (this.health.state !== 'ready' || !this.child)
      return Promise.reject(new RuntimeError('UNAVAILABLE'))
    if (this.pending.has(request.requestId))
      return Promise.reject(new RuntimeError('INVALID_REQUEST'))
    return new Promise((resolve, reject) => {
      const cancel = (code: 'TIMEOUT' | 'CANCELLED') => {
        const entry = this.pending.get(request.requestId)
        if (!entry) return
        this.pending.delete(request.requestId)
        entry.cleanup()
        entry.reject(new RuntimeError(code))
        try {
          this.child?.send({ type: 'cancel', requestId: request.requestId })
        } catch {
          this.failed(true)
        }
      }
      const abort = () => cancel('CANCELLED')
      const timer = setTimeout(() => cancel('TIMEOUT'), this.options.requestMs ?? 3000)
      const cleanup = () => {
        clearTimeout(timer)
        signal?.removeEventListener('abort', abort)
      }
      this.pending.set(request.requestId, { resolve, reject, cleanup })
      signal?.addEventListener('abort', abort, { once: true })
      try {
        this.child!.send(request)
      } catch {
        this.failed(true)
      }
    })
  }
  stop(): Promise<void> {
    if (this.stopPromise) return this.stopPromise
    this.stopping = true
    clearTimeout(this.restartTimer)
    this.restartTimer = undefined
    clearTimeout(this.startupTimer)
    this.publish('stopping')
    this.rejectPending('SHUTTING_DOWN')
    const child = this.child
    this.stopPromise = new Promise<void>((resolve) => {
      if (!child) {
        resolve()
        return
      }
      let settled = false
      let off: () => void = () => {}
      const finish = (kill: boolean) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        off()
        this.releaseChild(kill)
        resolve()
      }
      off = child.onExit(() => finish(false))
      const timer = setTimeout(() => finish(true), this.options.shutdownMs ?? 1500)
      try {
        child.send({ type: 'shutdown' })
      } catch {
        finish(true)
      }
    })
    return this.stopPromise
  }
}
