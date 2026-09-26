import { failure, type Result } from '@frade/repository-domain'
import type { BackendCommand } from '@frade/repository-api/workbench'
/** Main grants a selected directory; all repository composition lives in Utility. */
export class RepositoryDesktopController {
  constructor(
    private readonly pickDirectory: () => Promise<string | undefined>,
    private readonly relay: (command: BackendCommand) => Promise<Result<unknown>>,
    private readonly indexDirectory: string,
  ) {}
  async open(): Promise<Result<unknown>> {
    const dataRoot = await this.pickDirectory()
    return dataRoot
      ? this.relay({ operation: 'legacyOpen', dataRoot, indexDirectory: this.indexDirectory })
      : failure('CANCELLED')
  }
  request(value: unknown) {
    return this.relay({ operation: 'legacyRequest', value })
  }
  async close() {
    await this.relay({ operation: 'legacyClose' })
  }
}
