import { createHash } from 'node:crypto'
const originSha256 = '7c3e52a69c1b8346a78f4297774f5c2342a3ecdaeb05a2611465d2f09c546f43'
const liveSha256 = '3535fd97bbb5ad514abd7cc896e2dab750042a757afde459cd4be71984e367e9'
const patches = [
  {
    "original": "getByRole('option', { name: /Dark/ })",
    "current": "getByRole('option', { name: 'Тёмная (Dark)', exact: true })",
    "count": 4
  },
  {
    "original": "getByRole('option',{name:/Dark/})",
    "current": "getByRole('option',{name:'Тёмная (Dark)',exact:true})",
    "count": 1
  }
] as const
const digest = (raw: Buffer | string) => createHash('sha256').update(raw).digest('hex')
/** Historical-only original source projection; fresh runs bind the current live source separately. */
export function historicalFuiOrigin(live: Buffer): Buffer {
  if (digest(live) !== liveSha256) throw Error('FUI_CURRENT_SOURCE_DRIFT')
  let source = live.toString('utf8')
  for (const patch of patches) {
    if (source.split(patch.current).length - 1 !== patch.count) throw Error('FUI_SELECTOR_PATCH_COUNT')
    source = source.replaceAll(patch.current, patch.original)
  }
  const origin = Buffer.from(source)
  if (digest(origin) !== originSha256) throw Error('FUI_ORIGIN_SOURCE_DRIFT')
  return origin
}
