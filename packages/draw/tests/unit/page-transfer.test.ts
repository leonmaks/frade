// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { openTransferredPage, receivePageTransfer } from '../../src/editor/pageTransfer'
const document = {
  format: 'frade-draw' as const,
  version: 1 as const,
  metadata: { id: 'd', name: 'Drawing' },
  graph: { nodes: [], edges: [] },
}
afterEach(() => {
  localStorage.clear()
  history.replaceState(null, '', '/')
  vi.restoreAllMocks()
  vi.useRealTimers()
})
it('reports a blocked popup and removes the exact unconsumed transfer', () => {
  vi.spyOn(window, 'open').mockReturnValue(null)
  expect(() => openTransferredPage(document)).toThrow('Разрешите')
  expect(Object.keys(localStorage)).toEqual([])
})
it('consumes one same-origin transfer once, removes the URL token and keeps content', () => {
  history.replaceState(null, '', '/#frade-page=copy')
  localStorage.setItem(
    'frade.page-transfer/copy',
    JSON.stringify({ created: Date.now(), document: JSON.stringify(document) }),
  )
  expect(receivePageTransfer()).toEqual(document)
  expect(location.hash).toBe('')
  expect(Object.keys(localStorage)).toEqual([])
  history.replaceState(null, '', '/#frade-page=copy')
  expect(() => receivePageTransfer()).toThrow('Не удалось')
})
it.each([
  ['expired', Date.now() - 61000, '{}'],
  ['invalid', Date.now(), '{bad'],
])('cleans %s transfers without exposing them to later loads', (_name, created, content) => {
  history.replaceState(null, '', '/#frade-page=bad')
  localStorage.setItem('frade.page-transfer/bad', JSON.stringify({ created, document: content }))
  expect(() => receivePageTransfer()).toThrow()
  expect(location.hash).toBe('')
  expect(Object.keys(localStorage)).toEqual([])
})
it('cleans an unconsumed popup transfer after sixty seconds and severs opener', () => {
  vi.useFakeTimers()
  const child = { opener: window, location: { href: '' }, close: vi.fn() }
  vi.spyOn(window, 'open').mockReturnValue(child as unknown as Window)
  openTransferredPage(document)
  expect(child.opener).toBeNull()
  expect(child.location.href).toContain('#frade-page=')
  expect(Object.keys(localStorage)).toHaveLength(1)
  vi.advanceTimersByTime(60000)
  expect(Object.keys(localStorage)).toEqual([])
})
