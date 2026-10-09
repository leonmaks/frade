import type { ModelSource } from '@frade/metamodel-compiler'
/** Example vocabulary only. Repositories may supply any valid configured model. */
export function sampleMetamodel(): ModelSource {
  return {
    sourceSchemaVersion: 1,
    definition: {
      schemaVersion: 1,
      id: 'sample:architecture',
      version: '1.0.0',
      imports: [],
      profiles: [],
      viewpoints: [],
      objectTypes: [
        {
          id: 'sample:ApplicationSystem',
          attributes: [
            {
              id: 'status',
              schema: { kind: 'enum', values: ['created', 'used'] },
              default: 'created',
            },
          ],
          lifecycle: {
            states: ['created', 'used'],
            initial: 'created',
            transitions: [{ from: 'created', to: 'used' }],
          },
        },
        {
          id: 'sample:BusinessProcess',
          attributes: [{ id: 'description', schema: { kind: 'text' } }],
        },
      ],
      relationTypes: [
        {
          id: 'sample:IntegrationFlow',
          source: { typeIds: ['sample:ApplicationSystem'], includeSubtypes: true },
          target: { typeIds: ['sample:ApplicationSystem'], includeSubtypes: true },
          attributes: [],
          allowSelfReference: false,
          duplicates: 'forbid-same-type-and-pair',
        },
      ],
    },
  }
}
