import {
  type ModelDefinition,
  type ValueSchema,
  decodeModel,
  analyzeModel,
  validateAttributes,
} from '@frade/metamodel-domain'
const schema: ValueSchema = { kind: 'list', items: { kind: 'integer', minimum: 0 } }
const model: ModelDefinition = {
  schemaVersion: 1,
  id: 'example:model',
  version: '1.0.0',
  imports: [],
  objectTypes: [{ id: 'example:item', attributes: [{ id: 'values', schema }] }],
  relationTypes: [],
  profiles: [],
  viewpoints: [],
}
const decoded = decodeModel(model)
if (decoded.ok) {
  const analysis = analyzeModel(decoded.value)
  if (analysis.ok)
    validateAttributes(analysis.value.objectTypes.get('example:item')!.attributes, {
      values: [1, 2],
    })
}
// @ts-expect-error unknown kinds cannot be silently accepted
const invalid: ValueSchema = { kind: 'javascript', code: 'run()' }
void invalid
