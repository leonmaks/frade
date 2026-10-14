export interface Shortcut {
  readonly id: string
  readonly context: string
  readonly priority: number
  readonly allowEditable?: boolean
  readonly match: (event: KeyboardEvent) => boolean
  readonly run: (event: KeyboardEvent) => void
}
export interface ShortcutRegistry {
  register(command: Shortcut): () => void
  activate(context: string, priority: number): () => void
  dispatch(event: KeyboardEvent): boolean
  current(): string
  generation(): number
  observe(listener: (event: KeyboardEvent) => void): () => void
  dispose(): void
}
export function isEditingTarget(event: KeyboardEvent): boolean {
  const node = event.target instanceof Element ? event.target : document.activeElement
  return !!node?.closest(
    'input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"]',
  )
}
/** The caller owns one key listener. This registry installs none. */
export function createShortcutRegistry(): ShortcutRegistry {
  const commands = new Map<string, { value: Shortcut; sequence: number }>(),
    contexts = new Map<number, { id: string; priority: number; sequence: number }>(),
    observers = new Set<(event: KeyboardEvent) => void>()
  let sequence = 0,
    generation = 0,
    disposed = false
  const current = () =>
    [...contexts.values()].sort((a, b) => b.priority - a.priority || b.sequence - a.sequence)[0]
      ?.id ?? 'workbench'
  const registry: ShortcutRegistry = {
    register: (command) => {
      if (
        disposed ||
        !command.id ||
        !command.context ||
        !Number.isFinite(command.priority) ||
        commands.has(command.id)
      )
        throw Error('Invalid/duplicate shortcut registration: ' + command.id)
      const item = { value: command, sequence: ++sequence }
      commands.set(command.id, item)
      generation++
      return () => {
        if (commands.get(command.id) === item) {
          commands.delete(command.id)
          generation++
        }
      }
    },
    activate: (id, priority) => {
      if (disposed || !id || !Number.isFinite(priority)) throw Error('Invalid shortcut context')
      const token = ++sequence
      contexts.set(token, { id, priority, sequence: token })
      generation++
      return () => {
        if (contexts.delete(token)) generation++
      }
    },
    current,
    generation: () => generation,
    observe: (listener) => {
      if (disposed) throw Error('Shortcut registry disposed')
      observers.add(listener)
      return () => {
        observers.delete(listener)
      }
    },
    dispatch: (event) => {
      if (disposed || event.defaultPrevented) return false
      for (const listener of observers) listener(event)
      if (event.isComposing || event.keyCode === 229) return false
      const context = current(),
        editing = isEditingTarget(event)
      for (const item of [...commands.values()].sort(
        (a, b) => b.value.priority - a.value.priority || a.sequence - b.sequence,
      )) {
        const command = item.value
        if (
          command.context !== context ||
          (editing && !command.allowEditable) ||
          !command.match(event)
        )
          continue
        event.preventDefault()
        command.run(event)
        return true
      }
      return false
    },
    dispose: () => {
      if (disposed) return
      disposed = true
      commands.clear()
      contexts.clear()
      observers.clear()
      generation++
    },
  }
  return registry
}
export function registerThemeChord(
  registry: ShortcutRegistry,
  open: () => void,
  now: () => number = () => performance.now(),
): () => void {
  let until = 0,
    owner = -1
  const modifier = (event: KeyboardEvent) =>
    (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey
  const active = () => owner === registry.generation() && now() < until
  const reset = () => {
    until = 0
    owner = -1
  }
  const disposers = [
    registry.observe((event) => {
      if (event.isComposing || event.keyCode === 229 || isEditingTarget(event)) {
        reset()
        return
      }
      const key = event.key.toLowerCase()
      if (!((modifier(event) && ['k', 't'].includes(key)) || key === 'escape')) reset()
    }),
    registry.register({
      id: 'frade.theme.chord-start',
      context: 'workbench',
      priority: 100,
      match: (event) => modifier(event) && event.key.toLowerCase() === 'k',
      run: () => {
        owner = registry.generation()
        until = now() + 1000
      },
    }),
    registry.register({
      id: 'frade.theme.chord-complete',
      context: 'workbench',
      priority: 100,
      match: (event) => modifier(event) && event.key.toLowerCase() === 't' && active(),
      run: () => {
        reset()
        open()
      },
    }),
    registry.register({
      id: 'frade.theme.chord-cancel',
      context: 'workbench',
      priority: 100,
      match: (event) => event.key === 'Escape' && active(),
      run: reset,
    }),
  ]
  return () => {
    reset()
    for (const dispose of disposers) dispose()
  }
}
