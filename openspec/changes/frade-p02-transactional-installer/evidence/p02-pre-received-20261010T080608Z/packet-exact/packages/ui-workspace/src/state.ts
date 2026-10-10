import type { RepositoryObject, JsonValue, Issue } from '@frade/repository-domain'
export const objectKey = (repositoryId: string, objectId: string) =>
  JSON.stringify([repositoryId, objectId])
export interface Draft {
  base: RepositoryObject
  attributes: Record<string, JsonValue>
  raw: Record<string, string>
  modelGeneration: number
  state: 'clean' | 'dirty' | 'saving' | 'error' | 'conflict' | 'unknown'
  issues: readonly Issue[]
  operationId?: string
  error?: string
  disk?: RepositoryObject
  missing?: boolean
}
export function makeDraft(object: RepositoryObject, modelGeneration: number): Draft {
  return {
    base: object,
    attributes: structuredClone(object.attributes),
    raw: {},
    modelGeneration,
    state: 'clean',
    issues: [],
  }
}
export function isDirty(d: Draft) {
  return d.state !== 'clean' || Object.keys(d.raw).length > 0
}
export function edited(d: Draft, attributes: Record<string, JsonValue>): Draft {
  return {
    ...d,
    attributes,
    state:
      JSON.stringify(attributes) === JSON.stringify(d.base.attributes) && !Object.keys(d.raw).length
        ? 'clean'
        : 'dirty',
    error: undefined,
  }
}
export function refreshed(
  d: Draft,
  object: RepositoryObject | undefined,
  modelGeneration: number,
): Draft {
  if (!object)
    return {
      ...d,
      missing: true,
      error: 'Объект удалён из источника',
      state: isDirty(d) ? 'conflict' : 'error',
    }
  if (d.state === 'saving' || d.state === 'unknown') return d
  if (!isDirty(d)) return makeDraft(object, modelGeneration)
  if (object.revision !== d.base.revision || modelGeneration !== d.modelGeneration)
    return {
      ...d,
      disk: object,
      state: 'conflict',
      error:
        modelGeneration !== d.modelGeneration
          ? 'Изменилась метамодель. Проверьте черновик.'
          : 'Источник изменился. Сравните значения.',
    }
  return d
}
export interface EditorGroup {
  id: string
  tabs: string[]
  active?: string
  preview?: string
}
export function openTab(
  groups: EditorGroup[],
  groupId: string,
  key: string,
  pinned: boolean,
): EditorGroup[] {
  return groups.map((g) => {
    if (g.id !== groupId) return g
    if (g.tabs.includes(key))
      return { ...g, active: key, preview: pinned && g.preview === key ? undefined : g.preview }
    const tabs = g.preview && !pinned ? g.tabs.filter((t) => t !== g.preview) : [...g.tabs]
    return { ...g, tabs: [...tabs, key], active: key, preview: pinned ? g.preview : key }
  })
}
export interface Layout {
  version: 1
  sidebar: number
  panel: number
  sidebarVisible: boolean
  panelVisible: boolean
  expanded: string[]
  projection: 'types' | 'sources'
}
export function readLayout(value: string | null, width = 1280, height = 850): Layout {
  const defaults: Layout = {
    version: 1,
    sidebar: 300,
    panel: 180,
    sidebarVisible: true,
    panelVisible: false,
    expanded: [],
    projection: 'types',
  }
  try {
    const v = JSON.parse(value ?? 'null')
    if (!v || v.version !== 1) return defaults
    return {
      ...defaults,
      sidebar: Number.isFinite(v.sidebar) ? Math.max(180, Math.min(v.sidebar, width - 300)) : 300,
      panel: Number.isFinite(v.panel) ? Math.max(100, Math.min(v.panel, height - 220)) : 180,
      sidebarVisible: typeof v.sidebarVisible === 'boolean' ? v.sidebarVisible : true,
      panelVisible: typeof v.panelVisible === 'boolean' ? v.panelVisible : false,
      expanded: Array.isArray(v.expanded)
        ? v.expanded.filter((x: unknown) => typeof x === 'string').slice(0, 10000)
        : [],
      projection: v.projection === 'sources' ? 'sources' : 'types',
    }
  } catch {
    return defaults
  }
}
export function readEditors(value: string | null): EditorGroup[] {
  const fallback = [{ id: 'main', tabs: [] }]
  try {
    const data = JSON.parse(value ?? 'null')
    if (data?.version !== 1 || !Array.isArray(data.groups) || data.groups.length > 8)
      return fallback
    const groups: EditorGroup[] = data.groups
      .filter((g: unknown) => !!g && typeof g === 'object')
      .map(
        (g: { id?: unknown; tabs?: unknown; active?: unknown; preview?: unknown }, i: number) => {
          const tabs = Array.isArray(g.tabs)
            ? g.tabs
                .filter((key: unknown) => {
                  if (typeof key !== 'string') return false
                  try {
                    const ref = JSON.parse(key)
                    return (
                      Array.isArray(ref) &&
                      (ref.length === 2 || (ref.length === 3 && ref[1] === 'diagram')) &&
                      ref.every((v) => typeof v === 'string' && v.length)
                    )
                  } catch {
                    return false
                  }
                })
                .slice(0, 100)
            : []
          return {
            id: i === 0 ? 'main' : String(g.id ?? i),
            tabs: [...new Set(tabs)] as string[],
            ...(typeof g.active === 'string' && tabs.includes(g.active)
              ? { active: g.active }
              : {}),
            ...(typeof g.preview === 'string' && tabs.includes(g.preview)
              ? { preview: g.preview }
              : {}),
          }
        },
      )
    return groups.length ? groups : fallback
  } catch {
    return fallback
  }
}
