import profileData from '../../../tokens/diagram-editor-presentation.json'
import { builtinTokens } from '../generated/tokens'
import { isHexColor } from './contrast'
import { BUILTIN_IDS, isDataRecord } from './registry'
import { validatePresentationSnapshot } from './rootParticipant'
import { freezeOwned } from './types'
import type { ResolvedTheme } from './types'

export interface EditorPresentationProfile {
  readonly version: '1.0.0'
  readonly base: 'frade.builtin/light'
  readonly roles: Readonly<Record<'diagram.canvas' | 'diagram.grid', string>>
}
const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
/** Trusted role data only: never a descriptor registry or a user theme resolver. */
export function validateEditorPresentationProfile(value: unknown): EditorPresentationProfile {
  if (
    !isDataRecord(value) ||
    !hasExactKeys(value, ['version', 'base', 'roles']) ||
    value.version !== '1.0.0' ||
    value.base !== BUILTIN_IDS.light ||
    !isDataRecord(value.roles) ||
    !hasExactKeys(value.roles, ['diagram.canvas', 'diagram.grid']) ||
    !isHexColor(value.roles['diagram.canvas']) ||
    !isHexColor(value.roles['diagram.grid'])
  )
    throw Error('Invalid diagram editor presentation profile')
  return freezeOwned({
    version: '1.0.0',
    base: 'frade.builtin/light',
    roles: {
      'diagram.canvas': value.roles['diagram.canvas'],
      'diagram.grid': value.roles['diagram.grid'],
    },
  })
}
export const editorPresentationProfile = validateEditorPresentationProfile(profileData)
/** Scale-1 decorative dot diameter; grid spacing and snapping are not presentation data. */
export const editorGridDotDiameter = 1.2
/** Derived view only; application selection, registry, revision and author data are not written. */
export function projectEditorPresentation(snapshot: ResolvedTheme): ResolvedTheme {
  validatePresentationSnapshot(snapshot)
  const colors = { ...builtinTokens.themes.light, ...editorPresentationProfile.roles }
  return freezeOwned({
    ...structuredClone(snapshot),
    id: BUILTIN_IDS.light,
    label: 'Frade Light',
    kind: 'light',
    colors,
    // Reuse the validated resolver's final system mapping; do not duplicate its precedence.
    effectiveColors: snapshot.forcedColors ? { ...snapshot.effectiveColors } : { ...colors },
  })
}
