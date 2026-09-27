import { describe, expect, it } from 'vitest'

// @ts-expect-error The frozen process gate is JavaScript and intentionally has no package declaration.
import { inspectSource } from '../../../../../../scripts/routing-v2-architecture-gate.mjs'

const current = { number: 2 }
const boundary = {
  all: new Set([
    'packages/draw/src/routing/floatingAttachment.ts',
    'packages/draw/src/routing/terminalPolicy.ts',
  ]),
}
const terminalFile = 'packages/draw/src/routing/terminal/fixture.ts'
const perimeterFile = 'packages/draw/src/routing/perimeter/fixture.ts'
const geometryFile = 'packages/draw/src/routing/geometry/fixture.ts'

function findings(file: string, source: string) {
  return inspectSource(file, source, current, boundary)
}

describe('R02 installed dependency checker fixtures', () => {
  it.each([
    [terminalFile, 'import type { Point } from "../model";'],
    [terminalFile, 'import { EPSILON } from "../geometry";'],
    [terminalFile, 'import { perimeterIntersection } from "../perimeter";'],
    [perimeterFile, 'import type { Rect } from "../model";'],
    [perimeterFile, 'import { rectEdges } from "../geometry";'],
  ])('accepts inward import %s: %s', (file, source) => {
    expect(findings(file, source)).toEqual([])
  })

  it.each([
    [perimeterFile, 'import { X } from "../terminal";', 'direction'],
    [geometryFile, 'import { X } from "../terminal";', 'direction'],
    [geometryFile, 'import { X } from "../perimeter";', 'direction'],
    [terminalFile, 'import { X } from "../orthogonal/x";', 'direction'],
    [terminalFile, 'import { X } from "../floatingAttachment";', 'Legacy'],
    [terminalFile, 'import { X } from "../../document/schema";', 'outside'],
    [terminalFile, 'import { X } from "../../../index";', 'outside'],
    [
      terminalFile,
      'import { X } from "../../../../../../apps/desktop/vendor/drawio/mxgraph/src/view/mxPerimeter";',
      'outside',
    ],
  ])('rejects forbidden import %s: %s', (file, source, reason) => {
    expect(findings(file, source)).toEqual([
      expect.objectContaining({ file, reason: expect.stringMatching(new RegExp(reason, 'i')) }),
    ])
  })

  it.each([
    'import "react";',
    'import "react-dom";',
    'import "@antv/x6";',
    'import "electron";',
    'window;',
    'document;',
    'devicePixelRatio;',
  ])('rejects framework/browser dependency: %s', (source) => {
    expect(findings(terminalFile, source).length).toBeGreaterThan(0)
    expect(findings(perimeterFile, source).length).toBeGreaterThan(0)
  })
})
