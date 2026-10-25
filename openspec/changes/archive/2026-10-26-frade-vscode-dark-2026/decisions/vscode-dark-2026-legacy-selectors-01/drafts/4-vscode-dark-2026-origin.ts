import { createHash } from 'node:crypto'
const originSha256 = '7c3e52a69c1b8346a78f4297774f5c2342a3ecdaeb05a2611465d2f09c546f43'
const liveSha256 = '1e75d44a0db4155a2afcd1221b43a3afaaef453b9fd3448f87ab11fe001f5c8a'
const originalSelector = "getByRole('option', { name: /Dark/ })"
const currentSelector = "getByRole('option', { name: 'Тёмная (Dark)', exact: true })"
const digest = (raw: Buffer | string) => createHash('sha256').update(raw).digest('hex')
/** Historical FUI evidence binds the original source. Current executions bind current source separately.
 * Accept exactly the approved four selector substitutions; never rebase historical receipts. */
export function historicalFuiOrigin(live: Buffer): Buffer {
  if (digest(live) !== liveSha256) throw Error('FUI_CURRENT_SOURCE_DRIFT')
  const source = live.toString('utf8')
  if (source.split(currentSelector).length - 1 !== 4) throw Error('FUI_SELECTOR_PATCH_COUNT')
  const origin = Buffer.from(source.replaceAll(currentSelector, originalSelector))
  if (digest(origin) !== originSha256) throw Error('FUI_ORIGIN_SOURCE_DRIFT')
  return origin
}
