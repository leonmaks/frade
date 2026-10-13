/** Portable declarative installer data; no host/UI runtime dependency. */
export type ExtensionThemeKind = 'light' | 'dark' | 'high-contrast'
export interface ExtensionTheme {
  readonly id: string
  readonly label: string
  readonly kind: ExtensionThemeKind
  readonly path: string
  readonly colors: Readonly<Record<string, string>>
}
export interface ExtensionManifest {
  readonly publisher: string
  readonly name: string
  readonly displayName: string
  readonly version: string
  readonly engines: { readonly frade: string; readonly fradeApi: string }
  readonly kind: 'declarative'
  readonly capabilities: readonly []
  readonly contributes: {
    readonly themes: readonly {
      readonly id: string
      readonly label: string
      readonly kind: ExtensionThemeKind
      readonly path: string
    }[]
  }
}
export interface ExtensionDiagnostic {
  readonly code: string
  readonly message: string
  readonly source?: string
}
