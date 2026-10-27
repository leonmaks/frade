import {
  deserializeDrawingDocument,
  serializeDrawingDocument,
  type DrawingDocument,
} from './drawing'
export function downloadDocument(model: DrawingDocument) {
  const url = URL.createObjectURL(
    new Blob([serializeDrawingDocument(model)], { type: 'application/json' }),
  )
  const anchor = Object.assign(globalThis.document.createElement('a'), {
    href: url,
    download: `${model.metadata.name || 'diagram'}.frade.json`,
  })
  anchor.click()
  URL.revokeObjectURL(url)
}
export async function readDocument(file: File) {
  return deserializeDrawingDocument(await file.text())
}
