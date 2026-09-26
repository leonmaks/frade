type Start = {
  button: number
  pointerId: number
  currentTarget: Element
  preventDefault(): void
}
let activeStop: (() => void) | undefined
/** Keep one pointer gesture in the host document even when it crosses an iframe. */
export function startPointerDrag(event: Start, onMove: (event: PointerEvent) => void): () => void {
  if (event.button !== 0) return () => {}
  activeStop?.()
  event.preventDefault()
  const target = event.currentTarget,
    shield = document.createElement('div'),
    id = event.pointerId
  shield.dataset.pointerDragShield = ''
  Object.assign(shield.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    cursor: getComputedStyle(target).cursor,
    touchAction: 'none',
  })
  document.body.append(shield)
  let stopped = false
  const stop = () => {
    if (stopped) return
    stopped = true
    window.removeEventListener('pointermove', move, true)
    window.removeEventListener('pointerup', stop, true)
    window.removeEventListener('pointercancel', stop, true)
    window.removeEventListener('blur', stop)
    target.removeEventListener('lostpointercapture', stop)
    shield.remove()
    if (target.hasPointerCapture?.(id)) target.releasePointerCapture(id)
    if (activeStop === stop) activeStop = undefined
  }
  const move = (e: PointerEvent) => {
    if (e.pointerId !== id) return
    if (e.buttons === 0) {
      stop()
      return
    }
    onMove(e)
  }
  activeStop = stop
  target.setPointerCapture(id)
  window.addEventListener('pointermove', move, true)
  window.addEventListener('pointerup', stop, true)
  window.addEventListener('pointercancel', stop, true)
  window.addEventListener('blur', stop)
  target.addEventListener('lostpointercapture', stop)
  return stop
}
