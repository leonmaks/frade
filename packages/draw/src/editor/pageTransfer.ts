import {
  deserializeDrawingDocument,
  serializeDrawingDocument,
  type DrawingDocument,
} from '../document/drawing'
const prefix = 'frade.page-transfer/',
  fragment = '#frade-page='
const lifetime = 60000
/** One-shot same-origin application transfer; never a write-back document reference. */
export function receivePageTransfer(): DrawingDocument | undefined {
  if (!location.hash.startsWith(fragment)) return
  const key = prefix + decodeURIComponent(location.hash.slice(fragment.length))
  const raw = localStorage.getItem(key)
  localStorage.removeItem(key)
  history.replaceState(null, '', location.pathname + location.search)
  if (!raw) throw Error('Не удалось открыть копию страницы')
  const value = JSON.parse(raw)
  if (
    typeof value.created !== 'number' ||
    Date.now() - value.created > lifetime ||
    typeof value.document !== 'string'
  )
    throw Error('Истекло время открытия копии страницы')
  return deserializeDrawingDocument(value.document)
}
export function openTransferredPage(document: DrawingDocument) {
  const id = crypto.randomUUID(),
    key = prefix + id
  localStorage.setItem(
    key,
    JSON.stringify({
      created: Date.now(),
      document: serializeDrawingDocument(document),
    }),
  )
  const child = window.open('about:blank', '_blank')
  if (!child) {
    localStorage.removeItem(key)
    throw Error('Разрешите открытие нового окна для страницы')
  }
  child.opener = null
  const url = new URL(location.href)
  url.hash = fragment.slice(1) + encodeURIComponent(id)
  try {
    child.location.href = url.toString()
  } catch (error) {
    localStorage.removeItem(key)
    child.close()
    throw error
  }
  setTimeout(() => localStorage.removeItem(key), lifetime)
}
