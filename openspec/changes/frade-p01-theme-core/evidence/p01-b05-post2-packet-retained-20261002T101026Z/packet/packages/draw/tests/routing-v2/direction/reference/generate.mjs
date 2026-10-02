import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repository = path.resolve(here, '../../../../../../')
const vendor = path.join(repository, 'apps/desktop/vendor/drawio/mxgraph/src/view/mxEdgeStyle.js')
const fixturePath = path.resolve(here, '../fixtures/reference-cases.json')
const expectedSourceHash = '8608f4d1771db2307ce5a665a4ce9301da3ea4f759d932d381f057654c1e326d'
const source = fs.readFileSync(vendor, 'utf8')
const sourceHash = createHash('sha256').update(source).digest('hex')
if (sourceHash !== expectedSourceHash) throw new Error('Pinned mxEdgeStyle.js SHA256 changed')
const existingFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
if (existingFixture.vendorSha256 !== sourceHash)
  throw new Error('Existing golden fixture was produced from a different vendor revision')
const quadrantMarker = '// Work out which quad the target is in'
const endMarker = '// End of source and target direction determination'
const dirStart = source.lastIndexOf('var dir = [0, 0];', source.indexOf(quadrantMarker))
const bodyStart = source.indexOf(quadrantMarker, dirStart)
const bodyEnd = source.indexOf(endMarker, bodyStart)
if (dirStart < 0 || bodyStart < 0 || bodyEnd < 0)
  throw new Error('Pinned direction markers not found')
const directionBody = source.slice(dirStart, bodyEnd + endMarker.length)
const constants = {
  DIRECTION_MASK_WEST: 1,
  DIRECTION_MASK_NORTH: 2,
  DIRECTION_MASK_SOUTH: 4,
  DIRECTION_MASK_EAST: 8,
  DIRECTION_MASK_ALL: 15,
}
const reverse = { 1: 8, 2: 4, 4: 2, 8: 1 }
const reference = vm.compileFunction(
  directionBody + '\nreturn { directions: dir.slice(), quadrant: quad };',
  [
    'sourceX',
    'sourceY',
    'sourceWidth',
    'sourceHeight',
    'targetX',
    'targetY',
    'targetWidth',
    'targetHeight',
    'sourceBuffer',
    'targetBuffer',
    'totalBuffer',
    'source',
    'target',
    'p0',
    'pe',
    'portConstraint',
    'mxConstants',
    'mxUtils',
    'mxEdgeStyle',
  ],
  { filename: 'pinned-mxEdgeStyle-direction.js' },
)

function nativeMask(bits) {
  // V2 Direction enum order is WEST, NORTH, EAST, SOUTH; mxGraph bit values differ.
  return (bits & 1) | (bits & 2) | (bits & 4 ? 8 : 0) | (bits & 8 ? 4 : 0)
}
function directionName(bit) {
  return { 1: 'WEST', 2: 'NORTH', 8: 'EAST', 4: 'SOUTH' }[bit]
}

const sourceBounds = { x: 0, y: 0, width: 10, height: 10 }
const targetOffsets = [
  { x: -30, y: -30, quadrant: 0 },
  { x: 30, y: -30, quadrant: 1 },
  { x: 30, y: 30, quadrant: 2 },
  { x: -30, y: 30, quadrant: 3 },
]
function evaluate(source, target, sourceMask, targetMask) {
  const result = reference(
    source.x,
    source.y,
    source.width,
    source.height,
    target.x,
    target.y,
    target.width,
    target.height,
    0,
    0,
    0,
    true,
    true,
    null,
    null,
    [nativeMask(sourceMask), nativeMask(targetMask)],
    constants,
    { reversePortConstraints: (value) => reverse[value] ?? value },
    { limits: [[], []], vertexSeperations: [] },
  )
  const expected = result.directions.map(directionName)
  const allowed = [sourceMask, targetMask].map((bits) =>
    Object.fromEntries(
      ['WEST', 'NORTH', 'EAST', 'SOUTH'].map((name) => [
        name,
        Boolean(bits & { WEST: 1, NORTH: 2, EAST: 4, SOUTH: 8 }[name]),
      ]),
    ),
  )
  for (let index = 0; index < 2; index += 1) {
    if (!allowed[index][expected[index]])
      throw new Error(
        'Reference produced a direction outside its mask: ' +
          JSON.stringify({ source, target, expected, allowed }),
      )
  }
  return { quadrant: result.quadrant, expected }
}

