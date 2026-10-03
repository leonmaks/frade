import { loadVerifiedRelease } from './review.mjs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

try {
  if (process.argv.length !== 3) throw Error('REVIEW_CHILD_ARGV')
  const input = JSON.parse(process.argv[2])
  if (
    !input ||
    typeof input.releaseRoot !== 'string' ||
    typeof input.expectedDigest !== 'string' ||
    typeof input.ownerRoot !== 'string' ||
    typeof input.common !== 'string' ||
    typeof input.expectedBranch !== 'string' ||
    !input.request ||
    typeof input.request !== 'object' ||
    Array.isArray(input.request)
  )
    throw Error('REVIEW_CHILD_ARGV')
  const { core, release } = await loadVerifiedRelease(input.releaseRoot, input.expectedDigest)
  const discovered = await core.discover(input.ownerRoot, input.common)
  if (discovered.root !== input.ownerRoot || discovered.branch !== input.expectedBranch)
    throw Error('REVIEW_OWNER')
  const receipt = await core.review(release, discovered, input.request)
  const rawRecord = await readFile(join(receipt.run, 'output', 'record.json'))
  core.verifyRequestedPolicy(JSON.parse(rawRecord), input.request.reviewPolicy)
  await loadVerifiedRelease(input.releaseRoot, input.expectedDigest)
  process.stdout.write(
    JSON.stringify({
      receipt,
      recordSha256: createHash('sha256').update(rawRecord).digest('hex'),
    }) + '\n',
  )
} catch (error) {
  process.stderr.write(String(error) + '\n')
  process.exitCode = 2
}
