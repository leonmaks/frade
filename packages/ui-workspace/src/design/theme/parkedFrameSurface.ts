export interface PaintBounds {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}
const positive = (bounds: PaintBounds): boolean =>
  [bounds.left, bounds.top, bounds.width, bounds.height].every(Number.isFinite) &&
  bounds.width > 0 &&
  bounds.height > 0

/** Only the retained tab's existing group can supply first-paint geometry. */
function owningContentBounds(
  container: HTMLElement,
  anchor: Element | null,
): PaintBounds | undefined {
  if (
    !anchor?.isConnected ||
    anchor.ownerDocument !== container.ownerDocument ||
    !anchor.hasAttribute('data-diagram-group')
  )
    return
  const group = anchor.parentElement
  if (!group?.matches('.editor-group') || !group.isConnected || group.closest('[hidden]')) return
  const view = group.ownerDocument.defaultView
  if (!view) return
  const style = view.getComputedStyle(group)
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse')
    return
  const tabs = group.querySelector<HTMLElement>(':scope > .editor-tabs[role="tablist"]')
  if (!tabs) return
  const groupBounds = group.getBoundingClientRect(),
    tabBounds = tabs.getBoundingClientRect()
  if (!positive(groupBounds) || !positive(tabBounds)) return
  const top = Math.max(groupBounds.top, tabBounds.bottom)
  const bounds = {
    left: groupBounds.left,
    top,
    width: groupBounds.width,
    height: groupBounds.bottom - top,
  }
  return positive(bounds) ? bounds : undefined
}

/** Called only from frameParticipant after the service's neutral cover has painted. */
export function acquireParkedFrameSurface(
  parking: HTMLElement | null,
  container: HTMLElement,
  previous: PaintBounds | undefined,
  anchor: Element | null,
): () => void {
  if (!parking || !parking.contains(container) || !parking.hidden) return () => {}
  const bounds = previous ?? owningContentBounds(container, anchor)
  if (!bounds || !positive(bounds)) throw Error('Inactive editor paint bounds unavailable')
  const style = parking.getAttribute('style'),
    hidden = parking.getAttribute('hidden'),
    inert = parking.hasAttribute('inert')
  parking.hidden = false
  parking.setAttribute('inert', '')
  Object.assign(parking.style, {
    position: 'fixed',
    left: bounds.left + 'px',
    top: bounds.top + 'px',
    width: bounds.width + 'px',
    height: bounds.height + 'px',
    zIndex: '2147482000',
    pointerEvents: 'none',
  })
  let released = false
  return () => {
    if (released) return
    released = true
    if (hidden === null) parking.removeAttribute('hidden')
    else parking.setAttribute('hidden', hidden)
    if (style === null) parking.removeAttribute('style')
    else parking.setAttribute('style', style)
    if (!inert) parking.removeAttribute('inert')
  }
}
