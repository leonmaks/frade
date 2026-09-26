export const repositoryPolicies: Record<string, string[]>
export function inspectRepositorySource(
  file: string,
  content: string,
  scope: string,
  allowed: readonly string[],
): string[]
export function repositoryManifestViolations(
  name: string,
  manifest: Record<string, unknown>,
): string[]
export function checkRepositoryBoundaries(root: string): Promise<string[]>
