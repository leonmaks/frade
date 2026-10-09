import { constraintFields, type Constraint } from '@frade/metamodel-domain'
export interface DocumentationType {
  label: string
  description: string
  fields: Map<string, { title: string; description: string }>
}
/** Reads literal headings and table cells. No HTML, links, scripts or expressions execute. */
export function documentationIndex(
  documents: readonly { text: string }[],
): Map<string, DocumentationType> {
  const result = new Map<string, DocumentationType>()
  let current: DocumentationType | undefined
  for (const source of documents) {
    current = undefined
    for (const line of source.text.split(/\r?\n/)) {
      const heading = /^##\s+(.+?)\s*\(`([^`]+)`\)\s*$/.exec(line)
      if (heading) {
        current = { label: heading[1], description: '', fields: new Map() }
        if (!result.has(heading[2])) result.set(heading[2], current)
        continue
      }
      if (/^#{1,2}\s/.test(line)) {
        current = undefined
        continue
      }
      if (!current) continue
      const row = /^\|\s*`([^`]+)`\s*\|/.exec(line)
      if (row) {
        const cells = line
          .split(/(?<!\\)\|/)
          .slice(1, -1)
          .map((s) => s.trim().replaceAll('\\|', '|'))
        if (!current.fields.has(row[1]))
          current.fields.set(row[1], { title: cells[1] ?? '', description: cells[2] ?? '' })
      } else if (line.trim() && !line.startsWith('|'))
        current.description += (current.description ? '\n' : '') + line.trim()
    }
  }
  return result
}
export function documentedRule(
  rule: Constraint,
  documentation: DocumentationType | undefined,
): Constraint {
  if (!documentation) return rule
  const properties = { ...rule.properties }
  for (const field of constraintFields(rule)) {
    const doc = documentation.fields.get(field.key)
    if (!doc) continue
    const title = field.label === field.key && doc.title ? { title: doc.title } : {},
      description = !field.description && doc.description ? { description: doc.description } : {}
    if (Object.keys(title).length || Object.keys(description).length)
      properties[field.key] = { ...properties[field.key], ...title, ...description }
  }
  return { ...rule, properties }
}
