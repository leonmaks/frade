import { failure, success, type Result } from '@frade/repository-domain'
import { IntegrationFlowService, type RepositorySession } from '@frade/repository-application'
import type { IntegrationFlowCapability } from '@frade/repository-domain'
import type { CancellationToken } from '@frade/repository-ports'
import { decodeRequest } from './protocol'
/** The session is bound to an authenticated host context, never to caller-supplied permissions. */
export class RepositoryApi {
  private flows?: IntegrationFlowService
  constructor(
    private readonly session: RepositorySession,
    private readonly flowCapabilities: readonly IntegrationFlowCapability[] = [],
  ) {}
  dispose() {
    this.flows?.dispose()
  }
  async handle(input: unknown, token?: CancellationToken): Promise<Result<unknown>> {
    const decoded = decodeRequest(input)
    if (!decoded.ok) return decoded
    const { operation, payload } = decoded.value
    try {
      switch (operation) {
        case 'getObject':
          return await this.session.getObject(payload.ref, token)
        case 'getRelation':
          return await this.session.getRelation(payload.ref, token)
        case 'queryObjects':
          return await this.session.queryObjects(payload.query, token)
        case 'queryRelations':
          return await this.session.queryRelations(payload.query, token)
        case 'applyChanges':
          return await this.session.applyChanges(payload.changeSet, token)
        case 'validate':
          return success(await this.session.validate(payload.changeSet))
        case 'getSubgraph':
          return await this.session.getSubgraph(
            payload.ref,
            payload.options as Parameters<RepositorySession['getSubgraph']>[1],
            token,
          )
        case 'reload':
          return await this.session.reload()
        case 'capabilities':
          return success(this.session.capabilities)
        case 'integrationFlows':
          this.flows ??= new IntegrationFlowService(this.session, this.flowCapabilities)
          return await this.flows.search(payload.query, token)
        case 'diagram':
        case 'presentation':
          // Presentation transport is not wired to the session yet. Never return
          // undefined for a declared protocol operation or report false success.
          return failure('UNSUPPORTED_CAPABILITY')
        case 'reconcile':
          return await this.session.reconcile(payload.operationId as string)
      }
    } catch {
      return failure('REPOSITORY_UNAVAILABLE')
    }
  }
}
