import type { DiagramObject } from './DiagramView'
export function DiagramReferences(props: {
  references: DiagramObject[]
  objects: DiagramObject[]
  onOpen(id: string): void
}) {
  const found = (r: DiagramObject) =>
    props.objects.some((o) => o.id === r.id && o.sourceId === r.sourceId)
  const missing = props.references.filter((r) => !found(r)).length
  if (!props.references.length) return null
  return (
    <details className="diagram-references">
      <summary>
        Ссылки на диаграмме ({props.references.length})
        {missing ? ' · ⚠ Не найдены: ' + missing : ''}
      </summary>
      <div>
        {props.references.map((r, i) => (
          <button
            key={i}
            disabled={!found(r) || !!r.sourceId}
            title={r.id}
            onClick={() => props.onOpen(r.id)}
          >
            {!found(r) ? '⚠ ' : ''}
            {r.name}
            {!found(r) ? ' — не найден' : ''}
          </button>
        ))}
      </div>
    </details>
  )
}
