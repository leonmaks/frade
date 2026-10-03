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
  const upperSelector = privateRoot + ' .geToolbarContainer .geToolbar a.geButton'
  const upperHashes = new Set([
    '0a22cca4e14802d225bb7ef9dd30d4a42b157389a1681b84975349fd18a00b3a',
    '4dc5547840d699651cf7d3059a91d575cddaf80451ab85a7c41ed1d7c7998b24',
    'e78bd38fea8a799c13ffc0fbbab4d9ca6a1ee0ee57360c68596b58e4fe68da9a',
  ])
  type UpperSource = { node: HTMLElement; image: string; bytes: string }
  type UpperProperty = { before: string; priority: string; projected: string; projectedPriority: string }
  type UpperOwner = UpperSource & { marker: string | null; stylePresent: boolean; className: string; properties: Map<string, UpperProperty> }
  const upperVerified = new Map<string, string>(), upperOwners = new Map<HTMLElement, UpperOwner>()
  let upperPaintedRequest: any
  const upperRootOwned = () => !!active && root.getAttribute('data-frade-frame-runtime') === '1' &&
    root.getAttribute('data-frade-frame-revision') === String(active.snapshot.revision)
  const upperLive = (request: any, token: number) =>
    !disposed && epoch === token && active?.request === request && currentPresentation() && upperRootOwned()
  const upperPropertyMatches = (node: HTMLElement, name: string, saved: UpperProperty) =>
    node.style.getPropertyValue(name) === saved.projected && node.style.getPropertyPriority(name) === saved.projectedPriority
  function restoreUpper(node: HTMLElement, saved: UpperOwner) {
    for (const [name, value] of saved.properties) {
      if (!upperPropertyMatches(node, name, value)) continue
      if (value.before) node.style.setProperty(name, value.before, value.priority)
      else node.style.removeProperty(name)
    }
    if (node.getAttribute('data-frade-upper-glyph') === '1') {
      if (saved.marker === null) node.removeAttribute('data-frade-upper-glyph')
      else node.setAttribute('data-frade-upper-glyph', saved.marker)
    }
    if (!node.style.length) {
      if (saved.stylePresent) node.setAttribute('style', '')
      else node.removeAttribute('style')
    }
    upperOwners.delete(node)
  }
  function clearUpper() {
    clearUpperInteraction()
    upperPaintedRequest = undefined
    for (const [node, saved] of upperOwners) restoreUpper(node, saved)
  }
  function upperSource(node: HTMLElement): UpperSource | undefined {
    if (!node.isConnected || !node.matches(upperSelector)) return
    const owned = upperOwners.get(node), css = window.getComputedStyle(node)
    if (node.children.length || !['static', 'relative'].includes(css.position) ||
      !['18px', '18px auto', '18px 18px'].includes(css.backgroundSize) ||
      !['50% 50%', 'center center'].includes(css.backgroundPosition) || css.backgroundRepeat !== 'no-repeat' ||
      css.filter !== 'none' || css.transform !== 'none' || css.mixBlendMode !== 'normal' ||
      css.boxShadow !== 'none' || css.clipPath !== 'none') return
    if (!owned && !['none', 'normal'].includes(window.getComputedStyle(node, '::before').content)) return
    if (!['none', 'normal'].includes(window.getComputedStyle(node, '::after').content)) return
    const box = node.getBoundingClientRect()
    if (box.width < 18 || box.height < 18) return
    const image = owned?.image ?? css.backgroundImage, match = image.match(/^url\(["']?(data:image\/svg\+xml[^)]*?)["']?\)$/i)
    if (!match || match[1].length > 24576) return
    const url = match[1], comma = url.indexOf(','), header = url.slice(0, comma), encoded = url.slice(comma + 1)
    if (comma < 0 || !/^data:image\/svg\+xml(?:;charset=utf-8)?(?:;base64)?$/i.test(header)) return
    let bytes: string
    try {
      if (/;base64$/i.test(header)) bytes = atob(encoded)
      else bytes = Array.from(new TextEncoder().encode(decodeURIComponent(encoded)), byte => String.fromCharCode(byte)).join('')
    } catch { return }
    if (!bytes.length || bytes.length > 4096) return
    return { node, image, bytes }
  }
  function upperCandidates(strict: boolean): UpperSource[] {
    for (const [node, saved] of upperOwners) {
      if (!node.isConnected || !node.matches(upperSelector) || node.className !== saved.className ||
        node.getAttribute('data-frade-upper-glyph') !== '1' ||
        Array.from(saved.properties).some(([name, value]) => !upperPropertyMatches(node, name, value))) restoreUpper(node, saved)
    }
    const nodes = document.querySelectorAll<HTMLElement>(upperSelector)
    if (nodes.length > 256) {
      if (strict) throw Error('Upper glyph candidate bound exceeded')
      return []
    }
    return Array.from(nodes).map(upperSource).filter((source): source is UpperSource => !!source)
  }
  function reconcileUpper(pendingRequest?: any, pendingToken?: number) {
    if (disposed || !upperRootOwned()) { clearUpper(); return }
    if (pendingRequest ? !upperLive(pendingRequest, pendingToken!) : upperPaintedRequest !== active.request) return
    const sources = upperCandidates(false), keep = new Set<HTMLElement>()
    for (const source of sources) {
      if (!upperVerified.has(source.bytes)) continue
      const { node } = source
      keep.add(node)
      if (upperOwners.has(node)) continue
      const saved: UpperOwner = { ...source, marker: node.getAttribute('data-frade-upper-glyph'), stylePresent: node.hasAttribute('style'), className: node.className, properties: new Map() }
      const project = (name: string, value: string) => {
        const before = node.style.getPropertyValue(name), priority = node.style.getPropertyPriority(name)
        node.style.setProperty(name, value, 'important')
        saved.properties.set(name, { before, priority, projected: node.style.getPropertyValue(name), projectedPriority: node.style.getPropertyPriority(name) })
      }
      if (window.getComputedStyle(node).position === 'static') project('position', 'relative')
      project('--frade-upper-icon-image', source.image)
      project('background-image', 'none')
      node.setAttribute('data-frade-upper-glyph', '1')
      upperOwners.set(node, saved)
    }
    for (const [node, saved] of upperOwners) if (!keep.has(node)) restoreUpper(node, saved)
    reconcileUpperInteraction()
  }
  // New native digests belong only to pending apply/rollback; passive observers use verified bytes.
  function verifyUpper(request: any, token: number): Promise<void> | undefined {
    const deadline = performance.now() + 1800, examined = new Set<string>()
    let passes = 0, expired = false
    const live = () => !expired && upperLive(request, token)
    const verify = (): Promise<void> | undefined => {
      if (!live()) return
      if (performance.now() >= deadline) throw Error('Upper glyph verification exceeded pending deadline')
      const sources = upperCandidates(true), unseen = new Map<string, UpperSource[]>()
      for (const source of sources) if (!upperVerified.has(source.bytes) && !examined.has(source.bytes)) {
        const siblings = unseen.get(source.bytes) ?? []; siblings.push(source); unseen.set(source.bytes, siblings)
      }
      if (!unseen.size) { reconcileUpper(request, token); return }
      if (++passes > 3) throw Error('Upper glyph resources kept changing during verification')
      if (!window.crypto?.subtle?.digest) throw Error('Native upper glyph verification unavailable')
      return Promise.all(Array.from(unseen, async ([bytes, originals]) => {
        const digest = await window.crypto.subtle.digest('SHA-256', Uint8Array.from(bytes, byte => byte.charCodeAt(0)))
        return { bytes, originals, hash: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') }
      })).then(results => {
        if (!live()) return
        if (performance.now() >= deadline) throw Error('Upper glyph verification exceeded pending deadline')
        const current = upperCandidates(true)
        for (const result of results) {
          if (!result.originals.some(original => current.some(source => source.node === original.node && source.image === original.image && source.bytes === original.bytes))) continue
          examined.add(result.bytes)
          if (upperHashes.has(result.hash)) upperVerified.set(result.bytes, result.hash)
        }
        return verify()
      })
    }
    const pending = verify()
    if (!pending) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { expired = true; reject(Error('Upper glyph verification exceeded pending deadline')) }, Math.max(0, deadline - performance.now())) })
    return Promise.race([pending, timeout]).catch(error => {
      if (!upperLive(request, token)) return
      throw error
    }).finally(() => { if (timer !== undefined) clearTimeout(timer) })
  }
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
    const lower = prefix('.geTabContainer'),
      menu = prefix('[data-frade-lower-menu]'),
      size = snapshot.density === 'compact' ? 28 : 36
    style.textContent +=
      lower +
      '{height:auto!important;min-height:' +
      (size + 8) +
      'px!important;display:flex;align-items:center;gap:4px;padding:4px;box-sizing:border-box;background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;border-color:var(--frade-frame-border-subtle)!important;}' +
      lower +
      ' .geTabScroller{flex:1;min-width:0;max-width:none!important;display:flex;align-items:center;height:auto!important;background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;padding:4px;box-sizing:border-box;}' +
      lower +
      ' .geTab{flex-shrink:0;height:auto!important;display:inline-flex;align-items:center;background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;border-color:var(--frade-frame-border-subtle)!important;filter:none!important;}' +
      lower +
      ' [role="button"]{min-height:' +
      size +
      'px!important;min-width:24px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;}' +
      lower +
      ' .gePageTab>span{padding:0 8px;}' +
      lower +
      ' .geButton{color:inherit!important;opacity:1!important;filter:none!important;}' +
      lower +
      ' .geButton::before{content:"";display:inline-block;width:16px;height:16px;flex-shrink:0;mask-image:var(--frade-lower-icon-image);mask-size:contain;mask-repeat:no-repeat;mask-position:center;background-color:currentColor;forced-color-adjust:none;}' +
      lower +
      ' .gePageTab.geActivePage{background-color:var(--frade-frame-selection-bg)!important;color:var(--frade-frame-selection-fg)!important;border-color:var(--frade-frame-selection-indicator)!important;}' +
      lower +
      ' [role="button"]:hover{background-color:var(--frade-frame-surface-hover)!important;color:var(--frade-frame-text-primary)!important;}' +
      lower +
      ' [role="button"][aria-disabled="true"]{color:var(--frade-frame-text-disabled)!important;}' +
      menu +
      '{background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;border:1px solid var(--frade-frame-border-control)!important;padding:4px;box-sizing:border-box;}' +
      menu +
      ' td{background-color:inherit!important;color:inherit!important;border-color:var(--frade-frame-border-subtle)!important;}' +
      menu +
      ' [role^="menuitem"]{height:' +
      size +
      'px;min-width:24px;background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;}' +
      menu +
      ' [role^="menuitem"]:hover,' +
      menu +
      ' .mxPopupMenuItemHover{background-color:var(--frade-frame-surface-hover)!important;}' +
      menu +
      ' [aria-disabled="true"]{color:var(--frade-frame-text-disabled)!important;}' +
      lower +
      ' [role="button"]:focus-visible,' +
      menu +
      ' [role^="menuitem"]:focus-visible{outline:2px solid var(--frade-frame-focus-ring)!important;outline-offset:2px;}' +
      '@media(forced-colors:active){' +
      lower +
      ' [role="button"]:focus-visible{box-shadow:0 0 0 4px var(--frade-frame-surface-panel)!important;}}' +
      '@media(pointer:coarse){' +
      lower +
      ' [role="button"]{min-height:44px!important;min-width:44px!important;}' +
      menu +
      ' [role^="menuitem"]{height:44px!important;min-width:44px;}}'
    style.textContent += upperSelector + '[data-frade-upper-glyph="1"]::before{content:"";position:absolute;width:18px;height:18px;left:calc(50% - 9px);top:calc(50% - 9px);mask-image:var(--frade-upper-icon-image);mask-size:contain;mask-position:center;mask-repeat:no-repeat;background-color:var(--frade-frame-text-primary);pointer-events:none;forced-color-adjust:none;}'
    style.textContent +=
      prefix('[data-frade-upper-control="1"]:focus-visible') + ',' + prefix('[data-frade-upper-menu="1"] [data-frade-upper-row="1"]:focus-visible') + '{outline:2px solid var(--frade-frame-focus-ring)!important;outline-offset:2px;}' +
      prefix('[data-frade-upper-menu="1"]') + '{background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;}' +
      prefix('[data-frade-upper-menu="1"] table') + ',' + prefix('[data-frade-upper-menu="1"] tbody') + ',' + prefix('[data-frade-upper-menu="1"] td') + '{background-color:inherit!important;color:inherit!important;}' +
      prefix('[data-frade-upper-menu="1"] td span') + '{color:inherit!important;}' +
      prefix('[data-frade-upper-menu="1"] [data-frade-upper-row="1"]') + '{background-color:var(--frade-frame-surface-panel)!important;color:var(--frade-frame-text-primary)!important;}' +
      prefix('[data-frade-upper-menu="1"] [data-frade-upper-row="1"]:hover') + ',' + prefix('[data-frade-upper-menu="1"] [data-frade-upper-row="1"]:focus-visible') + '{background-color:var(--frade-frame-surface-hover)!important;}' +
      prefix('[data-frade-upper-menu="1"] [aria-disabled="true"]') + '{color:var(--frade-frame-text-disabled)!important;}'
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
  // Accessibility ownership is local to the actual lower strip and menus it opened.
  // Vendor nodes, callbacks and model APIs are never replaced or invoked as actions.
  const lowerAttributes = new Map<Element, Map<string, string | null>>(),
    menuAttributes = new Map<Element, Map<string, string | null>>(),
    lowerStyles = new Map<HTMLElement, Map<string, { value: string; priority: string }>>(),
    menuStyles = new Map<HTMLElement, Map<string, { value: string; priority: string }>>(),
    styleAttributePresence = new WeakMap<HTMLElement, boolean>()
  let menuLayout: { nodes: HTMLElement[]; key: string; boxes: string } | undefined
  const layoutProperties = new Set(['left', 'top', 'width', 'max-width', 'white-space', 'overflow-wrap'])
  type LowerPopup = {
    instance: any
    div: HTMLElement
    opener: HTMLElement
    request: any
    hide: () => void
  }
  let lowerObserver: MutationObserver | undefined,
    lowerTargets: HTMLElement[] = [],
    canvasFocus: HTMLElement | undefined,
    lastLower: HTMLElement | undefined,
    mouseSequence = 0,
    popup: LowerPopup | undefined,
    cancellationPopup: LowerPopup | undefined
  const projectAttribute = (
    map: typeof lowerAttributes,
    node: Element,
    name: string,
    value: string,
  ) => {
    let prior = map.get(node)
    if (!prior) {
      prior = new Map()
      map.set(node, prior)
    }
    if (!prior.has(name)) prior.set(name, node.getAttribute(name))
    if (node.getAttribute(name) !== value) node.setAttribute(name, value)
  }
  const restoreAttributes = (map: typeof lowerAttributes, keep?: Set<Element>) => {
    for (const [node, values] of map) {
      if (keep?.has(node)) continue
      for (const [name, value] of values) {
        if (value === null) node.removeAttribute(name)
        else node.setAttribute(name, value)
      }
      map.delete(node)
    }
  }
  const projectStyle = (node: HTMLElement, name: string, value: string, map = lowerStyles) => {
    let prior = map.get(node)
    if (!prior) {
      prior = new Map()
      map.set(node, prior)
      styleAttributePresence.set(node, node.hasAttribute('style'))
    }
    if (!prior.has(name))
      prior.set(name, {
        value: node.style.getPropertyValue(name),
        priority: node.style.getPropertyPriority(name),
      })
    if (
      node.style.getPropertyValue(name) !== value ||
      node.style.getPropertyPriority(name) !== 'important'
    )
      node.style.setProperty(name, value, 'important')
  }
  const restoreLowerStyles = (map = lowerStyles, keep?: Set<Element>) => {
    for (const [node, values] of map) {
      if (keep?.has(node)) continue
      for (const [name, value] of values) {
        if (value.value) node.style.setProperty(name, value.value, value.priority)
        else node.style.removeProperty(name)
      }
      if (!node.style.length) {
        if (styleAttributePresence.get(node)) node.setAttribute('style', '')
        else node.removeAttribute('style')
      }
      styleAttributePresence.delete(node)
      map.delete(node)
    }
  }
  const currentPresentation = () =>
    !disposed &&
    !!active &&
    root.getAttribute('data-frade-frame-runtime') === '1' &&
    owner?.participantGeneration === active.request.participantGeneration &&
    sameOwner(owner?.context, active.request.context)
  const visible = (node: Element) => {
    if (!node.isConnected) return false
    for (
      let element: Element | null = node;
      element && element !== root;
      element = element.parentElement
    ) {
      const style = window.getComputedStyle(element)
      if (
        element.hasAttribute('hidden') ||
        style.display === 'none' ||
        style.visibility === 'hidden'
      )
        return false
    }
    return true
  }
  const registered = (node: any, name: string) =>
    Array.isArray(node?.mxListenerList) &&
    node.mxListenerList.some((entry: any) => entry.name === name && typeof entry.f === 'function')
  const gestureNames = () =>
    globals.mxClient?.IS_POINTER === true
      ? ['pointerdown', 'pointerup', 'pointermove']
      : ['mousedown', 'mouseup', 'mousemove']
  const gestureOwner = (target: HTMLElement) => {
    const [down, up] = gestureNames()
    for (
      let node: HTMLElement | null = target;
      node && node !== ui?.tabContainer?.parentElement;
      node = node.parentElement
    ) {
      if (registered(node, down) && registered(node, up)) return node
      if (node === ui?.tabContainer) break
    }
    return undefined
  }
  const originallyDisabled = (target: HTMLElement) => {
    for (let node: Element | null = target; node && node !== root; node = node.parentElement) {
      const prior = lowerAttributes.get(node) || menuAttributes.get(node)
      const aria = prior?.has('aria-disabled')
        ? prior.get('aria-disabled')
        : node.getAttribute('aria-disabled')
      if (node.classList.contains('mxDisabled') || node.hasAttribute('disabled') || aria === 'true')
        return true
    }
    return false
  }
  const capable = (target: HTMLElement) =>
    visible(target) &&
    !originallyDisabled(target) &&
    (registered(target, 'click') || !!gestureOwner(target))
  const lowerReady = () =>
    currentPresentation() &&
    ui?.tabContainer instanceof HTMLElement &&
    visible(ui.tabContainer) &&
    typeof graph?.isEnabled === 'function' &&
    graph.isEnabled() &&
    typeof graph.isEditing === 'function' &&
    !graph.isEditing() &&
    !graph.isMouseDown &&
    !ui.dialog &&
    !(ui.dialogs?.length > 0)
  function forgetPopup(cancel = false) {
    const original = popup || cancellationPopup
    const proven =
      !!original &&
      ui?.currentMenu === original.instance &&
      original.instance.div === original.div &&
      original.div.isConnected
    if (cancel && proven) original.hide()
    // Stale keys restore projections, but apply/disposal must still cancel this original menu.
    // A detached/replaced/unowned current menu can never inherit the retained hide lease.
    cancellationPopup = !cancel && proven ? original : undefined
    menuLayout = undefined
    restoreLowerStyles(menuStyles)
    restoreAttributes(menuAttributes)
    if (original?.opener.isConnected && lowerAttributes.has(original.opener))
      projectAttribute(lowerAttributes, original.opener, 'aria-expanded', 'false')
    popup = undefined
  }
  const validPopup = () =>
    !!popup &&
    currentPresentation() &&
    popup.request === active.request &&
    ui?.currentMenu === popup.instance &&
    popup.instance.div === popup.div &&
    visible(popup.div) &&
    lowerTargets.includes(popup.opener) &&
    capable(popup.opener)
  function reconcileLower() {
    // Prepare is DOM-side-effect free, including queued mutation reconciliation.
    // Retain cancellation proof until apply; stale keyboard activation is separately rejected.
    if (!currentPresentation()) return
    const strip = ui?.tabContainer
    if (!(strip instanceof HTMLElement) || !strip.isConnected) {
      lowerTargets = []
      restoreAttributes(lowerAttributes)
      restoreLowerStyles(lowerStyles)
      forgetPopup()
      return
    }
    const keep = new Set<Element>([strip]),
      next: HTMLElement[] = []
    const own = (node: Element, name: string, value: string) => {
      keep.add(node)
      projectAttribute(lowerAttributes, node, name, value)
    }
    own(strip, 'role', 'group')
    const pagesName = globals.mxResources?.get?.('pages') || strip.getAttribute('title')
    if (pagesName) own(strip, 'aria-label', pagesName)
    const target = (node: HTMLElement, label: string, selected?: boolean, menu = false) => {
      if (!label) return
      own(node, 'role', 'button')
      own(node, 'aria-label', label)
      const enabled = capable(node)
      own(node, 'aria-disabled', String(!enabled))
      own(node, 'tabindex', enabled ? '0' : '-1')
      if (selected !== undefined) own(node, 'aria-pressed', String(selected))
      if (menu) {
        own(node, 'aria-haspopup', 'menu')
        own(node, 'aria-expanded', String(popup?.opener === node && validPopup()))
      }
      if (enabled) next.push(node)
    }
    for (const child of Array.from(
      strip.querySelectorAll<HTMLElement>('.geControlTab,.gePageTab'),
    )) {
      if (child.classList.contains('gePageTab')) {
        const label = child.querySelector<HTMLElement>('span'),
          icon = child.querySelector<HTMLElement>('.geButton')
        own(child, 'role', 'group')
        const name = label?.textContent?.trim() || child.getAttribute('title') || ''
        if (name) own(child, 'aria-label', name)
        if (label) target(label, name, child.classList.contains('geActivePage'))
        if (icon && pagesName) target(icon, name + ' — ' + pagesName, undefined, true)
      } else {
        let name = child.getAttribute('title') || ''
        if (!name && child === ui.leftScrollTab)
          name = globals.mxResources?.get?.('previousPage') || ''
        if (!name && child === ui.rightScrollTab)
          name = globals.mxResources?.get?.('nextPage') || ''
        target(child, name, undefined, child === ui.pageMenuTab)
        for (const decorative of Array.from(child.querySelectorAll('.geButton')))
          own(decorative, 'aria-hidden', 'true')
      }
    }
    lowerTargets = next
    restoreAttributes(lowerAttributes, keep)
    if (popup && !validPopup()) forgetPopup()
    // Pinned vendor uses Grid min-content rows; lower sizing reflows that row.
    // A relative bottom inset would shift the canvas beneath the toolbar.
    const glyphs = new Set(strip.querySelectorAll<HTMLElement>('.geButton'))
    for (const icon of glyphs) {
      const image = icon.style.backgroundImage
      if (image && image !== 'none' && !lowerStyles.has(icon)) {
        projectStyle(icon, '--frade-lower-icon-image', image)
        projectStyle(icon, 'background-image', 'none')
      }
    }
    restoreLowerStyles(lowerStyles, glyphs)
    if (popup) reconcilePopup()
  }
  function menuScopes() {
    const result: { scope: any; parent?: any; row?: HTMLElement; div: HTMLElement }[] = []
    if (!validPopup()) return result
    const visit = (scope: any, div: HTMLElement, parent?: any, row?: HTMLElement) => {
      if (!visible(div) || !(scope.tbody instanceof HTMLElement) || !div.contains(scope.tbody))
        return
      result.push({ scope, div, parent, row })
      for (const child of Array.from(scope.tbody.children) as any[]) {
        if (
          child.div instanceof HTMLElement &&
          child.tbody &&
          scope.activeRow === child &&
          child.div.isConnected
        )
          visit(child, child.div, scope, child)
      }
    }
    visit(popup!.instance, popup!.div)
    return result
  }
  function restoreMenuLayout() {
    for (const [node, values] of menuStyles) {
      for (const [name, prior] of values) {
        if (!layoutProperties.has(name)) continue
        if (prior.value) node.style.setProperty(name, prior.value, prior.priority)
        else node.style.removeProperty(name)
        values.delete(name)
      }
      if (values.size) continue
      if (!node.style.length) {
        if (styleAttributePresence.get(node)) node.setAttribute('style', '')
        else node.removeAttribute('style')
      }
      styleAttributePresence.delete(node)
      menuStyles.delete(node)
    }
  }
  let refusedLowerRequest: any
  function reflowPopup(entries: ReturnType<typeof menuScopes>, keep: Set<Element>): boolean {
    if (!validPopup() || !entries.length) return false
    const nodes = entries.map(entry => entry.div), width = window.innerWidth, height = window.innerHeight
    const measure = () => nodes.map(node => node.getBoundingClientRect())
    const rectangles = (boxes: DOMRect[]) => JSON.stringify(boxes.map(b => [b.left, b.top, b.width, b.height]))
    const current = measure()
    // Layout-less unit DOM and detached/obsolete panels are never given invented geometry.
    if (!(width > 0 && height > 0) || current.some(b => !(b.width > 0 && b.height > 0))) return true
    const key = JSON.stringify([width, height, active.snapshot.density,
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer:coarse)').matches,
      ...entries.map(entry => {
        const cell = entry.scope.tbody.querySelector('td:nth-child(2)') as HTMLElement | null
        const css = cell ? window.getComputedStyle(cell) : undefined
        return [entry.scope.tbody.textContent, css?.fontSize, css?.lineHeight]
      })])
    if (menuLayout?.key === key && menuLayout.boxes === rectangles(current) &&
        menuLayout.nodes.length === nodes.length && menuLayout.nodes.every((node, n) => node === nodes[n])) return true
    restoreMenuLayout()
    const natural = measure(), gap = 8, clearance = 4
    const targetBoxes = () => entries.map(entry => Array.from(entry.scope.tbody.children as HTMLCollectionOf<HTMLElement>)
      .filter(row => row.getAttribute('role')?.startsWith('menuitem') && visible(row))
      .map(row => ({ row, box: row.getBoundingClientRect() })))
    const fits = () => {
      if (measure().some(b => b.left < 0 || b.top < 0 || b.right > width || b.bottom > height)) return false
      const targets = targetBoxes()
      for (const group of targets) for (const { row, box: b } of group) {
        if (b.left < clearance || b.top < clearance || b.right + clearance > width || b.bottom + clearance > height) return false
        if (typeof document.elementFromPoint === 'function') {
          const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
          if (!hit || (hit !== row && !row.contains(hit))) return false
        }
      }
      for (let a = 0; a < targets.length; a++) for (let b = a + 1; b < targets.length; b++)
        for (const x of targets[a]) for (const y of targets[b]) {
          const r = x.box, t = y.box
          if (!(r.right + gap <= t.left || t.right + gap <= r.left || r.bottom + gap <= t.top || t.bottom + gap <= r.top)) return false
        }
      return true
    }
    const settle = () => { menuLayout = { nodes, key, boxes: rectangles(measure()) } }
    if (fits()) { settle(); return true }
    const project = (node: HTMLElement, name: string, value: string) => {
      keep.add(node)
      projectStyle(node, name, value, menuStyles)
    }
    const px = (value: string) => Number.parseFloat(value) || 0
    const profile = entries.map((entry, n) => {
      const table = entry.div.querySelector('table')!, box = table.getBoundingClientRect()
      const inset = Math.max(0, natural[n].width - box.width)
      const labels = Array.from(entry.scope.tbody.children as HTMLCollectionOf<HTMLElement>)
        .filter(row => row.getAttribute('role')?.startsWith('menuitem'))
        .map(row => {
          const cells = Array.from(row.children) as HTMLElement[], cell = cells[1], css = window.getComputedStyle(cell)
          const reserved = cells.filter(node => node !== cell).reduce((sum, node) => sum + node.getBoundingClientRect().width, 0)
          const padding = px(css.paddingLeft) + px(css.paddingRight) + px(css.borderLeftWidth) + px(css.borderRightWidth)
          return { cell, reserved, padding }
        })
      return { table, inset, labels, minimum: Math.max(44 + inset, ...labels.map(label => inset + label.reserved + label.padding + 1)) }
    })
    const available = width - clearance * 2 - gap * (nodes.length - 1)
    const refuse = () => {
      const request = active.request, opener = popup?.opener
      // Only the proven original hide lease cancels this chain. Restoration also
      // drops its cache; no observer may reinterpret a refusal as successful fit.
      forgetPopup(true)
      focusNode(opener)
      if (refusedLowerRequest !== request) {
        refusedLowerRequest = request
        reply(request, 'REFUSED', 'LOWER_MENU_REFLOW_UNAVAILABLE: original targets cannot fit without forbidden behavior')
      }
      return false
    }
    if (available < profile.reduce((sum, p) => sum + p.minimum, 0)) return refuse()
    const widths = natural.map(b => b.width)
    if (widths.reduce((sum, w) => sum + w, 0) > available) {
      const total = widths.reduce((sum, w) => sum + w, 0), spare = available - profile.reduce((sum, p) => sum + p.minimum, 0)
      for (let n = 0; n < widths.length; n++) widths[n] = Math.floor(profile[n].minimum + spare * natural[n].width / total)
      for (let n = 0; n < nodes.length; n++) {
        project(nodes[n], 'width', widths[n] + 'px'); project(nodes[n], 'max-width', widths[n] + 'px')
        project(profile[n].table, 'width', Math.max(1, widths[n] - profile[n].inset) + 'px')
        project(profile[n].table, 'max-width', Math.max(1, widths[n] - profile[n].inset) + 'px')
        for (const { cell, reserved, padding } of profile[n].labels) {
          const textWidth = Math.max(1, widths[n] - profile[n].inset - reserved - padding)
          project(cell, 'width', textWidth + 'px'); project(cell, 'max-width', textWidth + 'px')
          project(cell, 'white-space', 'normal'); project(cell, 'overflow-wrap', 'anywhere')
        }
      }
    }
    // Synchronous finite remeasure after wrapping; no recurring RAF or fitting call.
    for (let pass = 0; pass < 3; pass++) {
      const boxes = measure(), extent = boxes.reduce((sum, b) => sum + b.width, 0) + gap * (nodes.length - 1)
      if (extent > width - clearance * 2 || boxes.some(b => b.height > height - clearance * 2)) return refuse()
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))
      const right = clamp(natural[0].left, clearance, width - clearance - extent)
      const leftOffset = extent - boxes[0].width
      const left = clamp(natural[0].left, clearance + leftOffset, width - clearance - boxes[0].width)
      const direction = Math.abs(right - natural[0].left) <= Math.abs(left - natural[0].left) ? 1 : -1
      let x = direction === 1 ? right : left
      for (let n = 0; n < nodes.length; n++) {
        if (n && direction < 0) x -= boxes[n].width + gap
        const y = Math.floor(clamp(natural[n].top, clearance, height - clearance - boxes[n].height))
        const move = (name: 'left' | 'top', target: number, currentValue: number) => {
          if (Math.abs(target - currentValue) < 0.001) return
          const original = Number.parseFloat(nodes[n].style[name])
          const origin = Number.isFinite(original) ? original : name === 'left' ? nodes[n].offsetLeft : nodes[n].offsetTop
          project(nodes[n], name, origin + target - currentValue + 'px')
        }
        move('left', x, boxes[n].left); move('top', y, boxes[n].top)
        if (direction > 0) x += boxes[n].width + gap
      }
      if (fits()) { settle(); return true }
    }
    return refuse()
  }
  function reconcilePopup() {
    if (!validPopup()) {
      forgetPopup()
      return false
    }
    const keep = new Set<Element>(),
      own = (node: Element, name: string, value: string) => {
        keep.add(node)
        projectAttribute(menuAttributes, node, name, value)
      }
    const scopes = menuScopes()
    for (const entry of scopes) {
      own(entry.div, 'data-frade-lower-menu', String(active.request.participantGeneration))
      own(entry.div, 'role', 'menu')
      own(entry.div, 'aria-label', popup!.opener.getAttribute('aria-label') || '')
      for (const table of Array.from(entry.div.querySelectorAll('table,tbody')))
        own(table, 'role', 'presentation')
      for (const row of Array.from(entry.scope.tbody.children) as HTMLElement[]) {
        const cells = Array.from(row.children),
          label = cells[1]?.textContent?.trim() || ''
        if (!label) {
          own(row, 'role', 'separator')
          continue
        }
        const disabled =
          cells.some((cell) => cell.classList.contains('mxDisabled')) ||
          !registered(row, gestureNames()[0]) ||
          !registered(row, gestureNames()[1])
        const checkmark = globals.Editor?.checkmarkImage
        const checked =
          typeof checkmark === 'string' &&
          !!checkmark &&
          !!cells[1] &&
          Array.from(cells[1].querySelectorAll<HTMLElement>('div,img')).some(
            (node) =>
              (
                menuStyles.get(node)?.get('background-image')?.value || node.style.backgroundImage
              ).includes(checkmark) ||
              (node instanceof HTMLImageElement && node.src === checkmark),
          )
        own(row, 'role', checked ? 'menuitemcheckbox' : 'menuitem')
        if (checked) own(row, 'aria-checked', 'true')
        else {
          const prior = menuAttributes.get(row)
          if (prior?.has('aria-checked')) {
            const value = prior.get('aria-checked')
            if (value === null) row.removeAttribute('aria-checked')
            else if (value !== undefined) row.setAttribute('aria-checked', value)
            prior.delete('aria-checked')
          }
        }
        own(row, 'aria-label', label)
        own(row, 'aria-disabled', String(disabled))
        own(row, 'tabindex', disabled ? '-1' : '0')
        const sub = (row as any).div
        if (sub instanceof HTMLElement && (row as any).tbody) {
          own(row, 'aria-haspopup', 'menu')
          own(row, 'aria-expanded', String(entry.scope.activeRow === row && sub.isConnected))
        }
        for (const cell of cells) own(cell, 'role', 'presentation')
        if (cells[0]) own(cells[0], 'aria-hidden', 'true')
        if (cells[2]) own(cells[2], 'aria-hidden', 'true')
        for (const icon of Array.from(
          row.querySelectorAll<HTMLElement>('td.mxPopupMenuIcon img,td.mxPopupMenuItem>div'),
        )) {
          const glyph = icon instanceof HTMLImageElement ? icon.parentElement! : icon
          const image =
            icon instanceof HTMLImageElement
              ? 'url("' + icon.src + '")'
              : menuStyles.get(glyph)?.get('background-image')?.value || icon.style.backgroundImage
          if (!image || image === 'none') continue
          keep.add(glyph)
          keep.add(icon)
          own(icon, 'aria-hidden', 'true')
          if (!menuStyles.has(glyph)) {
            projectStyle(glyph, 'mask-image', image, menuStyles)
            projectStyle(glyph, 'mask-repeat', 'no-repeat', menuStyles)
            projectStyle(glyph, 'mask-position', 'center', menuStyles)
            projectStyle(glyph, 'mask-size', icon.style.backgroundSize || '16px 16px', menuStyles)
            projectStyle(glyph, 'background-image', 'none', menuStyles)
            projectStyle(glyph, 'background-color', 'currentColor', menuStyles)
            projectStyle(glyph, 'forced-color-adjust', 'none', menuStyles)
            if (icon instanceof HTMLImageElement)
              projectStyle(icon, 'visibility', 'hidden', menuStyles)
          }
        }
      }
    }
    if (!reflowPopup(scopes, keep)) return false
    restoreAttributes(menuAttributes, keep)
    restoreLowerStyles(menuStyles, keep)
    return true
  }
  const rows = (scope: any) =>
    Array.from(scope.tbody.children).filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement &&
        visible(node) &&
        node.getAttribute('aria-disabled') === 'false',
    )
  const focusNode = (node?: HTMLElement) => {
    if (!node || !visible(node) || node.closest('.mxDisabled,[disabled],[aria-disabled="true"]'))
      return
    const scroller = ui?.tabScroller
    if (
      currentPresentation() &&
      lowerTargets.includes(node) &&
      scroller instanceof HTMLElement &&
      ui.tabContainer.contains(scroller) &&
      scroller.contains(node) &&
      scroller.clientWidth > 0
    ) {
      const target = node.getBoundingClientRect(),
        box = scroller.getBoundingClientRect(),
        left = box.left + scroller.clientLeft + 4,
        right = box.left + scroller.clientLeft + scroller.clientWidth - 4
      // Reveal only the owned lower DOM scrollport; never scroll an ancestor or graph viewport.
      const delta =
        target.left < left ? target.left - left : target.right > right ? target.right - right : 0
      if (delta) scroller.scrollLeft += delta
    }
    node.focus({ preventScroll: true })
  }
  function adoptPopup(opener: HTMLElement, previous: any, keyboard: boolean) {
    const instance = ui?.currentMenu
    if (validPopup() && popup!.instance === instance && popup!.opener === opener) return
    if (
      !lowerReady() ||
      !lowerTargets.includes(opener) ||
      !capable(opener) ||
      !instance ||
      instance === previous ||
      !(instance.div instanceof HTMLElement) ||
      !instance.div.isConnected ||
      !instance.tbody ||
      !instance.div.contains(instance.tbody) ||
      typeof ui.hideCurrentMenu !== 'function'
    )
      return
    forgetPopup()
    const hide = ui.hideCurrentMenu
    popup = {
      instance,
      div: instance.div,
      opener,
      request: active.request,
      hide: () => hide.call(ui),
    }
    cancellationPopup = popup
    if (!reconcilePopup()) return
    projectAttribute(lowerAttributes, opener, 'aria-expanded', 'true')
    if (keyboard) focusNode(rows(instance)[0])
  }
  function originalGesture(target: HTMLElement, moveOnly = false) {
    const names = gestureNames(),
      ownerNode = gestureOwner(target)
    if (!ownerNode) return false
    const box = target.getBoundingClientRect(),
      init = {
        bubbles: true,
        cancelable: true,
        clientX: box.left + box.width / 2,
        clientY: box.bottom,
        button: 0,
        buttons: 1,
        pointerType: 'mouse',
        isPrimary: true,
      }
    const Constructor =
      globals.mxClient?.IS_POINTER === true ? globals.PointerEvent : globals.MouseEvent
    if (typeof Constructor !== 'function' || (moveOnly && !registered(ownerNode, names[2])))
      return false
    for (const name of moveOnly ? [names[2]] : names.slice(0, 2))
      target.dispatchEvent(new Constructor(name, { ...init, buttons: name.endsWith('up') ? 0 : 1 }))
    return true
  }
  function returnAfterAction(opener: HTMLElement, label: string) {
    if (!lowerReady() || popup) return
    const request = active.request,
      sequence = mouseSequence
    const restore = () => {
      if (!lowerReady() || active.request !== request || popup || sequence !== mouseSequence) return
      const matches = lowerTargets.filter((node) => node.getAttribute('aria-label') === label)
      const target = lowerTargets.includes(opener)
        ? opener
        : matches.length === 1
          ? matches[0]
          : lowerTargets[0]
      focusNode(target || canvasFocus)
      if (target) lastLower = target
    }
    restore()
    window.requestAnimationFrame(() => {
      const focused = document.activeElement
      if (
        focused === document.body ||
        focused === ui.typingShim ||
        focused === graph.container ||
        focused === opener ||
        lowerTargets.includes(focused as HTMLElement)
      )
        restore()
    })
  }
  const openerIdentity = (target: HTMLElement) => {
    const page = target.closest('.gePageTab')
    return {
      kind: page ? (target.tagName === 'SPAN' ? 'page' : 'page-menu') : 'control',
      title: page?.getAttribute('title') || target.getAttribute('title') || '',
      menu: target.getAttribute('aria-haspopup') === 'menu',
    }
  }
  const connectedOpener = (original: HTMLElement, identity: ReturnType<typeof openerIdentity>) => {
    if (lowerTargets.includes(original) && capable(original)) return original
    if (!identity.title) return undefined
    const matches = lowerTargets.filter((node) => {
      const candidate = openerIdentity(node)
      return (
        candidate.kind === identity.kind &&
        candidate.title === identity.title &&
        candidate.menu === identity.menu &&
        capable(node)
      )
    })
    return matches.length === 1 ? matches[0] : undefined
  }
  function activateLower(target: HTMLElement) {
    if (!lowerReady() || !capable(target)) return
    const previous = ui.currentMenu,
      identity = openerIdentity(target),
      label = target.getAttribute('aria-label') || ''
    if (registered(target, 'click')) {
      const box = target.getBoundingClientRect()
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: box.left + box.width / 2,
          clientY: box.top + box.height / 2,
          button: 0,
        }),
      )
    } else originalGesture(target)
    reconcileLower()
    const replacement = connectedOpener(target, identity)
    if (identity.menu && replacement) adoptPopup(replacement, previous, true)
    returnAfterAction(target, label)
  }
  const moveFocus = (targets: HTMLElement[], current: HTMLElement, key: string) => {
    const index = targets.indexOf(current)
    if (!targets.length) return
    focusNode(
      targets[
        key === 'Home'
          ? 0
          : key === 'End'
            ? targets.length - 1
            : (index + (['ArrowLeft', 'ArrowUp'].includes(key) ? -1 : 1) + targets.length) %
              targets.length
      ],
    )
  }
  function lowerKey(event: KeyboardEvent): boolean {
    if (!currentPresentation()) {
      forgetPopup()
      return false
    }
    const target = event.target as HTMLElement | null
    if (
      !target ||
      event.isComposing ||
      event.keyCode === 229 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      !lowerReady()
    )
      return false
    reconcileLower()
    const editable = target.closest(
      'input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"]',
    )
    const idleShim =
      target === ui.typingShim &&
      target.classList.contains('mxTypingShim') &&
      !(target as HTMLTextAreaElement).value &&
      !graph.isEditing()
    if (editable && !idleShim) return false
    if (popup) {
      const entry = menuScopes().find((value) => value.scope.tbody.contains(target))
      if (!entry) return false
      const current = target.closest('tr') as HTMLElement | null
      if (!current || !rows(entry.scope).includes(current)) return false
      if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key))
        moveFocus(rows(entry.scope), current, event.key)
      else if (event.key === 'ArrowRight' && (current as any).div) {
        if (!originalGesture(current, true)) originalGesture(current)
        if (reconcilePopup()) focusNode(rows(current)[0])
      } else if ((event.key === 'ArrowLeft' || event.key === 'Escape') && entry.parent) {
        const hide = popup.instance.hideSubmenu
        if (typeof hide !== 'function') return false
        hide.call(popup.instance, entry.parent)
        if (reconcilePopup()) focusNode(entry.row)
      } else if (event.key === 'Escape' || event.key === 'Tab') {
        const old = popup
        old.hide()
        forgetPopup()
        focusNode(old.opener)
        if (event.key === 'Tab') {
          event.stopPropagation()
          return false
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (!event.repeat) {
          const opener = popup!.opener,
            label = opener.getAttribute('aria-label') || ''
          originalGesture(current)
          reconcileLower()
          if (popup) reconcilePopup()
          else returnAfterAction(opener, label)
        }
      } else return false
      event.preventDefault()
      event.stopPropagation()
      return true
    }
    if (ui.currentMenu?.div?.isConnected) return false
    if (event.key === 'Escape' && lowerTargets.includes(target))
      focusNode(canvasFocus?.isConnected ? canvasFocus : ui.typingShim)
    else if (event.key === 'F6') {
      if (lowerTargets.includes(target))
        focusNode(canvasFocus?.isConnected ? canvasFocus : ui.typingShim)
      else {
        canvasFocus = target
        focusNode(lastLower && lowerTargets.includes(lastLower) ? lastLower : lowerTargets[0])
      }
    } else if (
      lowerTargets.includes(target) &&
      ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
    )
      moveFocus(lowerTargets, target, event.key)
    else if (lowerTargets.includes(target) && (event.key === 'Enter' || event.key === ' ')) {
      if (!event.repeat) activateLower(target)
    } else return false
    if (lowerTargets.includes(document.activeElement as HTMLElement))
      lastLower = document.activeElement as HTMLElement
    event.preventDefault()
    event.stopPropagation()
    return true
  }
  const lowerMouse = (event: Event) => {
    if (event.isTrusted && ['mousedown', 'pointerdown'].includes(event.type)) ++mouseSequence
    if (!lowerReady()) return
    const target = event.target as Element | null,
      opener = lowerTargets.find((node) => node === target || node.contains(target))
    if (!opener || !capable(opener)) return
    const identity = openerIdentity(opener)
    if (!identity.menu) return
    const previous = ui.currentMenu,
      request = active.request
    queueMicrotask(() => {
      if (active?.request === request) {
        reconcileLower()
        const replacement = connectedOpener(opener, identity)
        if (replacement) adoptPopup(replacement, previous, false)
      }
    })
  }
  const lowerResize = () => { reconcileLower(); reconcileUpperFocus() }

  // Separate ownership records keep upper projections from changing the lower adapter.
  type UpperProjection = Map<string, { before: string | null; last: string }>
  type UpperControl = { kind: 'menu' | 'freehand'; handlers: unknown[]; drawing?: () => boolean; freehand?: any }
  type UpperPopup = { instance: any; div: HTMLElement; tbody: HTMLElement; opener: HTMLElement; request: any; hide: () => void; hideSubmenu: (scope: any) => void }
  type UpperPanel = { scope: any; div: HTMLElement; tbody: HTMLElement; parent?: any; row?: HTMLElement }
  const upperControls = new Map<HTMLElement, UpperControl>(), upperControlProjection = new Map<HTMLElement, UpperProjection>(), upperMenuProjection = new Map<HTMLElement, UpperProjection>()
  let upperPopup: UpperPopup | undefined, upperGestureSequence = 0
  let upperGestureTimer: ReturnType<typeof setTimeout> | undefined
  let upperFocusRing: HTMLDivElement | undefined, upperFocusQueued = false
  function clearUpperFocus() {
    upperFocusRing?.remove()
    upperFocusRing = undefined
  }
  function reconcileUpperFocus() {
    if (disposed || !upperRootOwned()) { clearUpperFocus(); return }
    // prepare is pure; the current visual lease remains until apply/rollback.
    if (!currentPresentation()) return
    const node = document.activeElement, control = node instanceof HTMLElement ? upperControlProof(node) : undefined
    if (!(node instanceof HTMLElement) || !control || upperDisabled(node, control) || !node.matches(':focus-visible')) { clearUpperFocus(); return }
    const host = node.closest<HTMLElement>('.geToolbarContainer')
    if (!host || !host.isConnected || !['absolute', 'relative', 'fixed'].includes(getComputedStyle(host).position)) { clearUpperFocus(); return }
    const bounds = node.getBoundingClientRect(), parent = host.getBoundingClientRect()
    if (![bounds.x, bounds.y, bounds.width, bounds.height, parent.x, parent.y].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) { clearUpperFocus(); return }
    if (!upperFocusRing || upperFocusRing.parentElement !== host) {
      clearUpperFocus()
      upperFocusRing = document.createElement('div')
      upperFocusRing.setAttribute('data-frade-upper-focus-ring', '1')
      upperFocusRing.setAttribute('aria-hidden', 'true')
      upperFocusRing.setAttribute('inert', '')
      upperFocusRing.style.cssText = 'position:absolute;pointer-events:none;opacity:1;background:transparent;border:0;padding:0;margin:0;box-sizing:border-box;outline:2px solid var(--frade-frame-focus-ring);outline-offset:2px;z-index:1;'
      host.append(upperFocusRing)
    }
    const values: Record<string, string> = {
      left: bounds.left - parent.left - host.clientLeft + host.scrollLeft + 'px',
      top: bounds.top - parent.top - host.clientTop + host.scrollTop + 'px',
      width: bounds.width + 'px', height: bounds.height + 'px', 'border-radius': getComputedStyle(node).borderRadius || '0px',
    }
    for (const [name, value] of Object.entries(values)) if (upperFocusRing.style.getPropertyValue(name) !== value) upperFocusRing.style.setProperty(name, value)
  }
  const upperFocusChanged = () => {
    if (upperFocusQueued || disposed) return
    upperFocusQueued = true
    queueMicrotask(() => { upperFocusQueued = false; reconcileUpperFocus() })
  }
  function upperAttribute(map: Map<HTMLElement, UpperProjection>, node: HTMLElement, name: string, value: string) {
    let saved = map.get(node)
    if (!saved) { saved = new Map(); map.set(node, saved) }
    let property = saved.get(name)
    if (!property) { property = { before: node.getAttribute(name), last: value }; saved.set(name, property) }
    else if (node.getAttribute(name) !== property.last) return
    if (node.getAttribute(name) !== value) node.setAttribute(name, value)
    property.last = value
  }
  function restoreUpperProjection(map: Map<HTMLElement, UpperProjection>, keep?: Set<HTMLElement>) {
    for (const [node, saved] of map) {
      if (keep?.has(node)) continue
      for (const [name, property] of saved) if (node.getAttribute(name) === property.last) {
        if (property.before === null) node.removeAttribute(name)
        else node.setAttribute(name, property.before)
      }
      map.delete(node)
    }
  }
  const upperClickHandlers = (node: any): unknown[] => Array.isArray(node.mxListenerList)
    ? node.mxListenerList.filter((entry: any) => entry.name === 'click' && typeof entry.f === 'function').map((entry: any) => entry.f) : []
  function upperControlProof(node: HTMLElement) {
    const source = upperOwners.get(node), control = upperControls.get(node)
    if (!source || !control || !visible(node) || !node.matches(upperSelector) || node.className !== source.className ||
      node.getAttribute('data-frade-upper-glyph') !== '1' || Array.from(source.properties).some(([name, value]) => !upperPropertyMatches(node, name, value))) return
    const handlers = upperClickHandlers(node)
    if (!handlers.length || handlers.length !== control.handlers.length || handlers.some((handler, i) => handler !== control.handlers[i])) return
    if (control.kind === 'menu' && typeof (node as any).enabled !== 'boolean') return
    if (control.kind === 'freehand' && (graph?.freehand !== control.freehand || graph?.freehand?.isDrawing !== control.drawing)) return
    return control
  }
  const upperDisabled = (node: HTMLElement, control: UpperControl) => node.hasAttribute('disabled') || node.classList.contains('mxDisabled') ||
    (control.kind === 'menu' ? (node as any).enabled === false : typeof graph?.isEnabled !== 'function' || !graph.isEnabled())
  const upperInteractionReady = () => !disposed && currentPresentation() && upperRootOwned() && !active.upperPending &&
    !graph?.isEditing?.() && !graph?.isMouseDown && !ui?.dialog && !(ui?.dialogs?.length > 0)
  function upperPopupStructure(value: UpperPopup) {
    return ui?.currentMenu === value.instance && ui.currentMenuElt === value.opener && value.instance.div === value.div &&
      value.instance.tbody === value.tbody && value.div.isConnected && value.div.contains(value.tbody) &&
      value.instance.hideMenu === value.hide && value.instance.hideSubmenu === value.hideSubmenu && !!upperControlProof(value.opener)
  }
  function upperPanels(value: UpperPopup): UpperPanel[] | undefined {
    const result: UpperPanel[] = [], seen = new Set<HTMLElement>()
    let rowCount = 0
    const visit = (scope: any, div: HTMLElement, tbody: HTMLElement, parent?: any, row?: HTMLElement): boolean => {
      if (result.length >= 32 || seen.has(div) || !(tbody instanceof HTMLElement) || !div.isConnected || !div.contains(tbody) || tbody.tagName !== 'TBODY') return false
      seen.add(div); result.push({ scope, div, tbody, parent, row })
      const children = Array.from(tbody.children)
      rowCount += children.length
      if (rowCount > 512) return false
      for (const child of children) {
        if (!(child instanceof HTMLTableRowElement)) return false
        const sub = child as any
        if (sub.div?.isConnected && (scope.activeRow !== child || !(sub.div instanceof HTMLElement) || !visit(child, sub.div, sub.tbody, scope, child))) return false
      }
      return !scope.activeRow || children.includes(scope.activeRow)
    }
    return visit(value.instance, value.div, value.tbody) ? result : undefined
  }
  function forgetUpperPopup(cancel = false) {
    const previous = upperPopup
    upperPopup = undefined
    if (cancel && previous && upperPopupStructure(previous) && upperPanels(previous)) previous.hide.call(previous.instance)
    restoreUpperProjection(upperMenuProjection)
    if (previous && upperControlProjection.has(previous.opener)) upperAttribute(upperControlProjection, previous.opener, 'aria-expanded', 'false')
  }
  function clearUpperInteraction() {
    clearUpperFocus()
    ++upperGestureSequence
    if (upperGestureTimer !== undefined) clearTimeout(upperGestureTimer)
    upperGestureTimer = undefined
    forgetUpperPopup(true); restoreUpperProjection(upperControlProjection); upperControls.clear()
  }
  function upperPopupLive() {
    if (!upperPopup || !upperInteractionReady() || upperPopup.request !== active.request || !upperPopupStructure(upperPopup)) return false
    const control = upperControlProof(upperPopup.opener)
    return !!control && !upperDisabled(upperPopup.opener, control)
  }
  function reconcileUpperMenu() {
    if (!upperPopup || !currentPresentation()) return
    const panels = upperPopupLive() ? upperPanels(upperPopup) : undefined
    if (!panels) { forgetUpperPopup(); return }
    const keep = new Set<HTMLElement>(), own = (node: HTMLElement, name: string, value: string) => { keep.add(node); upperAttribute(upperMenuProjection, node, name, value) }
    for (const entry of panels) {
      own(entry.div, 'data-frade-upper-menu', '1'); own(entry.div, 'role', 'menu'); own(entry.div, 'aria-label', upperPopup.opener.title)
      const table = entry.tbody.parentElement
      if (table?.tagName === 'TABLE') own(table, 'role', 'presentation')
      own(entry.tbody, 'role', 'presentation')
      for (const child of Array.from(entry.tbody.children)) {
        const row = child as HTMLTableRowElement, label = row.cells[1]?.textContent?.trim() || ''
        if (!label) { own(row, 'role', 'separator'); continue }
        const disabled = Array.from(row.cells).some(cell => cell.classList.contains('mxDisabled')) || !registered(row, gestureNames()[0]) || !registered(row, gestureNames()[1])
        const checkmark = globals.Editor?.checkmarkImage
        const checked = typeof checkmark === 'string' && !!checkmark && Array.from(row.cells[1].querySelectorAll<HTMLElement>('div,img')).some(icon => icon.style.backgroundImage.includes(checkmark) || (icon instanceof HTMLImageElement && icon.src === checkmark))
        own(row, 'data-frade-upper-row', '1'); own(row, 'role', checked ? 'menuitemcheckbox' : 'menuitem'); own(row, 'aria-label', label); own(row, 'aria-disabled', String(disabled)); own(row, 'tabindex', '-1')
        if (checked) own(row, 'aria-checked', 'true')
        const sub = row as any
        if (sub.div instanceof HTMLElement && sub.tbody instanceof HTMLElement && sub.div.contains(sub.tbody)) { own(row, 'aria-haspopup', 'menu'); own(row, 'aria-expanded', String(sub.div.isConnected && entry.scope.activeRow === row)) }
        for (const cell of Array.from(row.cells)) { own(cell, 'role', 'presentation'); own(cell, 'aria-hidden', 'true') }
      }
    }
    restoreUpperProjection(upperMenuProjection, keep)
  }
  function reconcileUpperInteraction() {
    if (disposed || !upperRootOwned()) { clearUpperInteraction(); return }
    if (!currentPresentation()) return
    const keep = new Set<HTMLElement>()
    for (const [node, source] of upperOwners) {
      if (!visible(node)) continue
      const hash = upperVerified.get(source.bytes), kind = hash === 'e78bd38fea8a799c13ffc0fbbab4d9ca6a1ee0ee57360c68596b58e4fe68da9a' ? 'freehand' : 'menu'
      if (!upperControls.has(node)) {
        const handlers = upperClickHandlers(node)
        if (!handlers.length || !node.title.trim() || (kind === 'menu' ? typeof (node as any).enabled !== 'boolean' : typeof graph?.freehand?.isDrawing !== 'function')) continue
        upperControls.set(node, { kind, handlers, ...(kind === 'freehand' ? { freehand: graph.freehand, drawing: graph.freehand.isDrawing } : {}) })
      }
      const control = upperControlProof(node)
      if (!control) continue
      keep.add(node)
      const own = (name: string, value: string) => upperAttribute(upperControlProjection, node, name, value), disabled = upperDisabled(node, control)
      own('data-frade-upper-control', '1'); own('role', 'button'); own('tabindex', disabled ? '-1' : '0'); own('aria-label', node.title); own('aria-disabled', String(disabled))
      if (control.kind === 'menu') { own('aria-haspopup', 'menu'); own('aria-expanded', String(upperPopup?.opener === node && upperPopupStructure(upperPopup))) }
      else own('aria-pressed', String(control.drawing!.call(control.freehand)))
    }
    restoreUpperProjection(upperControlProjection, keep)
    for (const node of upperControls.keys()) if (!keep.has(node)) upperControls.delete(node)
    reconcileUpperMenu()
    reconcileUpperFocus()
  }
  function upperFocus(node?: HTMLElement) {
    if (node && upperInteractionReady() && visible(node) && node.getAttribute('aria-disabled') !== 'true') node.focus({ preventScroll: true })
  }
  const upperRows = (panel: UpperPanel) => Array.from(panel.tbody.children).filter((node): node is HTMLElement => node instanceof HTMLElement && visible(node) && node.getAttribute('role')?.startsWith('menuitem') === true && node.getAttribute('aria-disabled') === 'false')
  function adoptUpperPopup(opener: HTMLElement, previous: any, request: any, keyboard = false) {
    const control = upperControlProof(opener), instance = ui?.currentMenu
    if (!upperInteractionReady() || active.request !== request || control?.kind !== 'menu' || upperDisabled(opener, control) || !instance || instance === previous || ui.currentMenuElt !== opener || !(instance.div instanceof HTMLElement) || !(instance.tbody instanceof HTMLElement) || typeof instance.hideMenu !== 'function' || typeof instance.hideSubmenu !== 'function') return
    if (upperPopup?.instance === instance) return
    forgetUpperPopup()
    const candidate: UpperPopup = { instance, div: instance.div, tbody: instance.tbody, opener, request, hide: instance.hideMenu, hideSubmenu: instance.hideSubmenu }
    if (!upperPopupStructure(candidate) || !upperPanels(candidate)) return
    upperPopup = candidate; reconcileUpperInteraction()
    if (keyboard && upperPopupLive()) upperFocus(upperRows(upperPanels(candidate)![0])[0])
  }
  function upperMouse(event: Event) {
    const target = event.target instanceof Element ? event.target.closest<HTMLElement>(upperSelector) : null
    if (!target || !upperInteractionReady()) return
    const control = upperControlProof(target)
    if (!control || upperDisabled(target, control) || !registered(target, event.type)) return
    const request = active.request, previous = ui.currentMenu, sequence = ++upperGestureSequence
    const observeOriginal = () => {
      if (sequence !== upperGestureSequence || !upperInteractionReady() || active.request !== request) return
      if (control.kind === 'menu') adoptUpperPopup(target, previous, request)
      reconcileUpperInteraction()
      if (upperPopup?.opener === target && upperGestureTimer !== undefined) { clearTimeout(upperGestureTimer); upperGestureTimer = undefined }
    }
    if (upperGestureTimer !== undefined) clearTimeout(upperGestureTimer)
    // Trusted Chromium events checkpoint microtasks before the original target listener.
    upperGestureTimer = setTimeout(() => { upperGestureTimer = undefined; observeOriginal() }, 0)
    queueMicrotask(observeOriginal)
  }
  function upperKey(event: KeyboardEvent): boolean {
    if (!upperInteractionReady() || event.isComposing || event.keyCode === 229 || event.repeat || event.altKey || event.ctrlKey || event.metaKey || (event.shiftKey && event.key !== 'Tab')) return false
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"],[role="textbox"],[role="dialog"],[role="alertdialog"]')) return false
    if (upperPopup && !upperPopupLive()) forgetUpperPopup()
    const panels = upperPopupLive() ? upperPanels(upperPopup!) : undefined
    if (upperPopup && !panels) { forgetUpperPopup(); return false }
    let handled = false
    if (panels?.length) {
      const previous = upperPopup!, row = target?.closest<HTMLElement>('tr'), entry = panels.find(panel => !!row && row.parentElement === panel.tbody)
      if (event.key === 'Escape' || event.key === 'Tab') {
        const deepest = panels[panels.length - 1]
        if (event.key === 'Escape' && deepest.parent && deepest.row) { previous.hideSubmenu.call(previous.instance, deepest.parent); reconcileUpperMenu(); upperFocus(deepest.row) }
        else { forgetUpperPopup(true); reconcileUpperInteraction(); upperFocus(previous.opener) }
        event.stopPropagation(); if (event.key === 'Tab') return true; handled = true
      } else if (entry && row && row.getAttribute('aria-disabled') === 'false') {
        const items = upperRows(entry), index = items.indexOf(row)
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { upperFocus(items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]); handled = true }
        else if (event.key === 'ArrowRight' && (row as any).div && originalGesture(row, true)) { reconcileUpperMenu(); const nested = upperPopup && upperPanels(upperPopup)?.find(panel => panel.row === row); if (nested) upperFocus(upperRows(nested)[0]); handled = true }
        else if (event.key === 'ArrowLeft' && entry.parent && entry.row) { previous.hideSubmenu.call(previous.instance, entry.parent); reconcileUpperMenu(); upperFocus(entry.row); handled = true }
        else if (['Enter', ' '].includes(event.key) && originalGesture(row)) { reconcileUpperInteraction(); if (!upperPopup) upperFocus(previous.opener); handled = true }
      }
    } else {
      const node = target?.closest<HTMLElement>(upperSelector), control = node && upperControlProof(node)
      if (node && control && !upperDisabled(node, control) && (['Enter', ' '].includes(event.key) || (event.key === 'ArrowDown' && control.kind === 'menu'))) { const previous = ui.currentMenu, request = active.request; node.click(); if (control.kind === 'menu') adoptUpperPopup(node, previous, request, true); reconcileUpperInteraction(); handled = true }
    }
    if (handled) { event.preventDefault(); event.stopPropagation() }
    return handled
  }

  function clearLower() {
    forgetPopup(true)
    restoreAttributes(lowerAttributes)
    restoreLowerStyles()
    lowerTargets = []
    lastLower = undefined
    canvasFocus = undefined
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
    if (!active || disposed || active.upperPending) return
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
    lowerObserver = new MutationObserver(() => { reconcileLower(); reconcileUpper() })
    lowerObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'title', 'hidden', 'disabled'],
      characterData: true,
    })
    lowerObserver!.observe(root, { attributes: true, attributeFilter: ['data-frade-frame-runtime', 'data-frade-frame-revision'] })
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
    clearUpper()
    clearLower()
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
    forgetPopup(true)
    forgetUpperPopup(true)
    upperPaintedRequest = undefined
    active = { request, snapshot, upperPending: true }
    reconcileLower()
    syncProjection()
    const verification = verifyUpper(request, token)
    if (verification) await verification
    if (!upperLive(request, token)) return
    const beforePaint = upperCandidates(true)
    await paint()
    if (upperLive(request, token)) {
      const afterPaint = upperCandidates(true)
      if (afterPaint.length !== beforePaint.length || afterPaint.some((source, i) => source.node !== beforePaint[i].node || source.image !== beforePaint[i].image || source.bytes !== beforePaint[i].bytes))
        throw Error('Upper glyph ownership changed before painted acknowledgement')
      active.upperPending = false
      upperPaintedRequest = request
      reply(request, 'PAINTED')
    }
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
    if (upperKey(event) || lowerKey(event)) return
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
    lowerObserver?.disconnect()
    for (const name of ['click', 'mousemove', 'pointermove']) document.removeEventListener(name, upperMouse, true)
    for (const name of ['focusin', 'focusout', 'scroll']) document.removeEventListener(name, upperFocusChanged, true)
    window.removeEventListener('resize', lowerResize)
    for (const query of lowerMedia) query.removeEventListener('change', lowerResize)
    for (const name of ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'])
      document.removeEventListener(name, lowerMouse, true)
    graph?.view?.removeListener?.(viewChanged)
    ui?.editor?.removeListener?.(viewChanged)
    graph?.container?.removeEventListener('scroll', viewChanged)
    window.removeEventListener('message', receive)
    document.removeEventListener('keydown', keydown, true)
    window.removeEventListener('pagehide', dispose)
    if (prototype?.init === installedInit) prototype.init = originalInit
    clearProjection()
  }
  const lowerMedia = typeof window.matchMedia === 'function'
    ? ['(pointer:coarse)', '(forced-colors:active)', '(prefers-reduced-motion:reduce)'].map(query => window.matchMedia(query))
    : []
  for (const query of lowerMedia) query.addEventListener('change', lowerResize)
  window.addEventListener('resize', lowerResize)
  for (const name of ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'])
    document.addEventListener(name, lowerMouse, true)
  for (const name of ['click', 'mousemove', 'pointermove']) document.addEventListener(name, upperMouse, true)
  for (const name of ['focusin', 'focusout', 'scroll']) document.addEventListener(name, upperFocusChanged, true)
  window.addEventListener('message', receive)
  document.addEventListener('keydown', keydown, true)
  window.addEventListener('pagehide', dispose)
  return dispose
}
