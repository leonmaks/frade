import { readRepositoryDrag } from '@frade/ui-navigator'
import type { DiagramViewProps } from './DiagramView'
export function droppedObject(raw: unknown, props: DiagramViewProps) {
  if (props.readOnly) return
  const ref = readRepositoryDrag(raw)
  if (!ref) return
  if (ref.repositoryId !== props.draft.repositoryId) {
    props.onError(
      'Объект принадлежит другому репозиторию. Используйте явно подключённый внешний каталог.',
    )
    return
  }
  const object = props.objects.find((o) => o.id === ref.objectId && o.sourceId === ref.sourceId)
  if (!object) props.onError('Объект больше не доступен в репозитории или подключённом каталоге.')
  return object
}
