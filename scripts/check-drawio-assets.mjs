import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  dir = resolve(root, 'apps/desktop/vendor')
const manifest = JSON.parse(await readFile(resolve(dir, 'drawio-manifest.json'), 'utf8'))
const failed = []
for (const asset of manifest.assets) {
  try {
    const bytes = await readFile(resolve(dir, 'drawio', asset.path))
    if (
      bytes.length !== asset.size ||
      createHash('sha1')
        .update('blob ' + bytes.length + '\0')
        .update(bytes)
        .digest('hex') !== asset.sha
    )
      failed.push(asset.path)
  } catch {
    failed.push(asset.path)
  }
}
if (failed.length) {
  console.error('Draw.io resources are missing or modified:', failed)
  process.exitCode = 1
} else
  console.log(`Draw.io ${manifest.version}: ${manifest.assets.length} pinned resources verified`)
