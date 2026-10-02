import * as api from '../../src/index'
void api
declare const base: Omit<
  api.RepositoryAdapterSession,
  'capabilities' | 'writer' | 'history' | 'subscribe'
>
declare const writer: api.RepositoryWriter
const readOnly = {
  canRead: true,
  canWrite: false,
  supportsBatch: false,
  supportsAtomicBatch: false,
  supportsWatch: false,
  supportsHistory: false,
  supportsTransactions: false,
  supportsCrossRepositoryReferences: false,
  supportsServerSideQueries: false,
  supportedQueryOperators: ['eq'],
  supportedMetamodelFeatures: ['attributes'],
  guardedSnapshot: false,
  reconciliation: 'none',
  preservation: 'none',
  writerCoordination: 'none',
} as const
api.defineAdapterSession(readOnly, base)
api.defineAdapterSession(
  { ...readOnly, canWrite: true, guardedSnapshot: true, reconciliation: 'session' },
  { ...base, writer },
)
// @ts-expect-error A read-only capability shape cannot carry a writer.
api.defineAdapterSession(readOnly, { ...base, writer })
// @ts-expect-error A writable capability shape requires its writer.
api.defineAdapterSession({ ...readOnly, canWrite: true }, base)
// @ts-expect-error History capability requires its reader.
api.defineAdapterSession({ ...readOnly, supportsHistory: true }, base)
// @ts-expect-error Watch capability requires subscription lifecycle.
api.defineAdapterSession({ ...readOnly, supportsWatch: true }, base)
declare const pointOnly: Omit<
  api.RepositoryReaderSession,
  'capabilities' | 'writer' | 'history' | 'subscribe' | 'query' | 'snapshot'
>
api.defineAdapterSession({ ...readOnly, supportedQueryOperators: [] }, pointOnly)
// @ts-expect-error Server-side query capability requires its query service.
api.defineAdapterSession({ ...readOnly, supportsServerSideQueries: true }, pointOnly)
