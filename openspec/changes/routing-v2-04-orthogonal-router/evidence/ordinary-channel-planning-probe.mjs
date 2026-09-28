// Independent finite-template planning experiment; imports no R04 implementation.
// This does not replace regression, property, mutation or independent PRE evidence.
import assert from 'node:assert/strict'
const EPS = 1e-6
const directions = ['west', 'north', 'east', 'south']
const opposite = { west: 'east', east: 'west', north: 'south', south: 'north' }
const same = (a, b) => a.x === b.x && a.y === b.y
function direction(a, b) {
  assert.ok((a.x === b.x) !== (a.y === b.y))
  return a.x === b.x ? b.y < a.y ? 'north' : 'south' : b.x < a.x ? 'west' : 'east'
}
function templates(a, b, sd, td, frame) {
  const xs = [...new Set([frame.left, a.x, b.x, frame.right])].sort((x, y) => x - y)
  const ys = [...new Set([frame.top, a.y, b.y, frame.bottom])].sort((x, y) => x - y)
  const eligible = []
  let attempts = 0
  for (let count = 1; count <= 5; count++) for (let firstAxis = 0; firstAxis <= 1; firstAxis++) {
    function visit(points, indices) {
      const k = points.length - 1, current = points.at(-1)
      const axis = (firstAxis + k) % 2 === 0 ? 'x' : 'y', other = axis === 'x' ? 'y' : 'x'
      const values = axis === 'x' ? xs : ys
      const last = k === count - 1
      if (last) attempts++
      if (last && current[other] !== b[other]) return
      for (const value of last ? [b[axis]] : values) {
        if (Math.abs(value - current[axis]) <= EPS) continue
        const next = { ...current, [axis]: value }
        if (points.some(p => same(p, next)) && !(last && same(a, b) && same(next, b))) continue
        const path = [...points, next], key = [...indices, values.indexOf(value)]
        if (last) {
          if (direction(a, path[1]) === opposite[sd]) continue
          if (direction(b, path.at(-2)) === opposite[td]) continue
          eligible.push({ points: path, key: [count, firstAxis, ...key] })
        } else visit(path, key)
      }
    }
    visit([a], [])
  }
  assert.ok(attempts <= 242)
  return { eligible, attempts }
}
const positions = [
  { x: -1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 },
  { x: EPS / 2, y: 0 }, { x: 0, y: EPS / 2 },
]
const frame = { left: -20, top: -20, right: 20, bottom: 20 }
let cases = 0, eligibleCount = 0, largestAttempts = 0, coincidentCases = 0
for (const a of positions) for (const b of positions)
  for (const sd of directions) for (const td of directions) {
    const result = templates(a, b, sd, td, frame)
    assert.ok(result.eligible.length > 0, JSON.stringify({ a, b, sd, td }))
    for (const c of result.eligible) {
      assert.ok(c.points.length >= 2 && c.points.length <= 6)
      assert.notEqual(direction(a, c.points[1]), opposite[sd])
      assert.notEqual(direction(b, c.points.at(-2)), opposite[td])
    }
    cases++; eligibleCount += result.eligible.length
    if (same(a, b)) coincidentCases++
    largestAttempts = Math.max(largestAttempts, result.attempts)
  }
const a = { x: 733, y: -71166 }, b = { x: -15, y: -70958 }
const p = { x: 338, y: -71166 }, q = { x: -15, y: -70862 }
const original = templates(a, b, 'east', 'north', {
  left: -111, top: -71262, right: 829, bottom: -69208,
})
const cost = points => points.slice(1).reduce((n, p, i) =>
  n + Math.abs(p.x - points[i].x) + Math.abs(p.y - points[i].y), 0)
const minimum = Math.min(...original.eligible.map(c => cost([p, ...c.points, q])))
const best = original.eligible.filter(c => cost([p, ...c.points, q]) === minimum)
assert.equal(minimum, 1447)
// Among equal-length paths the two-segment connector has the fewest bends.
const fewest = Math.min(...best.map(c => c.points.length))
const selected = best.filter(c => c.points.length === fewest)
assert.equal(selected.length, 1)
assert.deepEqual(selected[0].points, [a, { x: 733, y: -70958 }, b])
console.log(JSON.stringify({ status: 'PASS', evidenceType: 'PLANNING_TEMPLATE_PROBE_ONLY',
  cases, directionPairs: 16, coincidentCases, eligibleCount, largestAttempts,
  originalCounterexample: { cost: minimum, route: [p, ...selected[0].points, q] },
  limitations: 'No production calls, floating projection, full numeric-domain proof, canonical tie tests or runtime property quota claimed.',
}, null, 2))
