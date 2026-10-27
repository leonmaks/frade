import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from '@cucumber/gherkin'
import { IdGenerator } from '@cucumber/messages'
import type { DiagramDocument } from '../../src/document/schema'
import {
  parseDrawingDocument,
  serializeDrawingDocument,
  deserializeDrawingDocument,
  pageState,
  drawingDocument,
  insertDrawingPage,
  duplicateDrawingPage,
  removeDrawingPage,
  moveDrawingPage,
  renameDrawingPage,
  sortDrawingPages,
  clearDrawingPages,
  nextPageName,
  type DrawingState,
} from '../../src/document/drawing'

const legacy: DiagramDocument = {
  format: 'frade-draw',
  version: 1,
  metadata: { id: 'drawing', name: 'Architecture' },
  graph: {
    nodes: ['a', 'b'].map((id, index) => ({
      id,
      shape: 'rect',
      x: index * 300,
      y: 20,
      width: 100,
      height: 60,
      label: id,
      repositoryRef: { objectId: 'system-' + id },
    })),
    edges: [
      {
        id: 'edge',
        source: { mode: 'floating', nodeId: 'a' },
        target: { mode: 'fixed', nodeId: 'b', portId: 'in' },
        vertices: [{ x: 180, y: 50 }],
        constraints: [{ axis: 'y', coordinate: 50, order: 0 }],
      },
    ],
  },
  viewport: { zoom: 1.5, pan: { x: 14, y: 21 } },
}
const empty = (id: string, name = 'Page-1') => ({
  id,
  name,
  graph: { nodes: [], edges: [] },
})
const feature = new Parser(
  new AstBuilder(IdGenerator.incrementing()),
  new GherkinClassicTokenMatcher(),
).parse(readFileSync(resolve(process.cwd(), 'tests/features/diagram-pages.feature'), 'utf8'))
for (const child of feature.feature!.children) {
  const scenario = child.scenario!
  it(scenario.tags[0].name + ' ' + scenario.name, () => {
    let state: DrawingState
    let sorted: string[] = []
    const steps: Record<string, () => void> = {
      'a legacy drawing with connected repository nodes': () => {
        state = pageState(legacy, 'Page-1')
      },
      'another drawing page is inserted': () => {
        state = insertDrawingPage(state, empty('second', 'Page-2'))
      },
      'both pages survive a complete file round trip': () => {
        const result = deserializeDrawingDocument(serializeDrawingDocument(drawingDocument(state)))
        expect(result.version).toBe(2)
        if (result.version !== 2) throw Error('Expected multipage drawing')
        expect(result.pages).toHaveLength(2)
        expect(result.pages[0].graph).toEqual(legacy.graph)
        expect(result.pages[0].viewport).toEqual(legacy.viewport)
        expect(result.pages[1]).toEqual(empty('second', 'Page-2'))
        expect(result).not.toHaveProperty('activeId')
      },
      'the drawing page is duplicated': () => {
        state = duplicateDrawingPage(state, state.activeId, 'copy', 'Copy of Page-1')
      },
      'copied terminals and references are correct and the original is unchanged': () => {
        expect(state.pages[0].graph).toEqual(legacy.graph)
        const copy = state.pages[1]
        expect(copy.id).toBe('copy')
        expect(copy.graph.nodes.map((n) => n.id)).toEqual(['copy/a', 'copy/b'])
        expect(copy.graph.edges[0].source.nodeId).toBe('copy/a')
        expect(copy.graph.edges[0].target).toEqual({
          mode: 'fixed',
          nodeId: 'copy/b',
          portId: 'in',
        })
        expect(copy.graph.nodes[0].repositoryRef).toEqual({
          objectId: 'system-a',
        })
        expect(copy.graph.edges[0].constraints).toEqual(legacy.graph.edges[0].constraints)
        expect(copy.viewport).toBeUndefined()
        copy.graph.nodes[0].label = 'Changed copy'
        expect(state.pages[0].graph.nodes[0].label).toBe('a')
        expect(legacy.graph.nodes[0].id).toBe('a')
      },
      'the only drawing page is removed': () => {
        state = removeDrawingPage(state, state.activeId, empty('replacement'))
      },
      'one new empty first page remains': () => {
        expect(state.pages).toEqual([empty('replacement')])
        expect(state.activeId).toBe('replacement')
      },
      'drawing pages named Page-10, Page-2 and Page-1': () => {
        state = pageState({
          format: 'frade-draw',
          version: 2,
          metadata: legacy.metadata,
          pages: [empty('10', 'Page-10'), empty('2', 'Page-2'), empty('1', 'Page-1')],
        })
      },
      'drawing pages are sorted and cleared': () => {
        state = sortDrawingPages(state, 'en')
        sorted = state.pages.map((p) => p.name)
        state = clearDrawingPages(state, empty('cleared'))
      },
      'sorting is natural and clearing retains one empty page': () => {
        expect(sorted).toEqual(['Page-1', 'Page-2', 'Page-10'])
        expect(state.pages).toEqual([empty('cleared')])
      },
      'a drawing whose inactive page has a dangling connection': () => {
        state = insertDrawingPage(pageState(legacy), empty('second'))
        state.pages[0].graph.edges[0].target.nodeId = 'absent'
      },
      'the complete drawing is parsed': () => {},
      'the invalid drawing is rejected': () =>
        expect(() => parseDrawingDocument(drawingDocument(state))).toThrow(
          'Dangling node reference',
        ),
    }
    for (const step of scenario.steps) {
      expect(steps[step.text], step.text).toBeTypeOf('function')
      steps[step.text]()
    }
  })
}
describe('drawing invariants and compatibility', () => {
  it('preserves the v1 envelope until a page operation and reads legacy Designer', () => {
    expect(drawingDocument(pageState(legacy))).toEqual(legacy)
    expect(parseDrawingDocument({ ...legacy, format: 'frade-designer' })).toEqual(legacy)
  })
  it.each([
    { pages: [] },
    { pages: [empty('same'), empty('same')] },
    { pages: [empty('a', ' ')] },
    { pages: [{ ...empty('a'), id: '' }] },
    { version: 99, pages: [empty('a')] },
  ])('rejects an invalid envelope %#', (patch) =>
    expect(() =>
      parseDrawingDocument({
        format: 'frade-draw',
        version: 2,
        metadata: legacy.metadata,
        ...patch,
      }),
    ).toThrow(),
  )
  it('keeps duplicate names, ignores empty renames and does not mutate earlier states', () => {
    const before = pageState(legacy, 'Page-1'),
      added = insertDrawingPage(before, empty('second', 'Page-2'))
    const renamed = renameDrawingPage(added, 'second', 'Page-1')
    expect(renamed.pages.map((p) => p.name)).toEqual(['Page-1', 'Page-1'])
    expect(added.pages[1].name).toBe('Page-2')
    expect(renameDrawingPage(renamed, 'second', '  ')).toBe(renamed)
    expect(nextPageName([empty('a', 'Page-3'), empty('b', 'Page-1')], (n) => 'Page-' + n)).toBe(
      'Page-4',
    )
  })
  it('keeps the active page on reorder and chooses the correct neighbor on remove', () => {
    let state = insertDrawingPage(pageState(legacy), empty('second'))
    state = insertDrawingPage(state, empty('third'))
    const moved = moveDrawingPage(state, 'third', 0)
    expect(moved.pages.map((p) => p.id)).toEqual(['third', state.pages[0].id, 'second'])
    expect(moved.activeId).toBe('third')
    expect(removeDrawingPage(moved, 'third', empty('unused')).activeId).toBe(state.pages[0].id)
    expect(removeDrawingPage(state, 'third', empty('unused')).activeId).toBe('second')
    expect(() => insertDrawingPage(state, empty('second'))).toThrow()
  })
  it('strips all transient properties from every page and preserves supported graph data', () => {
    const result = parseDrawingDocument({
      format: 'frade-draw',
      version: 2,
      metadata: legacy.metadata,
      activeId: 'p',
      pages: [
        {
          id: 'p',
          name: 'Page',
          graph: {
            ...legacy.graph,
            nodes: legacy.graph.nodes.map((n) => ({
              ...n,
              selected: true,
              tools: ['resize'],
            })),
          },
          preview: [1, 2],
        },
      ],
    })
    expect(JSON.stringify(result)).not.toMatch(/selected|tools|preview|activeId/)
    expect(result.version === 2 && result.pages[0].graph).toEqual(legacy.graph)
  })
})
