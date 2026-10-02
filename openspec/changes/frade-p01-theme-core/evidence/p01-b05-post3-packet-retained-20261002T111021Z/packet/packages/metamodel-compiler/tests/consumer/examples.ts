import { compileModel, type ModelSource } from '../../src'
const base: ModelSource = {
  sourceSchemaVersion: 1,
  definition: {
    schemaVersion: 1,
    id: 'shared:model',
    version: '1.0.0',
    imports: [],
    objectTypes: [
      {
        id: 'shared:service',
        attributes: [{ id: 'name', required: true, schema: { kind: 'string' } }],
      },
    ],
    relationTypes: [],
    profiles: [],
    viewpoints: [],
  },
}
export function organization(id: string, field: string): ModelSource {
  return {
    sourceSchemaVersion: 1,
    definition: {
      schemaVersion: 1,
      id,
      version: '1.0.0',
      imports: [{ id: 'shared:model', version: '1.0.0' }],
      objectTypes: [],
      relationTypes: [],
      profiles: [],
      viewpoints: [],
    },
    extensions: [
      {
        targetKind: 'object',
        targetId: 'shared:service',
        attributes: [
          { id: field, required: true, default: 'unassigned', schema: { kind: 'string' } },
        ],
      },
    ],
  }
}
/** The host supplies SHA-256 of UTF-8, not a filename or a fake hash. */
export async function compileExamples(sha256: (text: string) => Promise<string>) {
  const ports = {
    sha256,
    load: async (request: { id: string; version: string }) => {
      if (request.id !== base.definition.id || request.version !== base.definition.version)
        throw Error('Unknown package')
      return base
    },
  }
  return Promise.all([
    compileModel(organization('retail:model', 'owner'), ports),
    compileModel(organization('research:model', 'laboratory'), ports),
  ])
}
