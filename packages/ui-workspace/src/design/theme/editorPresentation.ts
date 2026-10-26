import { drawioEditor, drawioEditorProfile as profileData } from '../generated/drawio-editor'
import { isHexColor } from './contrast'
import { isDataRecord } from './registry'
import { validatePresentationSnapshot } from './rootParticipant'
import { freezeOwned } from './types'
import type { ResolvedTheme } from './types'

export interface EditorPresentationProfile {
  readonly version: '2.0.0'
  readonly base: 'drawio/31.5.2/light'
  readonly roles: Readonly<Record<'diagram.canvas' | 'diagram.grid', string>>
}
const hasExactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
/** Trusted role data only: never a descriptor registry or a user theme resolver. */
export function validateEditorPresentationProfile(value: unknown): EditorPresentationProfile {
  if (
    !isDataRecord(value) ||
    !hasExactKeys(value, ['version', 'base', 'roles']) ||
    value.version !== '2.0.0' ||
    value.base !== 'drawio/31.5.2/light' ||
    !isDataRecord(value.roles) ||
    !hasExactKeys(value.roles, ['diagram.canvas', 'diagram.grid']) ||
    !isHexColor(value.roles['diagram.canvas']) ||
    !isHexColor(value.roles['diagram.grid'])
  )
    throw Error('Invalid diagram editor presentation profile')
  return freezeOwned({
    version: '2.0.0',
    base: 'drawio/31.5.2/light',
    roles: {
      'diagram.canvas': value.roles['diagram.canvas'],
      'diagram.grid': value.roles['diagram.grid'],
    },
  })
}
export const editorPresentationProfile = validateEditorPresentationProfile(profileData)
/** Derived view only; application selection, registry, revision and author data are not written. */
export function projectEditorPresentation(snapshot: ResolvedTheme): ResolvedTheme {
  validatePresentationSnapshot(snapshot)
  const colors = { ...drawioEditor.colors, ...editorPresentationProfile.roles }
  return freezeOwned({
    ...structuredClone(snapshot),
    id: drawioEditor.id,
    label: 'Draw.io Light',
    kind: 'light',
    colors,
    // Reuse the validated resolver's final system mapping; do not duplicate its precedence.
    effectiveColors: snapshot.forcedColors ? { ...snapshot.effectiveColors } : { ...colors },
  })
}
