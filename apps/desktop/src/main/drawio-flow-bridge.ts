/** Self-contained unprivileged bridge; serialized into the isolated native editor. */
export function drawioFlowBridge(parentOrigin: string) {
  const globals = window as any
  let graph: any,
    hooked = false,
    repositoryId = '',
    active: any,
    sequence = 0
  const badges = new Map<string, string>(),
    pending = new Map<
      number,
      {
        cell: any
        terminal: any
        source: boolean
        args: any[]
        oldA: any
        oldB: any
        oldMembers: string
      }
    >()
  let panelMode: ((open: boolean) => void) | undefined
  let pressed = false,
    pointerId = 1
  const releasePointer = (x = 0, y = 0) => {
    if (!pressed) return
    pressed = false
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        bubbles: true,
        pointerId,
        pointerType: 'mouse',
        isPrimary: true,
        button: 0,
        buttons: 0,
        clientX: x,
        clientY: y,
      }),
    )
    document.dispatchEvent(
      new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y, buttons: 0 }),
    )
    graph?.escape?.()
    if (graph) graph.isMouseDown = false
  }
  document.addEventListener(
    'pointerdown',
    (event) => {
      pointerId = event.pointerId
      pressed = true
    },
    true,
  )
  document.addEventListener(
    'pointerup',
    () => {
      pressed = false
    },
    true,
  )
  document.addEventListener('pointercancel', () => releasePointer(), true)
  document.addEventListener(
    'pointermove',
    (event) => {
      if (pressed && event.buttons === 0) releasePointer(event.clientX, event.clientY)
    },
    true,
  )
  window.addEventListener('blur', () => releasePointer())
  const post = (data: unknown) => window.parent.postMessage(JSON.stringify(data), parentOrigin)
  const ref = (cell: any) => {
    const value = cell?.value
    const id = value?.getAttribute?.('fradeObjectId')
    return id && !value.getAttribute('fradeSourceId') ? { repositoryId, objectId: id } : undefined
  }
  const validRefs = (refs: unknown): refs is { repositoryId: string; objectId: string }[] =>
    Array.isArray(refs) &&
    refs.length <= 100000 &&
    refs.every(
      (r) =>
        r &&
        typeof r.repositoryId === 'string' &&
        r.repositoryId.length > 0 &&
        typeof r.objectId === 'string' &&
        r.objectId.length > 0 &&
        Object.keys(r).length === 2,
    ) &&
    new Set(refs.map((r) => JSON.stringify([r.repositoryId, r.objectId]))).size === refs.length
  const members = (cell: any) => {
    try {
      const data = JSON.parse(cell.value.getAttribute('fradeIntegrationFlowRefs') ?? '[]')
      return validRefs(data) ? data : []
    } catch {
      return []
    }
  }
  const state = (cell: any, a?: any, b?: any) => ({
    id: cell.id,
    endpointA: ref(a ?? graph.getModel().getTerminal(cell, true)),
    endpointB: ref(b ?? graph.getModel().getTerminal(cell, false)),
    members: members(cell),
    invalidMembership: (() => {
      try {
        return !validRefs(JSON.parse(cell.value.getAttribute('fradeIntegrationFlowRefs') ?? '[]'))
      } catch {
        return true
      }
    })(),
  })
  const isBundle = (cell: any) =>
    !!cell?.edge && cell.value?.getAttribute?.('fradeBundle') === 'empty'
  const sendState = (cell: any, event = 'selected') => {
    if (!isBundle(cell)) return
    active = cell
    post({ event: 'fradeFlow', kind: event, bundle: state(cell) })
  }
  const setMembers = (cell: any, refs: unknown) => {
    if (!validRefs(refs)) throw Error('Invalid members')
    const value = cell.value.cloneNode(true)
    value.setAttribute('fradeIntegrationFlowRefs', JSON.stringify(refs))
    graph.getModel().setValue(cell, value)
  }
  window.addEventListener('message', (event: MessageEvent) => {
    if (
      event.source !== window.parent ||
      event.origin !== parentOrigin ||
      typeof event.data !== 'string' ||
      event.data.length > 6 * 1024 * 1024
    )
      return
    let data: any
    try {
      data = JSON.parse(event.data)
    } catch {
      return
    }
    if (!data || typeof data !== 'object') return
    if (data.action === 'configure' && !hooked && globals.EditorUi) {
      hooked = true
      const prototype = globals.EditorUi.prototype,
        original = prototype.init
      prototype.init = function (...args: any[]) {
        const result = original.apply(this, args)
        graph = this.editor.graph
        const model = graph.getModel()
        let savedPanels: { shapes: number; format: number } | undefined
        panelMode = (open: boolean) => {
          if (open && !savedPanels) {
            savedPanels = { shapes: this.hsplitPosition, format: this.formatWidth }
            this.hsplitPosition = 0
            this.formatWidth = 0
            this.refresh(true)
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                if (savedPanels && active && model.getCell(active.id) === active)
                  graph.scrollCellToVisible(active, true)
              }),
            )
          } else if (!open && savedPanels) {
            const saved = savedPanels
            savedPanels = undefined
            this.hsplitPosition = saved.shapes
            this.formatWidth = saved.format
            this.refresh(true)
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                if (!savedPanels && active && model.getCell(active.id) === active)
                  graph.scrollCellToVisible(active, true)
              }),
            )
          }
        }
        const annotate = () => {
          for (const cell of model.getDescendants(model.getRoot()))
            if (isBundle(cell))
              post({ event: 'fradeFlow', kind: 'annotation', bundle: state(cell) })
        }
        ;(graph as any).fradeAnnotateBundles = annotate
        graph.getSelectionModel().addListener('change', () => sendState(graph.getSelectionCell()))
        model.addListener('change', () => {
          annotate()
          if (active && model.getCell(active.id) === active) sendState(active, 'changed')
          else if (active) {
            post({ event: 'fradeFlow', kind: 'removed', id: active.id })
            active = undefined
          }
        })
        const nativeDoubleClick = graph.dblClick
        graph.dblClick = function (event: MouseEvent, cell: any) {
          let bundle = isBundle(cell) ? cell : undefined
          if (!bundle) {
            const point = globals.mxUtils.convertPoint(
              graph.container,
              event.clientX,
              event.clientY,
            )
            bundle = model.getDescendants(model.getRoot()).find((candidate: any) => {
              if (!isBundle(candidate)) return false
              const points = graph.getView().getState(candidate)?.absolutePoints ?? []
              return points.some(
                (p: any, i: number) =>
                  i > 0 &&
                  p &&
                  points[i - 1] &&
                  globals.mxUtils.ptSegDistSq(
                    points[i - 1].x,
                    points[i - 1].y,
                    p.x,
                    p.y,
                    point.x,
                    point.y,
                  ) <= 64,
              )
            })
          }
          if (bundle) {
            globals.mxEvent.consume(event)
            sendState(bundle, 'open')
            return
          }
          return nativeDoubleClick.call(this, event, cell)
        }
        graph.addListener('doubleClick', (_sender: any, event: any) => {
          const cell = event.getProperty('cell')
          if (isBundle(cell)) {
            event.consume()
            sendState(cell, 'open')
          }
        })
        graph.addMouseListener({
          mouseDown: () => {},
          mouseUp: () => {},
          mouseMove: (_sender: any, event: any) => {
            const cell = event.getCell()
            if (isBundle(cell) && cell !== active) sendState(cell, 'hover')
          },
        })
        graph.connectionHandler?.addListener('connect', (_sender: any, event: any) => {
          const cell = event.getProperty('cell')
          if (isBundle(cell)) sendState(cell, 'created')
        })
        const popup = this.menus.createPopupMenu
        this.menus.createPopupMenu = function (menu: any, ...args: any[]) {
          popup.call(this, menu, ...args)
          const cell = graph.getSelectionCell()
          if (isBundle(cell)) {
            menu.addSeparator()
            menu.addItem('Интеграционные потоки…', null, () => sendState(cell, 'open'))
          }
        }
        const text = graph.convertValueToString
        graph.convertValueToString = function (cell: any) {
          const label = text.call(this, cell)
          if (!isBundle(cell)) return label
          return badges.get(cell.id) ?? ''
        }
        const cellStyle = graph.getCellStyle
        graph.getCellStyle = function (cell: any, ...args: any[]) {
          const style = cellStyle.call(this, cell, ...args)
          return isBundle(cell)
            ? { ...style, align: 'left', labelBackgroundColor: '#FFFFFFAA' }
            : style
        }
        const measure = document.createElement('canvas').getContext('2d')
        const view = graph.getView(),
          edgeLabelOffset = view.updateEdgeLabelOffset
        view.updateEdgeLabelOffset = function (state: any) {
          edgeLabelOffset.call(this, state)
          const geometry = model.getGeometry(state.cell)
          if (isBundle(state.cell) && !geometry?.x && !geometry?.y && !geometry?.offset) {
            const lines = (badges.get(state.cell.id) ?? '').split('\n')
            if (measure)
              measure.font =
                (state.style.fontSize ?? 11) + 'px ' + (state.style.fontFamily ?? 'Arial')
            const width = Math.max(
              0,
              ...lines.map((line: string) => measure?.measureText(line).width ?? line.length * 7),
            )
            state.absoluteOffset.x -= width / 2
            state.absoluteOffset.y -= 48 + (lines.length - 1) * 8
          }
        }
        const isHtmlLabel = graph.isHtmlLabel
        graph.isHtmlLabel = function (cell: any) {
          return isBundle(cell) ? false : isHtmlLabel.call(this, cell)
        }
        const connect = graph.connectCell
        graph.connectCell = function (cell: any, terminal: any, source: boolean, ...args: any[]) {
          if (!isBundle(cell) || members(cell).length === 0)
            return connect.call(this, cell, terminal, source, ...args)
          const oldA = model.getTerminal(cell, true),
            oldB = model.getTerminal(cell, false)
          if ((source ? oldA : oldB) === terminal)
            return connect.call(this, cell, terminal, source, ...args)
          const token = ++sequence
          pending.set(token, {
            cell,
            terminal,
            source,
            args,
            oldA,
            oldB,
            oldMembers: JSON.stringify(members(cell)),
          })
          post({
            event: 'fradeFlow',
            kind: 'reconnect',
            token,
            bundle: state(cell, source ? terminal : oldA, source ? oldB : terminal),
          })
          graph.refresh()
          return cell
        }
        ;(graph as any).fradeCompleteReconnect = (
          token: number,
          refs: unknown,
          commit: boolean,
        ) => {
          const operation = pending.get(token)
          pending.delete(token)
          if (!operation) return
          const { cell, terminal, source, args, oldA, oldB } = operation
          if (
            !commit ||
            !graph.isEnabled() ||
            graph.isCellLocked(cell) ||
            model.getCell(cell.id) !== cell ||
            model.getTerminal(cell, true) !== oldA ||
            model.getTerminal(cell, false) !== oldB ||
            JSON.stringify(members(cell)) !== operation.oldMembers
          ) {
            graph.refresh()
            return
          }
          model.beginUpdate()
          try {
            connect.call(graph, cell, terminal, source, ...args)
            setMembers(cell, refs)
          } finally {
            model.endUpdate()
          }
        }
        return result
      }
    }
    if (data.action !== 'fradeFlow') return
    event.stopImmediatePropagation()
    if (data.kind === 'init' && typeof data.repositoryId === 'string') {
      repositoryId = data.repositoryId
      graph?.fradeAnnotateBundles?.()
      return
    }
    if (data.kind === 'releasePointer') {
      releasePointer(data.x, data.y)
      return
    }
    if (!graph) return
    if (data.kind === 'panel' && typeof data.open === 'boolean') {
      panelMode?.(data.open)
      return
    }
    if (
      data.kind === 'badge' &&
      typeof data.id === 'string' &&
      typeof data.text === 'string' &&
      data.text.length <= 1024 * 1024
    ) {
      badges.set(data.id, data.text)
      const cell = graph.getModel().getCell(data.id)
      if (cell) graph.refresh(cell)
      return
    }
    if (data.kind === 'reconnect') {
      graph.fradeCompleteReconnect(data.token, data.members, data.commit === true)
      return
    }
    if (data.kind === 'membership') {
      try {
        const cell = graph.getModel().getCell(data.id)
        if (!isBundle(cell) || !graph.isEnabled() || graph.isCellLocked(cell))
          throw Error('Bundle unavailable')
        const model = graph.getModel()
        model.beginUpdate()
        try {
          setMembers(cell, data.members)
        } finally {
          model.endUpdate()
        }
        post({ event: 'fradeFlow', kind: 'ack', requestId: data.requestId, ok: true })
      } catch {
        post({ event: 'fradeFlow', kind: 'ack', requestId: data.requestId, ok: false })
      }
    }
  })
}
