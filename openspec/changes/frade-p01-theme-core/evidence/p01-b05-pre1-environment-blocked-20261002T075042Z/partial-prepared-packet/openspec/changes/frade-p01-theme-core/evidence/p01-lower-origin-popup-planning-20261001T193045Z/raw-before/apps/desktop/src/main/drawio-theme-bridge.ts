/** Self-contained DOM-only projection serialized into the unprivileged pinned editor. */
export function drawioThemeBridge(parentOrigin: string): () => void {
  if (parentOrigin !== 'frade://app') {
    const url = new URL(parentOrigin)
    if (
      url.protocol !== 'http:' ||
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      url.origin !== parentOrigin
    )
      throw Error('Invalid presentation parent origin')
  }
  // Kept inside the serialized function. Unit projection checks compare all roles with the canonical DTO.
  const roles = [
    'surface.base',
    'surface.panel',
    'surface.rail',
    'surface.hover',
    'surface.overlay',
    'text.primary',
    'text.secondary',
    'text.disabled',
    'border.subtle',
    'border.control',
    'action.primary',
    'action.primaryHover',
    'action.onPrimary',
    'selection.bg',
    'selection.fg',
    'selection.indicator',
    'focus.ring',
    'status.success',
    'status.successBg',
    'status.warning',
    'status.warningBg',
    'status.error',
    'status.errorBg',
    'status.info',
    'status.infoBg',
    'diagram.canvas',
    'diagram.grid',
    'diagram.nodeBg',
    'diagram.nodeStroke',
    'diagram.edge',
    'diagram.selection',
  ]
  const phaseKeys = [
    'version',
    'requestId',
    'sessionId',
    'generation',
    'transactionId',
    'revision',
    'membership',
    'phase',
  ]
  const globals = window as any,
    root = document.documentElement
  let graph: any,
    ui: any,
    disposed = false,
    hooked = false,
    prototype: any,
    originalInit: any,
    installedInit: any
  let owner: any,
    prepared: any,
    active: any,
    epoch = 0,
    patternSequence = 0,
    chordUntil = 0
  let installedStyle: HTMLStyleElement | undefined,
    overlay: SVGSVGElement | undefined,
    observer: MutationObserver | undefined
  const attributes = new Map<string, string | null>(),
    properties = new Map<string, { value: string; priority: string }>(),
    masks = new Map<Element, string | null>()
  const identity = (value: unknown) =>
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 160 &&
    /^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value) &&
    !value.split('/').some((part) => !part || part === '.' || part === '..')
  const fields = (value: any, names: string[]) =>
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === names.length &&
    names.every((name) => Object.hasOwn(value, name))
  const integer = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0
  const sameOwner = (a: any, b: any) =>
    a && b && phaseKeys.filter((key) => key !== 'phase').every((key) => a[key] === b[key])
  const validPhase = (value: any) =>
    fields(value, phaseKeys) &&
    value.version === 1 &&
    ['prepare', 'apply', 'rollback', 'join'].includes(value.phase) &&
    ['requestId', 'sessionId', 'transactionId'].every((key) => identity(value[key])) &&
    value.requestId === value.transactionId &&
    ['generation', 'revision', 'membership'].every((key) => integer(value[key]))
  const systemColor = (role: string) =>
    [
      'action.primary',
      'action.primaryHover',
      'selection.bg',
      'selection.indicator',
      'focus.ring',
      'diagram.selection',
    ].includes(role)
      ? 'Highlight'
      : ['action.onPrimary', 'selection.fg'].includes(role)
        ? 'HighlightText'
        : role.startsWith('surface.') || role.endsWith('Bg') || role === 'diagram.canvas'
          ? 'Canvas'
          : 'CanvasText'
  function validSnapshot(value: any, context: any): boolean {
    if (
      !fields(value, [
        'id',
        'label',
        'kind',
        'density',
        'revision',
        'colors',
        'effectiveColors',
        'forcedColors',
        'status',
        'repairPasses',
        'issues',
        'compatibility',
      ]) ||
      !identity(value.id) ||
      typeof value.label !== 'string' ||
      value.label.length < 1 ||
      value.label.length > 160 ||
      !['light', 'dark', 'high-contrast'].includes(value.kind) ||
      !['compact', 'comfortable'].includes(value.density) ||
      value.revision !== context.revision ||
      typeof value.forcedColors !== 'boolean' ||
      !['VALID', 'REPAIRED', 'FALLBACK'].includes(value.status) ||
      !integer(value.repairPasses) ||
      value.repairPasses > 10 ||
      !fields(value.colors, roles) ||
      !fields(value.effectiveColors, roles)
    )
      return false
    if (
      roles.some(
        (role) =>
          typeof value.colors[role] !== 'string' ||
          !/^#[0-9a-f]{6}$/i.test(value.colors[role]) ||
          value.effectiveColors[role] !==
            (value.forcedColors ? systemColor(role) : value.colors[role]),
      )
    )
      return false
    const text = (item: unknown, max = 512) =>
      typeof item === 'string' &&
      item.length > 0 &&
      item.length <= max &&
      ![...item].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
    if (
      !Array.isArray(value.issues) ||
      value.issues.length > 128 ||
      value.issues.some(
        (item: any) =>
          !fields(item, [
            'code',
            'source',
            'message',
            ...(Object.hasOwn(item ?? {}, 'role') ? ['role'] : []),
          ]) ||
          !text(item.code, 160) ||
          !text(item.source, 160) ||
          !text(item.message) ||
          (Object.hasOwn(item, 'role') && !text(item.role, 160)),
      )
    )
      return false
    if (!fields(value.compatibility, ['recognized', 'ignored', 'repaired'])) return false
    for (const key of ['recognized', 'ignored', 'repaired']) {
      const items = value.compatibility[key]
      if (
        !Array.isArray(items) ||
        items.length > 128 ||
        new Set(items).size !== items.length ||
        items.some(
          (item: unknown) =>
            !text(item, 160) || (key !== 'ignored' && !roles.includes(item as string)),
        )
      )
        return false
    }
    return true
  }
  const post = (data: unknown) => window.parent.postMessage(JSON.stringify(data), parentOrigin)
  const reply = (request: any, status: 'READY' | 'PAINTED' | 'REFUSED', message?: string) =>
    post({
      event: 'fradePresentation',
      version: 1,
      participantId: request.participantId,
      participantGeneration: request.participantGeneration,
      context: request.context,
      operation: request.operation,
      status,
      ...(message ? { message: message.slice(0, 512) } : {}),
    })
  const paint = () =>
    new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())),
    )
  const privateRoot = 'html[data-frade-frame-runtime="1"]'
  function stylesheet(snapshot: any): HTMLStyleElement {
    const style = document.createElement('style')
    style.setAttribute('data-frade-private-theme', '1')
    const chrome = [
        '.geMenubarContainer',
        '.geToolbarContainer',
        '.geSidebarContainer',
        '.geFormatContainer',
        '.geFooterContainer',
        '.geDialog',
        '.mxPopupMenu',
      ],
      controls = chrome.flatMap((selector) =>
        ['button', 'input', 'select', 'textarea', 'a.geButton', 'a.geItem', 'a.geStatus'].map(
          (child) => privateRoot + ' ' + selector + ' ' + child,
        ),
      ),
      prefix = (selector: string) => privateRoot + ' ' + selector
    style.textContent =
      chrome.map(prefix).join(',') +
      '{background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;border-color:var(--frade-frame-border-subtle)!important;color-scheme:' +
      (snapshot.kind === 'light' ? 'light' : 'dark') +
      ';}' +
      controls.join(',') +
      '{background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;border-color:var(--frade-frame-border-control)!important;min-height:' +
      (snapshot.density === 'compact' ? 28 : 36) +
      'px;min-width:24px;box-sizing:border-box;}' +
      controls.map((selector) => selector + ':hover').join(',') +
      '{background-color:var(--frade-frame-surface-hover)!important;}' +
      controls.map((selector) => selector + ':focus-visible').join(',') +
      '{outline:2px solid var(--frade-frame-focus-ring)!important;outline-offset:2px;}' +
      [prefix('.geMenubarContainer'), prefix('.geMenubar'), prefix('.geToolbarContainer')].join(
        ',',
      ) +
      '{min-height:' +
      (snapshot.density === 'compact' ? 28 : 36) +
      'px;}' +
      prefix('.geDiagramContainer') +
      '{background-color:var(--frade-frame-diagram-canvas)!important;}' +
      prefix('[data-frade-presentation-grid-layer]') +
      '{background-image:none!important;}' +
      '@media(pointer:coarse){' +
      controls.join(',') +
      '{min-height:44px;min-width:44px;}' +
      [prefix('.geMenubarContainer'), prefix('.geMenubar'), prefix('.geToolbarContainer')].join(
        ',',
      ) +
      '{min-height:44px;}}'
    return style
  }
  const ownAttribute = (name: string, value: string) => {
    if (!attributes.has(name)) attributes.set(name, root.getAttribute(name))
    root.setAttribute(name, value)
  }
  const ownProperty = (name: string, value: string) => {
    if (!properties.has(name))
      properties.set(name, {
        value: root.style.getPropertyValue(name),
        priority: root.style.getPropertyPriority(name),
      })
    root.style.setProperty(name, value)
  }
  function createGrid(): SVGSVGElement {
    const ns = 'http://www.w3.org/2000/svg',
      svg = document.createElementNS(ns, 'svg'),
      defs = document.createElementNS(ns, 'defs'),
      pattern = document.createElementNS(ns, 'pattern'),
      dot = document.createElementNS(ns, 'circle'),
      rect = document.createElementNS(ns, 'rect')
    const id = 'frade-private-grid-' + ++patternSequence
    svg.setAttribute('data-frade-private-grid', '1')
    svg.setAttribute('aria-hidden', 'true')
    svg.style.position = 'absolute'
    svg.style.left = '0'
    svg.style.top = '0'
    svg.style.pointerEvents = 'none'
    pattern.setAttribute('id', id)
    pattern.setAttribute('patternUnits', 'userSpaceOnUse')
    dot.setAttribute('cx', '0')
    dot.setAttribute('cy', '0')
    dot.setAttribute('r', '0.6')
    pattern.append(dot)
    defs.append(pattern)
    rect.setAttribute('width', '100%')
    rect.setAttribute('height', '100%')
    rect.setAttribute('fill', 'url(#' + id + ')')
    svg.append(defs, rect)
    return svg
  }
  function syncProjection(): void {
    if (!active || !graph?.container) return
    const container = graph.container as HTMLElement,
      view = graph.view,
      canvas = view?.canvas as Element | undefined
    // The vendor stores grid background-image on paper DOM or the outer view SVG.
    // Mask only that grid image; keep all paper/background colors, images and cell paint unchanged.
    const layer = (view?.backgroundPageShape?.node ??
      ((canvas instanceof SVGElement ? canvas.ownerSVGElement : undefined) || canvas)) as
      Element | undefined
    if (layer && !masks.has(layer)) {
      masks.set(layer, layer.getAttribute('data-frade-presentation-grid-layer'))
      layer.setAttribute('data-frade-presentation-grid-layer', '1')
    }
    if (!overlay || overlay.parentElement !== container) {
      overlay = createGrid()
      const before = (canvas instanceof SVGElement ? canvas.ownerSVGElement : undefined) || canvas
      container.insertBefore(overlay, before?.parentNode === container ? before : null)
    }
    const scale = Number(view?.scale ?? 1),
      translate = view?.translate ?? { x: 0, y: 0 },
      size = Number(graph.gridSize ?? 10) * scale
    if (
      !Number.isFinite(scale) ||
      scale <= 0 ||
      !Number.isFinite(size) ||
      size <= 0 ||
      !Number.isFinite(translate.x) ||
      !Number.isFinite(translate.y)
    )
      throw Error('Invalid diagram view transform')
    overlay.setAttribute('width', String(Math.max(container.clientWidth, container.scrollWidth)))
    overlay.setAttribute('height', String(Math.max(container.clientHeight, container.scrollHeight)))
    const enabled = typeof graph.isGridEnabled === 'function' ? graph.isGridEnabled() : true
    overlay.style.display = enabled ? '' : 'none'
    const pattern = overlay.querySelector('pattern')!,
      dot = overlay.querySelector('circle')!
    pattern.setAttribute('width', String(size))
    pattern.setAttribute('height', String(size))
    pattern.setAttribute('x', String(translate.x * scale))
    pattern.setAttribute('y', String(translate.y * scale))
    dot.setAttribute('fill', active.snapshot.effectiveColors['diagram.grid'])
  }
  async function redraw(): Promise<void> {
    if (!active || disposed) return
    const request = active.request,
      token = epoch
    try {
      syncProjection()
      await paint()
      if (!disposed && token === epoch && active?.request === request) reply(request, 'PAINTED')
    } catch (error) {
      if (!disposed && token === epoch)
        reply(request, 'REFUSED', error instanceof Error ? error.message : String(error))
    }
  }
  const viewChanged = () => {
    void redraw()
  }
  function attach(instance: any) {
    ui = instance
    graph = instance.editor?.graph
    if (!graph?.container) return
    for (const event of ['scale', 'translate', 'scaleAndTranslate'])
      graph.view?.addListener?.(event, viewChanged)
    ui.editor?.addListener?.('pageSelected', viewChanged)
    graph.container.addEventListener('scroll', viewChanged)
    observer = new MutationObserver((records) => {
      if (
        records.some((record) => {
          const target = record.target as Element
          if (target === overlay || overlay?.contains(target)) return false
          if (
            record.type === 'childList' &&
            record.removedNodes.length === 0 &&
            Array.from(record.addedNodes).every(
              (node) => node === overlay || overlay?.contains(node),
            )
          )
            return false
          return true
        })
      )
        viewChanged()
    })
    observer.observe(graph.container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style'],
    })
  }
  function clearProjection() {
    installedStyle?.remove()
    installedStyle = undefined
    overlay?.remove()
    overlay = undefined
    for (const [element, value] of masks) {
      if (value === null) element.removeAttribute('data-frade-presentation-grid-layer')
      else element.setAttribute('data-frade-presentation-grid-layer', value)
    }
    masks.clear()
    for (const [name, value] of attributes) {
      if (value === null) root.removeAttribute(name)
      else root.setAttribute(name, value)
    }
    attributes.clear()
    for (const [name, property] of properties) {
      if (property.value) root.style.setProperty(name, property.value, property.priority)
      else root.style.removeProperty(name)
    }
    properties.clear()
    if (root.style.length === 0) root.removeAttribute('style')
    prepared = undefined
    active = undefined
    chordUntil = 0
  }
  async function apply(request: any, snapshot: any, style: HTMLStyleElement) {
    const token = ++epoch
    installedStyle?.remove()
    installedStyle = style
    document.head.append(style)
    ownAttribute('data-frade-frame-runtime', '1')
    ownAttribute('data-frade-frame-theme', snapshot.kind)
    ownAttribute('data-frade-frame-density', snapshot.density)
    ownAttribute('data-frade-frame-revision', String(snapshot.revision))
    for (const role of roles)
      ownProperty('--frade-frame-' + role.replaceAll('.', '-'), snapshot.effectiveColors[role])
    active = { request, snapshot }
    syncProjection()
    await paint()
    if (!disposed && token === epoch && active?.request === request) reply(request, 'PAINTED')
  }
  function validRequest(value: any): boolean {
    if (
      !fields(value, [
        'action',
        'version',
        'participantId',
        'participantGeneration',
        'context',
        'operation',
        ...(['prepare', 'rollback'].includes(value.operation) ? ['snapshot'] : []),
      ]) ||
      value.action !== 'fradePresentation' ||
      value.version !== 1 ||
      !identity(value.participantId) ||
      !integer(value.participantGeneration) ||
      value.participantGeneration < 1 ||
      !validPhase(value.context) ||
      !['prepare', 'apply', 'rollback', 'release', 'detach'].includes(value.operation)
    )
      return false
    const context = value.context
    if (
      (value.operation === 'prepare' && !['prepare', 'join', 'rollback'].includes(context.phase)) ||
      (value.operation === 'apply' && !['apply', 'join', 'rollback'].includes(context.phase)) ||
      (value.operation === 'rollback' && context.phase !== 'rollback')
    )
      return false
    if (
      ['prepare', 'rollback'].includes(value.operation) &&
      !validSnapshot(value.snapshot, context)
    )
      return false
    if (
      owner &&
      (context.sessionId !== owner.context.sessionId ||
        value.participantId !== owner.participantId ||
        value.participantGeneration < owner.participantGeneration ||
        context.generation < owner.context.generation)
    )
      return false
    if (
      owner &&
      value.participantGeneration > owner.participantGeneration &&
      value.operation !== 'prepare'
    )
      return false
    return true
  }
  const receive = (event: MessageEvent) => {
    if (
      disposed ||
      event.source !== window.parent ||
      event.origin !== parentOrigin ||
      typeof event.data !== 'string' ||
      new TextEncoder().encode(event.data).byteLength > 32768
    )
      return
    let value: any
    try {
      value = JSON.parse(event.data)
    } catch {
      return
    }
    if (value?.action === 'configure' && !hooked && globals.EditorUi?.prototype) {
      hooked = true
      prototype = globals.EditorUi.prototype
      originalInit = prototype.init
      installedInit = function (this: any, ...args: unknown[]) {
        const result = originalInit.apply(this, args)
        attach(this)
        return result
      }
      prototype.init = installedInit
      return
    }
    // This separate capability must never enter the vendor's semantic embed handler.
    // Consume only a trusted bounded parsed action; strict schema validation still rejects it.
    if (value?.action === 'fradePresentation') event.stopImmediatePropagation()
    if (!validRequest(value)) return
    if (!graph?.container) {
      reply(value, 'REFUSED', 'Frame graph unavailable')
      return
    }
    try {
      if (value.operation === 'prepare') {
        owner = value
        ++epoch
        prepared = { request: value, snapshot: value.snapshot, style: stylesheet(value.snapshot) }
        reply(value, 'READY')
      } else if (value.operation === 'apply') {
        if (
          !prepared ||
          !sameOwner(prepared.request.context, value.context) ||
          value.participantGeneration !== prepared.request.participantGeneration
        ) {
          reply(value, 'REFUSED', 'Unprepared frame presentation owner')
          return
        }
        owner = value
        const candidate = prepared
        prepared = undefined
        void apply(value, candidate.snapshot, candidate.style).catch((error) => {
          if (!disposed && active?.request === value)
            reply(value, 'REFUSED', error instanceof Error ? error.message : String(error))
        })
      } else if (value.operation === 'rollback') {
        owner = value
        prepared = undefined
        void apply(value, value.snapshot, stylesheet(value.snapshot)).catch((error) => {
          if (!disposed && active?.request === value)
            reply(value, 'REFUSED', error instanceof Error ? error.message : String(error))
        })
      } else if (value.operation === 'release') {
        if (prepared && sameOwner(prepared.request.context, value.context)) prepared = undefined
        if (active && sameOwner(active.request.context, value.context)) ++epoch
      } else if (value.operation === 'detach') {
        ++epoch
        clearProjection()
      }
    } catch (error) {
      reply(value, 'REFUSED', error instanceof Error ? error.message : String(error))
    }
  }
  const keydown = (event: KeyboardEvent) => {
    if (
      disposed ||
      !active ||
      event.isComposing ||
      event.keyCode === 229 ||
      event.altKey ||
      event.shiftKey
    )
      return
    const target = event.target as Element | null
    if (
      target?.closest?.(
        'input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"]',
      )
    )
      return
    const key = event.key.toLowerCase(),
      now = performance.now()
    let command: 'k' | 't' | 'Escape' | undefined
    if ((event.ctrlKey || event.metaKey) && key === 'k') {
      chordUntil = now + 1000
      command = 'k'
    } else if ((event.ctrlKey || event.metaKey) && key === 't' && now < chordUntil) {
      chordUntil = 0
      command = 't'
    } else if (key === 'escape' && now < chordUntil) {
      chordUntil = 0
      command = 'Escape'
    }
    if (!command) return
    event.preventDefault()
    event.stopPropagation()
    post({
      event: 'fradePresentationKey',
      version: 1,
      participantId: active.request.participantId,
      participantGeneration: active.request.participantGeneration,
      context: active.request.context,
      key: command,
    })
  }
  const dispose = () => {
    if (disposed) return
    disposed = true
    ++epoch
    observer?.disconnect()
    graph?.view?.removeListener?.(viewChanged)
    ui?.editor?.removeListener?.(viewChanged)
    graph?.container?.removeEventListener('scroll', viewChanged)
    window.removeEventListener('message', receive)
    document.removeEventListener('keydown', keydown, true)
    window.removeEventListener('pagehide', dispose)
    if (prototype?.init === installedInit) prototype.init = originalInit
    clearProjection()
  }
  window.addEventListener('message', receive)
  document.addEventListener('keydown', keydown, true)
  window.addEventListener('pagehide', dispose)
  return dispose
}
