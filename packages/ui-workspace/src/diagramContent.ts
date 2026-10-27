import { drawingContentKey } from '@frade/draw/document'
/** Both editors export navigation dimensions; navigation/formatting is not a semantic edit. */
export function sameDiagramContent(path: string, left: string, right: string): boolean {
  if (left === right) return true
  if (path.toLowerCase().endsWith('.frade')) {
    try {
      return drawingContentKey(left) === drawingContentKey(right)
    } catch {
      return false
    } // Invalid drawings are never equivalent to different input bytes.
  }
  const parse = (xml: string) => {
    const doc = new DOMParser().parseFromString(xml, 'text/xml')
    if (doc.querySelector('parsererror')) return
    for (const model of doc.querySelectorAll('mxGraphModel')) {
      model.removeAttribute('dx')
      model.removeAttribute('dy')
    }
    return doc.documentElement
  }
  const a = parse(left),
    b = parse(right)
  return !!a && !!b && a.isEqualNode(b)
}
