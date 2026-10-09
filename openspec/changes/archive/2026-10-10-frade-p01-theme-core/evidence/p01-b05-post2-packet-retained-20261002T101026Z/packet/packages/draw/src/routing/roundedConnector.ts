/*
 * Adapted from @antv/x6 3.1.8 registry/connector/rounded.
 * MIT License
 *
 * Copyright (c) 2021-2025 Alipay.inc
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import { Graph, Path, Point } from '@antv/x6'
/** X6 3.1.8 rounded connector (MIT), retaining subpixel corridor coordinates. */
export function roundedConnector(
  source: { x: number; y: number },
  target: { x: number; y: number },
  vertices: { x: number; y: number }[],
  options: { radius?: number; raw?: boolean } = {},
) {
  const path = new Path(),
    radius = options.radius ?? 10
  path.appendSegment(Path.createSegment('M', source))
  for (let i = 0; i < vertices.length; i++) {
    const current = Point.create(vertices[i]),
      previous = vertices[i - 1] ?? source,
      next = vertices[i + 1] ?? target
    const start = current
      .clone()
      .move(previous, -Math.min(radius, current.distance(previous) / 2))
      .round(6)
    const end = current
      .clone()
      .move(next, -Math.min(radius, current.distance(next) / 2))
      .round(6)
    const first = new Point(start.x / 3 + (current.x * 2) / 3, start.y / 3 + (current.y * 2) / 3)
    const second = new Point(end.x / 3 + (current.x * 2) / 3, end.y / 3 + (current.y * 2) / 3)
    path.appendSegment(Path.createSegment('L', start))
    path.appendSegment(Path.createSegment('C', first, second, end))
  }
  path.appendSegment(Path.createSegment('L', target))
  return options.raw ? path : path.serialize()
}
Graph.registerConnector('frade-rounded', roundedConnector, true)
