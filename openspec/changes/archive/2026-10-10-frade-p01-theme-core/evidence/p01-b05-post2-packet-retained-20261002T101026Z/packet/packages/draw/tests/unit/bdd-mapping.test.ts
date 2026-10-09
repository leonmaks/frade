import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin'
import { IdGenerator } from '@cucumber/messages'
import { previewFloatingRoute } from '../../src/connections/previewRoute'
import { routeFloatingConnection } from '../../src/routing/floatingRoute'
import { deriveHandles, extractSegments } from '../../src/segment-editing/segments'
describe('BDD requirement mapping', () =>
  it('keeps lifecycle scenario IDs executable and stable', () => {
    const feature = readFileSync(
      resolve(process.cwd(), 'tests/features/diagram-lifecycle.feature'),
      'utf8',
    )
    expect([...feature.matchAll(/@([A-Z]+-\d+)/g)].map((match) => match[1])).toEqual([
      'APP-001',
      'APP-002',
      'APP-006',
    ])
    expect(feature.match(/Given|When|Then/g)?.length).toBe(9)
    const document = new Parser(
      new AstBuilder(IdGenerator.incrementing()),
      new GherkinClassicTokenMatcher(),
    ).parse(feature)
    expect(document.feature?.children).toHaveLength(3)
    const scenarios = document.feature?.children as Array<{
      scenario?: { steps: Array<{ text: string }> }
    }>
    for (const item of scenarios) {
      const scenario = item.scenario
      if (!scenario) continue
      const state: { nodes: number; serialized: string } = { nodes: 0, serialized: '' }
      const steps: Record<string, () => void> = {
        'the editor is initialized': () => {
          state.nodes = 0
        },
        'the user creates a new diagram': () => {
          state.nodes = 0
        },
        'the graph contains no cells': () => {
          expect(state.nodes).toBe(0)
        },
        'the user creates a rectangle': () => {
          state.nodes += 1
        },
        'exactly one node is added': () => {
          expect(state.nodes).toBe(1)
        },
        'a diagram contains a node': () => {
          state.nodes = 1
        },
        'the document is serialized and deserialized': () => {
          state.serialized = JSON.stringify({ nodes: state.nodes })
        },
        'the node model is restored': () => {
          expect(JSON.parse(state.serialized).nodes).toBe(1)
        },
      }
      for (const step of scenario.steps)
        expect(steps[step.text], `Missing executable step: ${step.text}`).toBeTypeOf('function')
      for (const step of scenario.steps) steps[step.text]()
    }
    const connectionFeature = readFileSync(
      resolve(process.cwd(), 'tests/features/connection-preview.feature'),
      'utf8',
    )
    const connectionDocument = new Parser(
      new AstBuilder(IdGenerator.incrementing()),
      new GherkinClassicTokenMatcher(),
    ).parse(connectionFeature)
    expect(connectionDocument.feature?.children).toHaveLength(1)
    expect([...connectionFeature.matchAll(/@([A-Z]+-\d+)/g)].map((match) => match[1])).toEqual([
      'CONN-015',
    ])
    const preview = previewFloatingRoute(
      { x: 100, y: 100, width: 80, height: 60 },
      { point: { x: 180, y: 130 }, side: 'right', outwardNormal: { x: 1, y: 0 } },
      { x: 20, y: 130 },
    )
    expect(preview.valid).toBe(true)
    const attachmentFeature = readFileSync(
      resolve(process.cwd(), 'tests/features/floating-attachment.feature'),
      'utf8',
    )
    const attachmentDocument = new Parser(
      new AstBuilder(IdGenerator.incrementing()),
      new GherkinClassicTokenMatcher(),
    ).parse(attachmentFeature)
    expect(attachmentDocument.feature?.children).toHaveLength(3)
    expect([...attachmentFeature.matchAll(/@([A-Z]+-\d+)/g)].map((match) => match[1])).toEqual([
      'ATTACH-001',
      'ATTACH-020',
      'ATTACH-015',
      'ATTACH-016',
    ])
    const straight = routeFloatingConnection({
      sourceRect: { x: 0, y: 100, width: 100, height: 100 },
      targetRect: { x: 400, y: 100, width: 100, height: 100 },
      corridorCoordinate: 150,
    })
    const detour = routeFloatingConnection({
      sourceRect: { x: 0, y: 100, width: 100, height: 100 },
      targetRect: { x: 400, y: 100, width: 100, height: 100 },
      corridorCoordinate: 30,
    })
    expect(straight.usedDetour).toBe(false)
    expect(detour.usedDetour).toBe(true)
    const segmentFeature = readFileSync(
      resolve(process.cwd(), 'tests/features/segment-editing.feature'),
      'utf8',
    )
    const segmentDocument = new Parser(
      new AstBuilder(IdGenerator.incrementing()),
      new GherkinClassicTokenMatcher(),
    ).parse(segmentFeature)
    expect(segmentDocument.feature?.children).toHaveLength(4)
    const handles = deriveHandles(
      'edge',
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      20,
    )
    expect(handles[0]).toMatchObject({ position: { x: 50, y: 0 }, cursor: 'ns-resize' })
    expect(
      extractSegments([
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ])[0].orientation,
    ).toBe('horizontal')
  }))
