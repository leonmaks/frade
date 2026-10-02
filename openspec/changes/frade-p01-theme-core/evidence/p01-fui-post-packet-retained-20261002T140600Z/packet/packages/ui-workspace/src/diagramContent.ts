/** Draw.io exports canvas dimensions on every read; resizing is not a document edit. */
export function sameDiagramContent(path: string, left: string, right: string): boolean {
  if (left === right) return true
  if (path.toLowerCase().endsWith('.frade')) return false
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
