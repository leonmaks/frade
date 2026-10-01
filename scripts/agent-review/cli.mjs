import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { bundle, discover, newRun, instance, probe, review } from './core.mjs'
import { publish } from './publish.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
try {
  const release = await bundle(root),
    owner = await discover(process.cwd(), release.manifest.common)
  const action = process.argv[2]
  let result
  if (action === 'status')
    result = {
      status: 'AVAILABLE',
      owner,
      release: release.digest,
      requestedModel: 'gpt-6-astra',
      requestedEffort: 'xhigh',
      policy: path.join(root, 'docs/engineering/agent-workflow.md'),
    }
  else if (action === 'probe') {
    const run = await newRun(owner),
      directory = await instance(release, owner, run, 'docs/engineering/agent-workflow.md')
    result = await probe(release, owner, run, directory)
  } else if (action === 'run')
    result = await review(release, owner, JSON.parse(await fs.readFile(process.argv[3], 'utf8')))
  else if (action === 'publish')
    result = await publish(release, owner, path.resolve(process.argv[3]))
  else
    throw Error(
      'USAGE: node cli.mjs status | probe | run <external-request.json> | publish <verified-POST-run>',
    )
  console.log(JSON.stringify(result, null, 2))
  if (result.status === 'FAIL') process.exitCode = 1
  if (result.status === 'BLOCKED') process.exitCode = 2
} catch (e) {
  console.error(JSON.stringify({ status: 'BLOCKED', error: String(e) }))
  process.exitCode = 2
}
