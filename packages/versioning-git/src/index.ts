import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { isAbsolute } from 'node:path'
import { failure, success, type Result } from '@frade/repository-domain'
import type { VersioningPort } from '@frade/repository-ports'
const execute = promisify(execFile)
export class GitVersioning implements VersioningPort {
  constructor(private readonly root: string) {}
  private async run(args: readonly string[]): Promise<string> {
    const result = await execute('git', ['--literal-pathspecs', '-C', this.root, ...args], {
      timeout: 15000,
      maxBuffer: 4 * 1024 * 1024,
      windowsHide: true,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })
    return result.stdout
  }
  async status() {
    try {
      const content = await this.run(['status', '--porcelain=v1', '-z', '--untracked-files=all']),
        parts = content.split('\0'),
        changedPaths: string[] = [],
        conflicts: string[] = []
      for (let i = 0; i < parts.length; i++) {
        const row = parts[i]
        if (!row) continue
        const code = row.slice(0, 2),
          path = row.slice(3)
        changedPaths.push(path)
        if (code.includes('U') || ['AA', 'DD'].includes(code)) conflicts.push(path)
        if (code.includes('R') || code.includes('C')) i++
      }
      let revision: string | null = null
      try {
        revision = (await this.run(['rev-parse', '--verify', 'HEAD'])).trim()
      } catch {
        /* unborn branch */
      }
      return success({ revision, changedPaths: changedPaths.sort(), conflicts: conflicts.sort() })
    } catch {
      return failure('REPOSITORY_UNAVAILABLE')
    }
  }
  async history(limit: number) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) return failure('INVALID_INPUT')
    try {
      const text = await this.run(['log', '-n', String(limit), '--format=%H%x00%s'])
      return success(
        text.trim()
          ? text
              .trimEnd()
              .split('\n')
              .map((line) => {
                const [revision, message] = line.split('\0')
                return { revision, message }
              })
          : [],
      )
    } catch {
      return failure('REPOSITORY_UNAVAILABLE')
    }
  }
  async commit(message: string, paths: readonly string[]): Promise<Result<string>> {
    if (
      !message.trim() ||
      message.length > 10000 ||
      !paths.length ||
      paths.length > 1000 ||
      paths.some(
        (path) =>
          !path ||
          isAbsolute(path) ||
          path.includes('\0') ||
          path.includes(':') ||
          path.split(/[\\/]/).includes('..'),
      )
    )
      return failure('INVALID_INPUT')
    const state = await this.status()
    if (!state.ok) return state
    if (state.value.conflicts.length) return failure('REVISION_CONFLICT')
    try {
      // Explicitly scoped paths only; --only prevents committing unrelated staged changes.
      await this.run(['add', '--', ...paths])
      await this.run([
        '-c',
        'core.hooksPath=',
        '-c',
        'commit.gpgSign=false',
        'commit',
        '--only',
        '-m',
        message,
        '--',
        ...paths,
      ])
      return success((await this.run(['rev-parse', '--verify', 'HEAD'])).trim())
    } catch {
      return failure('WRITE_FAILED')
    }
  }
}
