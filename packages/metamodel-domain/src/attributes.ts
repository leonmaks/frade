import type {
  AttributeDefinition,
  JsonValue,
  Result,
  ValidationContext,
  ValueSchema,
} from './types'
import { checkFields, DefinitionReader } from './definitions'
import { diagnostic, inspectJson, record, result, ValidationFailure } from './diagnostics'
import { valueEngine } from './value-engine'
export function validateAttributes(
  fields: readonly AttributeDefinition[],
  input: unknown,
  context: ValidationContext = {},
): Result<Record<string, JsonValue>> {
  const errors = [...checkFields(fields), ...inspectJson(input)]
  if (errors.length) return result({}, errors)
  if (!record(input))
    return result({}, [diagnostic('TYPE_MISMATCH', [], 'Expected attribute object')])
  const engine = valueEngine(context)
  try {
    return result(engine.fields(fields, input), engine.diagnostics)
  } catch (e) {
    if (e instanceof ValidationFailure) return result({}, [e.diagnostic])
    throw e
  }
}
export function validateValue(
  schema: ValueSchema,
  input: unknown,
  context: ValidationContext = {},
): Result<JsonValue> {
  const safety = [...inspectJson(schema), ...inspectJson(input)]
  if (safety.length) return result(null, safety)
  const reader = new DefinitionReader()
  reader.schema(schema, [])
  if (reader.diagnostics.length) return result(null, reader.diagnostics)
  const engine = valueEngine(context)
  try {
    return result(engine.value(schema, input) ?? null, engine.diagnostics)
  } catch (e) {
    if (e instanceof ValidationFailure) return result(null, [e.diagnostic])
    throw e
  }
}
