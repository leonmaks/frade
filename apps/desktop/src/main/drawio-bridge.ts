/** Runs only inside the isolated Draw.io frame, with no Electron or filesystem API. */
export function drawioRepositoryBridge(parentOrigin: string) {
  type Cell = { value?: Element; vertex?: boolean; edge?: boolean }
  type Model = {
    beginUpdate(): void
    endUpdate(): void
    getTerminal(cell: Cell, source: boolean): Cell | null
    setValue(cell: Cell, value: Element): void
    getRoot(): Cell
    getDescendants(cell: Cell): Cell[]
  }
  type Graph = {
    connectionHandler?: {
      addListener(
        name: string,
        callback: (sender: unknown, event: { getProperty(name: string): Cell | undefined }) => void,
      ): void
    }
    container: HTMLElement
    isEnabled(): boolean
    getPointForEvent(event: DragEvent, snap: boolean): { x: number; y: number }
    getDefaultParent(): unknown
    isCellLocked(cell: unknown): boolean
    getModel(): Model
    getCellStyle(cell: Cell): Record<string, unknown>
    setCellStyles(key: string, value: string, cells: Cell[]): void
    insertVertex(
      parent: unknown,
      id: null,
      value: Element,
      x: number,
      y: number,
      w: number,
      h: number,
      style: string,
    ): Cell
    setSelectionCell(cell: unknown): void
  }
  type Ui = {
    editor: { graph: Graph; addListener(name: string, callback: () => void): void }
    init(...args: unknown[]): unknown
  }
  const globals = window as unknown as { EditorUi?: { prototype: Ui } }
  let graph: Graph | undefined,
    hooked = false,
    enabled = false
  type Appearance = { id: string; sourceId?: string; style: Record<string, string> }
  let appearances = new Map<string, Appearance>(),
    staged = new Map<string, Appearance>(),
    live = false
  let emptyBundle = { stroke: '#404040', width: 1 }
  let applied = new WeakMap<Cell, string>()
  const identity = (id: string, sourceId?: string) => JSON.stringify([id, sourceId ?? ''])
  const validStyle = (input: unknown): input is Record<string, string> => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return false
    const entries = Object.entries(input)
    return (
      entries.length === 11 &&
      entries.every(([key, value]) => {
        if (typeof value !== 'string') return false
        if (['fillColor', 'strokeColor', 'shadowColor'].includes(key))
          return /^#[0-9a-f]{6}$/i.test(value)
        if (key === 'shape') return value === 'rectangle'
        if (key === 'rounded') return value === '0'
        if (key === 'shadow') return value === '0' || value === '1'
        const number = Number(value)
        if (!value.trim() || !Number.isFinite(number)) return false
        if (key === 'strokeWidth') return number >= 0.1 && number <= 20
        if (key === 'shadowOpacity' || key === 'shadowBlur') return number >= 0 && number <= 100
        return ['shadowOffsetX', 'shadowOffsetY'].includes(key) && Math.abs(number) <= 100
      })
    )
  }
  const isSystem = (cell: Cell | null) =>
    !!cell?.value?.getAttribute &&
    appearances.has(
      identity(
        cell.value.getAttribute('fradeObjectId') ?? '',
        cell.value.getAttribute('fradeSourceId') ?? undefined,
      ),
    )
  const applyBundle = (cell: Cell) => {
    if (!graph) return
    const style = {
      strokeColor: emptyBundle.stroke,
      strokeWidth: String(emptyBundle.width),
      startArrow: 'none',
      endArrow: 'none',
      dashed: '0',
    }
    const signature = JSON.stringify(style)
    if (applied.get(cell) === signature) return
    applied.set(cell, signature)
    const current = graph.getCellStyle(cell)
    for (const [key, value] of Object.entries(style))
      if (String(current[key]) !== value) graph.setCellStyles(key, value, [cell])
  }
  const refresh = () => {
    if (!graph || !live || !enabled || !graph.isEnabled()) return
    const model = graph.getModel()
    model.beginUpdate()
    try {
      for (const cell of model.getDescendants(model.getRoot())) {
        const value = cell.value
        if (
          cell.edge &&
          value?.getAttribute?.('fradeBundle') === 'empty' &&
          !graph.isCellLocked(cell)
        ) {
          applyBundle(cell)
          continue
        }
        if (!cell.vertex || !value?.getAttribute || graph.isCellLocked(cell)) continue
        const item = appearances.get(
          identity(
            value.getAttribute('fradeObjectId') ?? '',
            value.getAttribute('fradeSourceId') ?? undefined,
          ),
        )
        if (!item) continue
        const signature = JSON.stringify(item.style)
        if (applied.get(cell) === signature) continue
        applied.set(cell, signature)
        const current = graph.getCellStyle(cell)
        for (const [key, val] of Object.entries(item.style))
          if (String(current[key]) !== val) graph.setCellStyles(key, val, [cell])
      }
    } finally {
      model.endUpdate()
    }
  }
  window.addEventListener('message', (event) => {
    if (
      event.source !== window.parent ||
      event.origin !== parentOrigin ||
      typeof event.data !== 'string' ||
      event.data.length > 65536
    )
      return
    let data
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }
    if (!data || typeof data !== 'object') return
    // Consume only our bridge protocol before the upstream embed handler sees it.
    if (
      [
        'fradeDropState',
        'fradeAppearanceBegin',
        'fradeAppearanceChunk',
        'fradeAppearanceCommit',
        'fradeRepositoryInsert',
      ].includes(data.action)
    )
      event.stopImmediatePropagation()
    // The configure handshake runs after upstream code loads and before it creates its UI.
    if (data.action === 'configure' && !hooked && globals.EditorUi) {
      hooked = true
      const prototype = globals.EditorUi.prototype,
        original = prototype.init
      prototype.init = function (...args: unknown[]) {
        const result = original.apply(this, args)
        graph = this.editor.graph
        this.editor.addListener('pageSelected', refresh)
        graph.connectionHandler?.addListener('connect', (_sender, event) => {
          const cell = event.getProperty('cell')
          if (!graph || !enabled || !graph.isEnabled() || !cell) return
          const model = graph.getModel()
          if (!isSystem(model.getTerminal(cell, true)) || !isSystem(model.getTerminal(cell, false)))
            return
          const value = cell.value?.getAttribute
            ? (cell.value.cloneNode(true) as Element)
            : document.implementation.createDocument('', '', null).createElement('UserObject')
          if (!cell.value?.getAttribute) value.setAttribute('label', String(cell.value ?? ''))
          value.setAttribute('fradeBundle', 'empty')
          model.setValue(cell, value)
          applyBundle(cell)
        })
        return result
      }
    } else if (data.action === 'fradeDropState') {
      enabled = data.enabled === true
    } else if (data.action === 'fradeAppearanceBegin') {
      const bundle = data.emptyBundle
      if (
        bundle &&
        /^#[0-9a-f]{6}$/i.test(bundle.stroke) &&
        typeof bundle.width === 'number' &&
        Number.isFinite(bundle.width) &&
        bundle.width >= 0.1 &&
        bundle.width <= 20
      )
        emptyBundle = { stroke: bundle.stroke, width: bundle.width }
      if (data.live === true && !live) applied = new WeakMap()
      live = data.live === true
      staged = new Map()
    } else if (
      data.action === 'fradeAppearanceChunk' &&
      Array.isArray(data.objects) &&
      data.objects.length <= 50
    ) {
      for (const object of data.objects) {
        if (staged.size >= 100000) break
        if (
          object &&
          typeof object.id === 'string' &&
          object.id.length <= 1000 &&
          (object.sourceId === undefined || typeof object.sourceId === 'string') &&
          validStyle(object.style)
        )
          staged.set(identity(object.id, object.sourceId), object)
      }
    } else if (data.action === 'fradeAppearanceCommit') {
      appearances = staged
      refresh()
    } else if (data.action === 'fradeRepositoryInsert' && graph) {
      const object = data.object,
        clientX = data.clientX,
        clientY = data.clientY
      if (!enabled || !graph.isEnabled() || !Number.isFinite(clientX) || !Number.isFinite(clientY))
        return
      const rect = graph.container.getBoundingClientRect()
      if (
        clientX < rect.left ||
        clientX >= rect.right ||
        clientY < rect.top ||
        clientY >= rect.bottom
      )
        return
      const parent = graph.getDefaultParent()
      if (graph.isCellLocked(parent)) return
      if (
        !object ||
        typeof object.id !== 'string' ||
        typeof object.name !== 'string' ||
        (object.sourceId !== undefined && typeof object.sourceId !== 'string')
      )
        return
      const point = graph.getPointForEvent({ clientX, clientY } as DragEvent, false)
      const doc = document.implementation.createDocument('', '', null)
      const value = doc.createElement('UserObject')
      value.setAttribute('label', object.name)
      value.setAttribute('fradeObjectId', object.id)
      if (object.sourceId) value.setAttribute('fradeSourceId', object.sourceId)
      const model = graph.getModel()
      model.beginUpdate()
      try {
        const cell = graph.insertVertex(
          parent,
          null,
          value,
          point.x,
          point.y,
          180,
          70,
          validStyle(data.style)
            ? 'whiteSpace=wrap;html=0;' +
                Object.entries(data.style)
                  .map(([key, value]) => key + '=' + value + ';')
                  .join('')
            : 'rounded=1;whiteSpace=wrap;html=0;fillColor=#dae8fc;strokeColor=#6c8ebf;',
        )
        if (validStyle(data.style)) applied.set(cell, JSON.stringify(data.style))
        graph.setSelectionCell(cell)
      } finally {
        model.endUpdate()
      }
    }
  })
}
