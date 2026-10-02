export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }
export type Path = readonly (string | number)[]
export type DiagnosticCode =
  | 'INVALID_DEFINITION'
  | 'UNSUPPORTED_VERSION'
  | 'INVALID_ID'
  | 'DUPLICATE_ID'
  | 'UNSAFE_VALUE'
  | 'RESOURCE_LIMIT'
  | 'UNKNOWN_TYPE'
  | 'INHERITANCE_CYCLE'
  | 'CONFLICTING_OVERRIDE'
  | 'ABSTRACT_TYPE'
  | 'TYPE_MISMATCH'
  | 'REQUIRED'
  | 'NULL_NOT_ALLOWED'
  | 'CONSTRAINT'
  | 'UNKNOWN_ATTRIBUTE'
  | 'UNRESOLVED_REFERENCE'
  | 'FORBIDDEN_TARGET'
  | 'MISSING_ENDPOINT'
  | 'FORBIDDEN_PAIR'
  | 'SELF_REFERENCE'
  | 'DUPLICATE_RELATION'
  | 'CARDINALITY'
export type Diagnostic = {
  readonly code: DiagnosticCode
  readonly severity: 'error'
  readonly path: Path
  readonly entityId?: string
  readonly message: string
}
export type Result<T> =
  | { readonly ok: true; readonly value: T; readonly diagnostics: readonly Diagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] }
export interface UiMetadata {
  readonly label?: string
  readonly description?: string
  readonly group?: string
  readonly order?: number
}
export interface TypeRule {
  readonly typeIds: readonly string[]
  readonly includeSubtypes: boolean
}
type Nullable = { readonly nullable?: boolean }
export type ValueSchema = Nullable &
  (
    | { readonly kind: 'string' | 'text'; readonly minLength?: number; readonly maxLength?: number }
    | { readonly kind: 'integer' | 'decimal'; readonly minimum?: number; readonly maximum?: number }
    | { readonly kind: 'boolean' | 'date' | 'datetime' }
    | { readonly kind: 'enum'; readonly values: readonly string[] }
    | { readonly kind: 'reference'; readonly targets: TypeRule }
    | {
        readonly kind: 'list'
        readonly items: ValueSchema
        readonly minItems?: number
        readonly maxItems?: number
      }
    | { readonly kind: 'object'; readonly fields: readonly AttributeDefinition[] }
  )
export interface AttributeDefinition {
  readonly id: string
  readonly schema: ValueSchema
  readonly required?: boolean
  readonly default?: JsonValue
  readonly ui?: UiMetadata
}
export interface LifecycleDefinition {
  readonly states: readonly string[]
  readonly initial: string
  readonly transitions: readonly { readonly from: string; readonly to: string }[]
}
export interface IntegrationFlowMetadata {
  readonly status?: string
  readonly source: string
  readonly consumer: string
  readonly search: readonly string[]
  readonly columns: readonly { readonly field: string; readonly label: string }[]
  readonly nonCloneable: readonly string[]
  readonly editable?: readonly string[]
  readonly idPatterns?: readonly string[]
}
export interface ObjectTypeDefinition {
  readonly integrationFlow?: IntegrationFlowMetadata
  readonly id: string
  readonly extends?: string
  readonly abstract?: boolean
  readonly attributes: readonly AttributeDefinition[]
  readonly lifecycle?: LifecycleDefinition
  readonly ui?: UiMetadata
}
export interface Cardinality {
  readonly min: number
  readonly max: number | null
}
export interface RelationTypeDefinition {
  readonly id: string
  readonly source: TypeRule
  readonly target: TypeRule
  readonly direction?: 'directed' | 'undirected'
  readonly sourceCardinality?: Cardinality
  readonly targetCardinality?: Cardinality
  readonly allowSelfReference?: boolean
  readonly duplicates?: 'allow' | 'forbid-same-type-and-pair'
  readonly attributes: readonly AttributeDefinition[]
  readonly ui?: UiMetadata
}
export interface ModelImport {
  readonly id: string
  readonly version: string
}
export interface ProfileDefinition {
  readonly id: string
  readonly objectTypes: readonly string[]
  readonly relationTypes: readonly string[]
  readonly ui?: UiMetadata
}
export interface ViewpointDefinition extends ProfileDefinition {
  readonly presentation?: readonly { readonly typeId: string; readonly ui: UiMetadata }[]
}
export interface ModelDefinition {
  readonly schemaVersion: 1
  readonly id: string
  readonly version: string
  readonly imports: readonly ModelImport[]
  readonly objectTypes: readonly ObjectTypeDefinition[]
  readonly relationTypes: readonly RelationTypeDefinition[]
  readonly profiles: readonly ProfileDefinition[]
  readonly viewpoints: readonly ViewpointDefinition[]
}
export interface ObjectReference {
  readonly repositoryId: string
  readonly objectId: string
}
export interface RelationReference {
  readonly repositoryId: string
  readonly relationId: string
}
export interface EffectiveObjectType extends ObjectTypeDefinition {
  readonly ancestors: readonly string[]
}
export interface ModelAnalysis {
  readonly objectTypes: ReadonlyMap<string, EffectiveObjectType>
  readonly relationTypes: ReadonlyMap<string, RelationTypeDefinition>
}
export interface ValidationContext {
  readonly analysis?: ModelAnalysis
  readonly targets?: Pick<ReadonlyMap<string, string>, 'get'>
}
export interface ValidationObject {
  readonly ref: ObjectReference
  readonly typeId: string
  readonly attributes: Readonly<Record<string, JsonValue>>
}
export interface ValidationRelation {
  readonly ref: RelationReference
  readonly typeId: string
  readonly source: ObjectReference
  readonly target: ObjectReference
  readonly attributes: Readonly<Record<string, JsonValue>>
}
export interface ProspectiveSnapshot {
  readonly objects: readonly ValidationObject[]
  readonly relations: readonly ValidationRelation[]
}
