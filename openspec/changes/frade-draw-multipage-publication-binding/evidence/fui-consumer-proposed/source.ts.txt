import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { readDrawingPagesOrigin } from './drawing-pages-origin'
const originSha256 = '7c3e52a69c1b8346a78f4297774f5c2342a3ecdaeb05a2611465d2f09c546f43'
const liveSha256 = 'f9b08ca17f6eddcaa932de360e96d72a813532ff32d478d884dd3af30130dbd7'
const preLdeSha256 = '3535fd97bbb5ad514abd7cc896e2dab750042a757afde459cd4be71984e367e9'
const editorPatches = [
  {
    "before": "    const tick = (now: number) => {",
    "after": "    let p01RefuseArmed = false, p01RefusedIntent: string | undefined\n    Object.defineProperty(window, '__p01RefuseDark', {\n      configurable: true, enumerable: true,\n      get: () => p01RefuseArmed,\n      set: (value: boolean) => { p01RefuseArmed = value; p01RefusedIntent = undefined },\n    })\n    const tick = (now: number) => {",
    "count": 1,
    "reason": "Accepted request+prepare-only refusal latch",
    "offsets": [
      5710
    ]
  },
  {
    "before": "if (\n        data?.action === 'fradePresentation' &&\n        data.operation === 'prepare' &&\n        data.snapshot?.kind === 'dark' &&\n        (window as any).__p01RefuseDark\n      ) {\n        event.stopImmediatePropagation()\n        parent.postMessage(\n          JSON.stringify({\n            event: 'fradePresentation',\n            version: 1,\n            participantId: data.participantId,\n            participantGeneration: data.participantGeneration,\n            context: data.context,\n            operation: 'prepare',\n            status: 'REFUSED',\n            message: 'Controlled current frame refusal',\n          }),\n          'frade://app',\n        )\n      }",
    "after": "if (\n        data?.action === 'fradePresentation' &&\n        data.operation === 'prepare' &&\n        data.context?.phase === 'prepare' &&\n        data.snapshot?.kind === 'light' &&\n        (window as any).__p01RefuseDark &&\n        typeof data.context?.requestId === 'string' &&\n        (p01RefusedIntent === undefined || p01RefusedIntent === data.context.requestId)\n      ) {\n        p01RefusedIntent = data.context.requestId\n        event.stopImmediatePropagation()\n        parent.postMessage(\n          JSON.stringify({\n            event: 'fradePresentation',\n            version: 1,\n            participantId: data.participantId,\n            participantGeneration: data.participantGeneration,\n            context: data.context,\n            operation: 'prepare',\n            status: 'REFUSED',\n            message: 'Controlled current frame refusal',\n          }),\n          'frade://app',\n        )\n      }",
    "count": 1,
    "reason": "Accepted request+prepare-only refusal predicate",
    "offsets": [
      6578
    ]
  },
  {
    "before": "await expect(canvas).toHaveAttribute('data-frade-theme', 'dark')",
    "after": "await expect(canvas).toHaveAttribute('data-frade-theme', 'light')",
    "count": 1,
    "reason": "Native derived editor kind remains Light; global theme checks retained",
    "offsets": [
      12084
    ]
  },
  {
    "before": "await expect(chrome).toHaveAttribute('data-frade-frame-theme', 'dark')",
    "after": "await expect(chrome).toHaveAttribute('data-frade-frame-theme', 'light')",
    "count": 2,
    "reason": "Embedded derived editor Light including parked retained frame",
    "offsets": [
      14851,
      17966
    ]
  },
  {
    "before": "import { builtinTokens } from '@frade/ui-workspace/design/tokens'",
    "after": "import { builtinTokens } from '@frade/ui-workspace/design/tokens'\nimport { drawioEditor } from '../../../../packages/ui-workspace/src/design/generated/drawio-editor'",
    "count": 1,
    "reason": "Expected editor palette generated from pinned upstream; global palette remains builtinTokens",
    "offsets": [
      165748
    ]
  },
  {
    "before": ".toHaveAttribute(kind === 'native' ? 'data-frade-theme' : 'data-frade-frame-theme', mode)",
    "after": ".toHaveAttribute(kind === 'native' ? 'data-frade-theme' : 'data-frade-frame-theme', 'light')",
    "count": 1,
    "reason": "FUI full revision and31-role projection retains independent Light kind",
    "offsets": [
      172291
    ]
  },
  {
    "before": "}, { kind, roles })",
    "after": "}, { kind, roles: Object.entries(drawioEditor.colors) })",
    "count": 1,
    "reason": "FUI editor31-role projection consumes verified upstream palette while global/portal31-role checks remain exact",
    "offsets": [
      172829
    ]
  },
  {
    "before": ".toHaveAttribute(kind === 'native' ? 'data-frade-theme' : 'data-frade-frame-theme', 'dark')",
    "after": ".toHaveAttribute(kind === 'native' ? 'data-frade-theme' : 'data-frade-frame-theme', 'light')",
    "count": 1,
    "reason": "FUI006 preview keeps editorLight; rootDark assertion unchanged",
    "offsets": [
      177028
    ]
  },
  {
    "before": "theme:mode})",
    "after": "theme:'light'})",
    "count": 1,
    "reason": "Forced media assertions retained; editor kindLight independent of outer mode",
    "offsets": [
      213036
    ]
  },
  {
    "before": "await expect(frame.locator('html')).toHaveAttribute('data-frade-frame-theme',wanted)",
    "after": "await expect(frame.locator('html')).toHaveAttribute('data-frade-frame-theme','light')",
    "count": 1,
    "reason": "Upper actual theme transition retains editorLight, global wanted assertion unchanged",
    "offsets": [
      229141
    ]
  },
  {
    "before": "\n          tag: node.tagName,",
    "after": "\n          editorOwned: scope === 'frame' || !!node.closest('[data-frade-editor=light]'),\n          tag: node.tagName,",
    "count": 1,
    "reason": "Classify exact editor ownership for replaced density obligation; never alter external target requirement",
    "offsets": [
      29238
    ]
  },
  {
    "before": "consumer.target.height < (density === 'compact' ? 28 : 36)",
    "after": "consumer.target.height < (consumer.editorOwned ? 28 : density === 'compact' ? 28 : 36)",
    "count": 1,
    "reason": "Accepted fixed editor accessibility minimum28; external compact28/comfortable36 unchanged, density case loops retained",
    "offsets": [
      31645
    ]
  },
  {
    "before": "const minimum = record.media.coarse ? 44 : density === 'compact' ? 28 : 36",
    "after": "const minimum = record.media.coarse ? 44 : 28",
    "count": 1,
    "reason": "Lower editor upstream fixed geometry; applicable28/coarse44 accessibility thresholds remain",
    "offsets": [
      127152
    ]
  },
  {
    "before": "(record.media.coarse ? 44 : density === 'compact' ? 28 : 36)",
    "after": "(record.media.coarse ? 44 : 28)",
    "count": 1,
    "reason": "Second lower editor fixed28/coarse44 targets; all bounds/focus/text contrast preserved",
    "offsets": [
      133974
    ]
  },
  {
    "before": "expect(b.height).toBeGreaterThanOrEqual(record.media.coarse?44:36)",
    "after": "expect(b.height).toBeGreaterThanOrEqual(record.media.coarse?44:28)",
    "count": 1,
    "reason": "Native resize lower-only control fixed editor geometry28/coarse44",
    "offsets": [
      151909
    ]
  },
  {
    "before": "expect(ring.rect).toEqual({width:28,height:density==='compact'?28:36})",
    "after": "expect(ring.rect).toEqual({width:28,height:28})",
    "count": 1,
    "reason": "Upper exact shape becomes fixed28 across both retained external density cases; no tolerance change",
    "offsets": [
      234594
    ]
  }
] as const
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
  if (digest(live) !== liveSha256) {
    try {
      const root = fileURLToPath(new URL('../../../../', import.meta.url))
      live = readDrawingPagesOrigin(root, 'apps/desktop/tests/e2e/ui-contract-theme.spec.ts', live)
    } catch (cause) {
      throw new Error('FUI_CURRENT_SOURCE_DRIFT', { cause })
    }
  }
  if (digest(live) !== liveSha256) throw Error('FUI_CURRENT_SOURCE_DRIFT')
  let source = live.toString('utf8')
  for (const patch of [...editorPatches].reverse()) {
    if (patch.offsets.length !== patch.count) throw Error('FUI_EDITOR_PATCH_COUNT')
    for (const offset of [...patch.offsets].reverse()) {
      if (source.slice(offset, offset + patch.after.length) !== patch.after) throw Error('FUI_EDITOR_PATCH_ORDER')
      source = source.slice(0, offset) + patch.before + source.slice(offset + patch.after.length)
    }
  }
  if (digest(Buffer.from(source)) !== preLdeSha256) throw Error('FUI_PRE_LDE_SOURCE_DRIFT')
  for (const patch of patches) {
    if (source.split(patch.current).length - 1 !== patch.count) throw Error('FUI_SELECTOR_PATCH_COUNT')
    source = source.replaceAll(patch.current, patch.original)
  }
  const origin = Buffer.from(source)
  if (digest(origin) !== originSha256) throw Error('FUI_ORIGIN_SOURCE_DRIFT')
  return origin
}
