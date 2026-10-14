import fs from 'node:fs/promises'
import path from 'node:path'
import { sha, strictReceipt } from './core.mjs'
export async function publish(release, owner, proof) {
  const record = JSON.parse(await fs.readFile(path.join(proof, 'record.json'), 'utf8'))
  if (sha(await fs.readFile(path.join(proof, 'result.md'))) !== record.resultSha256)
    throw Error('POST_RESULT_DRIFT')
  const verdict = strictReceipt(
    await fs.readFile(path.join(proof, 'events.jsonl'), 'utf8'),
    await fs.readFile(path.join(proof, 'result.md'), 'utf8'),
    record.exitCode,
  )
  if (
    record.run !== path.resolve(proof) ||
    record.phase !== 'POST' ||
    record.status !== 'PASS' ||
    verdict.gateStatus !== 'PASS' ||
    !record.candidateUnchanged ||
    !record.packetUnchanged ||
    record.error
  )
    throw Error('POST_NOT_VERIFIED')
  const manifestBytes = await fs.readFile(path.join(record.packet, 'REVIEW-PACKET-MANIFEST.json'))
  if (sha(manifestBytes) !== record.packetManifestSha256) throw Error('POST_MANIFEST_DRIFT')
  const manifest = JSON.parse(manifestBytes)
  if (manifest.phase !== 'POST' || manifest.candidate.branch !== owner.branch)
    throw Error('POST_OWNER_MISMATCH')
  const templates = JSON.parse(
    await fs.readFile(
      path.join(release.root, 'scripts/agent-review/transport/provenance.json'),
      'utf8',
    ),
  )
  for (const tool of record.toolchain) {
    const item = templates.entries.find((x) => x.path === tool.path)
    if (!item || item.sha256 !== tool.sha256) throw Error('UNREVIEWED_POST_TRANSPORT')
  }
  if (record.toolchain.length !== 5) throw Error('MISSING_POST_TRANSPORT')
  for (const item of [
    ...release.manifest.files,
    { path: 'scripts/agent-review/bundle.json', sha256: release.digest },
  ]) {
    const artifact = manifest.artifacts.find((a) => a.path === item.path)
    if (
      !artifact ||
      artifact.sha256 !== item.sha256 ||
      sha(await fs.readFile(path.join(record.packet, item.path))) !== item.sha256
    )
      throw Error('PUBLICATION_NOT_REVIEWED:' + item.path)
  }
  const storage = path.join(owner.common, 'frade-workflow'),
    output = path.join(storage, 'releases', release.digest)
  await fs.mkdir(output, { recursive: true })
  for (const item of [
    ...release.manifest.files,
    { path: 'scripts/agent-review/bundle.json', sha256: release.digest },
  ]) {
    const target = path.join(output, item.path)
    await fs.mkdir(path.dirname(target), { recursive: true })
    const bytes = await fs.readFile(path.join(release.root, item.path))
    if (sha(bytes) !== item.sha256) throw Error('PUBLICATION_SOURCE_DRIFT')
    try {
      await fs.writeFile(target, bytes, { flag: 'wx' })
    } catch (e) {
      if (e.code !== 'EEXIST' || sha(await fs.readFile(target)) !== item.sha256) throw e
    }
  }
  const pointer = {
    version: 1,
    release: release.digest,
    common: owner.common,
    installedAtUtc: new Date().toISOString(),
    postResultSha256: record.resultSha256,
    policySha256: release.manifest.policySha256,
  }
  const temporary = path.join(storage, 'current-' + release.digest + '.tmp')
  await fs.writeFile(temporary, JSON.stringify(pointer, null, 2) + '\n', { flag: 'wx' })
  await fs.rename(temporary, path.join(storage, 'current.json'))
  return { ...pointer, output, status: 'PASS' }
}
