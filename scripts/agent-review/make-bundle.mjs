import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { COMMON, sha } from './core.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const paths = [
  'scripts/agent-review/core.mjs',
  'scripts/agent-review/cli.mjs',
  'scripts/agent-review/publish.mjs',
  'scripts/agent-review/make-bundle.mjs',
  'scripts/agent-review/AGENTS-common.fragment.md',
  'scripts/agent-review/AGENTS-stage-review.fragment.md',
  'docs/engineering/agent-workflow.md',
  'docs/engineering/routing-v2-agent-handoff.md',
  'docs/engineering/parallel-feature-workflow.md',
  ...[
    'integrity.mjs',
    'policy.mjs',
    'prepare-review.mjs',
    'invoke-review.mjs',
    'transport.test.mjs',
    'offline-probe-b.json',
    'provenance.json',
  ].map((f) => 'scripts/agent-review/transport/' + f),
]
const files = await Promise.all(
  paths.map(async (p) => ({ path: p, sha256: sha(await fs.readFile(path.join(root, p))) })),
)
const manifest = {
  version: 1,
  common: COMMON,
  policyVersion: '1.1',
  policySha256: files.find((f) => f.path === 'docs/engineering/agent-workflow.md').sha256,
  files,
}
await fs.writeFile(
  path.join(root, 'scripts/agent-review/bundle.json'),
  JSON.stringify(manifest, null, 2) + '\n',
)
console.log(
  JSON.stringify({ files: files.length, digest: sha(JSON.stringify(manifest, null, 2) + '\n') }),
)
