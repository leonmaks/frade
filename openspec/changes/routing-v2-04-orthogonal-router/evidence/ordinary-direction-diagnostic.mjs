// Read-only forensic reproduction. This is not a passing router regression.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { evaluateReference } from '../../../../packages/draw/tests/routing-v2/orthogonal/reference/oracle.mjs'

const require = createRequire(new URL('../../../../packages/draw/package.json', import.meta.url))
const ts = require('typescript')
const file = new URL('../../../../apps/desktop/vendor/drawio/mxgraph/src/view/mxEdgeStyle.js', import.meta.url)
const source = readFileSync(file, 'utf8')
const hash = createHash('sha256').update(source).digest('hex')
assert.equal(hash, '8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d')
const ast = ts.createSourceFile('mxEdgeStyle.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
assert.equal(ast.parseDiagnostics.length, 0)
const matches = []
function visit(node) {
  if (ts.isPropertyAssignment(node) && node.name.getText(ast) === 'OrthConnector') matches.push(node)
  ts.forEachChild(node, visit)
}
visit(ast)
assert.equal(matches.length, 1)
const body = matches[0].initializer.body
const starts = body.statements.filter((s) => ts.isVariableStatement(s) &&
  s.declarationList.declarations.some((d) => d.name.getText(ast) === 'sourceIndex'))
assert.equal(starts.length, 1)
const executor = source.slice(starts[0].getStart(ast), body.end - 1)

// Inject the separately regression-tested R03 directions. This is deliberately
// an executor-only experiment, NOT unmodified end-to-end draw.io parity.
// The zero-size target's attachment fraction is represented as zero so that
// finite target coordinates are used instead of vendor division by zero.
const context = vm.createContext({
  mxPoint: function (x, y) { this.x = x; this.y = y },
  mxConstants: { DIRECTION_MASK_WEST: 1, DIRECTION_MASK_NORTH: 2,
    DIRECTION_MASK_EAST: 8, DIRECTION_MASK_SOUTH: 4 },
  dir: [8, 2], quad: 0,
  geo: [[-8, -71166, 692, 1862], [-15, -70862, 0, 0]],
  constraint: [[0.5, 0], [0, 0]], sourceBuffer: 49, targetBuffer: 96,
  state: { view: { scale: 1 } }, result: [],
})
vm.runInContext(source, context, { timeout: 1000 })
vm.runInContext(`
  mxEdgeStyle.limits = geo.map((g, i) => {
    const b = i === 0 ? sourceBuffer : targetBuffer;
    const limits = Array(9).fill(0);
    limits[1] = g[0]-b; limits[2] = g[1]-b;
    limits[4] = g[0]+g[2]+b; limits[8] = g[1]+g[3]+b;
    return limits;
  });
  mxEdgeStyle.vertexSeperations = [0, 0, 0, 0, 0];
`, context)
vm.runInContext(executor, context, { timeout: 1000 })
const intermediates = JSON.parse(JSON.stringify(context.result))
assert.deepEqual(intermediates, [{ x: -15, y: -71166 }])
assert.deepEqual(Array.from(context.routePattern), [2114, 2561])

const input = {
  source: { bounds: { x: -8, y: -71166, width: 692, height: 1862 },
    mask: ['east'], mode: 'fixed', fixed: [338, -71166] },
  target: { bounds: { x: -15, y: -70862, width: 0, height: 0 },
    mask: ['west', 'north', 'east', 'south'], mode: 'fixed', fixed: [-15, -70862] },
  jetty: { source: 49, target: 96 },
}
const nativeOriginal = evaluateReference(input)
const nativeNondegenerateControl = evaluateReference({ ...input,
  target: { ...input.target, bounds: { x: -16, y: -70862, width: 2, height: 2 }, mask: ['north'] },
})
assert.deepEqual(nativeNondegenerateControl.trace.selection.directions, [2, 2])
console.log(JSON.stringify({
  classification: 'SPEC_CONFLICT', vendorSha256: hash,
  description: 'Pinned executor with required R03 EAST/NORTH loses source EAST; native selector is not a hard-mask substitute.',
  fixedDistance: Math.hypot(-15 - 338, -70862 + 71166), resolvedJettySum: 145,
  executorOnly: { injectedNativeDirections: [8, 2], quadrant: 0,
    pattern: Array.from(context.routePattern), intermediates,
    assembledPoints: [input.source.fixed, ...intermediates.map(p => [p.x, p.y]), input.target.fixed],
    actualSourceDirection: 'west', requiredSourceDirection: 'east' },
  nativeOriginal, nativeNondegenerateControl,
}, null, 2))
