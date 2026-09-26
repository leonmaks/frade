import { NativeAdapter } from '@frade/adapter-yaml'
import { createSbereaYamlAdapter } from '@frade/adapter-sberea-yaml'
import { failure, type Result, type JsonValue } from '@frade/repository-domain'
import type { RepositoryAdapterSession } from '@frade/repository-ports'
import type { MetadataSet } from '@frade/metamodel-config'

/** Constructed by the trusted host. It is not a renderer request or a path authorization API. */
export interface GrantedRepository {
  readonly adapterKind: string
  readonly dataRoot: string
  readonly repositoryId: string
  readonly label?: string
  readonly entry?: string
  readonly metadataSet?: MetadataSet
  /** Adapter-specific data, interpreted only by the explicitly selected factory. */
  readonly settings?: Readonly<Record<string, JsonValue>>
}
export type RepositoryAdapterFactory = (
  grant: GrantedRepository,
) => Promise<Result<RepositoryAdapterSession>>

/** Explicit host composition: registration is never derived from a file extension. */
export class RepositoryAdapterRegistry {
  private readonly factories = new Map<string, RepositoryAdapterFactory>()

  register(kind: string, factory: RepositoryAdapterFactory): this {
    if (!/^[a-z][a-z0-9-]*$/.test(kind)) throw Error('Invalid adapter kind')
    if (this.factories.has(kind)) throw Error('Adapter kind already registered: ' + kind)
    this.factories.set(kind, factory)
    return this
  }

  get kinds(): readonly string[] {
    return [...this.factories.keys()].sort()
  }

  async open(
    grant: GrantedRepository,
    options: { allowSourceIdentity?: boolean } = {},
  ): Promise<Result<RepositoryAdapterSession>> {
    const factory = this.factories.get(grant.adapterKind)
    if (!factory)
      return failure('UNSUPPORTED_CAPABILITY', [
        {
          code: 'UNKNOWN_ADAPTER',
          message: 'Repository adapter is not registered',
          path: ['adapterKind'],
        },
      ])
    if (!grant.dataRoot.trim() || !grant.repositoryId.trim()) return failure('PROFILE_INVALID')
    try {
      // Isolate a third-party factory's option mutations from other roots and the caller.
      const opened = await factory(structuredClone(grant))
      if (!opened.ok) return opened
      if (
        !options.allowSourceIdentity &&
        opened.value.profile.repositoryId !== grant.repositoryId
      ) {
        await opened.value.close()
        return failure('REPOSITORY_MISMATCH')
      }
      return opened
    } catch {
      // Host failures must not disclose privileged absolute paths through public results.
      return failure('REPOSITORY_UNAVAILABLE')
    }
  }
}

export function createRepositoryAdapterRegistry(): RepositoryAdapterRegistry {
  return new RepositoryAdapterRegistry()
    .register('native', (grant) => new NativeAdapter(grant.dataRoot).open())
    .register('sberea', async (grant) => {
      if (!grant.metadataSet || grant.metadataSet.dialect !== 'sberea')
        return failure('PROFILE_INVALID')
      return createSbereaYamlAdapter({
        dataRoot: grant.dataRoot,
        repositoryId: grant.repositoryId,
        metadataSet: grant.metadataSet,
        ...(grant.entry ? { entry: grant.entry } : {}),
        ...(grant.label ? { label: grant.label } : {}),
      }).open()
    })
}