const cases = []
for (let quadrant = 0; quadrant < targetOffsets.length; quadrant += 1) {
  const offset = targetOffsets[quadrant]
  for (let sourceMask = 1; sourceMask <= 15; sourceMask += 1) {
    for (let targetMask = 1; targetMask <= 15; targetMask += 1) {
      const source = { ...sourceBounds }
      const target = {
        ...sourceBounds,
        x: sourceBounds.x + offset.x,
        y: sourceBounds.y + offset.y,
      }
      const evaluated = evaluate(source, target, sourceMask, targetMask)
      if (evaluated.quadrant !== offset.quadrant)
        throw new Error('Reference quadrant marker disagreement')
      cases.push({ quadrant, sourceMask, targetMask, ...evaluated })
    }
  }
}
if (cases.length !== 900) throw new Error('Expected 900 independently evaluated reference pairs')
const directInputs = [
  {
    name: 'single-axis-east',
    source: { x: 0, y: 0, width: 10, height: 10 },
    target: { x: 30, y: 0, width: 10, height: 10 },
  },
  {
    name: 'single-axis-south',
    source: { x: 0, y: 0, width: 10, height: 10 },
    target: { x: 0, y: 30, width: 10, height: 10 },
  },
  {
    name: 'touching',
    source: { x: 0, y: 0, width: 10, height: 10 },
    target: { x: 10, y: 2, width: 15, height: 4 },
  },
  {
    name: 'overlap',
    source: { x: 0, y: 0, width: 10, height: 10 },
    target: { x: 8, y: 1, width: 10, height: 8 },
  },
  {
    name: 'containment',
    source: { x: 0, y: 0, width: 10, height: 10 },
    target: { x: 2, y: 2, width: 3, height: 4 },
  },
  {
    name: 'asymmetric-sizes',
    source: { x: 0, y: 0, width: 8, height: 14 },
    target: { x: 30, y: 1, width: 20, height: 6 },
  },
  {
    name: 'diagonal-role-forward',
    source: { x: 0, y: 0, width: 10, height: 10 },
    target: { x: 30, y: 30, width: 10, height: 10 },
  },
  {
    name: 'diagonal-role-reversed',
    source: { x: 30, y: 30, width: 10, height: 10 },
    target: { x: 0, y: 0, width: 10, height: 10 },
  },
  {
    name: 'degenerate-zero-extents',
    source: { x: 0, y: 0, width: 0, height: 0 },
    target: { x: 0, y: 0, width: 10, height: 10 },
  },
]
const directCases = directInputs.map((input) => ({
  ...input,
  sourceMask: 15,
  targetMask: 15,
  ...evaluate(input.source, input.target, 15, 15),
}))
const output = {
  vendor: 'apps/desktop/vendor/drawio/mxgraph/src/view/mxEdgeStyle.js',
  vendorSha256: sourceHash,
  source: sourceBounds,
  targetOffsets,
  extraction: {
    start: 'var dir = [0, 0]; before ' + quadrantMarker,
    end: endMarker,
    referenceConstants: constants,
    bitConversionIsTestLocal: true,
  },
  domain:
    'Four non-axis targets; no fixed points or jetty buffers; 15 non-empty boolean masks per endpoint',
  cases,
  directCases,
}
fs.writeFileSync(fixturePath, JSON.stringify(output, null, 2) + '\n')
console.log(
  'R03_REFERENCE_FIXTURES: PASS (' +
    cases.length +
    ' matrix + ' +
    directCases.length +
    ' direct; source ' +
    sourceHash +
    ')',
)
