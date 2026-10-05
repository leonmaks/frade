import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const ci = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8')
const job = ci.split('  directions-controls:\n')[1]?.split('\n  foundation:')[0]

test('actual CI job selects only the W01 supplier ref for its baseline audit', () => {
  assert.ok(job, 'directions job exists in actual workflow')
  const lines = job.split('\n')
  const index = lines.findIndex((line) => line.startsWith('    if: '))
  const scalar = index < 0 ? '' : lines[index].slice('    if: '.length)
  const folded = []
  if (scalar === '>-' || scalar === '>')
    for (const line of lines.slice(index + 1)) {
      if (!line.startsWith('      ')) break
      folded.push(line.trim())
    }
  const expression = folded.length ? folded.join(' ') : scalar
  assert.ok(expression, 'W01 ref condition must be on the job')
  assert.match(job, /- run: pnpm check:directions/)
  const selected = (event_name, ref, head_ref, headRepo = 'leonmaks/frade') =>
    runInNewContext(expression, {
      github: {
        event_name,
        ref,
        head_ref,
        repository: 'leonmaks/frade',
        event: { pull_request: { head: { repo: { full_name: headRepo } } } },
      },
    })
  assert.equal(selected('push', 'refs/heads/codex/frade-standard-workflow', ''), true)
  assert.equal(
    selected('pull_request', 'refs/pull/12/merge', 'codex/frade-standard-workflow'),
    true,
  )
  assert.equal(
    selected('pull_request', 'refs/pull/12/merge', 'codex/frade-standard-workflow', 'fork/frade'),
    false,
  )
  assert.equal(selected('push', 'refs/heads/codex/routing-v2', ''), false)
  assert.equal(selected('pull_request', 'refs/pull/13/merge', 'codex/routing-v2'), false)
  assert.equal(selected('push', 'refs/heads/main', ''), false)
})
