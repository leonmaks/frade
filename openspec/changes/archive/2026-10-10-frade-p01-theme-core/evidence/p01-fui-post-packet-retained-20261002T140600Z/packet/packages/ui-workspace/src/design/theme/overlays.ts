export interface OverlayOptions {
  readonly id: string
  readonly element: HTMLElement
  readonly priority: number
  readonly modal: boolean
  readonly opener?: HTMLElement | null
  readonly initialFocus?: HTMLElement | null
  readonly outside: 'cancel' | 'retain'
  readonly cancel: () => boolean | Promise<boolean>
}
export interface ManagedOverlays {
  register(overlay: OverlayOptions): () => void
  top(): OverlayOptions | undefined
  subscribe(listener: () => void): () => void
  handleKey(event: KeyboardEvent): boolean
  cancelTop(): Promise<boolean>
  dispose(): void
}
/** Stable host and DOM ownership only. Keyboard dispatch remains with the caller's registry. */
export function createManagedOverlays(owner: HTMLElement, host: HTMLElement): ManagedOverlays {
  if (!owner.contains(host)) throw Error('Overlay host must belong to its Workbench')
  type Entry = {
    options: OverlayOptions
    sequence: number
    opener: HTMLElement | null
    modal: string | null
    tabIndex: string | null
    canceling?: Promise<boolean>
    failure?: HTMLElement
  }
  const entries = new Map<string, Entry>(),
    listeners = new Set<() => void>(),
    inert = new Map<HTMLElement, boolean>(),
    doc = owner.ownerDocument
  let sequence = 0,
    disposed = false,
    current: Entry | undefined,
    redirecting = false
  const curtain = () => !!host.querySelector('.frade-theme-commit-barrier:not([hidden])')
  const top = () =>
    [...entries.values()]
      .filter((entry) => entry.options.element.isConnected)
      .sort((a, b) => b.options.priority - a.options.priority || b.sequence - a.sequence)[0]
  const focusable = (element: HTMLElement) =>
    [
      ...element.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])',
      ),
    ].filter(
      (node) =>
        node.tabIndex >= 0 &&
        !node.closest('[hidden],[inert]') &&
        doc.defaultView?.getComputedStyle(node).display !== 'none' &&
        doc.defaultView?.getComputedStyle(node).visibility !== 'hidden',
    )
  const focus = (entry: Entry, preferred?: HTMLElement | null) => {
    if (curtain()) return
    const element = entry.options.element,
      target =
        preferred?.isConnected && element.contains(preferred) && !preferred.closest('[inert]')
          ? preferred
          : focusable(element)[0]
    if (target) target.focus({ preventScroll: true })
    else {
      if (!element.hasAttribute('tabindex')) element.tabIndex = -1
      element.focus({ preventScroll: true })
    }
  }
  const restoreInert = () => {
    for (const [element, wasInert] of inert) {
      if (!wasInert) element.removeAttribute('inert')
    }
    inert.clear()
  }
  const block = (element: HTMLElement) => {
    if (!inert.has(element)) inert.set(element, element.hasAttribute('inert'))
    element.setAttribute('inert', '')
  }
  const sync = (preferred?: HTMLElement | null) => {
    restoreInert()
    const next = top(),
      changed = next !== current
    current = next
    if (next?.options.modal) {
      for (const child of owner.children)
        if (child instanceof HTMLElement && child !== host) block(child)
      for (const child of host.children)
        if (
          child instanceof HTMLElement &&
          child !== next.options.element &&
          !child.contains(next.options.element) &&
          !child.matches('.frade-theme-commit-barrier')
        )
          block(child)
    }
    if (changed && next) focus(next, preferred)
    if (changed) for (const listener of [...listeners]) listener()
  }
  const cancelTop = (): Promise<boolean> => {
    const entry = top()
    if (!entry || disposed || curtain()) return Promise.resolve(false)
    if (entry.canceling) return entry.canceling
    const pending = (async () => {
      try {
        return await entry.options.cancel()
      } catch (error) {
        const message =
          'Закрытие не выполнено: ' + (error instanceof Error ? error.message : String(error))
        if (entries.get(entry.options.id) === entry) {
          if (!entry.failure) {
            entry.failure = doc.createElement('p')
            entry.failure.setAttribute('role', 'status')
            entry.failure.setAttribute('aria-live', 'polite')
            entry.failure.setAttribute('aria-atomic', 'true')
            entry.options.element.append(entry.failure)
          }
          entry.failure.textContent = message
        }
        return false
      }
    })()
    entry.canceling = pending
    const clear = () => {
      if (entry.canceling === pending) entry.canceling = undefined
    }
    void pending.then(clear, clear)
    return pending
  }
  const pointer = (event: Event) => {
    const entry = top(),
      target = event.target
    if (
      !disposed &&
      !curtain() &&
      entry?.options.outside === 'cancel' &&
      target instanceof Node &&
      !entry.options.element.contains(target)
    )
      void cancelTop()
  }
  const focusIn = (event: FocusEvent) => {
    const entry = top()
    if (
      !disposed &&
      !curtain() &&
      !redirecting &&
      entry?.options.modal &&
      event.target instanceof Node &&
      !entry.options.element.contains(event.target)
    ) {
      redirecting = true
      try {
        focus(entry)
      } finally {
        redirecting = false
      }
    }
  }
  doc.addEventListener('pointerdown', pointer, true)
  doc.addEventListener('focusin', focusIn, true)
  const registry: ManagedOverlays = {
    register: (options) => {
      if (
        disposed ||
        !options.id ||
        entries.has(options.id) ||
        !host.contains(options.element) ||
        !Number.isFinite(options.priority)
      )
        throw Error('Invalid/duplicate managed overlay: ' + options.id)
      const entry: Entry = {
        options,
        sequence: ++sequence,
        opener:
          options.opener ?? (doc.activeElement instanceof HTMLElement ? doc.activeElement : null),
        modal: options.element.getAttribute('aria-modal'),
        tabIndex: options.element.getAttribute('tabindex'),
      }
      entries.set(options.id, entry)
      if (options.modal) options.element.setAttribute('aria-modal', 'true')
      sync(options.initialFocus)
      return () => {
        if (entries.get(options.id) !== entry) return
        const wasTop = top() === entry
        entries.delete(options.id)
        entry.failure?.remove()
        if (entry.modal === null) options.element.removeAttribute('aria-modal')
        else options.element.setAttribute('aria-modal', entry.modal)
        if (entry.tabIndex === null) options.element.removeAttribute('tabindex')
        else options.element.setAttribute('tabindex', entry.tabIndex)
        sync(wasTop ? entry.opener : undefined)
        if (wasTop && !current && entry.opener?.isConnected && !entry.opener.closest('[inert]'))
          entry.opener.focus({ preventScroll: true })
      }
    },
    top: () => top()?.options,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    handleKey: (event) => {
      const entry = top()
      if (disposed || !entry || curtain() || event.isComposing || event.keyCode === 229)
        return false
      if (event.key === 'Escape') {
        event.preventDefault()
        void cancelTop()
        return true
      }
      if (
        event.key !== 'Tab' ||
        !entry.options.modal ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return false
      const controls = focusable(entry.options.element),
        index = controls.indexOf(doc.activeElement as HTMLElement)
      event.preventDefault()
      if (!controls.length) focus(entry)
      else
        controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length].focus({
          preventScroll: true,
        })
      return true
    },
    cancelTop,
    dispose: () => {
      if (disposed) return
      disposed = true
      doc.removeEventListener('pointerdown', pointer, true)
      doc.removeEventListener('focusin', focusIn, true)
      restoreInert()
      for (const entry of entries.values()) {
        const element = entry.options.element
        entry.failure?.remove()
        if (entry.modal === null) element.removeAttribute('aria-modal')
        else element.setAttribute('aria-modal', entry.modal)
        if (entry.tabIndex === null) element.removeAttribute('tabindex')
        else element.setAttribute('tabindex', entry.tabIndex)
      }
      entries.clear()
      listeners.clear()
      current = undefined
    },
  }
  return registry
}
