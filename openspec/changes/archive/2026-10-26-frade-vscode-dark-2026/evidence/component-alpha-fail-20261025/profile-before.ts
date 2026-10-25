import { referenceTheme } from './generated'
import { builtinTokens } from '../../generated/tokens'
import { contrastRatio } from '../../theme/contrast'
import type { ResolvedTheme, ThemeRole } from '../../theme/types'

interface Slot {
  readonly key: string
  readonly role: ThemeRole
  readonly raw: string
  readonly background?: string
  readonly minimum?: number
}
const slots: Readonly<Record<string, Slot>> = referenceTheme.slots
export interface ReferenceStyleProjection {
  readonly colors: Readonly<Record<string, string>>
  readonly repairs: readonly { readonly slot: string; readonly original: string; readonly effective: string }[]
}
function composite(raw: string, background?: string): string {
  let hex = raw.slice(1)
  if (hex.length < 5) hex = [...hex].map(char => char + char).join('')
  if (hex.length === 6) return '#' + hex.toUpperCase()
  if (hex.length !== 8 || !background) throw Error('Unbound reference alpha')
  const alpha = parseInt(hex.slice(6), 16) / 255
  return '#' + [0, 2, 4].map(offset => Math.round(parseInt(hex.slice(offset, offset + 2), 16) * alpha +
    parseInt(background.slice(offset + 1, offset + 3), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('').toUpperCase()
}
/** First-party view projection, after the existing resolver; it never selects or persists a theme. */
export function projectReferenceStyles(snapshot: ResolvedTheme): ReferenceStyleProjection {
  if (snapshot.id !== referenceTheme.id || snapshot.forcedColors) return { colors: {}, repairs: [] }
  const colors: Record<string, string> = {}, active = new Set<string>()
  const repairs: { slot: string; original: string; effective: string }[] = []
  const resolve = (name: string): string => {
    if (colors[name]) return colors[name]
    if (active.has(name) || !Object.hasOwn(slots, name)) throw Error('Invalid reference style dependency')
    active.add(name)
    const slot = slots[name], background = slot.background ? resolve(slot.background) : undefined
    const roleChanged = snapshot.colors[slot.role] !== referenceTheme.descriptor.colors[slot.role]
    let color = roleChanged ? snapshot.colors[slot.role] : composite(slot.raw, background)
    if (background && slot.minimum && contrastRatio(color, background) < slot.minimum) {
      const original = color
      const replacement = [snapshot.colors[slot.role], builtinTokens.themes.dark[slot.role],
        builtinTokens.themes.dark['text.primary'], builtinTokens.themes.light['text.primary']]
        .find(candidate => contrastRatio(candidate, background) >= slot.minimum!)
      if (!replacement) throw Error('Reference style contrast cannot be established: ' + name)
      color = replacement; repairs.push({ slot: name, original, effective: color })
    }
    active.delete(name); colors[name] = color
    return color
  }
  for (const name of Object.keys(slots)) resolve(name)
  return { colors: Object.freeze(colors), repairs: Object.freeze(repairs) }
}

export function applyReferencePreset(root: HTMLElement, snapshot: ResolvedTheme): void {
  if (snapshot.id !== referenceTheme.id || snapshot.forcedColors) {
    if (root.dataset.fradeReference === 'vscode-dark-2026') {
      root.removeAttribute('data-frade-reference')
      for (const name of Object.keys(slots)) root.style.removeProperty('--frade-vscode-' + name)
    }
    return
  }
  const projection = projectReferenceStyles(snapshot)
  for (const [name, color] of Object.entries(projection.colors)) root.style.setProperty('--frade-vscode-' + name, color)
  root.dataset.fradeReference = 'vscode-dark-2026'
}
