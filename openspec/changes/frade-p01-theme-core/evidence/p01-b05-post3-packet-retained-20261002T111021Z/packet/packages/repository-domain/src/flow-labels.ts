/** Derived diagram text, never copied into canonical repository objects. */
export function flowStatusMarker(status: unknown): string {
  const value =
    typeof status === 'string' ? status.trim().toLocaleLowerCase().replaceAll('ё', 'е') : ''
  if (['используется', 'active', 'used', 'in use'].includes(value)) return '•'
  if (['создается', 'created', 'creating', 'planned'].includes(value)) return '+'
  if (['дорабатывается', 'modified', 'modifying'].includes(value)) return '~'
  if (['удаляется', 'deleted', 'deleting'].includes(value)) return '-'
  return '?'
}
export function formatBundleFlowLabel(
  flows: readonly { name: string; status?: unknown }[],
  width = 44,
): string {
  const indent = '\u00a0'.repeat(4),
    capacity = Math.max(12, width - 4)
  return flows
    .map((flow) => {
      const words = flow.name.trim().replace(/\s+/gu, ' ').split(' '),
        lines: string[] = []
      let line = ''
      for (const word of words) {
        const rest = Array.from(word)
        if (line && Array.from(line).length + rest.length + 1 > capacity) {
          lines.push(line)
          line = ''
        }
        while (rest.length > capacity) {
          if (line) {
            lines.push(line)
            line = ''
          }
          lines.push(rest.splice(0, capacity).join(''))
        }
        if (rest.length) line += (line ? ' ' : '') + rest.join('')
      }
      if (line || !lines.length) lines.push(line)
      return (
        flowStatusMarker(flow.status) +
        ' ' +
        lines[0] +
        lines
          .slice(1)
          .map((text) => '\n' + indent + text)
          .join('')
      )
    })
    .join('\n')
}
