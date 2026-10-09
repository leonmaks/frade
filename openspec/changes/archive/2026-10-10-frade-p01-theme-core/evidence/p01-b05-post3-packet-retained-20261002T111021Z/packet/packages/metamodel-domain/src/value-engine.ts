import type {
  AttributeDefinition,
  Diagnostic,
  JsonValue,
  Path,
  ValidationContext,
  ValueSchema,
} from './types'
import { diagnostic, record, ValidationFailure, MAX_VALUES, MAX_DEPTH } from './diagnostics'
import { matches, objectKey } from './matching'
export function validDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return false
  const y = Number(m[1]),
    month = Number(m[2]),
    day = Number(m[3])
  const leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
}
export function validDatetime(s: string): boolean {
  const m =
    /^(\d{4}-\d{2}-\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?([Zz]|[+-](\d{2}):(\d{2}))$/.exec(s)
  return (
    !!m &&
    validDate(m[1]) &&
    Number(m[2]) < 24 &&
    Number(m[3]) < 60 &&
    Number(m[4]) < 60 &&
    (m[6] === undefined || (Number(m[6]) < 24 && Number(m[7]) < 60))
  )
}
export function valueEngine(context: ValidationContext = {}, structuralReferences = false) {
  const diagnostics: Diagnostic[] = []
  let count = 0
  const emit = (code: Diagnostic['code'], path: Path, message: string) => {
    diagnostics.push(diagnostic(code, path, message))
  }
  const fields = (
    definitions: readonly AttributeDefinition[],
    input: Record<string, unknown>,
    path: Path = [],
    depth = 0,
  ): Record<string, JsonValue> => {
    const output: Record<string, JsonValue> = {}
    const known = new Set(definitions.map((f) => f.id))
    for (const key of Object.keys(input))
      if (!known.has(key)) emit('UNKNOWN_ATTRIBUTE', [...path, key], 'Undeclared attribute')
    for (const field of definitions) {
      const p = [...path, field.id]
      let present = Object.hasOwn(input, field.id),
        v = input[field.id]
      if (!present && Object.hasOwn(field, 'default')) {
        present = true
        v = field.default
      }
      if (!present) {
        if (field.required) emit('REQUIRED', p, 'Required attribute is absent')
        continue
      }
      const out = value(field.schema, v, p, depth + 1)
      if (out !== undefined) output[field.id] = out
    }
    return output
  }
  const value = (
    schema: ValueSchema,
    input: unknown,
    path: Path = [],
    depth = 0,
  ): JsonValue | undefined => {
    if (++count > MAX_VALUES || depth > MAX_DEPTH)
      throw new ValidationFailure(
        diagnostic('RESOURCE_LIMIT', path, 'Value validation budget exceeded'),
      )
    if (input === null) {
      if (schema.nullable) return null
      emit('NULL_NOT_ALLOWED', path, 'Explicit null is not permitted')
      return
    }
    const wrong = () => {
      emit('TYPE_MISMATCH', path, 'Expected ' + schema.kind)
      return undefined
    }
    const bounds = (n: number, min: number | undefined, max: number | undefined) => {
      if ((min !== undefined && n < min) || (max !== undefined && n > max))
        emit('CONSTRAINT', path, 'Value is outside declared bounds')
    }
    switch (schema.kind) {
      case 'string':
      case 'text':
        if (typeof input !== 'string') return wrong()
        bounds([...input].length, schema.minLength, schema.maxLength)
        return input
      case 'integer':
      case 'decimal':
        if (
          typeof input !== 'number' ||
          !Number.isFinite(input) ||
          (schema.kind === 'integer' && !Number.isSafeInteger(input))
        )
          return wrong()
        bounds(input, schema.minimum, schema.maximum)
        return input
      case 'boolean':
        if (typeof input !== 'boolean') return wrong()
        return input
      case 'date':
      case 'datetime':
        if (typeof input !== 'string') return wrong()
        if (!(schema.kind === 'date' ? validDate(input) : validDatetime(input)))
          emit('CONSTRAINT', path, 'Invalid calendar date or timestamp')
        return input
      case 'enum':
        if (typeof input !== 'string') return wrong()
        if (!schema.values.includes(input)) emit('CONSTRAINT', path, 'Undeclared enum member')
        return input
      case 'reference': {
        if (
          !record(input) ||
          Object.keys(input).length !== 2 ||
          typeof input.repositoryId !== 'string' ||
          !input.repositoryId.trim() ||
          typeof input.objectId !== 'string' ||
          !input.objectId.trim()
        )
          return wrong()
        const ref = { repositoryId: input.repositoryId, objectId: input.objectId }
        if (!structuralReferences) {
          const target = context.targets?.get(objectKey(ref))
          if (target === undefined)
            emit('UNRESOLVED_REFERENCE', path, 'Reference target information is missing')
          else if (!matches(context.analysis, schema.targets, target))
            emit('FORBIDDEN_TARGET', path, 'Reference target type is not permitted')
        }
        return ref
      }
      case 'list': {
        if (!Array.isArray(input)) return wrong()
        bounds(input.length, schema.minItems, schema.maxItems)
        return input.map((item, i) => value(schema.items, item, [...path, i], depth + 1) ?? null)
      }
      case 'object':
        if (!record(input)) return wrong()
        return fields(schema.fields, input, path, depth)
    }
  }
  return { value, fields, diagnostics }
}
