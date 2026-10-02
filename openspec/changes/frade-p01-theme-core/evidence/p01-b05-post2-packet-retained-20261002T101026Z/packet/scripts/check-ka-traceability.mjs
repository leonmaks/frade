import { readFile, readdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const entries = JSON.parse(
  await readFile(resolve(root, 'docs/ka-workbench/scenarios.json'), 'utf8'),
)
const expected = new Set(),
  requirements = new Set()
for (const name of await readdir(
  resolve(root, 'openspec/changes/frade-ka-workbench-pilot/specs'),
)) {
  const text = await readFile(
    resolve(root, 'openspec/changes/frade-ka-workbench-pilot/specs', name, 'spec.md'),
    'utf8',
  ).catch((e) => {
    if (e.code === 'ENOENT') return ''
    throw e
  })
  let requirement
  for (const line of text.split(/\r?\n/)) {
    const req = /^### Requirement: (\S+)/.exec(line)
    if (req) {
      requirement = req[1]
      if (requirements.has(requirement)) throw Error('Duplicate requirement ' + requirement)
      requirements.add(requirement)
    }
    const scenario = /^#### Scenario: (.+)/.exec(line)
    if (scenario) {
      const id = requirement + ' / ' + scenario[1]
      if (expected.has(id)) throw Error('Duplicate scenario ' + id)
      expected.add(id)
    }
  }
}
const seen = new Set()
for (const entry of entries) {
  if (!expected.has(entry.id) || seen.has(entry.id))
    throw Error('Unknown/duplicate trace ' + entry.id)
  seen.add(entry.id)
  if (!entry.tests?.length) throw Error('No assertion-bearing test: ' + entry.id)
  for (const file of entry.tests) {
    const text = await readFile(resolve(root, file), 'utf8')
    if (!/\bexpect\s*(?:\(|\.)|assert\./.test(text)) throw Error('No assertions in ' + file)
  }
}
if (seen.size !== expected.size)
  throw Error('Missing scenarios: ' + [...expected].filter((id) => !seen.has(id)).join(', '))
console.log(`KA traceability: PASS (${requirements.size} requirements, ${seen.size} scenarios)`)
