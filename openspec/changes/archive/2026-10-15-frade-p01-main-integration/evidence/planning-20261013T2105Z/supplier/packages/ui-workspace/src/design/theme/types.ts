import type { FradeThemeKind, FradeThemeRole, FradeDensity } from '../generated/tokens'
export type ThemeKind = FradeThemeKind
export type ThemeRole = FradeThemeRole
export type Density = FradeDensity
export type ThemeMode = ThemeKind | 'system'
export type ThemeColors = Readonly<Record<ThemeRole, string>>
export interface ThemeIssue {
  readonly code: string
  readonly source: string
  readonly role?: string
  readonly message: string
}
export interface RegisteredTheme {
  readonly id: string
  readonly label: string
  readonly kind: ThemeKind
  readonly enabled: boolean
  readonly builtin: boolean
  readonly colors: Readonly<Partial<Record<ThemeRole, string>>>
  readonly issues: readonly ThemeIssue[]
}
export interface ThemeRegistry {
  readonly issues: readonly ThemeIssue[]
  get(id: string): RegisteredTheme | undefined
  list(): readonly RegisteredTheme[]
}
export interface PresentationSelection {
  readonly mode: ThemeMode
  readonly density: Density
  readonly preferred: Readonly<Record<ThemeKind, string>>
}
export interface ResolveInput {
  readonly registry: ThemeRegistry
  readonly selection?: {
    readonly mode?: ThemeMode
    readonly density?: Density
    readonly preferred?: Readonly<Partial<Record<ThemeKind, string>>>
  }
  readonly environment?: {
    readonly colorScheme?: 'light' | 'dark'
    readonly highContrast?: boolean
    readonly forcedColors?: boolean
  }
  readonly overrides?: {
    readonly global?: unknown
    readonly byTheme?: Readonly<Record<string, unknown>>
    readonly workspace?: unknown
    readonly workspaceEnabled?: boolean
  }
  readonly revision?: number
}
export interface ResolvedTheme {
  readonly id: string
  readonly label: string
  readonly kind: ThemeKind
  readonly density: Density
  readonly revision: number
  readonly colors: ThemeColors
  readonly effectiveColors: ThemeColors
  readonly forcedColors: boolean
  readonly status: 'VALID' | 'REPAIRED' | 'FALLBACK'
  readonly repairPasses: number
  readonly issues: readonly ThemeIssue[]
  readonly compatibility: {
    readonly recognized: readonly string[]
    readonly ignored: readonly string[]
    readonly repaired: readonly ThemeRole[]
  }
}
export type ContrastPair = readonly [ThemeRole, ThemeRole, number]
export interface RepairResult {
  readonly colors: ThemeColors
  readonly status: 'VALID' | 'REPAIRED' | 'FALLBACK'
  readonly passes: number
  readonly repaired: readonly ThemeRole[]
}

/** Freeze only newly owned data; callers must never pass original input objects. */
export function freezeOwned<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeOwned(child)
    Object.freeze(value)
  }
  return value
}
