import type { DiagramObject } from './DiagramView'
export const appearanceStorageKey = 'frade.elementAppearance.v1'
export const ruleLabels = {
  external: 'Внешняя',
  nonTarget: 'Не целевая',
  nonTargetModified: 'Не целевая · Модифицируется',
  nonTargetPlanned: 'Не целевая · Планируется',
  used: 'Используется / Разрабатывается',
  planned: 'Планируется',
  modified: 'Модифицируется',
  retiring: 'Выводится из эксплуатации',
  fallback: 'Остальные / не определено',
} as const
export type RuleKey = keyof typeof ruleLabels
export type Paint = { fill: string; stroke: string; width: number }
export type Shadow = { color: string; opacity: number; dx: number; dy: number; blur: number }
export type ElementAppearance = {
  version: 1
  drawioLive: boolean
  emptyBundle: { stroke: string; width: number }
  system: {
    typeIds: string[]
    fields: { target: string; change: string; placement: string; parent: string }
    styles: Record<RuleKey, Paint>
    shadowEnabled: boolean
    shadow: Shadow
  }
}
const green = { fill: '#D5E8D4', stroke: '#82B366', width: 1 }
export const defaultAppearance: ElementAppearance = {
  version: 1,
  drawioLive: true,
  emptyBundle: { stroke: '#404040', width: 1 },
  system: {
    typeIds: ['sberea:kadzo.v2023.systems', 'kadzo.v2023.systems'],
    fields: {
      target: 'target-status',
      change: 'change-type',
      placement: 'location',
      parent: 'parent',
    },
    styles: {
      external: { fill: '#DAE8FC', stroke: '#6C8EBF', width: 1 },
      nonTarget: { fill: '#E1D5E7', stroke: '#9673A6', width: 1 },
      nonTargetModified: { fill: '#E1D5E7', stroke: '#FF00FF', width: 1 },
      nonTargetPlanned: { fill: '#E1D5E7', stroke: '#FF00FF', width: 2 },
      used: { ...green },
      planned: { fill: '#FFFF86', stroke: '#FF00FF', width: 2 },
      modified: { ...green, stroke: '#FF00FF' },
      retiring: { fill: '#BAC8D3', stroke: '#23445D', width: 1 },
      fallback: { fill: '#F9F7ED', stroke: '#363939', width: 1 },
    },
    shadowEnabled: true,
    shadow: { color: '#000000', opacity: 25, dx: 2, dy: 3, blur: 2 },
  },
}
export function validAppearance(value: unknown): value is ElementAppearance {
  if (!value || typeof value !== 'object') return false
  const v = value as ElementAppearance,
    s = v.system
  const color = (x: unknown) => typeof x === 'string' && /^#[0-9a-f]{6}$/i.test(x)
  const number = (x: unknown, min: number, max: number) =>
    typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max
  return (
    v.version === 1 &&
    typeof v.drawioLive === 'boolean' &&
    !!v.emptyBundle &&
    color(v.emptyBundle.stroke) &&
    number(v.emptyBundle.width, 0.1, 20) &&
    !!s &&
    Array.isArray(s.typeIds) &&
    s.typeIds.length > 0 &&
    s.typeIds.length <= 32 &&
    s.typeIds.every((id) => typeof id === 'string' && /^[a-zA-Z0-9_:.-]{1,200}$/.test(id)) &&
    !!s.fields &&
    ['target', 'change', 'placement', 'parent'].every((key) => {
      const field = s.fields[key as keyof typeof s.fields]
      return typeof field === 'string' && /^[a-zA-Z0-9_.-]{1,200}$/.test(field)
    }) &&
    !!s.styles &&
    Object.keys(ruleLabels).every((key) => {
      const p = s.styles[key as RuleKey]
      return !!p && color(p.fill) && color(p.stroke) && number(p.width, 0.1, 20)
    }) &&
    typeof s.shadowEnabled === 'boolean' &&
    !!s.shadow &&
    color(s.shadow.color) &&
    number(s.shadow.opacity, 0, 100) &&
    number(s.shadow.dx, -100, 100) &&
    number(s.shadow.dy, -100, 100) &&
    number(s.shadow.blur, 0, 100)
  )
}
export function readAppearance(raw: string | null): ElementAppearance {
  try {
    const parsed: unknown = JSON.parse(raw ?? 'null')
    if (
      parsed &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      !Object.hasOwn(parsed, 'emptyBundle')
    )
      Object.assign(parsed, { emptyBundle: { ...defaultAppearance.emptyBundle } })
    if (validAppearance(parsed)) return parsed
  } catch {
    /* use defaults */
  }
  return structuredClone(defaultAppearance)
}
export type SystemAppearance = Paint & { shadow?: Shadow }
export function systemAppearance(
  object: DiagramObject,
  config: ElementAppearance,
): SystemAppearance | undefined {
  const s = config.system
  if (!object.type || !s.typeIds.includes(object.type)) return undefined
  const a = object.attributes ?? {},
    f = s.fields
  const text = (key: string) => (typeof a[key] === 'string' ? a[key].trim() : '')
  const change = text(f.change)
  let key: RuleKey = 'fallback'
  if (text(f.placement) === 'Внешняя') key = 'external'
  else if (text(f.target) === 'Не целевая')
    key =
      change === 'Модифицируется'
        ? 'nonTargetModified'
        : change === 'Планируется'
          ? 'nonTargetPlanned'
          : 'nonTarget'
  else if (change === 'Используется' || change === 'Разрабатывается') key = 'used'
  else if (change === 'Планируется') key = 'planned'
  else if (change === 'Модифицируется') key = 'modified'
  else if (change === 'Выводится из эксплуатации') key = 'retiring'
  const parent = a[f.parent]
  const hasParent =
    parent !== null &&
    parent !== undefined &&
    (typeof parent === 'string'
      ? !!parent.trim()
      : Array.isArray(parent)
        ? parent.length > 0
        : true)
  return { ...s.styles[key], ...(s.shadowEnabled && !hasParent ? { shadow: { ...s.shadow } } : {}) }
}
export function drawioAppearance(appearance: SystemAppearance): Record<string, string> {
  const shadow = appearance.shadow
  return {
    shape: 'rectangle',
    rounded: '0',
    fillColor: appearance.fill,
    strokeColor: appearance.stroke,
    strokeWidth: String(appearance.width),
    shadow: shadow ? '1' : '0',
    shadowColor: shadow?.color ?? '#000000',
    shadowOpacity: String(shadow?.opacity ?? 25),
    shadowOffsetX: String(shadow?.dx ?? 2),
    shadowOffsetY: String(shadow?.dy ?? 3),
    shadowBlur: String(shadow?.blur ?? 2),
  }
}
