import { REPOSITORY_OBJECT_MIME, type RepositoryDragRef } from './drag'
import { useMemo, useRef, useState, useEffect } from 'react'
import type { RepositoryObject, ObjectRef } from '@frade/repository-domain'
import type { RepositoryPresentation, WorkspaceRoot } from '@frade/repository-api/workbench'
export interface NavigatorRoot {
  root: WorkspaceRoot
  objects: readonly RepositoryObject[]
  presentation?: RepositoryPresentation
  diagrams?: readonly { path: string; kind: 'file' | 'folder' }[]
  catalogs?: readonly {
    id: string
    label: string
    objects: readonly { id: string; name: string }[]
  }[]
  error?: string
}
export interface TreeNode {
  key: string
  label: string
  kind: 'root' | 'group' | 'object' | 'diagram' | 'diagram-folder'
  rootId: string
  entry?: string
  ref?: RepositoryDragRef
  children: TreeNode[]
  count?: number
}
const key = (...parts: string[]) => JSON.stringify(parts)
export function projectTree(
  roots: readonly NavigatorRoot[],
  projection: 'types' | 'sources',
): TreeNode[] {
  return roots.map(({ root, objects, presentation, error, diagrams, catalogs }) => {
    const tree: TreeNode = {
      key: key(root.repositoryId),
      label: root.label + (error ? ' ⚠' : ''),
      kind: 'root',
      rootId: root.repositoryId,
      children: [],
      count: objects.length,
    }
    const service: TreeNode = {
      key: key(root.repositoryId, 'diagram', '_diagrams'),
      label: '_diagrams',
      kind: 'diagram-folder',
      entry: '_diagrams',
      rootId: root.repositoryId,
      children: [],
    }
    tree.children.push(service)
    const folders = new Map([['_diagrams', service]])
    for (const item of [...(diagrams ?? [])].sort((a, b) => a.path.localeCompare(b.path))) {
      const node: TreeNode = {
        key: key(root.repositoryId, 'diagram', item.path),
        label: item.path.split('/').at(-1)!,
        kind: item.kind === 'folder' ? 'diagram-folder' : 'diagram',
        entry: item.path,
        rootId: root.repositoryId,
        children: [],
      }
      folders.get(item.path.slice(0, item.path.lastIndexOf('/')))?.children.push(node)
      if (item.kind === 'folder') folders.set(item.path, node)
    }
    const make = (o: RepositoryObject): TreeNode => ({
      key: key(root.repositoryId, 'object', o.ref.objectId),
      label: o.name,
      kind: 'object',
      rootId: root.repositoryId,
      ref: o.ref,
      children: [],
    })
    const group = (parent: TreeNode, id: string, label: string) => {
      let g = parent.children.find((n) => n.key === id)
      if (!g) {
        g = { key: id, label, kind: 'group', rootId: root.repositoryId, children: [] }
        parent.children.push(g)
      }
      return g
    }
    if (projection === 'sources') {
      for (const o of objects) {
        const source =
          presentation?.sources.find((s) => s.objectId === o.ref.objectId)?.entry ?? 'Объекты'
        let parent = tree
        const path: string[] = []
        for (const p of source.split('/')) {
          path.push(p)
          parent = group(parent, key(root.repositoryId, 'source', ...path), p)
        }
        parent.children.push(make(o))
      }
    } else {
      const types = [...new Set(objects.map((o) => o.typeId))]
      for (const typeId of types) {
        const type = presentation?.types.find((t) => t.id === typeId),
          section = group(
            tree,
            key(root.repositoryId, 'section', type?.section ?? 'Объекты'),
            type?.section ?? 'Объекты',
          ),
          parent = group(section, key(root.repositoryId, 'type', typeId), type?.label ?? typeId)
        const rows = objects.filter((o) => o.typeId === typeId),
          map = new Map(rows.map((o) => [o.ref.objectId, o])),
          placed = new Set<string>()
        const parentId = (o: RepositoryObject) => {
          const p = o.attributes.parent
          return p && typeof p === 'object' && !Array.isArray(p) && typeof p.objectId === 'string'
            ? p.objectId
            : undefined
        }
        const children = new Map<string, RepositoryObject[]>()
        for (const o of rows) {
          const p = parentId(o)
          if (p) {
            const list = children.get(p) ?? []
            list.push(o)
            children.set(p, list)
          }
        }
        const add = (o: RepositoryObject, target: TreeNode) => {
          if (placed.has(o.ref.objectId)) return
          placed.add(o.ref.objectId)
          const node = make(o)
          target.children.push(node)
          for (const c of children.get(o.ref.objectId) ?? []) add(c, node)
        }
        for (const o of rows) {
          const p = parentId(o)
          if (!p) add(o, parent)
          else if (!map.has(p))
            add(
              o,
              group(parent, key(root.repositoryId, 'orphans', typeId), 'Без доступного родителя'),
            )
        }
        for (const o of rows)
          if (!placed.has(o.ref.objectId))
            add(o, group(parent, key(root.repositoryId, 'cycles', typeId), 'Циклические связи'))
        parent.count = rows.length
      }
    }
    if (catalogs?.length)
      tree.children.push({
        key: key(root.repositoryId, 'external'),
        label: 'Внешние источники',
        kind: 'group',
        rootId: root.repositoryId,
        children: catalogs.map((catalog) => ({
          key: key(root.repositoryId, 'external', catalog.id),
          label: catalog.label,
          kind: 'group',
          rootId: root.repositoryId,
          children: catalog.objects.map((object) => ({
            key: key(root.repositoryId, 'external', catalog.id, object.id),
            label: object.name,
            kind: 'object',
            rootId: root.repositoryId,
            ref: { repositoryId: root.repositoryId, objectId: object.id, sourceId: catalog.id },
            children: [],
          })),
        })),
      })
    return tree
  })
}
export interface NavigatorProps {
  roots: readonly NavigatorRoot[]
  expanded: readonly string[]
  projection: 'types' | 'sources'
  selected?: ObjectRef
  selectedRoot?: string
  onDiagram?: (id: string, path: string, pinned: boolean) => void
  onDiagramAction?: (id: string, path: string, action: 'create' | 'folder' | 'rename') => void
  onCatalog?: (id: string) => void
  onRename: (id: string) => void
  onExpand: (keys: string[]) => void
  onProjection: (p: 'types' | 'sources') => void
  onOpen: (ref: ObjectRef, pinned: boolean) => void
  onRoot: (id: string) => void
  onSettings: (id: string) => void
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  onReorder: (ids: string[]) => void
}
export function Navigator(props: NavigatorProps) {
  const [query, setQuery] = useState(''),
    [focus, setFocus] = useState(''),
    [menu, setMenu] = useState<{
      id: string
      entry?: string
      kind?: string
      x: number
      y: number
    }>(),
    element = useRef<HTMLDivElement>(null)
  const tree = useMemo(
    () => projectTree(props.roots, props.projection),
    [props.roots, props.projection],
  )
  useEffect(() => {
    if (!props.selected) return
    const ancestors: string[] = []
    const find = (n: TreeNode, path: string[]): boolean => {
      if (
        !n.ref?.sourceId &&
        n.ref?.repositoryId === props.selected?.repositoryId &&
        n.ref?.objectId === props.selected?.objectId
      ) {
        ancestors.push(...path)
        if (
          query &&
          !(n.label + ' ' + n.ref?.objectId).toLocaleLowerCase().includes(query.toLocaleLowerCase())
        )
          setQuery('')
        return true
      }
      return n.children.some((c) => find(c, [...path, n.key]))
    }
    tree.some((n) => find(n, []))
    const missing = ancestors.filter((k) => !props.expanded.includes(k))
    if (missing.length) props.onExpand([...props.expanded, ...missing])
    requestAnimationFrame(() =>
      element.current
        ?.querySelector('[aria-selected="true"]')
        ?.scrollIntoView({ block: 'nearest' }),
    )
    // Reveal follows object selection and model reload; manual collapse stays possible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.selected?.repositoryId, props.selected?.objectId, props.projection])
  const nodes: { node: TreeNode; level: number; parent?: TreeNode }[] = []
  const matches = (n: TreeNode): boolean =>
    n.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ||
    !!n.ref?.objectId.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ||
    n.children.some(matches)
  const visit = (n: TreeNode, level: number, parent?: TreeNode) => {
    if (query && !matches(n)) return
    nodes.push({ node: n, level, parent })
    if (query || props.expanded.includes(n.key)) n.children.forEach((c) => visit(c, level + 1, n))
  }
  tree.forEach((n) => visit(n, 1))
  const toggle = (n: TreeNode) =>
    props.onExpand(
      props.expanded.includes(n.key)
        ? props.expanded.filter((k) => k !== n.key)
        : [...props.expanded, n.key],
    )
  const activate = (n: TreeNode, pin = false) => {
    props.onRoot(n.rootId)
    if (n.kind === 'diagram' && n.entry) props.onDiagram?.(n.rootId, n.entry, pin)
    else if (n.ref && !n.ref.sourceId) props.onOpen(n.ref, pin)
    else toggle(n)
  }
  const move = (id: string) => {
    setFocus(id)
    requestAnimationFrame(() =>
      element.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(id)}"]`)?.focus(),
    )
  }
  return (
    <div
      className="navigator"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          setMenu(undefined)
          element.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus()
        }
      }}
      onClick={() => menu && setMenu(undefined)}
    >
      <div className="explorer-controls">
        <input
          aria-label="Поиск объектов"
          placeholder="Поиск объектов…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Проекция дерева"
          value={props.projection}
          onChange={(e) => props.onProjection(e.target.value as 'types' | 'sources')}
        >
          <option value="types">По типам</option>
          <option value="sources">По файлам</option>
        </select>
      </div>
      <div className="explorer-tree" role="tree" aria-label="Репозитории архитектуры" ref={element}>
        {nodes.map(({ node: n, level, parent }, i) => {
          const selected = n.ref
            ? !n.ref.sourceId &&
              props.selected?.repositoryId === n.ref.repositoryId &&
              props.selected?.objectId === n.ref.objectId
            : n.kind === 'root' && !props.selected && props.selectedRoot === n.rootId
          return (
            <div
              role="treeitem"
              aria-level={level}
              aria-expanded={
                n.children.length ? props.expanded.includes(n.key) || !!query : undefined
              }
              aria-selected={!!selected}
              tabIndex={(focus || nodes[0]?.node.key) === n.key ? 0 : -1}
              key={n.key}
              data-key={n.key}
              data-object-id={n.ref?.objectId}
              data-source-id={n.ref?.sourceId}
              data-repository-id={n.rootId}
              className={'tree-row ' + (selected ? 'selected' : '')}
              style={{ paddingLeft: 8 + (level - 1) * 14 }}
              title={
                n.ref
                  ? `${props.roots.find((r) => r.root.repositoryId === n.rootId)?.root.label} / ${n.ref.objectId}`
                  : n.label
              }
              draggable={n.kind === 'root' || !!n.ref}
              onDragStart={(e) => {
                if (n.ref) {
                  e.dataTransfer.effectAllowed = 'copy'
                  e.dataTransfer.setData(REPOSITORY_OBJECT_MIME, JSON.stringify(n.ref))
                } else {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('application/frade-root', n.rootId)
                }
              }}
              onDragOver={(e) => {
                if (n.kind === 'root' && e.dataTransfer.types.includes('application/frade-root'))
                  e.preventDefault()
              }}
              onDrop={(e) => {
                const id = e.dataTransfer.getData('application/frade-root')
                if (n.kind === 'root' && id && id !== n.rootId) {
                  const ids = props.roots.map((r) => r.root.repositoryId).filter((r) => r !== id)
                  ids.splice(ids.indexOf(n.rootId), 0, id)
                  props.onReorder(ids)
                }
              }}
              onFocus={() => setFocus(n.key)}
              onClick={() => activate(n)}
              onDoubleClick={() => {
                if (n.ref && !n.ref.sourceId) props.onOpen(n.ref, true)
                else if (n.kind === 'diagram' && n.entry) props.onDiagram?.(n.rootId, n.entry, true)
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                props.onRoot(n.rootId)
                setMenu({ id: n.rootId, entry: n.entry, kind: n.kind, x: e.clientX, y: e.clientY })
              }}
              onKeyDown={(e) => {
                let target: string | undefined
                if (e.key === 'ArrowDown')
                  target = nodes[Math.min(i + 1, nodes.length - 1)].node.key
                else if (e.key === 'ArrowUp') target = nodes[Math.max(0, i - 1)].node.key
                else if (e.key === 'Home') target = nodes[0]?.node.key
                else if (e.key === 'End') target = nodes.at(-1)?.node.key
                else if (e.key === 'ArrowRight' && n.children.length) {
                  if (!props.expanded.includes(n.key)) toggle(n)
                  else target = n.children[0]?.key
                } else if (e.key === 'ArrowLeft') {
                  if (n.children.length && props.expanded.includes(n.key)) toggle(n)
                  else target = parent?.key
                } else if (e.key === 'Enter') activate(n, true)
                else if (e.key === ' ') {
                  activate(n)
                  e.preventDefault()
                } else return
                e.preventDefault()
                if (target) move(target)
              }}
            >
              <span
                className="tree-chevron"
                onClick={(e) => {
                  if (n.children.length) {
                    e.stopPropagation()
                    toggle(n)
                  }
                }}
              >
                {n.children.length ? (
                  <i
                    aria-hidden="true"
                    className={
                      'codicon codicon-chevron-' +
                      (props.expanded.includes(n.key) || query ? 'down' : 'right')
                    }
                  />
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className={
                  'tree-icon ' +
                  n.kind +
                  ' codicon codicon-' +
                  (n.kind === 'object'
                    ? 'symbol-class'
                    : n.kind === 'diagram'
                      ? 'graph'
                      : n.entry === '_diagrams'
                        ? 'graph'
                        : 'folder')
                }
              />
              <span className="tree-label">{n.label}</span>
              {n.count !== undefined && <span className="tree-count">{n.count}</span>}
            </div>
          )
        })}
      </div>
      {menu && (
        <div
          className="context-menu"
          role="menu"
          style={{
            left: Math.min(menu.x, window.innerWidth - 230),
            top: Math.min(menu.y, window.innerHeight - 140),
          }}
        >
          {menu.entry && (
            <>
              {menu.kind === 'diagram-folder' && (
                <>
                  <button
                    role="menuitem"
                    onClick={() => props.onDiagramAction?.(menu.id, menu.entry!, 'create')}
                  >
                    Новая диаграмма…
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => props.onDiagramAction?.(menu.id, menu.entry!, 'folder')}
                  >
                    Новая папка…
                  </button>
                </>
              )}
              {menu.kind === 'diagram' && (
                <button
                  role="menuitem"
                  onClick={() => props.onDiagramAction?.(menu.id, menu.entry!, 'rename')}
                >
                  Переименовать диаграмму…
                </button>
              )}
            </>
          )}
          {props.onCatalog && (
            <button role="menuitem" onClick={() => props.onCatalog?.(menu.id)}>
              Подключить внешний каталог…
            </button>
          )}
          <button role="menuitem" onClick={() => props.onRename(menu.id)}>
            Переименовать корень
          </button>
          <button role="menuitem" onClick={() => props.onSettings(menu.id)}>
            Настройки метаописания
          </button>
          <button role="menuitem" onClick={() => props.onRetry(menu.id)}>
            Перезагрузить репозиторий
          </button>
          <button role="menuitem" onClick={() => props.onRemove(menu.id)}>
            Убрать из workspace
          </button>
        </div>
      )}
    </div>
  )
}
