import { deserializeDocument, serializeDocument } from './serialize'
import type { DiagramDocument } from './schema'
export function downloadDocument(model: DiagramDocument) {
  const url = URL.createObjectURL(
    new Blob([serializeDocument(model)], { type: 'application/json' }),
  )
  const anchor = Object.assign(globalThis.document.createElement('a'), {
    href: url,
    download: `${model.metadata.name || 'diagram'}.frade.json`,
  })
  anchor.click()
  URL.revokeObjectURL(url)
}
export async function readDocument(file: File) {
  return deserializeDocument(await file.text())
}
