import { NativeAdapter } from '@frade/adapter-yaml'
import { openRepository, type RepositorySession } from '@frade/repository-application'
import { RepositoryApi } from '@frade/repository-api'
import { failure, success, type Result } from '@frade/repository-domain'
import type { DerivedIndexPort } from '@frade/repository-ports'
export class NativeRepositoryController {
  private session?: RepositorySession
  private generation = 0
  constructor(
    private readonly pickDirectory: () => Promise<string | undefined>,
    private readonly indexFactory?: (repositoryId: string) => Promise<DerivedIndexPort>,
  ) {}
  async open(): Promise<Result<unknown>> {
    const generation = ++this.generation
    try {
      const root = await this.pickDirectory()
      if (!root) return failure('CANCELLED')
      const adapter = await new NativeAdapter(root).open()
      if (!adapter.ok) return adapter
      const repositoryId = adapter.value.profile.repositoryId
      const opened = await openRepository(
        { open: async () => adapter },
        {
          callerId: 'desktop-local-user',
          repositoryIds: [repositoryId],
          permissions: ['read', 'write', 'configure', 'cascade'],
        },
        { authorize: (context) => context.permissions.includes('write') },
      )
      if (!opened.ok) return opened
      if (generation !== this.generation) {
        await opened.value.close()
        return failure('CANCELLED')
      }
      await this.session?.close()
      this.session = opened.value
      const warnings: string[] = []
      // v2 owns a verified paged catalog; a second snapshot index would require materializing the graph.
      if (
        adapter.value.profile.indexing.enabled &&
        adapter.value.profile.adapterKind !== 'native-v2' &&
        this.indexFactory
      ) {
        try {
          const indexed = await this.session.attachIndex(await this.indexFactory(repositoryId))
          if (!indexed.ok) warnings.push('INDEX_OUT_OF_SYNC')
        } catch {
          warnings.push('INDEX_OUT_OF_SYNC')
        }
      }
      return success({
        repositoryId,
        state: opened.value.state,
        capabilities: opened.value.capabilities,
        warnings,
      })
    } catch {
      return failure('REPOSITORY_UNAVAILABLE')
    }
  }
  request(input: unknown) {
    return this.session
      ? new RepositoryApi(this.session).handle(input)
      : Promise.resolve(failure('REPOSITORY_UNAVAILABLE'))
  }
  async close() {
    this.generation++
    await this.session?.close()
    this.session = undefined
  }
}
