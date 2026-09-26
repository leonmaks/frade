// @vitest-environment jsdom
import { it, expect, vi } from 'vitest'
import { startPointerDrag } from '../src/pointerDrag'
it('captures pointer and shields iframe; release, zero buttons and blur remove every listener', () => {
  const target = document.createElement('div')
  document.body.append(target)
  target.setPointerCapture = vi.fn()
  target.hasPointerCapture = () => true
  target.releasePointerCapture = vi.fn()
  const move = vi.fn()
  const begin = () =>
    startPointerDrag(
      { button: 0, pointerId: 7, currentTarget: target, preventDefault: vi.fn() },
      move,
    )
  begin()
  expect(target.setPointerCapture).toHaveBeenCalledWith(7)
  expect(document.querySelector('[data-pointer-drag-shield]')).toBeTruthy()
  const event = (type: string, buttons = 1) => {
    const e = new Event(type)
    Object.assign(e, { pointerId: 7, buttons, clientX: 200 })
    window.dispatchEvent(e)
  }
  event('pointermove')
  expect(move).toHaveBeenCalledTimes(1)
  event('pointerup', 0)
  event('pointermove')
  expect(move).toHaveBeenCalledTimes(1)
  expect(document.querySelector('[data-pointer-drag-shield]')).toBeNull()
  begin()
  event('pointermove', 0)
  expect(document.querySelector('[data-pointer-drag-shield]')).toBeNull()
  begin()
  event('pointercancel')
  expect(document.querySelector('[data-pointer-drag-shield]')).toBeNull()
  begin()
  window.dispatchEvent(new Event('blur'))
  event('pointermove')
  expect(move).toHaveBeenCalledTimes(1)
  target.remove()
})
