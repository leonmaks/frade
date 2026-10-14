// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { acquireParkedFrameSurface } from '../../src/design/theme/parkedFrameSurface'

const previous = { left: 30, top: 100, width: 600, height: 400 }
function fixture() {
  const group = document.createElement('section'),
    tabs = document.createElement('div'),
    anchor = document.createElement('div'),
    parking = document.createElement('div'),
    container = document.createElement('div'),
    iframe = document.createElement('iframe')
  group.className = 'editor-group'
  tabs.className = 'editor-tabs'
  tabs.setAttribute('role', 'tablist')
  anchor.dataset.diagramGroup = 'owned'
  anchor.style.display = 'none' // KA is active; the group's real content area remains available.
  group.append(tabs, anchor)
  container.append(iframe)
  parking.append(container)
  parking.hidden = true
  parking.setAttribute('style', 'margin: 3px;')
  document.body.append(group, parking)
  vi.spyOn(group, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 70, 400, 300))
  vi.spyOn(tabs, 'getBoundingClientRect').mockReturnValue(new DOMRect(10, 70, 400, 35))
  return { group, tabs, anchor, parking, container, iframe }
}
afterEach(() => {
  vi.restoreAllMocks()
  document.body.replaceChildren()
})

it('paints a never-visible retained frame in its measured owning content area and restores the exact lease', () => {
  const f = fixture(),
    parent = f.iframe.parentNode,
    initialStyle = f.parking.getAttribute('style')
  const release = acquireParkedFrameSurface(f.parking, f.container, undefined, f.anchor)
  expect(f.parking.hidden).toBe(false)
  expect(f.parking.hasAttribute('inert')).toBe(true)
  expect(f.parking.style.left).toBe('10px')
  expect(f.parking.style.top).toBe('105px')
  expect(f.parking.style.width).toBe('400px')
  expect(f.parking.style.height).toBe('265px')
  expect(f.iframe.parentNode).toBe(parent)
  expect(f.iframe.isConnected).toBe(true)
  release()
  expect(f.parking.hidden).toBe(true)
  expect(f.parking.hasAttribute('inert')).toBe(false)
  expect(f.parking.getAttribute('style')).toBe(initialStyle)
  expect(f.iframe.parentNode).toBe(parent)
  f.parking.style.margin = '9px'
  release()
  expect(f.parking.style.margin).toBe('9px') // Disposed lease cannot overwrite a later owner's state.
})
it('uses previous real visible bounds unchanged rather than replacing them with current group geometry', () => {
  const f = fixture(),
    release = acquireParkedFrameSurface(f.parking, f.container, previous, null)
  expect(f.parking.style.top).toBe('100px')
  expect(f.parking.style.width).toBe('600px')
  expect(f.group.getBoundingClientRect).not.toHaveBeenCalled()
  release()
})
it('retains a pre-existing inert attribute, original hidden value and absent style on release', () => {
  const f = fixture()
  f.parking.setAttribute('hidden', 'until-found')
  f.parking.setAttribute('inert', '')
  f.parking.removeAttribute('style')
  const release = acquireParkedFrameSurface(f.parking, f.container, previous, null)
  release()
  expect(f.parking.getAttribute('hidden')).toBe('until-found')
  expect(f.parking.hasAttribute('inert')).toBe(true)
  expect(f.parking.hasAttribute('style')).toBe(false)
})
it.each(['missing', 'detached', 'hidden', 'zero', 'no-tabs', 'not-owned', 'foreign-document'])(
  'refuses %s owned geometry before changing any state',
  (kind) => {
    const f = fixture()
    let anchor: Element | null = f.anchor
    if (kind === 'missing') anchor = null
    if (kind === 'detached') f.group.remove()
    if (kind === 'hidden') f.group.hidden = true
    if (kind === 'zero')
      vi.mocked(f.group.getBoundingClientRect).mockReturnValue(new DOMRect(10, 70, 400, 0))
    if (kind === 'no-tabs') f.tabs.remove()
    if (kind === 'not-owned') f.anchor.removeAttribute('data-diagram-group')
    if (kind === 'foreign-document') anchor = document.implementation.createHTMLDocument().body
    const style = f.parking.getAttribute('style')
    expect(() => acquireParkedFrameSurface(f.parking, f.container, undefined, anchor)).toThrow(
      'Inactive editor paint bounds unavailable',
    )
    expect(f.parking.hidden).toBe(true)
    expect(f.parking.hasAttribute('inert')).toBe(false)
    expect(f.parking.getAttribute('style')).toBe(style)
  },
)
it.each([NaN, Infinity, -1, 0])(
  'refuses invalid previous width %s without silently falling back',
  (width) => {
    const f = fixture()
    expect(() =>
      acquireParkedFrameSurface(f.parking, f.container, { ...previous, width }, f.anchor),
    ).toThrow('Inactive editor paint bounds unavailable')
    expect(f.parking.hidden).toBe(true)
  },
)
it('does not acquire a parking lease for an already active or unrelated container', () => {
  const f = fixture()
  f.parking.hidden = false
  const style = f.parking.getAttribute('style')
  acquireParkedFrameSurface(f.parking, f.container, undefined, null)()
  expect(f.parking.getAttribute('style')).toBe(style)
  const other = document.createElement('div')
  f.parking.hidden = true
  acquireParkedFrameSurface(f.parking, other, undefined, null)()
  expect(f.parking.getAttribute('style')).toBe(style)
})
