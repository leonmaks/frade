import type {
  AttributeDefinition,
  DiagnosticCode,
  EffectiveObjectType,
  ModelAnalysis,
  ModelDefinition,
  ModelImport,
  ObjectReference,
  Path,
  ProfileDefinition,
  ProspectiveSnapshot,
  RelationReference,
  RelationTypeDefinition,
  UiMetadata,
  ViewpointDefinition,
} from '@frade/metamodel-domain'
export interface Extension {
  readonly targetKind: 'object' | 'relation'
  readonly targetId: string
  readonly attributes: readonly AttributeDefinition[]
}
export interface ModelSource {
  readonly sourceSchemaVersion: 1
  readonly definition: ModelDefinition
  readonly extensions?: readonly Extension[]
}
export type Stage =
  | 'source'
  | 'load'
  | 'imports'
  | 'analysis'
  | 'extensions'
  | 'projection'
  | 'hash'
  | 'lock'
  | 'publication'
  | 'preview'
export type CompilerCode =
  | DiagnosticCode
  | 'INVALID_SOURCE'
  | 'LOAD_FAILED'
  | 'IMPORT_CYCLE'
  | 'IMPORT_IDENTITY_MISMATCH'
  | 'VERSION_CONFLICT'
  | 'DEFINITION_COLLISION'
  | 'EXTENSION_CONFLICT'
  | 'INVALID_EXTENSION_TARGET'
  | 'INVALID_PROJECTION'
  | 'HASH_FAILED'
  | 'LOCK_MISMATCH'
  | 'SUPERSEDED'
  | 'BINDING_MISMATCH'
export interface CompilerDiagnostic {
  readonly code: CompilerCode
  readonly severity: 'error'
  readonly stage: Stage
  readonly path: Path
  readonly message: string
  readonly modelId?: string
  readonly modelVersion?: string
  readonly entityId?: string
}
export type CompilerResult<T> =
  | { readonly ok: true; readonly value: T; readonly diagnostics: readonly CompilerDiagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly CompilerDiagnostic[] }
export interface CompilerPorts {
  readonly load: (identity: ModelImport) => Promise<unknown>
  readonly sha256: (canonicalText: string) => Promise<string>
}
export interface PackageLock extends ModelImport {
  readonly contentHash: string
}
export interface ModelLock {
  readonly lockSchemaVersion: 1
  readonly fingerprintFormatVersion: 1
  readonly root: ModelImport
  readonly packages: readonly PackageLock[]
  readonly fingerprint: string
}
export interface CompileOptions {
  readonly lock?: unknown
}
export interface Projection {
  readonly objectTypes: readonly string[]
  readonly relationTypes: readonly string[]
  readonly presentation: readonly { readonly typeId: string; readonly ui: UiMetadata }[]
}
export interface CompiledModel {
  readonly id: string
  readonly version: string
  readonly fingerprint: string
  readonly lock: ModelLock
  readonly objectTypes: readonly EffectiveObjectType[]
  readonly relationTypes: readonly RelationTypeDefinition[]
  readonly profiles: readonly ProfileDefinition[]
  readonly viewpoints: readonly ViewpointDefinition[]
  readonly analysis: () => ModelAnalysis
  readonly project: (profileId?: string, viewpointId?: string) => CompilerResult<Projection>
}
export interface ModelPublisher {
  readonly current: () => CompiledModel | undefined
  readonly compileAndPublish: (
    input: unknown,
    options?: CompileOptions,
  ) => Promise<CompilerResult<CompiledModel>>
}
export interface ImpactItem {
  readonly kind: 'object' | 'relation' | 'profile' | 'viewpoint' | 'model'
  readonly id: string
  readonly change: 'added' | 'removed' | 'changed'
  readonly classification: 'review' | 'presentation' | 'projection' | 'identity'
}
export interface ModelImpact {
  readonly changes: readonly ImpactItem[]
}
export interface RepositoryModelBinding {
  readonly modelId: string
  readonly modelVersion: string
  readonly fingerprint: string
}
export interface PreviewContext {
  readonly binding: RepositoryModelBinding
  readonly snapshot: ProspectiveSnapshot
}
export interface PreviewDiagnostic extends CompilerDiagnostic {
  readonly objectRef?: ObjectReference
  readonly relationRef?: RelationReference
}
export interface MigrationPreview {
  readonly impact: ModelImpact
  readonly repositoryStatus: 'not-evaluated' | 'valid' | 'invalid'
  readonly diagnostics: readonly PreviewDiagnostic[]
}
