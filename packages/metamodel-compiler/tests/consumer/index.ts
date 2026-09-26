import {
  compileModel,
  createModelPublisher,
  previewMigration,
  type ModelSource,
  type CompilerPorts,
} from '../../src'
import { compileExamples } from './examples'
const source: ModelSource = {
  sourceSchemaVersion: 1,
  definition: {
    schemaVersion: 1,
    id: 'sample:model',
    version: '1.0.0',
    imports: [],
    objectTypes: [],
    relationTypes: [],
    profiles: [],
    viewpoints: [],
  },
}
declare const ports: CompilerPorts
void compileExamples(ports.sha256)
void compileModel(source, ports)
const publisher = createModelPublisher(ports)
const current = publisher.current()
if (current) {
  current.project()
  current.analysis()
  previewMigration(current, current)
}
// @ts-expect-error Compiler envelopes have an independent supported version.
const unsupported: ModelSource = { ...source, sourceSchemaVersion: 2 }
void unsupported
