import { describe, expect, it } from 'vitest'
// @ts-expect-error The frozen process gate is JavaScript and intentionally has no package declaration.
import { inspectSource } from '../../../../../../scripts/routing-v2-architecture-gate.mjs'

const current = { number: 1 }
const boundary = {
  algorithms: new Set<string>(),
  all: new Set([
    'packages/draw/src/routing/floatingAttachment.ts',
    'packages/draw/src/document/schema.ts',
  ]),
}
const geometryFile = 'packages/draw/src/routing/geometry/fixture.ts'
const modelFile = 'packages/draw/src/routing/model/fixture.ts'
const testFile = 'packages/draw/tests/routing-v2/geometry/fixture.test.ts'

const findings = (file: string, content: string, core = true, tests = false) =>
  inspectSource(file, content, current, boundary, { core, tests })

describe('R01 installed architecture checker fixtures', () => {
  it.each([
    ['framework', 'import "react";'],
    ['X6', 'import "@antv/x6";'],
    ['Electron', 'import "electron";'],
    ['browser', 'const point = new DOMPoint(1, 2);'],
    ['timing', 'const now = performance.now();'],
    ['display state', 'const ratio = devicePixelRatio;'],
    ['randomness', 'const choice = Math.random();'],
    ['higher layer', 'import "../terminal/fixture";'],
    ['package root', 'import "../../../index";'],
    ['persistence/document', 'import "../../document/schema";'],
    ['legacy routing', 'import "../floatingAttachment";'],
  ])('rejects %s dependencies', (_label, source) => {
    expect(findings(geometryFile, source)).not.toHaveLength(0)
  })

  it('rejects model-to-geometry dependency and permits geometry-to-model dependency', () => {
    expect(findings(modelFile, 'import type { Point } from "../geometry";')).not.toHaveLength(0)
    expect(findings(geometryFile, 'import type { Point } from "../model";')).toHaveLength(0)
  })

  it('permits tests to depend on geometry and model', () => {
    expect(
      findings(
        testFile,
        'import { point } from "../../../src/routing/model"; import { EPSILON } from "../../../src/routing/geometry";',
        false,
        true,
      ),
    ).toHaveLength(0)
  })
})
